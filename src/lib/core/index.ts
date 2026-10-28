import { Application, Sprite, Assets, Container } from "pixi.js";
import { GameTime } from "./gametime.js";
import { Scenes } from "./scene.js";
import { app, signal_as_ready } from "./app.js";

export { app };
export {
  close,
  degrees,
  create_geometry_owner,
  create_camera,
  create_path,
  create_polygon,
  create_stroke_geometry,
  flatten_path,
  hex,
  hsl,
  hsla,
  line_to,
  move_to,
  quadratic_to,
  cubic_to,
  rgb,
  rgba,
  triangulate_polygon,
} from "./runtime/index.js";
export type {
  Bounds,
  Camera,
  CameraOptions,
  CameraViewport,
  Circle,
  CircleDraw,
  CircleOutlineDraw,
  FlattenedSubpath,
  GeometryHandle,
  GeometryOwner,
  Line,
  LineDraw,
  Path,
  PathCommand,
  PathInput,
  Polygon,
  PolygonInput,
  PolygonPoint,
  PolygonDraw,
  PolygonOutlineDraw,
  PreparedGeometry,
  Color,
  Rectangle,
  RectangleDraw,
  RectangleOutlineDraw,
  RenderCommand,
  StrokeDraw,
  StrokeGeometry,
  TextureFiltering,
  TextureFilteringOptions,
  TriangleDraw,
  TriangulatedPolygon,
  OwnedGeometryDraw,
} from "./runtime/index.js";
export { create_game, GameDeviceLostError, GameDisposedError, GameInitializationError, GameRuntimeError } from "./runtime/index.js";
export type { Game as RuntimeGame, GameOptions, GameSetupContext } from "./runtime/index.js";
export { create_webgpu_renderer, WebGpuUnavailableError } from "./runtime/index.js";
export type { WebGpuRenderer, WebGpuRendererOptions, WebGpuTexture, TextureDrawOptions, TextureDraw } from "./runtime/index.js";

// The application will create a renderer using WebGL, if possible,
// with a fallback to a canvas render. It will also setup the ticker
// and the root stage PIXI.Container

export const initialize = async (target: HTMLElement, background: string = "#1099bb") => {
  // Wait for the Renderer to be available
  await app.init({ background, resizeTo: window });

  // The application will create a canvas element for you that you
  // can then insert into the DOM
  target.appendChild(app.canvas);

  signal_as_ready();

  // Listen for frame updates
  app.ticker.add((time) => {
    GameTime.update(time.deltaMS);
    // Scenes.update(time.deltaMS);
  });
};
