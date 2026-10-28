import { GameTime } from "../core/gametime.js";
import { app, signal_as_ready } from "../core/app.js";

export const initialize = async (target: HTMLElement, background: string = "#1099bb"): Promise<void> => {
  await app.init({ background, resizeTo: window });
  target.appendChild(app.canvas);
  signal_as_ready();
  app.ticker.add((time) => {
    GameTime.update(time.deltaMS);
  });
};
