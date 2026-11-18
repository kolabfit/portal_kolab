const roomsSchema = `CREATE TABLE IF NOT EXISTS facility_rooms (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  floor VARCHAR(60) NULL,
  notes VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;

const assetsSchema = `CREATE TABLE IF NOT EXISTS facility_assets (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  room_id CHAR(36) NOT NULL,
  \`condition\` ENUM('GOOD','MINOR_DAMAGE','MAJOR_DAMAGE') NOT NULL,
  status ENUM('AVAILABLE','IN_USE','MAINTENANCE','RETIRED') NOT NULL,
  custodian VARCHAR(120) NULL,
  notes VARCHAR(500) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  CONSTRAINT fk_facility_asset_room FOREIGN KEY (room_id) REFERENCES facility_rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;

const historySchema = `CREATE TABLE IF NOT EXISTS facility_asset_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  previous_state JSON NULL,
  current_state JSON NOT NULL,
  changed_by VARCHAR(100) NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_facility_history_asset (asset_id, id),
  CONSTRAINT fk_facility_history_asset FOREIGN KEY (asset_id) REFERENCES facility_assets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`;

export async function migrateFacilityInventory(db) {
  await db.execute(roomsSchema);
  await db.execute(assetsSchema);
  await db.execute(historySchema);
}
