const { test, expect } = require('@playwright/test');

// F-009: 대여 폼에 대여자명 입력 필드가 있다
test('F-009 대여 폼에 대여자명 입력 필드가 있다', async ({ page }) => {
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

    // step 2: 대여자명 입력 필드가 존재하는지 확인
    const input = form.locator('input[name="renter_name"]');
    await expect(input).toHaveCount(1);
    await expect(input).toBeVisible();
    await expect(input).toBeEditable();
    await expect(input).toHaveAttribute('type', 'text');
    await expect(input).toHaveAttribute('required', '');

    // label 이 for 로 연결되어 있어 접근 가능한 이름이 "대여자명" 이다 (placeholder 로 대신하지 않는다)
    const inputId = await input.getAttribute('id');
    expect(inputId).toBe(`renter-${id}`);
    inputIds.add(inputId);
    const label = form.locator(`label[for="${inputId}"]`);
    await expect(label).toHaveText('대여자명');
    await expect(form.getByLabel('대여자명', { exact: true })).toHaveCount(1);

    // 입력 필드는 제출 버튼보다 앞에 있고 실제로 값을 받는다
    await input.fill('홍길동');
    await expect(input).toHaveValue('홍길동');
    const inputBeforeButton = await form.evaluate((f) => {
      const inp = f.querySelector('input[name="renter_name"]');
      const btn = f.querySelector('button[type="submit"]');
      return Boolean(inp.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(inputBeforeButton).toBe(true);
  }

  // 행마다 id 가 달라 label 연결이 섞이지 않는다
  expect(inputIds.size).toBe(n);
});
