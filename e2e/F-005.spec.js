const path = require('path');
const Database = require('better-sqlite3');
const { test, expect } = require('@playwright/test');

// 서버와 같은 DB 파일을 읽기 전용으로 열어 기대값을 구한다.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
const TYPES = ['노트북', '모니터', '주변기기'];

function queryEquipment() {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    return db.prepare('SELECT id, type FROM equipment ORDER BY id').all();
  } finally {
    db.close();
  }
}

// F-005: 각 장비의 종류(type)가 목록에 표시된다
test('F-005 각 장비의 종류(type)가 목록에 표시된다', async ({ page }) => {
  const equipment = queryEquipment();
  expect(equipment.length).toBeGreaterThan(0);

  // step 1: 루트 페이지 접속
  await page.goto('/');
  const list = page.locator('#equipment-list');
  await expect(list).toBeVisible();

  // step 2: 각 장비 행에 종류(노트북/모니터/주변기기)가 표시되는지 확인
  await expect(list.locator('thead th', { hasText: '종류' })).toBeVisible();

  const rows = list.locator('tbody tr.equipment-row');
  await expect(rows).toHaveCount(equipment.length);

  // 모든 행이 종류 셀을 정확히 하나 가지며, 값은 세 종류 중 하나다
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const typeCell = rows.nth(i).locator('td.equipment-type');
    await expect(typeCell).toHaveCount(1);
    await expect(typeCell).toBeVisible();
    const text = (await typeCell.innerText()).trim();
    expect(TYPES).toContain(text);
  }

  // 각 장비 id 의 행에 DB 의 type 이 정확히 표시된다
  for (const item of equipment) {
    const typeCell = list.locator(
      `tr.equipment-row[data-equipment-id="${item.id}"] td.equipment-type`
    );
    await expect(typeCell).toHaveText(item.type);
  }

  // 시드의 세 종류가 모두 화면에 나타난다
  for (const t of TYPES) {
    await expect(list.locator('td.equipment-type', { hasText: t }).first()).toBeVisible();
  }
});
