import { expect, test } from "@playwright/test";

test("input routing demo proves scene priority and native browser behavior", async ({ page }) => {
  await page.goto("/docs/examples/input");
  await expect(page.getByRole("heading", { level: 1, name: "Input routing" })).toBeVisible();
  await expect(page.locator('a.nested[href="/docs/examples/input"]')).toHaveAttribute("href", "/docs/examples/input");
  await expect(page.getByTestId("input-gamepad-status")).toContainText("gamepad");

  const button = page.getByTestId("input-demo-button");
  await button.click();
  await expect(page.getByTestId("input-demo-log")).toContainText("native button click");

  await button.focus();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("input-demo-log")).toContainText("scene consumed Escape");

  const editable = page.getByTestId("input-demo-editable");
  await editable.fill("native text");
  await expect(editable).toHaveValue("native text");
  await expect(page.getByTestId("input-demo-log")).not.toContainText("keyboard down: n");
});
