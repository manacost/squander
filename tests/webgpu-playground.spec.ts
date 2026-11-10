import { expect, test } from "@playwright/test";

test("[feature-documentation] composes runtime capabilities through GameHost", async ({ page }) => {
  const console_messages: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "warning" || message.type() === "error") console_messages.push(message.text());
  });
  await page.goto("/docs/examples/playground");
  await page.waitForTimeout(500);
  if ((await page.getByTestId("playground-status").textContent()) === "error") {
    throw new Error((await page.getByTestId("playground-error").textContent()) ?? "unknown playground initialization error");
  }
  await expect(page.getByTestId("playground-status")).toHaveText("ready");
  await expect(page.getByTestId("playground-generation")).toHaveText("1");
  await page.waitForTimeout(100);
  const canvas_probe = await page.evaluate(async () => {
    const canvas = document.querySelector("canvas");
    if (canvas === null) return { non_black: 0 };
    const blob = await (await fetch(canvas.toDataURL())).blob();
    const bitmap = await createImageBitmap(blob);
    const probe = document.createElement("canvas");
    probe.width = bitmap.width;
    probe.height = bitmap.height;
    const context = probe.getContext("2d");
    if (context === null) return { non_black: 0 };
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let non_black = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] !== 0 || pixels[index + 1] !== 0 || pixels[index + 2] !== 0) non_black += 1;
    }
    return { non_black };
  });
  expect(console_messages.filter((message) => /WebGPU|Invalid CommandBuffer|bytesPerRow/.test(message))).toEqual([]);
  expect(canvas_probe.non_black).toBeGreaterThan(0);
  const canvas_box = await page.locator("canvas").boundingBox();
  expect(canvas_box).not.toBeNull();
  if (canvas_box === null) throw new Error("canvas bounding box unavailable");
  const static_composition = await page.screenshot({
    clip: { x: canvas_box.x, y: canvas_box.y, width: canvas_box.width, height: canvas_box.height * 0.88 },
    animations: "disabled",
  });
  expect(static_composition).toMatchSnapshot("playground.png");
  await expect.poll(async () => Number(await page.getByTestId("playground-ticks").textContent())).toBeGreaterThan(0);
  await page.getByTestId("playground-pause").click();
  await expect(page.getByTestId("playground-status")).toHaveText("paused");
  const paused_ticks = Number(await page.getByTestId("playground-ticks").textContent());
  await page.waitForTimeout(150);
  await expect(page.getByTestId("playground-ticks")).toHaveText(String(paused_ticks));
  await page.getByTestId("playground-resume").click();
  await expect(page.getByTestId("playground-status")).toHaveText("ready");
  await expect.poll(async () => Number(await page.getByTestId("playground-ticks").textContent())).toBeGreaterThan(paused_ticks);
  await page.getByTestId("playground-fail-asset").click();
  await expect(page.getByTestId("playground-status")).toHaveText("asset-error");
  await expect(page.getByTestId("playground-asset-error")).toHaveText("ImageDecodeError");
});
