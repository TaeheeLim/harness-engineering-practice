// Express 서버 부트스트랩 (환경 스캐폴드)
// EJS 뷰 엔진 설정, 헬스체크, 장비 목록 페이지(/)를 제공한다.
const path = require('path');
const express = require('express');
const { getDb, DB_PATH } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// 프로세스당 하나의 DB 연결을 재사용한다 (better-sqlite3 는 동기 API)
let db;
function conn() {
  if (!db) db = getDb();
  return db;
}

// equipment.status(DB 원문) -> 화면 라벨. 배지 클래스는 badge--<status> 로 원문을 그대로 쓴다.
const STATUS_LABELS = { available: '대여가능', rented: '대여중' };

// 미들웨어
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/static', express.static(path.join(__dirname, '..', 'public')));

// EJS SSR 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

// 헬스체크 (init.sh 가 이 엔드포인트로 기동 확인)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', db: DB_PATH, ts: new Date().toISOString() });
});

// 루트 — 장비 목록 페이지 (EJS SSR)
app.get('/', (req, res) => {
  const equipment = conn()
    .prepare('SELECT id, name, type, status FROM equipment ORDER BY id')
    .all()
    .map((item) => ({ ...item, statusLabel: STATUS_LABELS[item.status] }));
  res.render('index', { title: 'NKIA 장비 대여', equipment });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    console.log(`[server] health:  http://localhost:${PORT}/health`);
  });
}

module.exports = app;
