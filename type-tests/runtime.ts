import {
  close,
  create_camera,
  create_game,
  create_geometry_owner,
  create_path,
  create_polygon,
  flatten_path,
  line_to,
  move_to,
  rgba,
  degrees,
  rgb,
  hex,
  triangulate_polygon,
  type GeometryHandle,
  type RenderCommand,
  type RenderFrame,
  type Path,
  type Polygon,
  type WebGpuRenderer,
  type WebGpuFont,
  type ResourceHandle,
  type FixedStepOptions,
} from "../src/lib/index.js";

const renderer = {
  canvas: {} as HTMLCanvasElement,
  width: 1,
  height: 1,
};
const fixed_step: FixedStepOptions = { step_seconds: 1 / 60, max_steps_per_frame: 5 };
// @ts-expect-error Fixed-step durations must be numeric.
const invalid_fixed_step: FixedStepOptions = { step_seconds: "1/60" };
void fixed_step;
void invalid_fixed_step;

const path: Path = create_path([move_to(0, 0), line_to(1, 1), close()]);
const polygon: Polygon = create_polygon([
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
]);
const color = rgba(1, 0, 0, 1);
const sprite_color = rgb(0, 1, 0);
const camera = create_camera({ viewport: { logical_width: 1, logical_height: 1 } });
const command: RenderCommand = {
  kind: "rectangle",
  draw: { rectangle: { x: 0, y: 0, width: 1, height: 1 }, color: hex("#fff") },
};
const public_polygon = triangulate_polygon(polygon.get_points());
const public_path = flatten_path(path.get_commands(), 0.25);
const owner = create_geometry_owner();
const geometry: GeometryHandle = owner.create({ vertices: [{ x: 0, y: 0 }], indices: [0, 0, 0] });

void path;
void polygon;
void color;
void sprite_color;
void camera;
void command;
void public_polygon;
void public_path;
void degrees(90);
void geometry;

const accepts_renderer = (renderer: WebGpuRenderer): void => {
  void renderer.create_texture_from_blob(new Blob());
  // @ts-expect-error Dynamic texture loading accepts only Blob/File values.
  void renderer.create_texture_from_blob("not-an-image");
};

void accepts_renderer;

// @ts-expect-error -- Resource handles are opaque and cannot be forged from ordinary objects.
const forged_texture_handle: ResourceHandle<WebGpuTexture> = {};
void forged_texture_handle;

// @ts-expect-error -- path handles are opaque and not indexable.
path[0] = move_to(2, 2);
// @ts-expect-error -- polygon handles are opaque and not indexable.
polygon[0] = { x: 2, y: 2 };

const game = create_game({
  scheduler: {
    request_frame: () => 0,
    cancel_frame: () => undefined,
    now_seconds: () => 0,
  },
  renderer,
  fixed_step,
  setup: ({ geometry: game_geometry }) => {
    const handle = game_geometry.create({ vertices: [{ x: 0, y: 0 }], indices: [0, 0, 0] });
    handle.read(game_geometry);
  },
  update: () => undefined,
  draw: (frame: RenderFrame) => {
    frame.draw_commands([command]);
  },
});

void game;
const font_handle: Promise<ResourceHandle<WebGpuFont>> = game.assets.load_font("url(/fonts/example.woff2)", {
  characters: "0123456789",
  size: 24,
});
void font_handle;
game.resize({
  logical_width: 1,
  logical_height: 1,
  css_width: 1,
  css_height: 1,
  physical_width: 1,
  physical_height: 1,
  content_width: 1,
  content_height: 1,
  offset_x: 0,
  offset_y: 0,
});
const viewport_width: number = game.get_viewport().logical_width;
void viewport_width;
