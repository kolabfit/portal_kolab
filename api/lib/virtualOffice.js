export async function migrateVirtualOffice(db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS virtual_office_settings (
    id TINYINT UNSIGNED PRIMARY KEY,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    room_overrides JSON NOT NULL,
    version INT UNSIGNED NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`);
  await db.execute('INSERT IGNORE INTO virtual_office_settings (id, room_overrides) VALUES (1, JSON_OBJECT())');
}
