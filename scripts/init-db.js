// DB 초기화 + 시드 (환경 구축)
// - schema.sql 적용
// - 장비 마스터 시드 데이터 삽입 (멱등: 이미 있으면 건너뜀)
const fs = require('fs');
const path = require('path');
const { getDb, DB_PATH } = require('../src/db');

const SCHEMA_PATH = path.join(__dirname, '..', 'db', 'schema.sql');

const SEED_EQUIPMENT = [
  { name: 'ThinkPad X1 Carbon', type: '노트북' },
  { name: 'MacBook Pro 14"', type: '노트북' },
  { name: 'Dell UltraSharp 27"', type: '모니터' },
  { name: 'LG 32" 4K 모니터', type: '모니터' },
  { name: 'Logitech MX Master 3', type: '주변기기' },
  { name: 'Anker USB-C 허브', type: '주변기기' },
];

function main() {
  const db = getDb();

  // 1) 스키마 적용
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
  db.exec(schema);

  // 2) 시드 (멱등) — 동일 name 이 없을 때만 삽입
  const exists = db.prepare('SELECT 1 FROM equipment WHERE name = ? LIMIT 1');
  const insert = db.prepare('INSERT INTO equipment (name, type) VALUES (?, ?)');
  const seed = db.transaction((rows) => {
    let inserted = 0;
    for (const row of rows) {
      if (!exists.get(row.name)) {
        insert.run(row.name, row.type);
        inserted += 1;
      }
    }
    return inserted;
  });
  const inserted = seed(SEED_EQUIPMENT);

  const total = db.prepare('SELECT COUNT(*) AS c FROM equipment').get().c;
  db.close();

  console.log(`[init-db] schema applied -> ${DB_PATH}`);
  console.log(`[init-db] seed inserted: ${inserted}, equipment total: ${total}`);
}

main();
