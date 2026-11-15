export type WebGpuAllocationSnapshot = Readonly<{
  buffers_created: number;
  textures_created: number;
  samplers_created: number;
  bind_groups_created: number;
  pipelines_created: number;
  retained_buffers: number;
  retained_buffer_bytes: number;
  retained_textures: number;
  submissions: number;
  draw_calls: number;
  readbacks: number;
}>;

export type WebGpuAllocationInstrumentation = Readonly<{
  snapshot: () => WebGpuAllocationSnapshot;
  restore: () => void;
}>;

export const install_webgpu_allocation_instrumentation = (): WebGpuAllocationInstrumentation => {
  const counts = {
    buffers_created: 0,
    textures_created: 0,
    samplers_created: 0,
    bind_groups_created: 0,
    pipelines_created: 0,
    retained_buffers: 0,
    retained_buffer_bytes: 0,
    retained_textures: 0,
    submissions: 0,
    draw_calls: 0,
    readbacks: 0,
  };
  const device_prototype = GPUDevice.prototype;
  const queue_prototype = GPUQueue.prototype;
  const encoder_prototype = GPUCommandEncoder.prototype;
  const pass_prototype = GPURenderPassEncoder.prototype;
  const originals = [
    [device_prototype, "createBuffer", Object.getOwnPropertyDescriptor(device_prototype, "createBuffer")],
    [device_prototype, "createTexture", Object.getOwnPropertyDescriptor(device_prototype, "createTexture")],
    [device_prototype, "createSampler", Object.getOwnPropertyDescriptor(device_prototype, "createSampler")],
    [device_prototype, "createBindGroup", Object.getOwnPropertyDescriptor(device_prototype, "createBindGroup")],
    [device_prototype, "createRenderPipeline", Object.getOwnPropertyDescriptor(device_prototype, "createRenderPipeline")],
    [queue_prototype, "submit", Object.getOwnPropertyDescriptor(queue_prototype, "submit")],
    [encoder_prototype, "copyTextureToBuffer", Object.getOwnPropertyDescriptor(encoder_prototype, "copyTextureToBuffer")],
    [pass_prototype, "draw", Object.getOwnPropertyDescriptor(pass_prototype, "draw")],
  ] as const;

  const track_buffer = (buffer: GPUBuffer, size: number): GPUBuffer => {
    counts.retained_buffers += 1;
    counts.retained_buffer_bytes += size;
    let destroyed = false;
    const destroy = buffer.destroy.bind(buffer);
    Object.defineProperty(buffer, "destroy", {
      configurable: true,
      value: () => {
        if (!destroyed) {
          destroyed = true;
          counts.retained_buffers -= 1;
          counts.retained_buffer_bytes -= size;
        }
        destroy();
      },
    });
    return buffer;
  };

  const track_texture = (texture: GPUTexture): GPUTexture => {
    counts.retained_textures += 1;
    let destroyed = false;
    const destroy = texture.destroy.bind(texture);
    Object.defineProperty(texture, "destroy", {
      configurable: true,
      value: () => {
        if (!destroyed) {
          destroyed = true;
          counts.retained_textures -= 1;
        }
        destroy();
      },
    });
    return texture;
  };

  const original_create_buffer = device_prototype.createBuffer;
  Object.defineProperty(device_prototype, "createBuffer", {
    configurable: true,
    value: function (this: GPUDevice, descriptor: GPUBufferDescriptor): GPUBuffer {
      counts.buffers_created += 1;
      return track_buffer(original_create_buffer.call(this, descriptor), descriptor.size);
    },
  });
  const original_create_texture = device_prototype.createTexture;
  Object.defineProperty(device_prototype, "createTexture", {
    configurable: true,
    value: function (this: GPUDevice, descriptor: GPUTextureDescriptor): GPUTexture {
      counts.textures_created += 1;
      return track_texture(original_create_texture.call(this, descriptor));
    },
  });
  const original_create_sampler = device_prototype.createSampler;
  Object.defineProperty(device_prototype, "createSampler", {
    configurable: true,
    value: function (this: GPUDevice, descriptor?: GPUSamplerDescriptor): GPUSampler {
      counts.samplers_created += 1;
      return original_create_sampler.call(this, descriptor);
    },
  });
  const original_create_bind_group = device_prototype.createBindGroup;
  Object.defineProperty(device_prototype, "createBindGroup", {
    configurable: true,
    value: function (this: GPUDevice, descriptor: GPUBindGroupDescriptor): GPUBindGroup {
      counts.bind_groups_created += 1;
      return original_create_bind_group.call(this, descriptor);
    },
  });
  const original_create_pipeline = device_prototype.createRenderPipeline;
  Object.defineProperty(device_prototype, "createRenderPipeline", {
    configurable: true,
    value: function (this: GPUDevice, descriptor: GPURenderPipelineDescriptor): GPURenderPipeline {
      counts.pipelines_created += 1;
      return original_create_pipeline.call(this, descriptor);
    },
  });
  const original_submit = queue_prototype.submit;
  Object.defineProperty(queue_prototype, "submit", {
    configurable: true,
    value: function (this: GPUQueue, command_buffers: Iterable<GPUCommandBuffer>): void {
      counts.submissions += 1;
      original_submit.call(this, command_buffers);
    },
  });
  const original_readback = encoder_prototype.copyTextureToBuffer;
  Object.defineProperty(encoder_prototype, "copyTextureToBuffer", {
    configurable: true,
    value: function (
      this: GPUCommandEncoder,
      source: GPUTexelCopyTextureInfo,
      destination: GPUTexelCopyBufferInfo,
      size: GPUExtent3D,
    ): void {
      counts.readbacks += 1;
      original_readback.call(this, source, destination, size);
    },
  });
  const original_draw = pass_prototype.draw;
  Object.defineProperty(pass_prototype, "draw", {
    configurable: true,
    value: function (
      this: GPURenderPassEncoder,
      vertex_count: number,
      instance_count?: number,
      first_vertex?: number,
      first_instance?: number,
    ): void {
      counts.draw_calls += 1;
      original_draw.call(this, vertex_count, instance_count, first_vertex, first_instance);
    },
  });

  return Object.freeze({
    snapshot: () => Object.freeze({ ...counts }),
    restore: () => {
      originals.forEach(([prototype, name, descriptor]) => {
        if (descriptor === undefined) {
          Reflect.deleteProperty(prototype, name);
        } else {
          Object.defineProperty(prototype, name, descriptor);
        }
      });
    },
  });
};
