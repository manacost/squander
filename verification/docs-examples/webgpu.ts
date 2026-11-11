import { create_webgpu_renderer } from "squander/core/runtime";

declare const canvas: HTMLCanvasElement;
const renderer = await create_webgpu_renderer({ canvas, width: 800, height: 450 });
const pixels = await renderer.clear({ red: 0.04, green: 0.05, blue: 0.1, alpha: 1 });
void pixels;
renderer.dispose();
