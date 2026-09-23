const path = require('path');
const Database = require('better-sqlite3');
const { test, expect } = require('@playwright/test');

// 서버와 같은 DB 파일을 열어 대여 전후 상태를 확인하고, 테스트가 만든 기록을 정리한다.
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
    (db) =>
      db
        .prepare('SELECT id, renter_name, due_date, rented_at, returned_at FROM rentals WHERE equipment_id = ? AND returned_at IS NULL')
        .all(equipmentId),
    { readonly: true }
  );
}

function cleanup(equipmentId, status, beforeMaxRentalId) {
  withDb((db) =>
    db.transaction(() => {
      db.prepare('DELETE FROM rentals WHERE equipment_id = ? AND id > ?').run(equipmentId, beforeMaxRentalId);
      db.prepare('UPDATE equipment SET status = ? WHERE id = ?').run(status, equipmentId);
    })()
  );
}

// F-011: 대여 제출 시 rentals 테이블에 대여 기록이 생성된다
test('F-011 대여 제출 시 rentals 테이블에 대여 기록이 생성된다', async ({ page }) => {
  const target = queryEquipment().find((e) => e.status === 'available');
  expect(target).toBeTruthy();
  expect(queryOpenRentals(target.id)).toHaveLength(0);
  const beforeMaxRentalId = withDb(
    (db) => db.prepare('SELECT COALESCE(MAX(id), 0) AS m FROM rentals').get().m,
    { readonly: true }
  );
  const renterName = 'F-011 테스트 대여자';
  const dueDate = '2099-12-31';

  try {
    await page.goto('/');
    const list = page.locator('#equipment-list');
    const row = list.locator(`tbody tr.equipment-row[data-equipment-id="${target.id}"]`);
    await expect(row.locator('td.equipment-status .badge--available')).toHaveText('대여가능');

    // step 1: 대여자명/반납예정일 입력 후 대여 제출
    await row.locator('details.rent-toggle > summary').click();
    const form = row.locator('form.rent-form');
    await expect(form).toBeVisible();
    await form.getByLabel('대여자명', { exact: true }).fill(renterName);
    await form.getByLabel('반납예정일', { exact: true }).fill(dueDate);
    await Promise.all([
      page.waitForURL('/'),
      form.getByRole('button', { name: '대여', exact: true }).click(),
    ]);

    // step 2: 목록에서 해당 장비가 대여중으로 바뀌는지 확인 (제출 후 목록으로 돌아온 화면 기준)
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1')).toHaveText('사내 장비 대여 관리');
    await expect(list.locator('tbody tr.equipment-row')).toHaveCount(queryEquipment().length);
    const rentedRow = list.locator(`tbody tr.equipment-row[data-equipment-id="${target.id}"]`);
    await expect(rentedRow.locator('td.equipment-status')).toHaveText('대여중');
    await expect(rentedRow.locator('td.equipment-status .badge--rented')).toHaveText('대여중');
    await expect(rentedRow.locator('td.equipment-status .badge--available')).toHaveCount(0);
    // 대여중 행이 되었으므로 대여 폼 대신 반납 버튼이 보인다
    await expect(rentedRow.locator('.rent-toggle, form.rent-form')).toHaveCount(0);
    await expect(rentedRow.getByRole('button', { name: '반납', exact: true })).toBeVisible();

    // step 3: DB 확인 — rentals 에 returned_at IS NULL 레코드가 입력값 그대로 하나 생겼다
    const open = queryOpenRentals(target.id);
    expect(open).toHaveLength(1);
    expect(open[0].id).toBeGreaterThan(beforeMaxRentalId);
    expect(open[0].renter_name).toBe(renterName);
    expect(open[0].due_date).toBe(dueDate);
    expect(open[0].returned_at).toBeNull();
    expect(open[0].rented_at).toBeTruthy();
    expect(queryEquipment().find((e) => e.id === target.id).status).toBe('rented');
  } finally {
    cleanup(target.id, target.status, beforeMaxRentalId);
  }

  // 원상복구 확인 (다른 테스트가 시드 상태를 기대한다)
  expect(queryEquipment().find((e) => e.id === target.id).status).toBe(target.status);
  expect(queryOpenRentals(target.id)).toHaveLength(0);
});
