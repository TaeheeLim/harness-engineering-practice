const path = require('path');
const Database = require('better-sqlite3');
const { test, expect } = require('@playwright/test');

// 서버와 같은 DB 파일을 열어 기대값을 구하고, 대여 상태를 만든다.
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.db');

function withDb(fn, options) {
  const db = new Database(DB_PATH, options);
  try {
    return fn(db);
  } finally {
    db.close();
  }
}

function queryEquipment() {
  return withDb((db) => db.prepare('SELECT id, status FROM equipment ORDER BY id').all(), { readonly: true });
}

function queryOpenRentals(equipmentId) {
  return withDb(
    (db) => db.prepare('SELECT id FROM rentals WHERE equipment_id = ? AND returned_at IS NULL').all(equipmentId),
    { readonly: true }
  );
}

// 대여 라우트(F-011) 전이라 대여 처리를 DB 에 직접 한다: 미반납 rentals 행 + equipment.status = 'rented'.
function rent(equipmentId) {
  return withDb((db) =>
    db.transaction(() => {
      const { lastInsertRowid } = db
        .prepare("INSERT INTO rentals (equipment_id, renter_name, due_date) VALUES (?, 'F-008 테스트', '2099-12-31')")
        .run(equipmentId);
      db.prepare("UPDATE equipment SET status = 'rented' WHERE id = ?").run(equipmentId);
      return lastInsertRowid;
    })()
  );
}

function undoRent(equipmentId, rentalId, status) {
  withDb((db) =>
    db.transaction(() => {
      db.prepare('DELETE FROM rentals WHERE id = ?').run(rentalId);
      db.prepare('UPDATE equipment SET status = ? WHERE id = ?').run(status, equipmentId);
    })()
  );
}

// F-008: 대여중 장비에는 반납 버튼이 노출된다
test('F-008 대여중 장비에는 반납 버튼이 노출된다', async ({ page }) => {
  const target = queryEquipment().find((e) => e.status === 'available');
  expect(target).toBeTruthy();

  // step 1: 장비 하나를 대여 처리한다
  const rentalId = rent(target.id);
  try {
    // DB 확인: 대상 장비가 대여중이고 미반납 대여 건이 정확히 하나 있다
    expect(queryEquipment().find((e) => e.id === target.id).status).toBe('rented');
    expect(queryOpenRentals(target.id)).toHaveLength(1);

    await page.goto('/');
    const list = page.locator('#equipment-list');
    await expect(list).toBeVisible();
    await expect(list.locator('tbody tr.equipment-row')).toHaveCount(queryEquipment().length);

    // step 2: 해당 장비 행에 반납 버튼이 표시되는지 확인
    const row = list.locator(`tbody tr.equipment-row[data-equipment-id="${target.id}"]`);
    await expect(row).toHaveCount(1);
    await expect(row.locator('td.equipment-status .badge--rented')).toHaveText('대여중');

    const actions = row.locator('td.equipment-actions');
    const form = actions.locator('form.return-form');
    await expect(form).toHaveCount(1);
    await expect(form).toHaveAttribute('method', 'post');
    await expect(form).toHaveAttribute('action', `/equipment/${target.id}/return`);

    // 반납 버튼은 펼침 없이 바로 보인다
    const button = form.locator('button[type="submit"]');
    await expect(button).toHaveCount(1);
    await expect(button).toBeVisible();
    await expect(button).toHaveText('반납');
    await expect(button).toHaveClass(/\bbtn--secondary\b/);

    // 대여중 행에는 대여 버튼/폼이 없다
    await expect(actions.locator('.rent-toggle, form.rent-form')).toHaveCount(0);

    // 대여중이 아닌 행에는 반납 폼/버튼이 없다
    const otherRows = list.locator('tbody tr.equipment-row:not(:has(.badge--rented))');
    expect(await otherRows.count()).toBeGreaterThan(0);
    await expect(otherRows.locator('form.return-form')).toHaveCount(0);
    await expect(otherRows.getByRole('button', { name: '반납' })).toHaveCount(0);
  } finally {
    undoRent(target.id, rentalId, target.status);
  }

  // 원상복구 확인
  expect(queryEquipment().find((e) => e.id === target.id).status).toBe(target.status);
  expect(queryOpenRentals(target.id)).toHaveLength(0);
});
