const { test, expect } = require('@playwright/test');

test('서버가 기동되어 있다', async ({ page }) => {
  const res = await page.goto('/health');
  expect(res.status()).toBe(200);
});
