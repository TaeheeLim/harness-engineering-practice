// Express 서버 부트스트랩 (환경 스캐폴드)
// EJS 뷰 엔진 설정, 헬스체크, 장비 목록 페이지(/)를 제공한다.
const path = require('path');
const express = require('express');
const { DB_PATH } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

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
  res.render('index', { title: 'NKIA 장비 대여' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    console.log(`[server] health:  http://localhost:${PORT}/health`);
  });
}

module.exports = app;
