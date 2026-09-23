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

function cleanup(equipmentId, status, beforeMaxRentalId) {
  withDb((db) =>
    db.transaction(() => {
      db.prepare('DELETE FROM rentals WHERE equipment_id = ? AND id > ?').run(equipmentId, beforeMaxRentalId);
      db.prepare('UPDATE equipment SET status = ? WHERE id = ?').run(status, equipmentId);
    })()
  );
}

// F-012: 대여 제출 시 장비 상태가 대여중으로 변경된다
test('F-012 대여 제출 시 장비 상태가 대여중으로 변경된다', async ({ page }) => {
  const before = queryEquipment();
  const target = before.find((e) => e.status === 'available');
  expect(target).toBeTruthy();
  const beforeMaxRentalId = withDb(
    (db) => db.prepare('SELECT COALESCE(MAX(id), 0) AS m FROM rentals').get().m,
    { readonly: true }
  );

  try {
    await page.goto('/');
    const list = page.locator('#equipment-list');
    const rowSelector = `tbody tr.equipment-row[data-equipment-id="${target.id}"]`;
    const row = list.locator(rowSelector);
    await expect(row.locator('td.equipment-status .badge--available')).toHaveText('대여가능');

    // step 1: 대여가능 장비를 대여 제출
    await row.locator('details.rent-toggle > summary').click();
    const form = row.locator('form.rent-form');
    await expect(form).toBeVisible();
    await form.getByLabel('대여자명', { exact: true }).fill('F-012 테스트 대여자');
    await form.getByLabel('반납예정일', { exact: true }).fill('2099-12-31');
    await Promise.all([
      page.waitForURL('/'),
      form.getByRole('button', { name: '대여', exact: true }).click(),
    ]);

    // step 2: 목록 새로고침 후 상태가 대여중으로 표시되는지 확인
    // 새로고침은 GET / 로 다시 렌더링하므로, 리다이렉트 직후 화면이 아니라 DB 에 저장된 상태를 보여준다.
    const response = await page.reload();
    expect(response.request().method()).toBe('GET');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('h1')).toHaveText('사내 장비 대여 관리');
    await expect(list.locator('tbody tr.equipment-row')).toHaveCount(queryEquipment().length);
    const rentedRow = list.locator(rowSelector);
    await expect(rentedRow.locator('td.equipment-status')).toHaveText('대여중');
    await expect(rentedRow.locator('td.equipment-status .badge--rented')).toHaveText('대여중');
    await expect(rentedRow.locator('td.equipment-status .badge--available')).toHaveCount(0);
    await expect(rentedRow.locator('.rent-toggle, form.rent-form')).toHaveCount(0);
    await expect(rentedRow.getByRole('button', { name: '반납', exact: true })).toBeVisible();

    // DB 확인 — equipment.status 가 실제로 rented 로 저장되었고, 다른 장비의 상태는 그대로다
    const after = queryEquipment();
    expect(after.find((e) => e.id === target.id).status).toBe('rented');
    expect(after.filter((e) => e.id !== target.id)).toEqual(before.filter((e) => e.id !== target.id));
    // 새로고침이 재제출하지 않았다 — 이번 테스트로 생긴 대여 기록은 1건뿐이다
    const created = withDb(
      (db) => db.prepare('SELECT COUNT(*) AS n FROM rentals WHERE id > ?').get(beforeMaxRentalId).n,
      { readonly: true }
    );
    expect(created).toBe(1);
  } finally {
    cleanup(target.id, target.status, beforeMaxRentalId);
  }

  // 원상복구 확인 (다른 테스트가 시드 상태를 기대한다)
  expect(queryEquipment().find((e) => e.id === target.id).status).toBe(target.status);
});
