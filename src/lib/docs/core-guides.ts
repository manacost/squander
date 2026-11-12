export type CoreGuide = Readonly<{
  slug: string;
  label: string;
  title: string;
  summary: string;
  evidence_kind: "example" | "test";
  evidence_label: string;
  evidence_href?: string;
  test_file?: string;
  example_description: string;
  explanation: string;
  types: readonly string[];
  sample: string;
  proof: string;
  limitations: string;
}>;

export const core_guides = [
  {
    slug: "asset-loading",
    label: "asset loading",
    title: "Asset loading",
    summary: "Load textures and fonts through the game-owned asset cache.",
    evidence_kind: "test",
    evidence_label: "Read the asset cache tests",
    test_file: "src/lib/core/runtime/asset_loading.test.ts",
    example_description: "Watch a checkerboard texture arrive through the game asset cache before frames begin.",
    explanation:
      "Load assets during setup, before the frame loop starts. The cache connects each handle to the game's abort and disposal lifecycle, so canceled or disposed games cannot publish late resources.",
    types: ["AssetCache<Manifest>", "ResourceHandle<T>", "GameSetupContext<Manifest>", "GameInitializationError"],
    sample:
      'const texture = await assets.load_texture(blob, { magnification: "nearest" });\nconst pixels = texture.read();\ntexture.release();',
    proof: "CPU tests cover cancellation, retry, and ownership. Real Blob and File fixtures verify texture readback.",
    limitations:
      "Generic manifest loading is supported. Manifest-specific texture descriptors and atlas manifests remain future extensions.",
  },
  {
    slug: "dynamic-assets",
    label: "dynamic assets",
    title: "Dynamic assets",
    summary: "Turn Blob and File values into GPU textures at runtime.",
    evidence_kind: "test",
    evidence_label: "Read the image loading tests",
    test_file: "src/lib/core/runtime/image_loading.test.ts",
    example_description: "Watch a File created at runtime decode into a texture and move across the canvas.",
    explanation:
      "Use the same loading API for generated images and user-provided files. Decoding and upload honor AbortSignal, while the returned handle controls access and release.",
    types: ["Blob", "File", "AbortSignal", "ResourceHandle<WebGpuTexture>", "ImageDecodeError"],
    sample:
      'const file = new File([png_bytes], "hero.png", { type: "image/png" });\nconst handle = await game.assets.load_texture(file, { signal });\nframe.draw_commands([{ kind: "texture", draw: { texture: handle.read() } }]);',
    proof: "Real Chromium tests load both Blob and File sources and read back deterministic pixels.",
    limitations: "Identical Blob and File values are loaded independently.",
  },
  {
    slug: "sprite-drawing",
    label: "sprites",
    title: "Sprite drawing",
    summary: "Place textures and atlas regions with explicit transforms, tint, opacity, and draw order.",
    evidence_kind: "test",
    evidence_label: "Read the renderer texture tests",
    test_file: "tests/webgpu-renderer.spec.ts",
    example_description: "Compare transformed sprites that share one texture but use different tint, flip, opacity, and position settings.",
    explanation:
      "Sprite draws use logical screen or camera-space coordinates. Each draw can specify a source region, origin, flip, rotation, scale, tint, opacity, and submission order.",
    types: ["WebGpuTexture", "TextureDrawOptions", "BlendMode", "TextureRegion", "TextureFilteringOptions", "Color"],
    sample:
      'frame.draw_commands([{ kind: "texture", draw: { texture, options: {\n  x: 120, y: 80, width: 64, height: 64,\n  origin: { x: 0.5, y: 0.5 }, rotation: degrees(15), flip_x: true,\n  tint: rgba(1, 0.8, 0.8, 1), opacity: 0.9, blend_mode: "additive",\n} } }]);',
    proof: "Real readback verifies atlas regions, tint, opacity, origins, rotation, flips, submission order, and blend-mode pixels.",
    limitations: "The supported modes are normal, additive, and multiply; mipmaps and swappable projections remain outside this guide.",
  },
  {
    slug: "shape-drawing",
    label: "shapes",
    title: "Shape drawing",
    summary: "Draw rectangles, circles, lines, and outlines as frame-local commands.",
    evidence_kind: "test",
    evidence_label: "Read the shape validation tests",
    test_file: "src/lib/core/runtime/shapes.test.ts",
    example_description: "See rectangles, circles, and lines drawn as frame-local value commands.",
    explanation:
      "Shapes are frame-local commands, so you can submit them without allocating per-call GPU resources. Signed rectangles are normalized; invalid geometry throws, and valid zero-area shapes draw nothing.",
    types: ["RectangleDraw", "CircleDraw", "LineDraw", "RectangleOutlineDraw", "CircleOutlineDraw", "Color"],
    sample:
      'frame.draw_commands([\n  { kind: "rectangle", draw: { rectangle: { x: 20, y: 20, width: 80, height: 40 }, color: rgba(0.2, 0.5, 1, 1) } },\n  { kind: "circle", draw: { circle: { x: 140, y: 40, radius: 20 }, color: rgba(1, 0.3, 0.3, 1) } },\n]);',
    proof:
      "CPU validation covers inputs. Real GPU fixtures verify fills, outlines, circles, lines, centered strokes, joins, and degenerate inputs.",
    limitations:
      "Path cap, join, and screen-unit options are documented separately; dashed strokes and inside/outside alignment remain deferred.",
  },
  {
    slug: "paths-and-polygons",
    label: "paths & polygons",
    title: "Paths and polygons",
    summary: "Build reusable polygon fills and curved stroke geometry from copied input data.",
    evidence_kind: "test",
    evidence_label: "Read the geometry preparation tests",
    test_file: "src/lib/core/runtime/paths.test.ts",
    example_description: "See a curved stroke and polygon fill prepared from reusable geometry.",
    explanation:
      "Path and polygon constructors copy caller data. Updates validate before replacing geometry, and handles remain scoped to the game that created them.",
    types: ["PathHandle", "PolygonHandle", "FlattenedSubpath", "TriangulatedPolygon", "GeometryHandle"],
    sample:
      "const route = create_path([move_to(0, 0), quadratic_to(40, -30, 80, 0)]);\nconst marker = create_polygon([{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 20, y: 30 }]);\nroute.update([move_to(0, 0), line_to(100, 20)]);",
    proof:
      "CPU snapshots and tessellation tests cover geometry preparation. Real GPU fixtures verify curves, concave fills, outlines, updates, cache replacement, and ownership.",
    limitations:
      "Even-odd filled curved subpaths are available in the separate filled-curved-paths capability; broader fill rules remain deferred.",
  },
  {
    slug: "stroke-options",
    label: "stroke options",
    title: "Stroke options",
    summary: "Keep path stroke thickness stable or choose explicit endpoint and corner styles.",
    evidence_kind: "test",
    evidence_label: "Read the stroke geometry and GPU tests",
    test_file: "tests/webgpu-renderer.spec.ts",
    example_description: "Compare round endpoints and corners with a screen-space overlay stroke.",
    explanation:
      "Path strokes use world units, butt caps, and miter joins by default. Opt into screen units, square or round caps, bevel or round joins, and a finite miter limit without managing GPU resources.",
    types: ["StrokeDraw", "StrokeUnits", "StrokeCap", "StrokeJoin"],
    sample:
      'frame.draw_commands([{ kind: "stroke", draw: { subpaths: outline, width: 2, units: "screen", cap: "round", join: "round", color: rgba(1, 1, 0, 1) } }]);',
    proof:
      "CPU geometry tests cover cap/join selection and miter limits. Trusted WebGPU readback covers endpoint, corner, zoom, and DPR behavior.",
    limitations:
      "Options currently apply to path stroke commands; dashed strokes, inside/outside alignment, and primitive outline styles remain deferred.",
  },
  {
    slug: "filled-curved-paths",
    label: "filled curved paths",
    title: "Filled curved paths",
    summary: "Fill curved subpaths with transparent holes using the even-odd rule.",
    evidence_kind: "test",
    evidence_label: "Read the filled-path GPU test",
    test_file: "tests/webgpu-renderer.spec.ts",
    example_description: "Render a curved outer region and a transparent inner hole as one command.",
    explanation:
      "Flatten closed path subpaths, then submit them through the filled_path command. Alternating containment depth creates solid regions, holes, and nested islands without exposing the tessellator or GPU buffers.",
    types: ["FlattenedSubpath", "FillRule", "RenderCommand", "filled_path"],
    sample:
      'const outer = flatten_path([move_to(0, 0), line_to(200, 0), line_to(200, 120), line_to(0, 120), close()], 0.5)[0];\nconst hole = flatten_path([move_to(40, 30), line_to(40, 90), line_to(160, 90), line_to(160, 30), close()], 0.5)[0];\nframe.draw_commands([{ kind: "filled_path", draw: { subpaths: [outer, hole], fill_rule: "even_odd", color: rgba(1, 0, 0, 1) } }]);',
    proof:
      "CPU tessellation tests cover holes and nested islands. Trusted WebGPU readback verifies a curved filled region and transparent hole.",
    limitations:
      "Only closed subpaths and even_odd are supported. Nonzero winding, automatic closure, and arbitrary tessellation plugins remain deferred.",
  },
  {
    slug: "camera-2d",
    label: "camera 2D",
    title: "2D cameras",
    summary: "Transform world-space drawing with synchronous position, zoom, and rotation scopes.",
    evidence_kind: "test",
    evidence_label: "Read the camera transform tests",
    test_file: "src/lib/core/runtime/camera.test.ts",
    example_description: "See world-space shapes rendered through a rotated and zoomed camera scope.",
    explanation:
      "camera.draw temporarily maps world coordinates into the logical viewport. It restores the previous camera synchronously, even when the callback throws. Drawing outside the scope remains in screen space.",
    types: ["Camera", "CameraOptions", "CameraViewport", "Bounds", "Point"],
    sample:
      'const camera = create_camera({ x: 400, y: 225, zoom: 2, rotation: degrees(10), viewport });\ncamera.draw(() => {\n  frame.draw_commands([{ kind: "texture", draw: { texture: hero, options: { x: 400, y: 225 } } }]);\n});',
    proof:
      "Camera CPU tests verify transforms and scope restoration. Real GPU fixtures verify centered focus, zoom, inverse rotation, and conservative visibility.",
    limitations: "Advanced projections and cursor-anchored zoom are deferred. Opt-in bounded render culling is documented separately.",
  },
  {
    slug: "render-culling",
    label: "render culling",
    title: "Opt-in render culling",
    summary: "Skip clearly offscreen bounded commands without changing simulation.",
    evidence_kind: "test",
    evidence_label: "Read the render-culling tests",
    test_file: "src/lib/core/runtime/webgpu_renderer.test.ts",
    example_description: "Enable culling and attach conservative world bounds to camera-scoped render commands.",
    explanation:
      "Culling is disabled by default. When enabled, the renderer uses the active camera's conservative visibility query and skips only definitely offscreen bounded commands; visible, touching, and unbounded commands remain.",
    types: ["WebGpuRendererOptions.cull_offscreen", "RenderCommand.bounds", "Bounds"],
    sample:
      'const renderer = await create_webgpu_renderer({ canvas, width: 800, height: 450, cull_offscreen: true });\ncamera.draw(() => {\n  frame.draw_commands([{ kind: "texture", draw: { texture }, bounds: enemy_bounds }]);\n});',
    proof:
      "Camera boundary tests and renderer CPU tests verify conservative filtering. Trusted GPU equivalence and CPU/GPU workload evidence are required before promotion.",
    limitations:
      "Bounds are caller-provided world-space hints. Occlusion culling, automatic bounds calculation, and projection changes are deferred.",
  },
  {
    slug: "viewport-sizing",
    label: "viewport sizing",
    title: "Viewport sizing",
    summary: "Keep logical coordinates stable as CSS size, letterboxing, and device pixels change.",
    evidence_kind: "test",
    evidence_label: "Read the viewport sizing tests",
    test_file: "src/lib/core/runtime/viewport_sizing.test.ts",
    example_description: "See a logical frame and centered marker stay stable inside the responsive viewport.",
    explanation:
      "Choose a fixed-fit or responsive policy to separate logical size from CSS size, letterboxing, device pixel ratio, and physical surface dimensions.",
    types: ["ViewportSize", "FixedViewportOptions", "ResponsiveViewportOptions", "Game.resize"],
    sample:
      "game.resize(calculate_fixed_viewport({\n  logical_width: 800, logical_height: 450,\n  css_width: container.clientWidth, css_height: container.clientHeight,\n  device_pixel_ratio: devicePixelRatio,\n}));\nconst bounds = game.get_viewport();",
    proof:
      "Helper tests verify sizing calculations. Real readback verifies fixed-fit bars, responsive sizing, resize, DPR mapping, and logical placement.",
    limitations: "Fixed-fill cropping, integer-only scaling, and automatic DOM observation are deferred.",
  },
  {
    slug: "texture-filtering",
    label: "texture filtering",
    title: "Texture filtering",
    summary: "Choose nearest or linear sampling for each texture.",
    evidence_kind: "test",
    evidence_label: "Read the filtering policy tests",
    test_file: "src/lib/core/runtime/texture_filtering.test.ts",
    example_description: "Compare nearest sampling on the left with linear sampling on the right.",
    explanation:
      "Set filtering when a texture or font atlas is created. Warm frames reuse samplers internally, while the renderer still does not generate mipmaps.",
    types: ["TextureFilteringOptions", 'TextureFilter = "nearest" | "linear"', "WebGpuTexture"],
    sample: 'const handle = await assets.load_texture(blob, {\n  magnification: "nearest",\n  minification: "linear",\n});',
    proof: "Real GPU fixtures distinguish nearest and linear sampling. They also verify minification policy without mipmaps.",
    limitations: "Mipmapped and anisotropic filtering are deferred.",
  },
  {
    slug: "game-lifecycle",
    label: "game lifecycle",
    title: "Game lifecycle",
    summary: "Start, pause, resume, suspend, and dispose an isolated game instance.",
    evidence_kind: "test",
    evidence_label: "Read the game lifecycle tests",
    test_file: "src/lib/core/runtime/game.test.ts",
    example_description: "Watch a game-owned object advance while the game loop is running.",
    explanation:
      "Renderer creation and setup must finish before the frame loop starts. Disposal is idempotent: it aborts setup, cleans late resources, and never revives the game.",
    types: ["Game", "GameOptions", "GameSetupContext", "GameInitializationError", "GameDisposedError"],
    sample:
      "const game = create_game({ renderer, scheduler, setup, update, draw });\nawait game.ready;\ngame.pause();\ngame.resume();\nawait game.dispose();",
    proof:
      "Lifecycle unit tests cover setup races, callback errors, visibility, disposal, and renderer cleanup. Browser demos expose the controls.",
    limitations:
      "Scene composition and input routing are documented as separate capabilities. Storage lifecycle remains outside this guide.",
  },
  {
    slug: "game-timing",
    label: "game timing",
    title: "Game timing",
    summary: "Drive deterministic update and draw loops with bounded deltas.",
    evidence_kind: "test",
    evidence_label: "Read the frame loop tests",
    test_file: "src/lib/core/runtime/frame_loop.test.ts",
    example_description: "Watch motion advance from frame deltas supplied by the scheduler.",
    explanation:
      "The scheduler supplies monotonic time to update callbacks. The default frame loop clamps large deltas, while fixed_step opts into bounded fixed updates and reports discarded catch-up time.",
    types: ["FrameScheduler", "UpdateTime", "FrameLoopState", "max_delta_seconds", "FixedStepOptions"],
    sample:
      "const scheduler: FrameScheduler = {\n  request_frame: requestAnimationFrame,\n  cancel_frame: cancelAnimationFrame,\n  now_seconds: () => performance.now() / 1000,\n};",
    proof: "Frame-loop tests cover delta clamping, pause/resume, visibility suspension, timing reset, and callback failure.",
    limitations: "Interpolation, rollback, and scheduler integrations beyond the browser frame API are deferred.",
  },
  {
    slug: "webgpu-runtime",
    label: "WebGPU runtime",
    title: "WebGPU runtime",
    summary: "Create a secure-context WebGPU renderer and draw deterministic frames.",
    evidence_kind: "test",
    evidence_label: "Read the real WebGPU browser tests",
    test_file: "tests/webgpu-renderer.spec.ts",
    example_description: "See the production WebGPU renderer create a surface and draw a frame.",
    explanation:
      "The renderer owns the adapter, device, canvas context, pipelines, textures, samplers, and readback path. Device loss is reported as a typed game error.",
    types: ["WebGpuRenderer", "WebGpuRendererOptions", "RenderFrame", "WebGpuUnavailableError", "GameDeviceLostError"],
    sample:
      'const renderer = await create_webgpu_renderer({ canvas, width: 800, height: 450 });\nconst frame = renderer.begin_frame();\nframe.draw_commands([{ kind: "rectangle", draw: { rectangle: { x: 0, y: 0, width: 800, height: 450 }, color: { red: 0, green: 0, blue: 0, alpha: 1 } } }]);\nawait frame.submit();\nrenderer.dispose();',
    proof:
      "Real Chromium tests assert secure context, GPU availability, adapter/device creation, deterministic readback, and two-game isolation.",
    limitations: "Render targets and constrained texture fragment effects are available; arbitrary GPU resource APIs remain deferred.",
  },
  {
    slug: "resource-ownership",
    label: "resource ownership",
    title: "Resource ownership",
    summary: "Keep GPU resources alive across accepted draws with opaque handles and leases.",
    evidence_kind: "test",
    evidence_label: "Read the resource ownership tests",
    test_file: "src/lib/core/runtime/resource_ownership.test.ts",
    example_description: "See a texture acquired through a resource owner remain usable for the game lifetime.",
    explanation:
      "Releasing a handle invalidates that handle for future reads. An accepted draw keeps its resource lease until the renderer is safe to release it, while owner disposal cleans up remaining acquisitions.",
    types: ["ResourceOwner", "ResourceHandle<T>", "GeometryOwner", "GeometryHandle"],
    sample:
      "const handle = game.resources.acquire(texture, (resource) => resource.release());\nrenderer.draw_texture(handle.read());\nhandle.release();",
    proof: "CPU ownership tests and real GPU readback cover stale handles, accepted draw lifetime, cache cleanup, and game isolation.",
    limitations: "Scene ownership automation and multi-scene asset policies are deferred.",
  },
  {
    slug: "render-targets",
    label: "render targets",
    title: "Render targets",
    summary: "Compose renderer-owned offscreen targets back into the canvas.",
    evidence_kind: "test",
    evidence_label: "Read the render-target WebGPU test",
    test_file: "tests/webgpu-renderer.spec.ts",
    example_description: "Render a red layer offscreen, then sample it into the canvas presentation pass.",
    explanation:
      "Create an explicit-size target, select it on a frame, record commands, switch back to the canvas, and draw the target as a texture. The renderer owns views, leases, and pipelines.",
    types: ["WebGpuRenderTarget", "RenderTargetOptions", "RenderFrame.set_target"],
    sample:
      'const target = renderer.create_render_target({ width: 800, height: 450 });\nconst frame = renderer.begin_frame();\nframe.set_target(target);\nframe.draw_commands(scene_commands);\nframe.set_target();\nframe.draw_commands([{ kind: "texture", draw: { texture: target } }]);\ntarget.release();\nawait frame.submit();',
    proof: "Trusted WebGPU readback verifies offscreen rendering, target sampling, and release-before-submit ownership.",
    limitations:
      "Targets use the preferred canvas format. Mipmaps, multisampling, arbitrary formats, and broader shader layouts remain separate capabilities.",
  },
  {
    slug: "custom-shader-effects",
    label: "custom shader effects",
    title: "Custom shader effects",
    summary: "Apply a constrained fragment effect while Squander owns GPU resources.",
    evidence_kind: "test",
    evidence_label: "Read the custom-shader WebGPU test",
    test_file: "tests/webgpu-renderer.spec.ts",
    example_description: "Use a fixed fragment body and numeric uniforms to transform a sampled texture.",
    explanation:
      "Effects run after texture sampling and tinting. The body can read color, normalized uv coordinates, and a four-vector uniform array; bindings, pipelines, and disposal remain private.",
    types: ["ShaderEffectOptions", "WebGpuShaderEffect", "TextureDrawOptions.effect"],
    sample:
      'const effect = renderer.create_shader_effect({\n  fragment_code: "return vec4f(color.rgb * uniforms[0].x, color.a);",\n  uniforms: [0.75],\n});\nawait renderer.draw_texture(texture, { effect });\neffect.release();',
    proof:
      "CPU validation tests and trusted Chromium WebGPU readback verify metadata rejection, uniform-driven output, and renderer ownership.",
    limitations:
      "Only texture and render-target draws are supported. Custom vertex code, arbitrary bindings, storage textures, mipmaps, and untrusted-source security guarantees are out of scope.",
  },
  {
    slug: "svelte-bridge",
    label: "Svelte bridge",
    title: "Svelte 5 bridge",
    summary: "Connect game state and typed commands to Svelte without coupling core to Svelte.",
    evidence_kind: "example",
    evidence_label: "Open the Svelte adapter example",
    evidence_href: "/docs/examples/svelte",
    test_file: "tests/webgpu-svelte-adapter.spec.ts",
    example_description: "Use the focused Svelte example to observe readonly state snapshots and invoke typed commands.",
    explanation:
      "The adapter owns one game instance and publishes readonly views. Commands preserve synchronous or asynchronous return types, and unmounting disposes subscriptions and the game.",
    types: ["GameBridge<State, Commands>", "GameAdapterView<State, Commands>", "GameHost", "create_game_adapter"],
    sample:
      "const bridge = create_game_adapter({\n  initial_state: { score: 0 },\n  commands: { increment: (amount: number) => score += amount },\n  create: ({ publish, canvas }) => create_game({ canvas, publish }),\n});",
    proof:
      "Adapter unit, SSR, package-consumer, and browser tests cover typed commands, snapshots, unmount, SSR, and advanced multi-host isolation.",
    limitations:
      "Core remains Svelte-independent; scene-owned UI is available through the optional Svelte Game host, while richer reactive helpers are deferred.",
  },
] satisfies readonly CoreGuide[];

export const core_guide_by_slug = new Map(core_guides.map((guide) => [guide.slug, guide]));
