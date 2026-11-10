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
      'const file = new File([png_bytes], "hero.png", { type: "image/png" });\nconst handle = await game.assets.load_texture(file, { signal });\nrenderer.draw_texture(handle.read());',
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
    types: ["WebGpuTexture", "TextureDrawOptions", "TextureRegion", "TextureFilteringOptions", "Color"],
    sample:
      "renderer.draw_texture(texture, {\n  x: 120, y: 80, width: 64, height: 64,\n  origin: { x: 0.5, y: 0.5 }, rotation: degrees(15), flip_x: true,\n  tint: rgba(1, 0.8, 0.8, 1), opacity: 0.9,\n});",
    proof: "Real readback verifies atlas regions, tint, opacity, origins, rotation, flips, and sprite submission order.",
    limitations: "Selectable blend modes and implicit batching policy are not currently supported; order remains observable.",
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
      'renderer.draw_commands([\n  { kind: "rectangle", draw: { rectangle: { x: 20, y: 20, width: 80, height: 40 }, color: rgba(0.2, 0.5, 1, 1) } },\n  { kind: "circle", draw: { circle: { x: 140, y: 40, radius: 20 }, color: rgba(1, 0.3, 0.3, 1) } },\n]);',
    proof:
      "CPU validation covers inputs. Real GPU fixtures verify fills, outlines, circles, lines, centered strokes, joins, and degenerate inputs.",
    limitations: "Rounded caps/joins, dashed strokes, and inside/outside alignment are deferred.",
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
    limitations: "Holes, fill rules, and filled curved paths remain future capability candidates.",
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
      "const camera = create_camera({ x: 400, y: 225, zoom: 2, rotation: degrees(10), viewport });\ncamera.draw(() => {\n  renderer.draw_texture(hero, { x: 400, y: 225 });\n});",
    proof:
      "Camera CPU tests verify transforms and scope restoration. Real GPU fixtures verify centered focus, zoom, inverse rotation, and conservative visibility.",
    limitations: "Advanced projections, cursor-anchored zoom, and automatic culling are deferred.",
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
      "Set filtering when a texture or font atlas is created. The renderer reuses samplers internally and does not generate mipmaps.",
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
      "The scheduler supplies monotonic time to update callbacks. The frame loop clamps large deltas, resets timing after suspension, and does not advance simulation while paused.",
    types: ["FrameScheduler", "UpdateTime", "FrameLoopState", "max_delta_seconds"],
    sample:
      "const scheduler: FrameScheduler = {\n  request_frame: requestAnimationFrame,\n  cancel_frame: cancelAnimationFrame,\n  now_seconds: () => performance.now() / 1000,\n};",
    proof: "Frame-loop tests cover delta clamping, pause/resume, visibility suspension, timing reset, and callback failure.",
    limitations: "Fixed-step simulation and scheduler integrations beyond the browser frame API are deferred.",
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
    types: ["WebGpuRenderer", "WebGpuRendererOptions", "WebGpuUnavailableError", "GameDeviceLostError"],
    sample:
      "const renderer = await create_webgpu_renderer({ canvas, width: 800, height: 450 });\nconst pixels = await renderer.clear({ red: 0, green: 0, blue: 0, alpha: 1 });\nrenderer.dispose();",
    proof:
      "Real Chromium tests assert secure context, GPU availability, adapter/device creation, deterministic readback, and two-game isolation.",
    limitations: "Custom shaders, render targets, and advanced GPU resource APIs are deferred.",
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
