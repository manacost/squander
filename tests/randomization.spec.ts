import { expect, test } from "@playwright/test";

test("random guide reproduces seeded examples", async ({ page }) => {
  await page.goto("/docs/utilities/random");

  await expect(page.getByRole("heading", { name: "Random", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "random" })).toHaveAttribute("href", "/docs/utilities/random");

  const seed = page.getByRole("textbox", { name: "Seed" });
  const sequence = page.getByTestId("random-dice");
  await seed.fill("browser-replay");
  await page.getByRole("button", { name: "Run examples" }).click();
  const first_sequence = await sequence.textContent();

  await page.getByRole("button", { name: "Run examples" }).click();
  await expect(sequence).toHaveText(first_sequence ?? "");
});
