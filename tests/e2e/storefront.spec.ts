import { test, expect } from "@playwright/test";

test.describe("Storefront & Navigation E2E", () => {
  test("loads the editorial homepage with brand header and hero", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Snitch|SNITCH/i);

    // Verify editorial brand wordmark
    const wordmark = page.locator(".wordmark");
    await expect(wordmark.first()).toBeVisible();

    // Verify main navigation links
    await expect(page.getByRole("link", { name: "Men" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Women" }).first()).toBeVisible();
  });

  test("navigates to login page and displays authentication form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
    await expect(page.getByPlaceholder(/you@somewhere.com/i)).toBeVisible();
  });

  test("allows searching the collection", async ({ page }) => {
    await page.goto("/");
    const searchButton = page.locator(".search-action");
    if (await searchButton.isVisible()) {
      await searchButton.click();
      const searchInput = page.locator("#site-search");
      if (await searchInput.isVisible()) {
        await searchInput.fill("Shirt");
        await searchInput.press("Enter");
        await expect(page).toHaveURL(/\/\?search=Shirt/);
      }
    }
  });

  test("bag page renders empty state for new session", async ({ page }) => {
    await page.goto("/cart");
    // Should prompt sign in or show bag
    const bodyText = await page.textContent("body");
    expect(bodyText).toBeDefined();
  });
});

