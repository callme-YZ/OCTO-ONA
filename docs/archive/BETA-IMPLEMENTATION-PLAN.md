# OCTO-ONA Beta 版本实施计划

**版本**: Beta v1.0  
**目标**: 重现Octo报告的核心发现（品鉴金字塔）  
**范围**: 核心功能，单页Dashboard

---

## Phase 1: 数据提取层（Layer 1）

### 目标
实现DMWork数据适配器，能够提取并过滤主题数据。

### Steps

#### Step 1.1: 项目初始化
- 创建Python项目结构
- 设置依赖管理（requirements.txt或pyproject.toml）
- 配置开发环境

**产出**:
```
octo-ona/
├── octo_ona/
│   ├── __init__.py
│   ├── layer1/
│   ├── layer2/
│   ├── layer3/
│   └── layer4/
├── tests/
├── examples/
├── requirements.txt
└── README.md
```

**测试标准**:
- ✅ Python项目可以导入（`import octo_ona`）
- ✅ 依赖安装成功（pymysql, networkx, pydantic等）

---

#### Step 1.2: Layer 2数据模型实现
**优先实现Layer 2，因为Layer 1依赖它**

- 实现Pydantic模型（5个）
  - HumanNode, AIAgentNode, Edge, Message, NetworkGraph

**产出**: `octo_ona/layer2/models.py`

**测试标准**:
- ✅ 模型可以实例化
- ✅ JSON序列化/反序列化成功
- ✅ 验证规则生效（必填字段、类型检查）

#### Step 1.3: BaseAdapter接口实现
- 实现BaseAdapter抽象类
- 实现过滤方法（uid_whitelist, channel_ids）

**产出**: `octo_ona/layer1/base_adapter.py`

**测试标准**:
- ✅ 抽象方法定义正确
- ✅ 过滤方法单元测试通过

#### Step 1.4: DMWorkAdapter实现
- 数据库连接、5张message表查询
- to_uids推断逻辑、过滤参数支持

**产出**: `octo_ona/layer1/dmwork_adapter.py`

**测试标准**:
- ✅ 连接DMWork数据库成功
- ✅ 查询5张message表成功
- ✅ UID白名单过滤有效（267K→33K）

#### Step 1.5: 数据验证逻辑
- 实现数据完整性检查、合理性验证

**产出**: `octo_ona/layer1/validator.py`

**测试标准**:
- ✅ 检测节点数/消息数过少
- ✅ 生成警告信息

### Phase 1 验收标准
- ✅ 能从DMWork提取Octo数据（15节点，33,770条消息）
- ✅ UID白名单过滤有效（267K→33K，87.4%减少）
- ✅ 输出NetworkGraph JSON文件

---

## Phase 2: 分析引擎层（Layer 3）

### 目标
实现核心分析算法，重点是Hub Score计算和品鉴识别。

### Steps

#### Step 2.1: AnalysisEngine基础实现
- NetworkX图转换、缓存机制

**产出**: `octo_ona/layer3/analysis_engine.py`

#### Step 2.2: Hub Score计算
- 实现calculate_hub_score()方法
- 处理∞和0/0情况

**测试标准**（关键）:
- ✅ CharlieUID = ∞（405被@, 0发送）
- ✅ BobUID ≈ 4.0（1187被@, 299发送）
- ✅ AliceUID ≈ 0.3（239被@, 900发送）
- ✅ DavidUID < 0.05（97被@, 5270发送）

#### Step 2.3: 品鉴识别（规则式）
- 4维度关键词匹配、上下文验证

**测试标准**:
- ✅ 识别"UI有问题"为品鉴
- ✅ 过滤"好的，知道了"

#### Step 2.4: NetworkX图算法集成
- Degree/Betweenness/Closeness Centrality

### Phase 2 验收标准
- ✅ Hub Score计算正确（Charlie=∞，Bob≈4.0）
- ✅ 品鉴识别有效
- ✅ 输出analysis-results.json

---

## Phase 3: 指标计算层（Layer 4）

### 目标
实现P0核心指标（12个）。

### Steps

#### Step 3.1: MetricsCalculator基础实现
- 指标注册机制

#### Step 3.2: 品鉴指标（L3.1-L3.5）
- L3.1品鉴频率、L3.2影响广度、L3.3执行转化、L3.5 Hub Score

**测试标准**:
- ✅ L3.1: David品鉴频率 > 30%
- ✅ L3.5: Hub Score值正确

#### Step 3.3: 网络指标（L1.1, L1.2, L1.4）
- Degree/Betweenness Centrality、Network Density

#### Step 3.4: Bot标签（T1-T5）
- 跨团队连接、团队枢纽、人类代理、信息聚合、高活跃

**测试标准**:
- ✅ T5: wuyun_bot标记为高活跃

### Phase 3 验收标准
- ✅ 12个P0指标全部计算成功
- ✅ 输出metrics.json

---

## Phase 4: 可视化层（Layer 6 - 单页Dashboard）

### 目标
生成单页HTML Dashboard，5个核心图表。

### Steps

#### Step 4.1: Dashboard HTML模板
- ECharts库集成、响应式布局

#### Step 4.2: 核心图表实现（5个）
1. **Hub Score条形图**（品鉴金字塔，5层配色）
2. **网络图**（Force-directed布局）
3. **Bot标签饼图**（8种标签）
4. **消息时间序列**（折线图）
5. **Top 10互动表格**

**测试标准**:
- ✅ 5个图表全部渲染成功
- ✅ 数据绑定正确

#### Step 4.3: Dashboard生成器
- 数据注入、模板渲染

### Phase 4 验收标准
- ✅ octo-ona-beta-dashboard.html生成成功（<500KB）
- ✅ 5个图表全部可见
- ✅ 品鉴金字塔清晰（CharlieL4, BobL5, AliceL2, DavidL1）

---

## Phase 5: 集成测试与文档

### 目标
端到端测试 + 用户文档。

### Steps

#### Step 5.1: 端到端测试
**测试场景1**: 完整Octo分析流程（提取→分析→指标→Dashboard）
**测试场景2**: 边界情况（空网络、Hub Score=∞）

**验收标准**:
- ✅ 4步流程全部成功
- ✅ 程序不崩溃

#### Step 5.2: 用户文档
- README.md（快速开始）
- user-guide.md（配置说明）
- api.md（API文档）

#### Step 5.3: 性能测试
**测试数据集**: 小（15节点）、中（50节点）、大（200节点）

**验收标准**:
- ✅ 小规模：<10秒完成全流程
- ✅ 内存占用：<2GB

### Phase 5 验收标准
- ✅ 端到端测试通过
- ✅ 用户文档完整

---

## Beta 版本总验收标准

### 核心功能验收（必须100%通过）
- ✅ 数据提取: 15节点，33,770消息（Octo）
- ✅ Hub Score: Charlie=∞, Bob≈4.0, Alice≈0.3, David≈0.0
- ✅ 可视化: 单页Dashboard，5个图表，品鉴金字塔5层

### 质量验收
- ✅ 单元测试通过（覆盖率>80%）
- ✅ 文档完整可用
- ✅ Octo数据集全流程<10秒

### 交付物清单
- ✅ Python包（octo-ona）+ 测试 + 示例
- ✅ 文档（README + user-guide + api）
- ✅ 示例输出（network.json + metrics.json + dashboard.html）

---

## 成功标准（最终验收）

**"成功" = 用Beta版本完整重现Octo报告的核心发现**

验收方法:
```bash
python examples/full_pipeline.py --config octo_config.yaml
open octo-ona-beta-dashboard.html
```

验证清单:
- ✅ Hub Score图表显示5层金字塔
- ✅ Charlie在L4（HS=∞）、Bob在L5（HS=4.0）
- ✅ Alice在L2（HS=0.3）、David在L1（HS=0.0）
- ✅ 网络图显示15节点
- ✅ Bot标签分布合理

**通过标准**: 以上全部验证通过 ✅

---

**计划制定时间**: 2026-03-19  
**预期交付**: Beta v1.0（功能完整，文档齐全，质量合格）
