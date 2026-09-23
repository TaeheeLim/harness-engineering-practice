# AGENTS.md

## 환경
- WSL2(Ubuntu). Windows Node 를 쓰면 안 된다.
- 작업 전 `node -p "process.platform"` 이 linux 인지 확인. win32 면 중단하고 사람에게 알린다.
- 서버 기동은 반드시 `./init.sh`. `npm run dev` 직접 실행 금지.

## 코드 규약
- 모듈 시스템은 <CommonJS | ESM> 하나로 통일한다. import/require 를 섞지 마라.
- better-sqlite3 는 동기 API. DB 호출에 async/await 쓰지 말 것.
- 브라우저 네이티브 alert()/confirm() 금지. 인페이지 모달 사용.
- 파일 인코딩은 UTF-8(BOM 없음), 줄바꿈은 LF.

## 검증
- e2e 테스트는 `e2e/<feature-id>.spec.js` 에 작성한다.
- URL 은 상대경로로 쓴다 (baseURL 은 playwright.config 에 설정됨).
- HTTP 상태코드만 확인하는 테스트는 불충분하다.
  렌더링된 화면의 텍스트와 요소를 검증하라.
- 커밋 전 `npx playwright test` 전체를 돌려 회귀가 없는지 확인한다.

## 절대 규칙
- feature_list.json 은 passes 필드만 변경 가능하다.
  항목 삭제, description/steps 수정은 용납되지 않는다.
- 통과하지 못하는 테스트를 지우거나 완화하지 마라.
- 세션 시작 시 작업 트리가 깨끗해야 한다. 미커밋 변경이 있으면 사람에게 알린다.
