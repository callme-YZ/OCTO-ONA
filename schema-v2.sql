-- ============================================
-- OCTO-ONA v2.0 Database Schema
-- ============================================
-- Part 1: Data Source Cache (本地化数据源)
-- Part 2: Metrics Metadata (指标元数据管理)
-- ============================================

-- ============================================
-- PART 1: DATA SOURCE CACHE
-- ============================================

-- Data Sources (多数据源配置)
CREATE TABLE IF NOT EXISTS data_sources (
    id VARCHAR(64) PRIMARY KEY,
    type ENUM('discord', 'dmwork', 'github') NOT NULL,
    name VARCHAR(255) NOT NULL,
    config JSON COMMENT '连接配置（加密）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users (统一用户表)
CREATE TABLE IF NOT EXISTS users (
    uid VARCHAR(128) PRIMARY KEY COMMENT 'source_id:source_user_id',
    source_id VARCHAR(64) NOT NULL,
    source_user_id VARCHAR(128) NOT NULL COMMENT '原始用户ID',
    name VARCHAR(255),
    display_name VARCHAR(255),
    is_bot BOOLEAN DEFAULT FALSE,
    metadata JSON COMMENT '扩展字段（头像、邮箱等）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE,
    UNIQUE KEY uk_source_user (source_id, source_user_id),
    INDEX idx_source (source_id),
    INDEX idx_is_bot (is_bot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Channels (频道/群组/仓库)
CREATE TABLE IF NOT EXISTS channels (
    channel_id VARCHAR(128) PRIMARY KEY COMMENT 'source_id:source_channel_id',
    source_id VARCHAR(64) NOT NULL,
    source_channel_id VARCHAR(128) NOT NULL COMMENT '原始频道ID',
    name VARCHAR(255),
    type ENUM('dm', 'group', 'channel', 'repository') NOT NULL,
    metadata JSON COMMENT '扩展字段（主题、成员数等）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE,
    UNIQUE KEY uk_source_channel (source_id, source_channel_id),
    INDEX idx_source (source_id),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Messages (核心消息表)
CREATE TABLE IF NOT EXISTS messages (
    message_id VARCHAR(128) PRIMARY KEY COMMENT 'source_id:source_message_id',
    source_id VARCHAR(64) NOT NULL,
    source_message_id VARCHAR(128) NOT NULL COMMENT '原始消息ID',
    channel_id VARCHAR(128) NOT NULL,
    from_uid VARCHAR(128) NOT NULL,
    content TEXT,
    timestamp BIGINT NOT NULL COMMENT 'Unix timestamp (seconds)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Interaction fields
    reply_to_message_id VARCHAR(128) COMMENT '回复的消息ID',
    reply_to_uid VARCHAR(128) COMMENT '回复的用户ID',
    mentioned_uids JSON COMMENT '@提及的用户ID数组',
    
    -- Metadata
    metadata JSON COMMENT '扩展字段（附件、Reactions等）',
    
    FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE,
    FOREIGN KEY (channel_id) REFERENCES channels(channel_id) ON DELETE CASCADE,
    FOREIGN KEY (from_uid) REFERENCES users(uid) ON DELETE CASCADE,
    
    UNIQUE KEY uk_source_message (source_id, source_message_id),
    INDEX idx_source (source_id),
    INDEX idx_channel (channel_id),
    INDEX idx_from_uid (from_uid),
    INDEX idx_timestamp (timestamp),
    INDEX idx_reply_to (reply_to_message_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sync Metadata (同步状态追踪)
CREATE TABLE IF NOT EXISTS sync_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL,
    last_sync_at TIMESTAMP NOT NULL,
    sync_status ENUM('success', 'partial', 'failed') NOT NULL,
    messages_synced INT DEFAULT 0,
    users_synced INT DEFAULT 0,
    channels_synced INT DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE,
    INDEX idx_source (source_id),
    INDEX idx_last_sync (last_sync_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PART 2: METRICS METADATA (指标元数据)
-- ============================================

-- Metric Categories (指标分类)
CREATE TABLE IF NOT EXISTS metric_categories (
    id VARCHAR(32) PRIMARY KEY COMMENT 'e.g., network, collaboration, evolution',
    name_en VARCHAR(128) NOT NULL,
    name_zh VARCHAR(128) NOT NULL,
    description TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Metrics (指标定义)
CREATE TABLE IF NOT EXISTS metrics (
    id VARCHAR(32) PRIMARY KEY COMMENT 'e.g., L1.1, L2.3',
    category_id VARCHAR(32) NOT NULL,
    name_en VARCHAR(128) NOT NULL,
    name_zh VARCHAR(128) NOT NULL,
    description TEXT,
    priority ENUM('P0', 'P1', 'P2') DEFAULT 'P1',
    unit VARCHAR(32) COMMENT 'score, ratio, count, etc.',
    status ENUM('active', 'deprecated', 'experimental') DEFAULT 'active',
    version INT DEFAULT 1 COMMENT '当前版本号',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES metric_categories(id) ON DELETE RESTRICT,
    INDEX idx_category (category_id),
    INDEX idx_priority (priority),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Metric Formulas (指标算法定义)
CREATE TABLE IF NOT EXISTS metric_formulas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_id VARCHAR(32) NOT NULL,
    version INT NOT NULL COMMENT '算法版本号',
    formula_type ENUM('graphology', 'custom', 'sql', 'javascript') NOT NULL,
    formula_code TEXT NOT NULL COMMENT '算法代码/SQL/函数名',
    parameters JSON COMMENT '可调参数（权重、阈值等）',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(64) COMMENT '创建者',
    
    FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE CASCADE,
    UNIQUE KEY uk_metric_version (metric_id, version),
    INDEX idx_metric (metric_id),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Metric Parameters (可调参数定义)
CREATE TABLE IF NOT EXISTS metric_parameters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    formula_id INT NOT NULL,
    param_name VARCHAR(64) NOT NULL,
    param_type ENUM('number', 'string', 'boolean', 'array', 'object') NOT NULL,
    default_value JSON NOT NULL,
    min_value DECIMAL(10,2) COMMENT '数值类型的最小值',
    max_value DECIMAL(10,2) COMMENT '数值类型的最大值',
    description TEXT,
    
    FOREIGN KEY (formula_id) REFERENCES metric_formulas(id) ON DELETE CASCADE,
    UNIQUE KEY uk_formula_param (formula_id, param_name),
    INDEX idx_formula (formula_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Analysis Results (分析结果缓存)
CREATE TABLE IF NOT EXISTS analysis_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source_id VARCHAR(64) NOT NULL,
    metric_id VARCHAR(32) NOT NULL,
    formula_version INT NOT NULL,
    time_range_start BIGINT NOT NULL COMMENT 'Unix timestamp',
    time_range_end BIGINT NOT NULL COMMENT 'Unix timestamp',
    channel_ids JSON COMMENT '分析的频道列表（NULL=全部）',
    result JSON NOT NULL COMMENT '计算结果（节点分数、图数据等）',
    parameters JSON COMMENT '使用的参数值',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (source_id) REFERENCES data_sources(id) ON DELETE CASCADE,
    FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE CASCADE,
    INDEX idx_source_metric (source_id, metric_id),
    INDEX idx_time_range (time_range_start, time_range_end),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Metric Changelog (指标变更历史)
CREATE TABLE IF NOT EXISTS metric_changelog (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_id VARCHAR(32) NOT NULL,
    change_type ENUM('created', 'updated', 'deprecated', 'formula_changed') NOT NULL,
    old_value JSON COMMENT '变更前的值',
    new_value JSON COMMENT '变更后的值',
    changed_by VARCHAR(64),
    change_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (metric_id) REFERENCES metrics(id) ON DELETE CASCADE,
    INDEX idx_metric (metric_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PART 3: VIEWS (便捷查询视图)
-- ============================================

-- V1: Messages Enriched (消息 + 用户信息)
CREATE OR REPLACE VIEW v_messages_enriched AS
SELECT 
    m.message_id,
    m.source_id,
    m.channel_id,
    m.from_uid,
    u.name AS from_name,
    u.display_name AS from_display_name,
    u.is_bot AS from_is_bot,
    m.content,
    FROM_UNIXTIME(m.timestamp) AS message_time,
    m.reply_to_message_id,
    m.reply_to_uid,
    m.mentioned_uids,
    m.metadata
FROM messages m
JOIN users u ON m.from_uid = u.uid;

-- V2: Channel Stats (频道活跃度统计)
CREATE OR REPLACE VIEW v_channel_stats AS
SELECT 
    c.channel_id,
    c.source_id,
    c.name AS channel_name,
    c.type AS channel_type,
    COUNT(DISTINCT m.from_uid) AS unique_users,
    COUNT(m.message_id) AS total_messages,
    MIN(FROM_UNIXTIME(m.timestamp)) AS first_message_at,
    MAX(FROM_UNIXTIME(m.timestamp)) AS last_message_at
FROM channels c
LEFT JOIN messages m ON c.channel_id = m.channel_id
GROUP BY c.channel_id, c.source_id, c.name, c.type;

-- V3: User Stats (用户活跃度统计)
CREATE OR REPLACE VIEW v_user_stats AS
SELECT 
    u.uid,
    u.source_id,
    u.name,
    u.display_name,
    u.is_bot,
    COUNT(m.message_id) AS total_messages,
    COUNT(DISTINCT m.channel_id) AS channels_active,
    MIN(FROM_UNIXTIME(m.timestamp)) AS first_message_at,
    MAX(FROM_UNIXTIME(m.timestamp)) AS last_message_at
FROM users u
LEFT JOIN messages m ON u.uid = m.from_uid
GROUP BY u.uid, u.source_id, u.name, u.display_name, u.is_bot;

-- V4: Metrics Overview (指标总览)
CREATE OR REPLACE VIEW v_metrics_overview AS
SELECT 
    m.id,
    m.name_zh,
    m.name_en,
    c.name_zh AS category_name,
    m.priority,
    m.status,
    m.version,
    COUNT(DISTINCT f.id) AS formula_count,
    MAX(f.version) AS latest_formula_version,
    m.updated_at
FROM metrics m
LEFT JOIN metric_categories c ON m.category_id = c.id
LEFT JOIN metric_formulas f ON m.id = f.metric_id
GROUP BY m.id, m.name_zh, m.name_en, c.name_zh, m.priority, m.status, m.version, m.updated_at;

-- V5: Latest Analysis (最新分析结果)
CREATE OR REPLACE VIEW v_latest_analysis AS
SELECT 
    a.id,
    a.source_id,
    ds.name AS source_name,
    a.metric_id,
    m.name_zh AS metric_name,
    FROM_UNIXTIME(a.time_range_start) AS analysis_start,
    FROM_UNIXTIME(a.time_range_end) AS analysis_end,
    a.created_at,
    a.formula_version
FROM analysis_results a
JOIN data_sources ds ON a.source_id = ds.id
JOIN metrics m ON a.metric_id = m.id
WHERE a.id IN (
    SELECT MAX(id) 
    FROM analysis_results 
    GROUP BY source_id, metric_id
);
