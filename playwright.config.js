const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './e2e',
  // 모든 테스트가 같은 서버·같은 data/app.db 를 공유하고, 일부(F-006, F-008)는 장비 상태를 잠깐 바꿨다가 되돌린다.
  // 파일 간 병렬 실행 시 다른 테스트의 DB 스냅샷과 렌더링 결과가 어긋나므로 직렬로 돌린다.
  workers: 1,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  reporter: 'list',
});
