import { expect, test } from "@playwright/test";

test("real WebGPU can render and read back a deterministic fixture", async ({ page }) => {
  await page.goto("/");

  const result = await page.evaluate(async () => {
    if (!window.isSecureContext) {
      return { available: false, reason: "WebGPU requires a secure context" };
    }

    if (!("gpu" in navigator)) {
      return { available: false, reason: "navigator.gpu is unavailable" };
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return { available: false, reason: "no WebGPU adapter is available" };
    }

    const device = await adapter.requestDevice();
    const texture = device.createTexture({
      size: { width: 1, height: 1 },
      format: "rgba8unorm",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    const readback = device.createBuffer({
      size: 256,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: texture.createView(),
          clearValue: { r: 0.25, g: 0.5, b: 0.75, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.end();
    encoder.copyTextureToBuffer({ texture }, { buffer: readback, bytesPerRow: 256 }, { width: 1, height: 1 });
    device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const pixel = Array.from(new Uint8Array(readback.getMappedRange()).slice(0, 4));
    readback.unmap();
    texture.destroy();
    device.destroy();

    return { available: true, pixel };
  });

  expect(result.available, result.reason ?? "WebGPU probe failed").toBe(true);
  expect(result.pixel).toEqual([64, 128, 191, 255]);
});
