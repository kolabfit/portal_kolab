CREATE DATABASE IF NOT EXISTS portal_kolab;
USE portal_kolab;

-- profile_mahasiswa
CREATE TABLE IF NOT EXISTS students (
  nim VARCHAR(20) PRIMARY KEY,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  avatar TEXT,
  photo_id TEXT,
  type ENUM('STARTUP', 'NON_STARTUP') DEFAULT 'NON_STARTUP',
  startup_id VARCHAR(50),
  startup_position VARCHAR(20) NULL,
  INDEX idx_students_startup_position (startup_id, startup_position),
  job_desk VARCHAR(100),
  is_approved BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  custom_quota BIGINT DEFAULT 524288000,
  custom_max_upload BIGINT DEFAULT 20971520,
  statuses TEXT, -- JSON string
  youtube TEXT,
  spotify TEXT,
  reset_requested_at DATETIME NULL, -- lupa password: waktu member mengajukan password baru
  pending_password VARCHAR(255) NULL, -- lupa password: hash password baru, aktif setelah disetujui admin
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- profile_dosen
CREATE TABLE IF NOT EXISTS lecturers (
  nip VARCHAR(20) PRIMARY KEY,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  avatar TEXT,
  photo_id TEXT,
  job_desks TEXT, -- JSON string
  code VARCHAR(20),
  is_approved BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  custom_quota BIGINT DEFAULT 1073741824,
  custom_max_upload BIGINT DEFAULT 52428800,
  youtube TEXT,
  spotify TEXT,
  reset_requested_at DATETIME NULL, -- lupa password: waktu member mengajukan password baru
  pending_password VARCHAR(255) NULL, -- lupa password: hash password baru, aktif setelah disetujui admin
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Admin
CREATE TABLE IF NOT EXISTS admins (
  username VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100),
  avatar TEXT,
  photo_id TEXT,
  password VARCHAR(255) NOT NULL,
  youtube TEXT,
  spotify TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assets
CREATE TABLE IF NOT EXISTS assets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bg_front TEXT,
  bg_back TEXT,
  logo_url TEXT,
  student_policy TEXT, -- JSON string
  lecturer_policy TEXT, -- JSON string
  admin_youtube TEXT,
  admin_spotify TEXT
);

-- Repo
CREATE TABLE IF NOT EXISTS repo (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url TEXT,
  date DATETIME,
  size BIGINT,
  mime VARCHAR(100),
  category VARCHAR(50),
  owner_id VARCHAR(50),
  role ENUM('STUDENT', 'LECTURER', 'ADMIN'),
  parent_id VARCHAR(100),
  type ENUM('FILE', 'FOLDER')
);

-- Trash
CREATE TABLE IF NOT EXISTS trash (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255),
  url TEXT,
  date DATETIME,
  size BIGINT,
  mime VARCHAR(100),
  category VARCHAR(50),
  owner_id VARCHAR(50),
  role ENUM('STUDENT', 'LECTURER', 'ADMIN'),
  original_parent_id VARCHAR(100),
  deleted_at DATETIME,
  type ENUM('FILE', 'FOLDER')
);

-- startup_team
CREATE TABLE IF NOT EXISTS startup_teams (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  website TEXT,
  ig TEXT,
  tiktok TEXT,
  linkedin TEXT,
  logo TEXT
);

-- Informasi
CREATE TABLE IF NOT EXISTS information (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATETIME,
  description TEXT,
  author VARCHAR(100),
  target_type VARCHAR(50),
  target_value TEXT
);

-- Schedules
CREATE TABLE IF NOT EXISTS schedules (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE,
  time TIME,
  location_offline VARCHAR(255),
  location_online BOOLEAN,
  meet_link TEXT,
  organizer VARCHAR(100),
  description TEXT,
  end_time TIME,
  author VARCHAR(100)
);

-- Events
CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  date DATE,
  image_url TEXT,
  description TEXT,
  location_offline VARCHAR(255),
  location_online VARCHAR(255),
  max_participants INT,
  status VARCHAR(50),
  tags TEXT,
  meet_link TEXT,
  time TIME,
  author VARCHAR(100)
);

-- Articles
CREATE TABLE IF NOT EXISTS articles (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content LONGTEXT,
  date DATETIME,
  author VARCHAR(100),
  tags TEXT,
  category_id VARCHAR(50),
  image_url TEXT,
  video_url TEXT,
  other_url TEXT
);

-- ArticleCategories
CREATE TABLE IF NOT EXISTS article_categories (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

-- ArticleTags
CREATE TABLE IF NOT EXISTS article_tags (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS article_tag_map (
  article_id VARCHAR(50) NOT NULL,
  tag_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (article_id, tag_id)
);

CREATE TABLE IF NOT EXISTS article_attachments (
  id VARCHAR(50) PRIMARY KEY,
  article_id VARCHAR(50) NOT NULL,
  file_id VARCHAR(100) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  size INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_attachments_article (article_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(50) PRIMARY KEY,
  type VARCHAR(50),
  title VARCHAR(255),
  message TEXT,
  timestamp DATETIME
);

-- Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id VARCHAR(50) PRIMARY KEY,
  author VARCHAR(100),
  title VARCHAR(255),
  content TEXT,
  created_at DATETIME,
  target_type VARCHAR(50),
  target_value TEXT
);

-- SystemLogs
CREATE TABLE IF NOT EXISTS system_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  timestamp DATETIME,
  action VARCHAR(255),
  user_id VARCHAR(50),
  details TEXT
);

-- yplaylist
CREATE TABLE IF NOT EXISTS yplaylists (
  playlist_id VARCHAR(100) PRIMARY KEY,
  title VARCHAR(255),
  thumbnail TEXT,
  published_at DATETIME,
  channel_title VARCHAR(255),
  category VARCHAR(20) NOT NULL DEFAULT 'LAINNYA',
  status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  added_by_role VARCHAR(20),
  added_by_id VARCHAR(100),
  added_by_name VARCHAR(255)
);

-- tvlive
CREATE TABLE IF NOT EXISTS tvlive (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(255),
  video_id VARCHAR(100),
  thumbnail TEXT,
  category VARCHAR(20) NOT NULL DEFAULT 'LAINNYA',
  status VARCHAR(20) NOT NULL DEFAULT 'APPROVED',
  added_by_role VARCHAR(20),
  added_by_id VARCHAR(100),
  added_by_name VARCHAR(255)
);

-- AuditForensic
CREATE TABLE IF NOT EXISTS audit_forensics (
  log_id VARCHAR(50) PRIMARY KEY,
  timestamp DATETIME,
  actor VARCHAR(100),
  action_type VARCHAR(255),
  resource_id VARCHAR(100),
  status VARCHAR(50),
  metadata TEXT
);

-- photobooth_settings
CREATE TABLE IF NOT EXISTS photobooth_settings (
  category VARCHAR(50) PRIMARY KEY,
  data LONGTEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Binary uploads are persisted in MySQL alongside repository metadata.
CREATE TABLE IF NOT EXISTS file_blobs (
  repo_id VARCHAR(100) PRIMARY KEY,
  content LONGBLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS integration_results (id VARCHAR(36) PRIMARY KEY, action VARCHAR(100), user_id VARCHAR(50), request_data LONGTEXT, response_data LONGTEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);

-- Magang: indexed references preserve compatibility with existing member/startup deletion.
CREATE TABLE IF NOT EXISTS internships (
  id VARCHAR(50) PRIMARY KEY,
  student_nim VARCHAR(20) NOT NULL,
  startup_id VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  field_supervisor VARCHAR(150),
  academic_supervisor_nip VARCHAR(20),
  academic_supervisor2_nip VARCHAR(20),
  status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_internships_student (student_nim),
  INDEX idx_internships_startup (startup_id),
  INDEX idx_internships_academic (academic_supervisor_nip),
  INDEX idx_internships_academic2 (academic_supervisor2_nip),
  INDEX idx_internships_status (status)
) ENGINE=InnoDB;

-- Inventaris aset sarana Ko+Lab
CREATE TABLE IF NOT EXISTS facility_rooms (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  floor VARCHAR(60) NULL,
  notes VARCHAR(500) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS facility_assets (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  category VARCHAR(80) NOT NULL,
  room_id CHAR(36) NOT NULL,
  `condition` ENUM('GOOD','MINOR_DAMAGE','MAJOR_DAMAGE') NOT NULL,
  status ENUM('AVAILABLE','IN_USE','MAINTENANCE','RETIRED') NOT NULL,
  custodian VARCHAR(120) NULL,
  notes VARCHAR(500) NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1,
  CONSTRAINT fk_facility_asset_room FOREIGN KEY (room_id) REFERENCES facility_rooms(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS facility_asset_history (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  asset_id CHAR(36) NOT NULL,
  previous_state JSON NULL,
  current_state JSON NOT NULL,
  changed_by VARCHAR(100) NOT NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_facility_history_asset (asset_id, id),
  CONSTRAINT fk_facility_history_asset FOREIGN KEY (asset_id) REFERENCES facility_assets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Pengaturan Virtual Office 3D
CREATE TABLE IF NOT EXISTS virtual_office_settings (
  id TINYINT UNSIGNED PRIMARY KEY,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  room_overrides JSON NOT NULL,
  version INT UNSIGNED NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT IGNORE INTO virtual_office_settings (id, room_overrides) VALUES (1, JSON_OBJECT());
