// Express 서버 부트스트랩 (환경 스캐폴드)
// EJS 뷰 엔진 설정, 헬스체크, 장비 목록 페이지(/), 대여 제출(POST /equipment/:id/rent)을 제공한다.
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

// 대여 제출 — 미반납(returned_at NULL) rentals 행을 만들고 장비를 대여중으로 바꾼 뒤 목록으로 돌아간다 (PRG).
// 두 쓰기는 한 트랜잭션으로 묶어 "기록은 있는데 상태는 대여가능" 같은 어긋난 상태가 남지 않게 한다.
// 입력 검증(F-013/F-014)과 중복 대여 거부(F-015)는 별도 기능에서 다룬다.
app.post('/equipment/:id/rent', (req, res) => {
  const db = conn();
  const equipment = db.prepare('SELECT id FROM equipment WHERE id = ?').get(req.params.id);
  if (!equipment) return res.status(404).send('장비를 찾을 수 없습니다.');

  const { renter_name: renterName, due_date: dueDate } = req.body;
  db.transaction(() => {
    db.prepare('INSERT INTO rentals (equipment_id, renter_name, due_date) VALUES (?, ?, ?)').run(
      equipment.id,
      renterName,
      dueDate
    );
    db.prepare("UPDATE equipment SET status = 'rented' WHERE id = ?").run(equipment.id);
  })();
  res.redirect(303, '/');
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    console.log(`[server] health:  http://localhost:${PORT}/health`);
  });
}

module.exports = app;
