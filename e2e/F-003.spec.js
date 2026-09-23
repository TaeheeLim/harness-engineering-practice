const path = require('path');
const Database = require('better-sqlite3');
const { test, expect } = require('@playwright/test');

// 서버와 같은 DB 파일을 읽기 전용으로 열어 기대값을 구한다.
// (이후 대여 테스트가 DB 를 바꿀 수 있으므로 하드코딩 대신 실제 쿼리 사용)
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');

function queryEquipment() {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    return db.prepare('SELECT id, name, type FROM equipment ORDER BY id').all();
  } finally {
    db.close();
  }
}

// F-003: 시드된 장비들이 목록에 모두 표시된다
test('F-003 시드된 장비들이 목록에 모두 표시된다', async ({ page }) => {
  const equipment = queryEquipment();

  // step 1: 루트 페이지 접속
  await page.goto('/');
  const list = page.locator('#equipment-list');
  await expect(list).toBeVisible();
  const rows = list.locator('tbody tr.equipment-row');

  // step 2: 시드 장비(노트북/모니터/주변기기)들이 목록에 나타나는지 확인
  const types = new Set(equipment.map((e) => e.type));
  for (const t of ['노트북', '모니터', '주변기기']) {
    expect(types.has(t), `시드에 ${t} 종류가 있어야 한다`).toBe(true);
  }
  for (const item of equipment) {
    const row = list.locator(`tr.equipment-row[data-equipment-id="${item.id}"]`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(item.name);
  }

  // step 3: 총 항목 수가 시드 개수와 일치하는지 확인
  expect(equipment.length).toBeGreaterThanOrEqual(6); // scripts/init-db.js SEED_EQUIPMENT
  await expect(rows).toHaveCount(equipment.length);
});
