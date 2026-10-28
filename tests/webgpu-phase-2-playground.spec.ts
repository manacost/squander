import { expect, test } from "@playwright/test";

test("[phase-2-playground] composes runtime capabilities through GameHost", async ({ page }) => {
  await page.goto("/docs/phase-2/playground");
  await page.waitForTimeout(500);
  if ((await page.getByTestId("playground-status").textContent()) === "error") {
    throw new Error((await page.getByTestId("playground-error").textContent()) ?? "unknown playground initialization error");
  }
  await expect(page.getByTestId("playground-status")).toHaveText("ready");
  await expect(page.getByTestId("playground-generation")).toHaveText("1");
  await page.getByTestId("playground-pause").click();
  await expect(page.getByTestId("playground-status")).toHaveText("paused");
  await page.getByTestId("playground-resume").click();
  await expect(page.getByTestId("playground-status")).toHaveText("ready");
  await page.getByTestId("playground-fail-asset").click();
  await expect(page.getByTestId("playground-status")).toHaveText("asset-error");
  await expect(page.getByTestId("playground-asset-error")).toHaveText("ImageDecodeError");
});
