# UI 가이드

U-* 항목을 포함해 화면을 건드리는 모든 작업은 이 문서를 따른다.
여기 없는 값을 새로 만들지 말고, 필요하면 이 문서를 먼저 고친 뒤(사람 승인) 사용한다.

## 1. 원칙
- 사내 업무 도구다. 화려함보다 **한눈에 상태를 읽을 수 있는 것**이 우선이다.
- 한 화면(목록)에서 조회·대여·반납이 끝나야 한다. 별도 페이지를 늘리지 않는다.
- 색은 의미가 있을 때만 쓴다: 상태(대여가능/대여중/연체)와 에러.

## 2. 파일 구조
- 스타일은 `public/app.css` 한 파일에만 작성하고, 레이아웃에서
  `<link rel="stylesheet" href="/static/app.css">` 로 불러온다.
- 인라인 `style=""` 속성, `<style>` 블록 금지.
- CSS 프레임워크/CDN(Bootstrap, Tailwind 등) 도입 금지. 외부 폰트 로딩 금지.
- 클라이언트 JS 가 필요하면 `public/app.js` 한 파일에만 둔다. JS 없이도 폼 제출은 동작해야 한다(SSR 우선).

## 3. 디자인 토큰
`public/app.css` 최상단 `:root` 에 아래 변수를 정의하고, 이후 모든 색·간격은 변수로만 참조한다.
16진수 색상값을 규칙 본문에 직접 쓰지 않는다.

```css
:root {
  /* 색 */
  --color-bg:        #f5f6f8;  /* 페이지 배경 */
  --color-surface:   #ffffff;  /* 카드/표 배경 */
  --color-border:    #e2e5ea;
  --color-text:      #1f2328;
  --color-text-muted:#6b7280;
  --color-primary:   #2563eb;  /* 주요 버튼, 링크 */
  --color-primary-hover: #1d4ed8;

  --color-available-bg: #e7f6ec;  --color-available-fg: #1a7f37;  /* 대여가능 */
  --color-rented-bg:    #fff4e0;  --color-rented-fg:    #9a6700;  /* 대여중 */
  --color-overdue-bg:   #fde8e8;  --color-overdue-fg:   #c62828;  /* 연체 / 에러 */

  /* 간격 (4px 배수만 사용) */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-6: 24px; --space-8: 32px;

  /* 형태 */
  --radius: 8px;
  --shadow: 0 1px 2px rgba(0,0,0,.06), 0 1px 3px rgba(0,0,0,.08);
  --font: system-ui, -apple-system, "Segoe UI", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
}
```

- 글꼴 크기는 14px(본문/표), 13px(보조·배지), 20px(h1), 16px(h2) 네 가지만 쓴다.
- 본문 최대 폭 960px, 가운데 정렬, 좌우 여백 `--space-4`.

## 4. 컴포넌트

### 헤더 (U-001)
- 페이지 상단 전체 폭 바, 배경 `--color-surface`, 하단 1px `--color-border`.
- `<h1>` 텍스트는 **정확히 `사내 장비 대여 관리`** 를 유지한다(F-002 테스트). 부제목은 별도 요소로.

### 장비 목록 표 (U-002)
- `<table>` 을 카드(`--color-surface`, `--radius`, `--shadow`) 안에 둔다.
- `thead` 배경 `--color-bg`, 글자 `--color-text-muted`, 13px.
- 행 높이는 셀 패딩 `--space-3 --space-4` 로 맞추고, 행 구분선은 `--color-border` 1px. 줄무늬 배경 금지.
- 칼럼 순서: 장비명 → 종류 → 상태 → 대여자 → 반납예정일 → 작업(버튼). 작업 칼럼은 오른쪽 정렬.

### 상태 배지 (F-006, U-003, U-004)
- 마크업: `<span class="badge badge--available">대여가능</span>`
  / `badge--rented` 대여중 / `badge--overdue` 연체.
- 배지는 pill 형태(`border-radius: 999px`), 13px, 패딩 `2px var(--space-2)`, 해당 상태의 `-bg`/`-fg` 토큰 사용.
- **색만으로 구분하지 않는다**. 배지 안의 텍스트가 반드시 상태를 말해야 한다.
- 연체 행은 배지에 더해 행(`tr`)에 `is-overdue` 클래스를 붙이고 왼쪽 3px `--color-overdue-fg` 테두리로 강조한다.

### 버튼
- 기본(대여): `.btn .btn--primary`, 배경 `--color-primary`, 흰 글자.
- 보조(반납, 취소): `.btn .btn--secondary`, 흰 배경 + `--color-border` 테두리.
- 높이 32px, 패딩 `0 var(--space-3)`, `--radius`. hover/focus 스타일 필수. `:focus-visible` 에 2px outline.
- 버튼 라벨은 동사: `대여`, `반납`, `취소`. "확인"/"OK" 금지.

### 대여 폼 (F-009, F-010, U-005)
- 인페이지 모달 또는 행 아래 인라인 펼침 중 하나로 통일한다. 브라우저 `alert()/confirm()/prompt()` 금지.
- 모든 입력에 `<label for>` 연결. placeholder 로 label 을 대신하지 않는다.
- 반납예정일은 `<input type="date">`.

### 에러 메시지 (F-013, F-014, U-010)
- 해당 입력 바로 아래 `<p class="field-error" role="alert">` 로 표시, `--color-overdue-fg`, 13px.
- 문구는 "무엇이 문제인지 + 어떻게 고치는지": `대여자명을 입력하세요.` (O) / `잘못된 입력` (X).
- 에러 후 재렌더링 시 사용자가 입력했던 값은 유지한다.

### 빈 목록 (U-008)
- 표 대신 카드 안에 가운데 정렬 문구 `등록된 장비가 없습니다.` 를 `--color-text-muted` 로 표시.

### 날짜 (U-009)
- 화면에 보이는 날짜는 모두 `YYYY-MM-DD`. 시간이 필요하면 `YYYY-MM-DD HH:mm`.

## 5. 반응형 (U-011)
- 기준 폭 1280px 과 375px 두 가지를 모두 확인한다.
- 640px 이하에서는 표를 카드형으로 바꾼다(각 `tr` 을 블록으로, `td` 앞에 `data-label` 로 칼럼명 표시).
- 375px 에서 **가로 스크롤이 생기면 실패**다. (`document.documentElement.scrollWidth <= 375`)

## 6. 테스트가 의존하는 선택자 (변경 금지)
스타일 작업 중에도 아래는 이름·구조를 바꾸지 않는다. 새 선택자가 테스트에 쓰이면 여기에 추가한다.

| 선택자 / 텍스트 | 사용하는 테스트 |
|---|---|
| `<title>NKIA 장비 대여</title>` | F-002 |
| `h1` 텍스트 `사내 장비 대여 관리` | F-002 |
| `#equipment-list`, `aria-labelledby="equipment-list-title"`, h2 `장비 목록` | F-002, F-003 |
| `tbody tr.equipment-row[data-equipment-id]` | F-003, F-004 |
| `thead th` `장비명`, `td.equipment-name` | F-004 |

## 7. 셀프 리뷰 절차 (UI 변경 시 필수)
테스트 통과만으로는 "보기 좋은지"를 알 수 없다. 커밋 전에 스크린샷을 찍어 **직접 이미지를 열어 확인**한다.

```bash
npx playwright screenshot --full-page --viewport-size=1280,800 http://localhost:3000/ test-results/ui-desktop.png
npx playwright screenshot --full-page --viewport-size=375,800  http://localhost:3000/ test-results/ui-mobile.png
```

확인 체크리스트:
- [ ] 토큰 외의 색/간격이 보이지 않는다
- [ ] 상태 배지 색이 상태별로 다르고, 텍스트로도 구분된다
- [ ] 375px 에서 가로 스크롤·잘린 텍스트·겹친 요소가 없다
- [ ] 버튼/입력에 키보드 포커스 표시가 보인다
- [ ] 브라우저 기본 스타일(Times 글꼴, 파란 밑줄 링크, 테두리 없는 표)이 남아있지 않다

progress.txt 에 "스크린샷 확인함 (desktop/mobile)" 과 발견한 문제를 기록한다.
