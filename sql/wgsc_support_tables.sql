-- Proposed additional tables. Deploy with DBA approval; the six provided tables are unchanged.
CREATE TABLE IF NOT EXISTS app_open_api_c002_wgsc_permission_1 (
  id BIGINT NOT NULL AUTO_INCREMENT,
  phone VARCHAR(16) NOT NULL,
  name VARCHAR(64) NOT NULL,
  role TINYINT(1) NOT NULL DEFAULT 3 COMMENT '1 city / 2 branch / 3 grid',
  branch VARCHAR(64) NOT NULL DEFAULT '',
  grid VARCHAR(64) NOT NULL DEFAULT '',
  super_admin TINYINT(1) NOT NULL DEFAULT 0,
  enabled TINYINT NOT NULL DEFAULT 1,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id), UNIQUE KEY uk_phone (phone),
  KEY idx_branch (branch), KEY idx_grid (grid), KEY idx_role (role),
  KEY idx_enabled (enabled), KEY idx_is_super_admin (super_admin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_open_api_c003_wgsc_target_1 (
  id BIGINT NOT NULL AUTO_INCREMENT,
  branch VARCHAR(64) NOT NULL,
  grid VARCHAR(64) NOT NULL,
  product_id VARCHAR(32) NOT NULL,
  target_month CHAR(7) NOT NULL COMMENT 'YYYY-MM',
  month_target DECIMAL(18,2) NOT NULL,
  day_target DECIMAL(18,2) DEFAULT NULL,
  target_date DATE DEFAULT NULL,
  PRIMARY KEY (id), UNIQUE KEY uk_target (branch,grid,product_id,target_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_open_api_c003_wgsc_script_1 (
  id BIGINT NOT NULL AUTO_INCREMENT,
  product_id VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  updated_at DATETIME NOT NULL,
  updated_by VARCHAR(11) NOT NULL,
  PRIMARY KEY (id), UNIQUE KEY uk_product (product_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
