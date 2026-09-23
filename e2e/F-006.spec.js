const path = require('path');
const Database = require('better-sqlite3');
const { test, expect } = require('@playwright/test');

// 서버와 같은 DB 파일을 열어 기대값을 구한다.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');
const LABELS = { available: '대여가능', rented: '대여중' };

function queryEquipment() {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    return db.prepare('SELECT id, status FROM equipment ORDER BY id').all();
  } finally {
    db.close();
  }
}

function setStatus(id, status) {
  const db = new Database(DB_PATH);
  try {
    db.prepare('UPDATE equipment SET status = ? WHERE id = ?').run(status, id);
  } finally {
    db.close();
  }
}

// 각 행의 상태 셀이 DB status 에 맞는 라벨/배지를 정확히 하나 보여주는지 확인한다.
async function expectStatusCells(list, equipment) {
  const rows = list.locator('tbody tr.equipment-row');
  await expect(rows).toHaveCount(equipment.length);

  for (const item of equipment) {
    const cell = list.locator(
      `tr.equipment-row[data-equipment-id="${item.id}"] td.equipment-status`
    );
    await expect(cell).toHaveCount(1);
    await expect(cell).toBeVisible();
    await expect(cell).toHaveText(LABELS[item.status]);

    const badge = cell.locator('span.badge');
    await expect(badge).toHaveCount(1);
    await expect(badge).toHaveClass(new RegExp(`\\bbadge--${item.status}\\b`));
    await expect(badge).toHaveText(LABELS[item.status]);
  }
}

// F-006: 각 장비의 상태(대여가능/대여중)가 표시된다
test.describe('F-006 각 장비의 상태(대여가능/대여중)가 표시된다', () => {
  test('시드 상태 그대로 각 행에 상태 라벨이 표시된다', async ({ page }) => {
    const equipment = queryEquipment();
    expect(equipment.length).toBeGreaterThan(0);

    // step 1: 루트 페이지 접속
    await page.goto('/');
    const list = page.locator('#equipment-list');
    await expect(list).toBeVisible();

    // step 2: 각 장비 행에 상태 라벨(대여가능/대여중)이 표시되는지 확인
    await expect(list.locator('thead th', { hasText: '상태' })).toBeVisible();
    await expectStatusCells(list, equipment);
    // DB 원문 값이 그대로 노출되지 않는다
    await expect(list.locator('td.equipment-status', { hasText: /available|rented/ })).toHaveCount(0);
  });

  test('대여중 장비는 대여중 라벨로 표시된다', async ({ page }) => {
    // 대여 기능(F-011) 전이라 DB 에서 한 장비를 직접 rented 로 바꾸고, 끝나면 원상복구한다.
    const [target] = queryEquipment();
    setStatus(target.id, 'rented');
    try {
      const equipment = queryEquipment();
      expect(equipment.find((e) => e.id === target.id).status).toBe('rented');

      // step 1: 루트 페이지 접속
      await page.goto('/');
      const list = page.locator('#equipment-list');
      await expect(list).toBeVisible();

      // step 2: 대여중/대여가능 라벨이 각 행에 맞게 표시되는지 확인
      await expectStatusCells(list, equipment);
      await expect(
        list.locator(`tr.equipment-row[data-equipment-id="${target.id}"] .badge--rented`)
      ).toHaveText('대여중');
      await expect(list.locator('.badge--available').first()).toHaveText('대여가능');
    } finally {
      setStatus(target.id, target.status);
    }
  });
});
