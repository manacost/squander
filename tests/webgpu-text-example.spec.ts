import { expect, test } from "@playwright/test";

test("[text-drawing] documents and renders the bundled font example", async ({ page }) => {
  await page.goto("/docs/examples/text");
  await expect(page.getByRole("heading", { level: 1, name: "Text drawing" })).toBeVisible();
  await expect(page.getByTestId("text-example-status")).toHaveText("status: ready");
  await expect
    .poll(async () => Number((await page.getByTestId("text-example-ticks").textContent())?.replace("ticks: ", "")))
    .toBeGreaterThan(0);
  await expect(page.getByText("This example loads a bundled font", { exact: false })).toBeVisible();
  await expect(page.getByText("const font_handle = await assets.load_font(", { exact: false })).toBeVisible();

  const non_black = await page.locator("canvas").evaluate(async (element) => {
    const canvas = element as HTMLCanvasElement;
    const blob = await (await fetch(canvas.toDataURL())).blob();
    const bitmap = await createImageBitmap(blob);
    const probe = document.createElement("canvas");
    probe.width = bitmap.width;
    probe.height = bitmap.height;
    const context = probe.getContext("2d");
    if (context === null) return 0;
    context.drawImage(bitmap, 0, 0);
    const pixels = context.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let count = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      if (pixels[index] !== 0 || pixels[index + 1] !== 0 || pixels[index + 2] !== 0) count += 1;
    }
    return count;
  });
  expect(non_black).toBeGreaterThan(100);
});
