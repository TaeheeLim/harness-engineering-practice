-- 사내 장비 대여 관리 스키마
-- equipment: 장비 마스터, status = 'available'(대여가능) | 'rented'(대여중)
-- rentals: 대여 이력. returned_at IS NULL 이면 현재 대여중 건.

CREATE TABLE IF NOT EXISTS equipment (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  type       TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'available'
             CHECK (status IN ('available', 'rented')),
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rentals (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  equipment_id INTEGER NOT NULL REFERENCES equipment(id),
  renter_name  TEXT    NOT NULL,
  due_date     TEXT    NOT NULL,          -- YYYY-MM-DD 반납예정일
  rented_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  returned_at  TEXT                        -- NULL 이면 미반납(대여중)
);

CREATE INDEX IF NOT EXISTS idx_rentals_equipment ON rentals(equipment_id);
CREATE INDEX IF NOT EXISTS idx_rentals_open      ON rentals(equipment_id) WHERE returned_at IS NULL;
