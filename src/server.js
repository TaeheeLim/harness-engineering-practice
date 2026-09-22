// Express 서버 부트스트랩 (환경 스캐폴드)
// EJS 뷰 엔진 설정 + 헬스체크만 제공한다.
// 장비 목록/대여/반납 등 애플리케이션 기능 라우트는 여기 없다 (feature_list.json 참고).
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

// 루트 — 스캐폴드 플레이스홀더. 실제 장비 목록 페이지는 기능 세션에서 구현한다.
app.get('/', (req, res) => {
  res
    .status(200)
    .type('html')
    .send(
      '<!doctype html><meta charset="utf-8">' +
        '<title>NKIA 장비 대여</title>' +
        '<h1>사내 장비 대여 관리 — 환경 스캐폴드</h1>' +
        '<p>환경 구축이 완료되었습니다. 애플리케이션 기능은 아직 구현되지 않았습니다.</p>' +
        '<p>헬스체크: <a href="/health">/health</a></p>'
    );
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
    console.log(`[server] health:  http://localhost:${PORT}/health`);
  });
}

module.exports = app;
