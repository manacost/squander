import { expect, test } from "@playwright/test";

test.describe("UI styles", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/ui-styles");
  });

  test("applies the dark semantic theme and accessible control states", async ({ page }) => {
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(5, 7, 13)");
    await expect(page.locator("body")).toHaveCSS("color", "rgb(238, 242, 251)");
    await expect(page.locator(".preview-shell h1")).toHaveCSS("font-size", "24px");
    await expect(page.locator(".preview-shell h2").first()).toHaveCSS("font-size", "22px");
    await expect(page.locator(".preview-shell h1")).toHaveCSS("font-weight", "500");
    await expect(page.getByTestId("primary-action")).toHaveCSS("background-color", "rgb(116, 28, 59)");
    await expect(page.getByTestId("primary-action")).toHaveCSS("border-top-width", "0px");
    await expect(page.getByTestId("primary-action")).toHaveCSS("border-bottom-width", "3px");
    await expect(page.getByTestId("style-dialog")).toHaveCSS("background-color", "rgb(21, 25, 35)");
    await expect(page.getByTestId("status-output")).toHaveCSS("border-top-width", "0px");
    await expect(page.locator("fieldset")).toHaveCSS("border-top-width", "0px");
    await expect(page.locator("fieldset > p").first()).toHaveCSS("gap", "4px");
    await expect(page.locator("button[disabled]")).toHaveCSS("opacity", "0.5");

    await page.keyboard.press("Tab");
    await expect(page.getByTestId("primary-action")).toBeFocused();
    await expect(page.getByTestId("primary-action")).toHaveCSS("outline-color", "rgb(215, 121, 128)");
  });

  test("keeps the preview usable at narrow widths", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId("preview-grid")).toHaveCSS("grid-template-columns", "374px");
    await expect(page.getByTestId("primary-action")).toBeVisible();
    await expect(page.getByLabel("Call sign")).toBeVisible();
  });

  test("matches the desktop visual contract", async ({ page }) => {
    await expect(page).toHaveScreenshot("ui-styles-desktop.png", { fullPage: true });
  });

  test("matches the mobile visual contract", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page).toHaveScreenshot("ui-styles-mobile.png", { fullPage: true });
  });
});
