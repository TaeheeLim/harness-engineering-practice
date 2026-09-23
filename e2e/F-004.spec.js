const path = require('path');
const Database = require('better-sqlite3');
const { test, expect } = require('@playwright/test');

// 서버와 같은 DB 파일을 읽기 전용으로 열어 기대값을 구한다.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');

function queryEquipment() {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    return db.prepare('SELECT id, name FROM equipment ORDER BY id').all();
  } finally {
    db.close();
  }
}

// F-004: 각 장비의 이름이 목록에 표시된다
test('F-004 각 장비의 이름이 목록에 표시된다', async ({ page }) => {
  const equipment = queryEquipment();
  expect(equipment.length).toBeGreaterThan(0);

  // step 1: 루트 페이지 접속
  await page.goto('/');
  const list = page.locator('#equipment-list');
  await expect(list).toBeVisible();

  // step 2: 각 행에 장비명이 표시되는지 확인
  await expect(list.locator('thead th', { hasText: '장비명' })).toBeVisible();

  const rows = list.locator('tbody tr.equipment-row');
  await expect(rows).toHaveCount(equipment.length);

  // 모든 행이 비어있지 않은 장비명 셀을 하나씩 가진다
  const count = await rows.count();
  for (let i = 0; i < count; i++) {
    const nameCell = rows.nth(i).locator('td.equipment-name');
    await expect(nameCell).toHaveCount(1);
    await expect(nameCell).toBeVisible();
    await expect(nameCell).not.toHaveText(/^\s*$/);
  }

  // 각 장비 id 의 행에 DB 의 name 이 정확히(이스케이프 깨짐 없이) 표시된다
  for (const item of equipment) {
    const nameCell = list.locator(
      `tr.equipment-row[data-equipment-id="${item.id}"] td.equipment-name`
    );
    await expect(nameCell).toBeVisible();
    await expect(nameCell).toHaveText(item.name);
  }
});
