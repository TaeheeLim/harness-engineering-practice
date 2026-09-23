const { test, expect } = require('@playwright/test');

// F-002: 루트(/) 접속 시 장비 목록 페이지가 EJS로 렌더링된다
test('F-002 루트 접속 시 장비 목록 페이지가 렌더링된다', async ({ page }) => {
  // step 1: http://localhost:3000/ 접속
  const res = await page.goto('/');
  expect(res.status()).toBe(200);

  // step 2: 장비 목록 페이지(HTML)가 표시되는지 확인
  expect(res.headers()['content-type']).toContain('text/html');
  await expect(page).toHaveTitle('NKIA 장비 대여');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('사내 장비 대여 관리');
  // 스캐폴드 플레이스홀더가 아닌 EJS 템플릿 결과여야 한다
  await expect(page.getByText('환경 스캐폴드')).toHaveCount(0);

  // step 3: 페이지에 장비 목록 영역이 존재하는지 확인
  const list = page.locator('#equipment-list');
  await expect(list).toBeVisible();
  await expect(page.getByRole('region', { name: '장비 목록' })).toBeVisible();
});
