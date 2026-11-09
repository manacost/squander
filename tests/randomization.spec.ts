import { expect, test } from "@playwright/test";

test("randomization guide reproduces a seeded sequence", async ({ page }) => {
  await page.goto("/docs/core/randomization");

  await expect(page.getByRole("heading", { name: "Randomization and seeds", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "randomization" })).toHaveAttribute("href", "/docs/core/randomization");

  const seed = page.getByLabel("Seed");
  const sequence = page.getByTestId("random-sequence");
  await seed.fill("browser-replay");
  await page.getByRole("button", { name: "Generate sequence" }).click();
  const first_sequence = await sequence.textContent();

  await page.getByRole("button", { name: "Generate sequence" }).click();
  await expect(sequence).toHaveText(first_sequence ?? "");
});
