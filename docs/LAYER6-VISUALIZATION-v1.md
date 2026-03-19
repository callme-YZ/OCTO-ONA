# OCTO-ONA Layer 6 可视化层设计 v1.0

**更新时间**: 2026-03-19  
**设计原则**: 从洞察到呈现 - 多层次、可交互、易理解

---

## 一、总览

### 输出形式（4种）

1. **Web Dashboard** — 交互式（主要形式）
2. **PDF报告** — 静态分享
3. **CLI输出** — 快速查看
4. **REST API** — 数据接口

---

## 二、Dashboard页面设计（6页）

### Page 1: 概览页 (Overview)

**核心组件**:
- KPI卡片：节点数/边数/消息数/警告数
- 健康评分：综合评分条
- 网络图：力导向布局
- Top洞察：Layer 5的Top 5

**交互**: 点击节点→节点详情，点击洞察→分析页

---

### Page 2: Bot分析页 (Bot Analytics)

**核心图表**:
- 饼图：Bot功能标签分布（T1-T8）
- 条形图：Top 10活跃Bot
- 表格：Bot详情（名称/标签/消息数/Degree）
- 警示卡：边缘Bot提醒

**交互**: 点击标签→筛选Bot，点击Bot→Bot详情

---

### Page 3: 网络健康页 (Network Health)

**核心图表**:
- 仪表盘卡片：Silo Index/Density/Leadership Distance
- 热力图：团队×团队协作强度
- 列表：过载风险人员 + 孤岛团队

---

### Page 4: 品鉴分析页 (Connoisseurship)

**核心图表**:
- 条形图：品鉴者排名（按频率）
- 雷达图：单个品鉴者4维度（频率/广度/转化/放大）
- 漏斗图：品鉴→Bot响应→Issue→PR转化流程
- 文本卡片：品鉴示例（高/低转化对比）

---

### Page 5: 洞察与建议页 (Insights & Recommendations)

**核心内容**:
- 严重问题列表（Critical）
- 警告列表（Warning）
- 行动清单（优先级排序）

**展示**: 每个洞察展开显示证据+建议

---

### Page 6: 网络图详情页 (Network Graph)

**核心功能**:
- 全屏力导向布局
- 交互：Zoom/拖拽/点击节点
- 筛选：节点类型/边类型/团队

---

## 三、图表类型选择

### 网络关系
- 力导向图 (Force Graph) — 整体网络
- 热力图 (Heatmap) — 团队协作
- 桑基图 (Sankey) — 品鉴传播流

### 分布统计
- 饼图 (Pie) — Bot标签占比
- 直方图 (Histogram) — Degree分布
- 条形图 (Bar) — Top N排名

### 趋势对比
- 折线图 (Line) — 时间序列
- 雷达图 (Radar) — 多维对比
- 漏斗图 (Funnel) — 转化流程

### 指标展示
- 仪表盘 (Gauge) — 单一指标
- 卡片 (Card) — KPI
- 进度条 (Progress) — 健康评分

---

## 四、技术栈

### Web Dashboard
- 前端: Vue 3 + TypeScript
- 图表: ECharts 5.x
- UI: Element Plus
- 后端: FastAPI

### PDF报告
- 图表: Matplotlib + Seaborn
- PDF: ReportLab
- 模板: Jinja2

### CLI输出
- 表格: Rich/Tabulate
- 图表: plotille (ASCII)

### REST API
```
GET /api/v1/reports/{report_id}
GET /api/v1/metrics/{metric_id}
GET /api/v1/insights
GET /api/v1/network/graph
```

---

## 五、配色方案

### 节点颜色
- 人类: #5470C6 (蓝色)
- Bot: #91CC75 (绿色)
- 过载: #EE6666 (红色)
- 边缘: #D3D3D3 (灰色)

### 严重程度
- Critical: #EE6666 (红色)
- Warning: #FAC858 (橙色)
- Info: #73C0DE (蓝色)

---

## 六、交互设计

### Drill-down
```
概览页
  ↓ 点击节点
节点详情
  ↓ 点击"二层网络"
二层网络图
```

### 筛选
- 全局搜索（节点名称/标签）
- 时间筛选（日期范围）
- 条件筛选（团队/类型/阈值）

### 导出
- PNG/SVG（图表）
- JSON（数据）
- CSV（表格）
- PDF（完整报告）

---

## 七、部署方式

### 本地运行
```bash
pip install octo-ona
octo-ona serve --port 8080
```

### Docker
```bash
docker run -p 8080:8080 octo-ona/dashboard
```

### 静态导出
```bash
octo-ona export --output report.html
```

---

## 八、实施优先级

### Phase 1: 核心页面（2周）
- Page 1: 概览页
- Page 5: 洞察与建议页

### Phase 2: 分析页面（2周）
- Page 2-4: Bot/网络/品鉴分析

### Phase 3: 增强功能（2周）
- Page 6: 交互式网络图
- PDF/CLI/API

---

## 九、示例（ECharts网络图配置）

```javascript
const option = {
  title: { text: 'Octo团队协作网络' },
  series: [{
    type: 'graph',
    layout: 'force',
    data: [
      { name: '黄楠', value: 0.60, category: 'human' },
      { name: '无云', value: 0.40, category: 'bot' }
    ],
    links: [
      { source: '黄楠', target: '无云', value: 156 }
    ],
    force: {
      repulsion: 100,
      edgeLength: 200
    }
  }]
}
```

---

**至此，OCTO-ONA核心设计全部完成！**

**变更记录**:
- 2026-03-19: v1.0初始版本，6页Dashboard设计
