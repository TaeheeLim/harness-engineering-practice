const path = require('path');
const Database = require('better-sqlite3');
const { test, expect } = require('@playwright/test');

// 서버와 같은 DB 파일을 열어 기대값을 구한다.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');

function countEquipment() {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    return db.prepare('SELECT COUNT(*) AS n FROM equipment').get().n;
  } finally {
    db.close();
  }
}

// F-007: 대여가능 장비에는 대여 폼/버튼이 노출된다
test('F-007 대여가능 장비에는 대여 폼/버튼이 노출된다', async ({ page }) => {
  // step 1: 루트 페이지 접속
  await page.goto('/');
  const list = page.locator('#equipment-list');
  await expect(list).toBeVisible();
  await expect(list.locator('tbody tr.equipment-row')).toHaveCount(countEquipment());
  await expect(list.locator('thead th', { hasText: '작업' })).toBeVisible();

  // step 2: 상태가 대여가능인 장비 행에 대여 버튼 또는 폼이 있는지 확인
  // (F-006 테스트가 공유 DB 의 status 를 잠깐 바꾸므로, 기대값은 렌더링된 배지 기준으로 잡는다)
  const availableRows = list.locator('tbody tr.equipment-row:has(td.equipment-status .badge--available)');
  const n = await availableRows.count();
  expect(n).toBeGreaterThan(0);

  for (let i = 0; i < n; i++) {
    const row = availableRows.nth(i);
    const id = await row.getAttribute('data-equipment-id');
    const actions = row.locator('td.equipment-actions');
    await expect(actions).toHaveCount(1);

    // 대여 버튼(펼침 토글)이 보인다
    const toggle = actions.locator('details.rent-toggle > summary');
    await expect(toggle).toHaveCount(1);
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveText('대여');

    // 대여 폼은 이 장비로 POST 한다. 펼치기 전에는 숨겨져 있다.
    const form = actions.locator('form.rent-form');
    await expect(form).toHaveCount(1);
    await expect(form).toHaveAttribute('method', 'post');
    await expect(form).toHaveAttribute('action', `/equipment/${id}/rent`);
    await expect(form).toBeHidden();

    // 대여 버튼을 누르면 같은 행 안에 폼과 제출 버튼이 나타난다
    await toggle.click();
    await expect(form).toBeVisible();
    await expect(form.locator('button[type="submit"]')).toHaveText('대여');
  }

  // 대여가능이 아닌 행에는 대여 폼/버튼이 없다
  const otherRows = list.locator('tbody tr.equipment-row:not(:has(.badge--available))');
  await expect(otherRows.locator('.rent-toggle, form.rent-form')).toHaveCount(0);
});
