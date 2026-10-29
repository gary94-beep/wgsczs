-- SQL聚合建议索引。仅供核对后按需执行；此文件未在任何线上数据库执行。
-- 先用 SHOW INDEX FROM <表名> 检查，已有同等前缀索引时无需重复建立。
-- 平台如不开放DDL，请在数据表配置中建立对应联合索引。

CREATE INDEX idx_wgsc_region_scope_period
ON app_open_api_c003_wgsc_region_capacity_1
(stat_date, branch_company, grid_name, prod_period_type, product_name);

CREATE INDEX idx_wgsc_channel_scope_period
ON app_open_api_c001_wgsc_chn_capacity_1
(stat_date, branch_company, grid_name, prod_period_type, product_name);

CREATE INDEX idx_wgsc_staff_scope_period
ON app_open_api_c003_wgsc_staff_capacity_1
(stat_date, branch_company, grid_name, prod_period_type, product_name);

CREATE INDEX idx_wgsc_channel_latest
ON app_open_api_c002_wgsc_chn_level_1 (chn_code, id);

CREATE INDEX idx_wgsc_employee_latest
ON app_open_api_c002_wgsc_staff_1 (staff_no, id);

CREATE INDEX idx_wgsc_terminal_latest
ON app_open_api_c002_wgsc_staff_terminal_1 (staff_no, id);

CREATE INDEX idx_wgsc_target_month_scope
ON app_open_api_c002_wgsc_target_1 (target_month, branch, grid, product_id);
