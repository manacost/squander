import { expect, test } from "@playwright/test";

test("[input-routing] demo proves scene priority and native browser behavior", async ({ page }) => {
  await page.goto("/docs/examples/input");
  await expect(page.getByRole("heading", { level: 1, name: "Input routing" })).toBeVisible();
  await expect(page.locator('a.nested[href="/docs/examples/input"]')).toHaveAttribute("href", "/docs/examples/input");
  await expect(page.getByTestId("input-gamepad-status")).toContainText("gamepad");

  const button = page.getByTestId("input-demo-button");
  await button.focus();
  await page.keyboard.down("Enter");
  await expect(page.getByTestId("input-action-status")).toContainText("Confirm pressed");
  await page.keyboard.up("Enter");
  await expect(page.getByTestId("input-action-status")).toContainText("Confirm released");

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

test("[input-coordinates] maps fixed-fit pointer input and preserves letterbox coordinates", async ({ page }) => {
  await page.goto("/input-coordinates");
  const host = page.getByTestId("logical-input-host");
  await expect(host).toBeVisible();
  await page.evaluate(() => {
    const input_host = document.querySelector<HTMLElement>('[data-testid="logical-input-host"]');
    if (input_host === null) throw new Error("logical input host is missing");
    const bounds = input_host.getBoundingClientRect();
    input_host.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, clientX: bounds.left + 20, clientY: bounds.top + 100, pointerId: 1 }),
    );
    input_host.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, clientX: bounds.left + 20, clientY: bounds.top + 20, pointerId: 1 }),
    );
  });

  const events_output = page.getByTestId("logical-input-events");
  await expect(events_output).not.toHaveText("[]");
  const serialized_events = (await events_output.textContent()) ?? "";
  expect(serialized_events).toContain('"x":20,"y":100');
  expect(serialized_events).toContain('"logical_x":40,"logical_y":25');
  expect(serialized_events).toContain('"inside_logical_content":true');
  expect(serialized_events).toContain('"x":20,"y":20');
  expect(serialized_events).toContain('"logical_x":40,"logical_y":-135');
  expect(serialized_events).toContain('"inside_logical_content":false');
});
