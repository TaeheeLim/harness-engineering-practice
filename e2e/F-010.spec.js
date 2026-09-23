const { test, expect } = require('@playwright/test');

// F-010: 대여 폼에 반납예정일 입력 필드가 있다
test('F-010 대여 폼에 반납예정일 입력 필드가 있다', async ({ page }) => {
  await page.goto('/');
  const list = page.locator('#equipment-list');
  await expect(list).toBeVisible();

  // (F-006/F-008 테스트가 공유 DB 의 status 를 잠깐 바꾸므로, 대여가능 행은 렌더링된 배지 기준으로 잡는다)
  const availableRows = list.locator('tbody tr.equipment-row:has(td.equipment-status .badge--available)');
  const n = await availableRows.count();
  expect(n).toBeGreaterThan(0);

  const inputIds = new Set();
  for (let i = 0; i < n; i++) {
    const row = availableRows.nth(i);
    const id = await row.getAttribute('data-equipment-id');
    const form = row.locator('td.equipment-actions form.rent-form');
    await expect(form).toHaveCount(1);

    // step 1: 대여가능 장비의 대여 폼을 연다
    await expect(form).toBeHidden();
    await row.locator('details.rent-toggle > summary').click();
    await expect(form).toBeVisible();

    // step 2: 반납예정일(date) 입력 필드가 존재하는지 확인
    const input = form.locator('input[name="due_date"]');
    await expect(input).toHaveCount(1);
    await expect(input).toBeVisible();
    await expect(input).toBeEditable();
    await expect(input).toHaveAttribute('type', 'date');
    await expect(input).toHaveAttribute('required', '');
    // 브라우저가 실제로 date 입력으로 인식하는지 (type 속성만이 아니라 DOM 프로퍼티로 확인)
    expect(await input.evaluate((el) => el.type)).toBe('date');

    // label 이 for 로 연결되어 있어 접근 가능한 이름이 "반납예정일" 이다 (placeholder 로 대신하지 않는다)
    const inputId = await input.getAttribute('id');
    expect(inputId).toBe(`due-${id}`);
    inputIds.add(inputId);
    const label = form.locator(`label[for="${inputId}"]`);
    await expect(label).toHaveText('반납예정일');
    await expect(form.getByLabel('반납예정일', { exact: true })).toHaveCount(1);

    // 날짜 값을 받고, 날짜가 아닌 값은 받지 않는다 (date 입력의 동작)
    await input.fill('2099-12-31');
    await expect(input).toHaveValue('2099-12-31');
    const rejectsText = await input.evaluate((el) => {
      el.value = 'not-a-date';
      return el.value === '';
    });
    expect(rejectsText).toBe(true);

    // 대여자명 입력 뒤, 제출 버튼 앞에 있다
    const order = await form.evaluate((f) => {
      const renter = f.querySelector('input[name="renter_name"]');
      const due = f.querySelector('input[name="due_date"]');
      const btn = f.querySelector('button[type="submit"]');
      const F = Node.DOCUMENT_POSITION_FOLLOWING;
      return {
        afterRenter: Boolean(renter.compareDocumentPosition(due) & F),
        beforeButton: Boolean(due.compareDocumentPosition(btn) & F),
      };
    });
    expect(order).toEqual({ afterRenter: true, beforeButton: true });
  }

  // 행마다 id 가 달라 label 연결이 섞이지 않는다
  expect(inputIds.size).toBe(n);
});
