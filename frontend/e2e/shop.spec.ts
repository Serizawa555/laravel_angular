import { test, expect } from '@playwright/test';

/**
 * Happy path (PROMPT §11): browse → category → PDP → add to cart → checkout → order JSON.
 * Run with: npx playwright install && npx playwright test   (backend must be up on :8000).
 */
test('guest can browse, add to cart and check out', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('link', { name: 'PhoneShop' })).toBeVisible();

  // Category listing
  await page.getByRole('link', { name: 'Phones' }).click();
  await expect(page).toHaveURL(/\/en\/phones/);

  // Open the first product
  await page.locator('app-product-card a').first().click();
  await expect(page).toHaveURL(/\/en\/p\//);

  // Add to cart
  await page.getByRole('button', { name: /Add to cart/i }).click();

  // Cart shows an item, go to checkout
  await page.getByRole('link', { name: /Cart/ }).click();
  await expect(page).toHaveURL(/\/en\/cart/);
  await page.getByRole('link', { name: /→/ }).click();
  await expect(page).toHaveURL(/\/en\/checkout/);

  // Fill the mock checkout form
  await page.getByPlaceholder('Name').fill('E2E Tester');
  await page.getByPlaceholder('Email').fill('e2e@example.md');
  await page.getByPlaceholder(/Card number/).fill('4242 4242 4242 4242');
  await page.getByRole('button', { name: 'Pay' }).click();

  // Confirmation page with order number + JSON
  await expect(page).toHaveURL(/\/en\/order\/ORD-/);
  await expect(page.getByText(/Thank you/)).toBeVisible();
  await expect(page.getByText('"order_number"')).toBeVisible();
});
