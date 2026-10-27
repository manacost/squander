import {
  close,
  create_game,
  create_geometry_owner,
  create_path,
  create_polygon,
  line_to,
  move_to,
  rgba,
  type GeometryHandle,
  type Path,
  type Polygon,
} from "../src/lib/index.js";

const path: Path = create_path([move_to(0, 0), line_to(1, 1), close()]);
const polygon: Polygon = create_polygon([
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
]);
const color = rgba(1, 0, 0, 1);
const owner = create_geometry_owner();
const geometry: GeometryHandle = owner.create({ vertices: [{ x: 0, y: 0 }], indices: [0, 0, 0] });

void path;
void polygon;
void color;
void geometry;

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
  setup: ({ geometry: game_geometry }) => {
    const handle = game_geometry.create({ vertices: [{ x: 0, y: 0 }], indices: [0, 0, 0] });
    handle.read(game_geometry);
  },
  update: () => undefined,
  draw: () => undefined,
});

void game;
