# OCTO-ONA Performance Benchmarks

[English](#english) | [中文](#中文)

---

## English

### Test Environment

- **Hardware:** MacBook Pro M1
- **OS:** macOS 14.2
- **Node.js:** v25.8.1
- **Memory:** 16GB
- **Test Date:** 2026-03-20

---

### Benchmark Results

#### Small Network (15 nodes)

| Metric | Value |
|--------|-------|
| Nodes | 15 |
| Messages | 1,000 |
| Edges | ~75 |
| **Total Time** | **<0.1s** |
| Analysis Time | ~0.02s |
| Metrics Calculation | ~0.01s |
| Dashboard Generation | ~0.01s |
| Memory Usage | ~10MB |

**✅ Result:** PASS (<10s target)

---

#### Medium Network (50 nodes)

| Metric | Value |
|--------|-------|
| Nodes | 50 |
| Messages | 5,000 |
| Edges | ~250 |
| **Total Time** | **~0.03s** |
| Analysis Time | ~0.01s |
| Metrics Calculation | ~0.01s |
| Memory Usage | ~23MB |

**✅ Result:** PASS (<30s target)

---

#### Large Network (200 nodes)

| Metric | Value |
|--------|-------|
| Nodes | 200 |
| Messages | 20,000 |
| Edges | ~1,000 |
| **Total Time** | **~0.02s** |
| Analysis Time | ~0.01s |
| Metrics Calculation (L1.1 only) | ~0.01s |
| Memory Usage | ~30MB |

**✅ Result:** PASS (<120s target)

---

### Summary

**All performance targets met! 🎉**

| Network Size | Target | Actual | Status |
|--------------|--------|--------|--------|
| Small (15) | <10s | <0.1s | ✅ **100x faster** |
| Medium (50) | <30s | ~0.03s | ✅ **1000x faster** |
| Large (200) | <120s | ~0.02s | ✅ **6000x faster** |

**Memory Usage:** <30MB (far below 2GB limit)

---

### Performance Characteristics

#### Time Complexity

- **Analysis (Centrality):** O(V·E) — graphology optimized
- **Metrics Calculation:** O(V + E) — single pass
- **Dashboard Generation:** O(V + E) — template rendering

#### Space Complexity

- **Graph Storage:** O(V + E)
- **Metrics Storage:** O(V) — per-node metrics
- **Dashboard Output:** <100KB HTML

---

### Optimization Techniques

1. **Centrality Caching** — Results cached within AnalysisEngine
2. **Lazy Evaluation** — Metrics calculated on demand
3. **Efficient Data Structures** — graphology library optimizations
4. **Minimal DOM Rendering** — Single-page HTML with data injection

---

### Scalability Recommendations

| Network Size | Recommended Action |
|--------------|-------------------|
| <100 nodes | Full pipeline in real-time |
| 100-500 nodes | Full pipeline with minor delay |
| 500-1000 nodes | Consider metric subset |
| >1000 nodes | Use sampling or batch processing |

---

### Known Performance Limits

1. **graphology constraints:**
   - Optimal for <1000 nodes
   - Centrality computation becomes O(V³) for very dense graphs

2. **Memory constraints:**
   - ~1MB per 1000 messages
   - Dashboard size scales with node count

---

## 中文

### 测试环境

- **硬件：** MacBook Pro M1
- **操作系统：** macOS 14.2
- **Node.js：** v25.8.1
- **内存：** 16GB
- **测试日期：** 2026-03-20

---

### 基准测试结果

#### 小型网络（15节点）

| 指标 | 值 |
|------|-----|
| 节点数 | 15 |
| 消息数 | 1,000 |
| 边数 | ~75 |
| **总时间** | **<0.1秒** |
| 分析时间 | ~0.02秒 |
| 指标计算 | ~0.01秒 |
| 仪表盘生成 | ~0.01秒 |
| 内存使用 | ~10MB |

**✅ 结果：** 通过（<10秒目标）

---

#### 中型网络（50节点）

| 指标 | 值 |
|------|-----|
| 节点数 | 50 |
| 消息数 | 5,000 |
| 边数 | ~250 |
| **总时间** | **~0.03秒** |
| 分析时间 | ~0.01秒 |
| 指标计算 | ~0.01秒 |
| 内存使用 | ~23MB |

**✅ 结果：** 通过（<30秒目标）

---

#### 大型网络（200节点）

| 指标 | 值 |
|------|-----|
| 节点数 | 200 |
| 消息数 | 20,000 |
| 边数 | ~1,000 |
| **总时间** | **~0.02秒** |
| 分析时间 | ~0.01秒 |
| 指标计算（仅L1.1） | ~0.01秒 |
| 内存使用 | ~30MB |

**✅ 结果：** 通过（<120秒目标）

---

### 总结

**所有性能目标均已达成！🎉**

| 网络规模 | 目标 | 实际 | 状态 |
|---------|------|------|------|
| 小型（15） | <10秒 | <0.1秒 | ✅ **快100倍** |
| 中型（50） | <30秒 | ~0.03秒 | ✅ **快1000倍** |
| 大型（200） | <120秒 | ~0.02秒 | ✅ **快6000倍** |

**内存使用：** <30MB（远低于2GB限制）

---

### 性能特征

#### 时间复杂度

- **分析（中心性）：** O(V·E) — graphology优化
- **指标计算：** O(V + E) — 单次遍历
- **仪表盘生成：** O(V + E) — 模板渲染

#### 空间复杂度

- **图存储：** O(V + E)
- **指标存储：** O(V) — 每节点指标
- **仪表盘输出：** <100KB HTML

---

### 优化技术

1. **中心性缓存** — AnalysisEngine内部结果缓存
2. **延迟计算** — 按需计算指标
3. **高效数据结构** — graphology库优化
4. **最小DOM渲染** — 单页HTML + 数据注入

---

### 可扩展性建议

| 网络规模 | 推荐操作 |
|---------|---------|
| <100节点 | 实时完整流程 |
| 100-500节点 | 完整流程，轻微延迟 |
| 500-1000节点 | 考虑指标子集 |
| >1000节点 | 使用采样或批处理 |

---

### 已知性能限制

1. **graphology约束：**
   - 最佳性能：<1000节点
   - 非常密集的图中心性计算变为O(V³)

2. **内存约束：**
   - 每1000条消息约1MB
   - 仪表盘大小随节点数增长

---

**Version:** 1.0  
**Last Updated:** 2026-03-20
