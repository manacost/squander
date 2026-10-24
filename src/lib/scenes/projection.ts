import { Scenes } from "#lib/core/scene.js";
import { Container, Assets, Sprite, Texture, Graphics, Text } from "pixi.js";
import { app } from "../core/app.js";
import { asset } from "$app/paths";

type TileData = {
  x: number;
  y: number;
  tile: Graphics | Sprite;
};

export default Scenes.create(async () => {
  const tile_size_x = 128;
  const tile_size_y = tile_size_x / 2;
  let texture = await Assets.load<Texture>("https://pixijs.com/assets/bunny.png");
  let house = await Assets.load<Texture>(asset("isohouse.png"));
  let tiles: TileData[] = [];

  const GRID_ROWS = 5;
  const GRID_COLS = 5;

  let factor = {
    x: 1,
    y: 1,
  };

  function createTile(color: number) {
    const tile = new Graphics();
    tile.rect(0, 0, tile_size_x, tile_size_x);
    // tile.moveTo(0, TILE_SIZE / 2); // Top
    // tile.lineTo(TILE_SIZE / 2, TILE_SIZE); // Right
    // tile.lineTo(0, (TILE_SIZE / 2) * 2); // Bottom
    // tile.lineTo(-TILE_SIZE / 2, TILE_SIZE); // Left
    // tile.lineTo(0, TILE_SIZE / 2); // Close
    tile.fill(color);
    tile.stroke(0x000000);
    tile.pivot.x = tile_size_x / 2;
    tile.pivot.y = tile_size_x / 2;

    const sprite = new Sprite(house);
    // sprite.addChild(tile);
    // tile.angle = 45;
    return sprite;
  }

  function createIsometricGrid(rows: number, cols: number): Container {
    const container = new Container();

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const tile = createTile(0x5cafe2);

        console.log(row, col, col - row, col + row);
        const isoX = ((col - row) * tile_size_x) / 4;
        const isoY = ((col + row) * tile_size_y) / 4;

        tile.x = isoX;
        tile.y = isoY;

        tiles.push({ x: row, y: col, tile });
        container.addChild(tile);
      }
    }

    return container;
  }

  return {
    name: "projection",
    init: async () => {},
    enter: async () => {
      app.renderer.background.color = 0x00a610;
      const bg = new Graphics();
      bg.rect(0, 0, app.screen.width, app.screen.height);
      bg.fill(`rgba(0, 0, 0, 0.5)`);
      app.stage.addChild(bg);

      // Create and center the isometric grid
      const isoGrid = createIsometricGrid(GRID_ROWS, GRID_COLS);
      isoGrid.x = app.screen.width / 2;
      isoGrid.y = app.screen.height / 4;

      app.stage.addChild(isoGrid);
      app.stage.on("pointermove", (e) => {
        factor.x = (e.global.x / app.screen.width / 2) * 2;
        factor.y = (e.global.y / app.screen.height / 2) * 2;
        console.log(factor);
        bg.clear();
        bg.rect(0, 0, app.screen.width, app.screen.height);
        bg.fill(`hsl(${factor.x * 240}, 100%, 50%)`);
      });

      app.stage.interactive = true;
      app.stage.eventMode = "static";
    },
    update: (t) => {
      tiles.forEach((tile) => {
        const isoX = ((tile.y - tile.x) * tile_size_x) / (4 * factor.x);
        const isoY = ((tile.y + tile.x) * tile_size_y) / (4 * factor.y);
        tile.tile.x = isoX;
        tile.tile.y = isoY;
      });
    },
  };
});
