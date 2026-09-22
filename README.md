# 사내 장비 대여 관리 미니 웹앱

노트북/모니터 등 사내 장비의 대여와 반납을 기록하는 SSR 웹앱.

> 현재 상태: **환경 스캐폴드 완료** — 서버 부트스트랩, DB 스키마/시드, 헬스체크까지 구축됨.
> 애플리케이션 기능(목록/대여/반납/연체)은 `feature_list.json` 기준으로 이후 세션에서 구현한다.

## 스택
- Node.js 20+
- Express (SSR)
- EJS (뷰 엔진)
- SQLite (`better-sqlite3`)

## 빠른 시작
```bash
./init.sh
```
의존성 설치 → DB 초기화/시드 → 개발 서버 기동 → 헬스체크까지 자동 수행하고,
성공 시 접속 URL을 출력한다.

접속: http://localhost:3000/ · 헬스체크: http://localhost:3000/health

## 수동 실행
```bash
npm install       # 의존성 설치
npm run init-db   # 스키마 적용 + 시드 (멱등)
npm start         # 서버 기동 (기본 PORT=3000)
```

## 디렉터리 구조
```
.
├── src/
│   ├── server.js      # Express 부트스트랩 + EJS 설정 + /health
│   └── db.js          # SQLite 연결 헬퍼
├── scripts/
│   └── init-db.js     # 스키마 적용 + 시드
├── db/
│   └── schema.sql     # equipment / rentals 스키마
├── views/             # EJS 템플릿 (기능 세션에서 채움)
├── public/            # 정적 자산 (/static)
├── data/              # SQLite DB 파일 (git 제외)
├── feature_list.json  # 검증 대상 기능 목록 (E2E)
└── progress.txt       # 작업 진행 로그
```

## 데이터 모델
- `equipment(id, name, type, status, created_at)` — `status`: `available` | `rented`
- `rentals(id, equipment_id, renter_name, due_date, rented_at, returned_at)` — `returned_at IS NULL`이면 대여중

## 환경 변수
- `PORT` — 서버 포트 (기본 `3000`)
- `DB_PATH` — SQLite 파일 경로 (기본 `data/app.db`)
