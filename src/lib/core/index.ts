import { Application, Sprite, Assets, Container } from "pixi.js";
import { GameTime } from "./gametime.js";
import { Scenes } from "./scene.js";
import { app, signal_as_ready } from "./app.js";

export { app };
export {
  close,
  create_geometry_owner,
  create_path,
  create_polygon,
  flatten_path,
  line_to,
  move_to,
  quadratic_to,
  cubic_to,
  rgba,
} from "./runtime/index.js";
export type {
  FlattenedSubpath,
  GeometryHandle,
  GeometryOwner,
  Path,
  PathCommand,
  PathInput,
  Polygon,
  PolygonInput,
  PolygonPoint,
  PreparedGeometry,
  Color,
} from "./runtime/index.js";
export { create_game, GameDeviceLostError, GameDisposedError, GameInitializationError, GameRuntimeError } from "./runtime/index.js";
export type { Game as RuntimeGame, GameOptions, GameSetupContext } from "./runtime/index.js";

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
