export type CoreGuide = Readonly<{
  slug: string;
  label: string;
  title: string;
  summary: string;
  evidence_kind: "example" | "test";
  evidence_label: string;
  evidence_href?: string;
  test_file?: string;
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
    summary: "Load manifest resources and owned fonts or textures through the game asset cache.",
    evidence_kind: "test",
    evidence_label: "Read the asset cache tests",
    test_file: "src/lib/core/runtime/asset_loading.test.ts",
    explanation:
      "The game owns its asset cache. Setup can await assets before the frame loop starts. Cancellation and disposal prevent late resources from becoming usable.",
    types: ["AssetCache<Manifest>", "ResourceHandle<T>", "GameSetupContext<Manifest>", "GameInitializationError"],
    sample:
      'const texture = await assets.load_texture(blob, { magnification: "nearest" });\nconst pixels = texture.read();\ntexture.release();',
    proof: "CPU tests cover cancellation, retry, and ownership. Real Blob and File fixtures verify texture readback.",
    limitations: "Typed manifest texture descriptors and atlas manifests are deferred; generic manifest loading remains available.",
  },
  {
    slug: "dynamic-assets",
    label: "dynamic assets",
    title: "Dynamic assets",
    summary: "Decode Blob and File values and upload them to WebGPU without a canvas-only shortcut.",
    evidence_kind: "test",
    evidence_label: "Read the image loading tests",
    test_file: "src/lib/core/runtime/image_loading.test.ts",
    explanation:
      "Dynamic image inputs pass through browser decoding and the game-owned renderer. Blob and File values use the same typed loading path, which supports abort and retry.",
    types: ["Blob", "File", "AbortSignal", "ResourceHandle<WebGpuTexture>", "ImageDecodeError"],
    sample:
      'const file = new File([png_bytes], "hero.png", { type: "image/png" });\nconst handle = await game.assets.load_texture(file, { signal });\nrenderer.draw_texture(handle.read());',
    proof: "Real Chromium tests load both Blob and File sources and read back deterministic pixels.",
    limitations: "Identical Blob/File inputs are not deduplicated in Phase 2.",
  },
  {
    slug: "sprite-drawing",
    label: "sprites",
    title: "Sprite drawing",
    summary: "Draw textures and atlas regions with predictable transforms, tint, opacity, and order.",
    evidence_kind: "test",
    evidence_label: "Read the renderer texture tests",
    test_file: "tests/webgpu-renderer.spec.ts",
    explanation:
      "Sprites use logical screen or camera-space coordinates. Each draw specifies its region, origin, flips, rotation, scale, tint, opacity, and source-over order.",
    types: ["WebGpuTexture", "TextureDrawOptions", "TextureRegion", "TextureFilteringOptions", "Color"],
    sample:
      "renderer.draw_texture(texture, {\n  x: 120, y: 80, width: 64, height: 64,\n  origin: { x: 0.5, y: 0.5 }, rotation: degrees(15), flip_x: true,\n  tint: rgba(1, 0.8, 0.8, 1), opacity: 0.9,\n});",
    proof: "Real readback verifies atlas regions, tint, opacity, origins, rotation, flips, and sprite submission order.",
    limitations: "Selectable blend modes and implicit batching policy are outside Phase 2; order remains observable.",
  },
  {
    slug: "shape-drawing",
    label: "shapes",
    title: "Shape drawing",
    summary: "Draw rectangles, circles, lines, and outlines without creating per-call resources.",
    evidence_kind: "test",
    evidence_label: "Read the shape validation tests",
    test_file: "src/lib/core/runtime/shapes.test.ts",
    explanation:
      "Shapes are frame-local value commands. The renderer normalizes signed rectangle dimensions. Invalid geometry throws, and valid zero-area shapes draw nothing.",
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
    summary: "Prepare reusable polygon fills and curved stroke geometry with explicit update and release semantics.",
    evidence_kind: "test",
    evidence_label: "Read the geometry preparation tests",
    test_file: "src/lib/core/runtime/paths.test.ts",
    explanation:
      "Path and polygon handles snapshot caller data. Updates validate before replacing geometry. Handles remain scoped to the game that created them.",
    types: ["PathHandle", "PolygonHandle", "FlattenedSubpath", "TriangulatedPolygon", "GeometryHandle"],
    sample:
      "const route = create_path([move_to(0, 0), quadratic_to(40, -30, 80, 0)]);\nconst marker = create_polygon([{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 20, y: 30 }]);\nroute.update([move_to(0, 0), line_to(100, 20)]);",
    proof:
      "CPU snapshots and tessellation tests cover geometry preparation. Real GPU fixtures verify curves, concave fills, outlines, updates, cache replacement, and ownership.",
    limitations: "Holes, fill rules, and filled curved paths are Phase 3 candidates.",
  },
  {
    slug: "camera-2d",
    label: "camera 2D",
    title: "2D cameras",
    summary: "Apply synchronous position, zoom, and rotation scopes to world-space drawing.",
    evidence_kind: "test",
    evidence_label: "Read the camera transform tests",
    test_file: "src/lib/core/runtime/camera.test.ts",
    explanation:
      "A camera scope temporarily maps world coordinates into the logical viewport. The scope restores synchronously, even when the callback throws. Unscoped drawing remains in screen space.",
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
    summary: "Map logical coordinates into responsive or fixed-fit CSS and physical pixel viewports.",
    evidence_kind: "test",
    evidence_label: "Read the viewport sizing tests",
    test_file: "src/lib/core/runtime/viewport_sizing.test.ts",
    explanation:
      "Viewport policy keeps logical coordinates stable. It separates CSS size, letterboxing, device pixel ratio, and physical surface dimensions.",
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
    summary: "Choose nearest or linear magnification and minification behavior per texture.",
    evidence_kind: "test",
    evidence_label: "Read the filtering policy tests",
    test_file: "src/lib/core/runtime/texture_filtering.test.ts",
    explanation:
      "The renderer selects filtering when it creates a texture or font glyph texture. It reuses samplers internally and does not generate mipmaps in Phase 2.",
    types: ["TextureFilteringOptions", 'TextureFilter = "nearest" | "linear"', "WebGpuTexture"],
    sample: 'const handle = await assets.load_texture(blob, {\n  magnification: "nearest",\n  minification: "linear",\n});',
    proof: "Real GPU fixtures distinguish nearest and linear sampling. They also verify minification policy without mipmaps.",
    limitations: "Mipmapped and anisotropic filtering are deferred.",
  },
  {
    slug: "game-lifecycle",
    label: "game lifecycle",
    title: "Game lifecycle",
    summary: "Create, await, pause, resume, suspend, and dispose an isolated game instance.",
    evidence_kind: "test",
    evidence_label: "Read the game lifecycle tests",
    test_file: "src/lib/core/runtime/game.test.ts",
    explanation:
      "Renderer creation and setup gate the frame loop. Disposal is idempotent. It aborts setup, cleans late resources, and never revives a disposed game.",
    types: ["Game", "GameOptions", "GameSetupContext", "GameInitializationError", "GameDisposedError"],
    sample:
      "const game = create_game({ renderer, scheduler, setup, update, draw });\nawait game.ready;\ngame.pause();\ngame.resume();\nawait game.dispose();",
    proof:
      "Lifecycle unit tests cover setup races, callback errors, visibility, disposal, and renderer cleanup. Browser demos expose the controls.",
    limitations: "Scene automation and input/storage lifecycle are outside Phase 2.",
  },
  {
    slug: "game-timing",
    label: "game timing",
    title: "Game timing",
    summary: "Run deterministic update/draw loops with bounded deltas and observable pause behavior.",
    evidence_kind: "test",
    evidence_label: "Read the frame loop tests",
    test_file: "src/lib/core/runtime/frame_loop.test.ts",
    explanation:
      "The scheduler supplies monotonic time to update callbacks. The frame loop resets timing after suspension. It does not advance simulation while paused.",
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
    summary: "Initialize a secure-context WebGPU renderer and read deterministic pixels back for verification.",
    evidence_kind: "test",
    evidence_label: "Read the real WebGPU browser tests",
    test_file: "tests/webgpu-renderer.spec.ts",
    explanation:
      "The production renderer owns the adapter, device, canvas context, pipelines, textures, samplers, and readback path. It reports device loss as a typed game error.",
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
    summary: "Use opaque handles and leases so resources survive accepted draws and release exactly once.",
    evidence_kind: "test",
    evidence_label: "Read the resource ownership tests",
    test_file: "src/lib/core/runtime/resource_ownership.test.ts",
    explanation:
      "Releasing a handle invalidates only that handle for future reads. Accepted draws retain a lease until safe completion. Owner disposal cleans the remaining acquisitions.",
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
    summary: "Expose readonly snapshots and typed commands to Svelte without making core depend on Svelte.",
    evidence_kind: "example",
    evidence_label: "Open the Svelte adapter example",
    evidence_href: "/docs/examples/svelte",
    test_file: "tests/webgpu-svelte-adapter.spec.ts",
    explanation:
      "The adapter owns a game instance and publishes readonly views. It wires synchronous and asynchronous commands, then disposes subscriptions and the game on unmount.",
    types: ["GameBridge<State, Commands>", "GameAdapterView<State, Commands>", "GameHost", "create_game_adapter"],
    sample:
      "const bridge = create_game_adapter({\n  initial_state: { score: 0 },\n  commands: { increment: (amount: number) => score += amount },\n  create: ({ publish, canvas }) => create_game({ canvas, publish }),\n});",
    proof:
      "Adapter unit, SSR, package-consumer, and browser tests cover typed commands, snapshots, unmount, SSR, and advanced multi-host isolation.",
    limitations: "Core remains Svelte-independent; scene overlays and richer reactive helpers are deferred.",
  },
] as const satisfies readonly CoreGuide[];

export const core_guide_by_slug = new Map(core_guides.map((guide) => [guide.slug, guide]));
