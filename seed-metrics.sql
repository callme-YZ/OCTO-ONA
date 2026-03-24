-- ============================================
-- OCTO-ONA Seed Metrics Data
-- Version: 2.0.0
-- Purpose: Initialize 12 P0 metrics into database
-- ============================================

-- Step 1: Insert Metric Categories
INSERT INTO metric_categories (id, name_en, name_zh, description, display_order) VALUES
('network', 'Network Metrics', '网络指标', 'Basic network topology metrics', 1),
('collaboration', 'Collaboration Metrics', '协作指标', 'Human-AI collaboration patterns', 2),
('connoisseurship', 'Connoisseurship Metrics', '品鉴指标', 'Connoisseurship behavior analysis', 3),
('bot_tag', 'Bot Tags', 'Bot标签', 'Bot functional tags', 4)
ON DUPLICATE KEY UPDATE name_en=VALUES(name_en), name_zh=VALUES(name_zh);

-- Step 2: Insert Metrics (12 P0 metrics)

-- L1: Network Metrics (3)
INSERT INTO metrics (id, category_id, name_en, name_zh, description, priority, unit, status, version) VALUES
('L1.1', 'network', 'Degree Centrality', '度中心性', '节点的连接数，反映直接影响力', 'P0', 'score', 'active', 1),
('L1.2', 'network', 'Betweenness Centrality', '中介中心性', '节点的桥梁作用，反映信息中转能力', 'P0', 'score', 'active', 1),
('L1.4', 'network', 'Network Density', '网络密度', '实际边数 / 最大可能边数', 'P0', 'ratio', 'active', 1)
ON DUPLICATE KEY UPDATE name_en=VALUES(name_en), name_zh=VALUES(name_zh);

-- L2: Collaboration Metrics (2)
INSERT INTO metrics (id, category_id, name_en, name_zh, description, priority, unit, status, version) VALUES
('L2.1', 'collaboration', 'Bot Functional Tags', 'Bot功能标签', 'Bot的功能标签（T1-T5）', 'P0', 'tags', 'active', 1),
('L2.2', 'collaboration', 'H2B Collaboration Ratio', '人机协作比例', '人与Bot交互边 / 总边数', 'P0', 'ratio', 'active', 1)
ON DUPLICATE KEY UPDATE name_en=VALUES(name_en), name_zh=VALUES(name_zh);

-- L3: Connoisseurship Metrics (5)
INSERT INTO metrics (id, category_id, name_en, name_zh, description, priority, unit, status, version) VALUES
('L3.1', 'connoisseurship', 'Connoisseurship Frequency', '品鉴行为频率', '品鉴消息占比', 'P0', 'ratio', 'active', 1),
('L3.2', 'connoisseurship', 'Connoisseurship Reach', '品鉴影响广度', '品鉴消息触达的节点数', 'P0', 'nodes', 'active', 1),
('L3.3', 'connoisseurship', 'Connoisseurship Conversion', '品鉴执行转化', '品鉴后有Bot响应的比例 (30分钟内)', 'P0', 'ratio', 'active', 1),
('L3.5', 'connoisseurship', 'Hub Score', 'Hub Score', '被@次数 / 发送消息数 (影响力vs活跃度)', 'P0', 'ratio', 'active', 1)
ON DUPLICATE KEY UPDATE name_en=VALUES(name_en), name_zh=VALUES(name_zh);

-- Bot Tags (2)
INSERT INTO metrics (id, category_id, name_en, name_zh, description, priority, unit, status, version) VALUES
('T5', 'bot_tag', 'High Activity Bot', '高活跃Bot', '消息数 > P75的Bot', 'P0', 'boolean', 'active', 1)
ON DUPLICATE KEY UPDATE name_en=VALUES(name_en), name_zh=VALUES(name_zh);

-- Note: Missing metrics from original 12 P0
-- L2.4 - Bot活跃时段
-- L4.5 - 品鉴评分
-- Will add these if found in codebase

-- Step 3: Insert Metric Formulas (Algorithm implementations)

-- L1.1: Degree Centrality
INSERT INTO metric_formulas (metric_id, version, formula_type, formula_code, parameters, is_active, created_by) VALUES
('L1.1', 1, 'custom', 'computeCentrality().degree', '{}', TRUE, 'seed-script')
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);

-- L1.2: Betweenness Centrality
INSERT INTO metric_formulas (metric_id, version, formula_type, formula_code, parameters, is_active, created_by) VALUES
('L1.2', 1, 'custom', 'computeCentrality().betweenness', '{}', TRUE, 'seed-script')
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);

-- L1.4: Network Density
INSERT INTO metric_formulas (metric_id, version, formula_type, formula_code, parameters, is_active, created_by) VALUES
('L1.4', 1, 'custom', 'getGraphStats().density', '{}', TRUE, 'seed-script')
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);

-- L2.1: Bot Functional Tags
INSERT INTO metric_formulas (metric_id, version, formula_type, formula_code, parameters, is_active, created_by) VALUES
('L2.1', 1, 'custom', 'BotTagger.tagAllBots()', '{}', TRUE, 'seed-script')
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);

-- L2.2: H2B Collaboration Ratio
INSERT INTO metric_formulas (metric_id, version, formula_type, formula_code, parameters, is_active, created_by) VALUES
('L2.2', 1, 'custom', 'edges.filter(H2B/B2H).length / edges.length', '{}', TRUE, 'seed-script')
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);

-- L3.1: Connoisseurship Frequency
INSERT INTO metric_formulas (metric_id, version, formula_type, formula_code, parameters, is_active, created_by) VALUES
('L3.1', 1, 'custom', 'calculateConnoisseurshipFrequency()', '{}', TRUE, 'seed-script')
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);

-- L3.2: Connoisseurship Reach
INSERT INTO metric_formulas (metric_id, version, formula_type, formula_code, parameters, is_active, created_by) VALUES
('L3.2', 1, 'custom', 'detectConnoisseurshipMessages().recipients.size', '{}', TRUE, 'seed-script')
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);

-- L3.3: Connoisseurship Conversion
INSERT INTO metric_formulas (metric_id, version, formula_type, formula_code, parameters, is_active, created_by) VALUES
('L3.3', 1, 'custom', 'connoisseurshipToBot30min()', '{"window_minutes": 30}', TRUE, 'seed-script')
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);

-- L3.5: Hub Score
INSERT INTO metric_formulas (metric_id, version, formula_type, formula_code, parameters, is_active, created_by) VALUES
('L3.5', 1, 'custom', 'calculateHubScore()', '{}', TRUE, 'seed-script')
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);

-- T5: High Activity Bot
INSERT INTO metric_formulas (metric_id, version, formula_type, formula_code, parameters, is_active, created_by) VALUES
('T5', 1, 'custom', 'botMessageCount > P75', '{"percentile": 75}', TRUE, 'seed-script')
ON DUPLICATE KEY UPDATE is_active=VALUES(is_active);

-- Step 4: Insert Parameters (for metrics with configurable params)

-- L3.3: Conversion window parameter
INSERT INTO metric_parameters (formula_id, param_name, param_type, default_value, min_value, max_value, description)
SELECT id, 'window_minutes', 'number', '30', 1, 120, '品鉴后Bot响应的时间窗口（分钟）'
FROM metric_formulas WHERE metric_id = 'L3.3' AND version = 1
ON DUPLICATE KEY UPDATE default_value=VALUES(default_value);

-- T5: Percentile parameter
INSERT INTO metric_parameters (formula_id, param_name, param_type, default_value, min_value, max_value, description)
SELECT id, 'percentile', 'number', '75', 50, 99, '活跃度百分位阈值'
FROM metric_formulas WHERE metric_id = 'T5' AND version = 1
ON DUPLICATE KEY UPDATE default_value=VALUES(default_value);

-- Step 5: Record changelog
INSERT INTO metric_changelog (metric_id, change_type, new_value, changed_by, change_reason)
SELECT id, 'created', JSON_OBJECT('version', 1), 'seed-script', 'Initial metrics seeding for v2.0'
FROM metrics
WHERE id IN ('L1.1', 'L1.2', 'L1.4', 'L2.1', 'L2.2', 'L3.1', 'L3.2', 'L3.3', 'L3.5', 'T5')
ON DUPLICATE KEY UPDATE change_type=VALUES(change_type);

-- Step 6: Verify
SELECT '✅ Seed complete!' AS status;

SELECT 
    mc.name_zh AS category,
    COUNT(m.id) AS metric_count,
    COUNT(mf.id) AS formula_count
FROM metric_categories mc
LEFT JOIN metrics m ON mc.id = m.category_id
LEFT JOIN metric_formulas mf ON m.id = mf.metric_id
GROUP BY mc.id, mc.name_zh
ORDER BY mc.display_order;

SELECT 
    m.id,
    m.name_zh,
    m.priority,
    mf.version AS formula_version,
    COUNT(mp.id) AS param_count
FROM metrics m
LEFT JOIN metric_formulas mf ON m.id = mf.metric_id AND mf.is_active = TRUE
LEFT JOIN metric_parameters mp ON mf.id = mp.formula_id
WHERE m.status = 'active'
GROUP BY m.id, m.name_zh, m.priority, mf.version
ORDER BY m.id;
