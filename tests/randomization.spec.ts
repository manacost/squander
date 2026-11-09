import { expect, test } from "@playwright/test";

test("random guide reproduces seeded examples", async ({ page }) => {
  await page.goto("/docs/utilities/random");

  await expect(page.getByRole("heading", { name: "Random", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "random" })).toHaveAttribute("href", "/docs/utilities/random");

  const seed = page.getByRole("textbox", { name: "Seed" });
  const sequence = page.getByTestId("random-dice");
  const loot_options = page.getByTestId("random-loot-options").locator("li");
  await seed.fill("browser-replay");
  await page.getByRole("button", { name: "Run examples" }).click();
  const first_sequence = await sequence.textContent();
  const first_picked = page.getByTestId("random-loot-options").locator('[data-picked="true"]');
  await expect(loot_options).toHaveCount(5);
  await expect(first_picked).toHaveCount(1);
  await expect(first_picked.locator(".choice-marker")).toHaveCount(0);
  const first_picked_text = await first_picked.textContent();

  await page.getByRole("button", { name: "Run examples" }).click();
  await expect(sequence).toHaveText(first_sequence ?? "");
  await expect(page.getByTestId("random-loot-options").locator('[data-picked="true"]')).toHaveText(first_picked_text ?? "");
});
