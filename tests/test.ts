import { expect, test } from "@playwright/test";

test("home page presents the project and primary navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1, name: "squander" })).toBeVisible();
  await expect(page.getByRole("link", { name: "getting-started" })).toBeVisible();
  await expect(page.getByRole("link", { name: "pixi-demo" })).toBeVisible();
  await expect(page.getByRole("link", { name: "github" })).toHaveAttribute("href", "https://github.com/ancient-cat/squander");
});

test("documentation navigation loads the getting-started guide", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "getting-started" }).click();

  await expect(page).toHaveURL(/\/docs\/getting-started$/);
  await expect(page.getByRole("heading", { level: 1, name: "Getting Started" })).toBeVisible();
  await expect(page.getByText("npm i squander@latest svelte pixi.js")).toBeVisible();
});

for (const scene of ["pixi-demo", "camera", "ui-bridge"]) {
  test(`${scene} initializes its rendering surface`, async ({ page }) => {
    const page_errors: string[] = [];
    page.on("pageerror", (error) => page_errors.push(error.message));
    await page.goto(`/scenes/${scene}`);
    const canvas = page.locator("canvas");
    await expect(canvas).toBeVisible();
    await expect.poll(() => canvas.evaluate((element) => element.width > 0 && element.height > 0)).toBe(true);

    if (scene === "ui-bridge") {
      await expect(page.getByRole("heading", { name: "Hello from Scene" })).toBeVisible();
      await page.getByRole("button", { name: "+", exact: true }).click();
      await expect(page.getByRole("button", { name: "11", exact: true })).toBeVisible();
    }

    await page.getByRole("link", { name: "Back to root" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "squander" })).toBeVisible();
    expect(page_errors).toEqual([]);
  });
}
