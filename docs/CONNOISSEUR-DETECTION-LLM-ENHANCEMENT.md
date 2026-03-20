# 品鉴检测LLM增强方案

**创建时间**: 2026-03-20  
**当前状态**: Phase 1 (规则式) 已完成，Phase 2 (LLM增强) 待实现  
**优先级**: P1 (可选增强)

---

## 一、当前规则式检测的局限性

### 1.1 边缘案例

**简短对比句**:
```
案例: "没有飞书好用"
规则式得分: 1 (仅comparative)
实际应判定: 品鉴 ✓
```

**隐式批判**:
```
案例: "这个功能有点鸡肋"
规则式得分: 0 (关键词库未覆盖)
实际应判定: 品鉴 ✓
```

### 1.2 误判风险

**关键词误触**:
```
案例: "今天天气很好"
规则式得分: 1 (evaluation: "很好")
实际应判定: 非品鉴 ✗
```

---

## 二、LLM增强策略

### 2.1 混合检测模式

```typescript
function detectConnoisseurship(content: string): boolean {
  // Step 1: 规则式快速筛选
  const ruleScore = ConnoisseurDetector.getScoreBreakdown(content);
  
  // 高置信度：直接返回
  if (ruleScore.total >= 3) return true;  // 强品鉴
  if (ruleScore.total === 0) return false; // 强非品鉴
  
  // Step 2: 边缘案例 (score = 1-2) → LLM判断
  if (ruleScore.total >= 1 && ruleScore.total <= 2) {
    return llmDetector.isConnoisseurship(content);
  }
  
  return ruleScore.total >= 2; // 默认阈值
}
```

### 2.2 LLM选型

**候选模型（小尺寸）**:

| 模型 | 大小 | 推理速度 | 中文能力 | 推荐 |
|------|------|----------|----------|------|
| **Qwen2.5-0.5B-Instruct** | 0.5GB | 极快 | ★★★★★ | ✅ 首选 |
| Phi-3.5-mini-instruct | 3.8GB | 快 | ★★★☆☆ | 备选 |
| Gemma-2-2B-it | 2GB | 快 | ★★★☆☆ | 备选 |
| MiniCPM-1B | 1GB | 极快 | ★★★★☆ | 备选 |

**推荐：Qwen2.5-0.5B-Instruct**
- 阿里云开源，中文优化
- 0.5B参数，推理速度快（CPU可运行）
- 支持function calling和structured output
- 下载：https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct

### 2.3 Prompt设计

```typescript
const CONNOISSEUR_DETECTION_PROMPT = `
你是品鉴行为识别专家。判断以下消息是否为"品鉴"。

**品鉴定义**：
人在与AI/人对话中的专业判断、评价、引导和决策。

**品鉴特征**：
1. 评价性：感觉不对、很好、应该
2. 批判性：为什么、怎么、质疑
3. 对比性：比X好、没有Y好用
4. 品味性：优雅、简洁、别扭

**非品鉴**：
- 纯信息通知："会议改时间了"
- 纯协调工作："请帮忙看一下"
- 闲聊："中午吃什么"

**消息**：{content}

**输出JSON**：
{
  "is_connoisseurship": true/false,
  "confidence": 0.0-1.0,
  "reason": "判断理由"
}
`;
```

### 2.4 实现架构

```typescript
// src/layer3/llm-connoisseur-detector.ts

import { pipeline } from '@xenova/transformers';

export class LLMConnoisseurDetector {
  private static model: any;
  
  static async initialize() {
    this.model = await pipeline(
      'text-generation',
      'Qwen/Qwen2.5-0.5B-Instruct-GGUF',
      { quantized: true }
    );
  }
  
  static async isConnoisseurship(content: string): Promise<boolean> {
    const prompt = CONNOISSEUR_DETECTION_PROMPT.replace('{content}', content);
    
    const result = await this.model(prompt, {
      max_new_tokens: 100,
      temperature: 0.1, // 低温度确保确定性
    });
    
    const response = JSON.parse(result[0].generated_text);
    
    return response.is_connoisseurship && response.confidence > 0.7;
  }
}
```

---

## 三、集成方案

### 3.1 配置选项

```typescript
// Layer 3 AnalysisEngine配置
interface ConnoisseurDetectionConfig {
  mode: 'rule' | 'llm' | 'hybrid';
  llmThreshold?: number; // LLM置信度阈值 (default: 0.7)
  hybridScoreRange?: [number, number]; // 混合模式的规则得分区间 (default: [1, 2])
}
```

### 3.2 使用示例

```typescript
// 纯规则式 (当前实现)
const engine = new AnalysisEngine(graph, {
  connoisseurDetection: { mode: 'rule' }
});

// LLM增强
const engine = new AnalysisEngine(graph, {
  connoisseurDetection: { 
    mode: 'hybrid',
    llmThreshold: 0.7,
    hybridScoreRange: [1, 2]
  }
});

await engine.detectConnoisseurshipMessages();
```

---

## 四、性能优化

### 4.1 缓存机制

```typescript
// 缓存LLM判断结果
const llmCache = new Map<string, boolean>();

function getLLMResult(content: string): Promise<boolean> {
  if (llmCache.has(content)) {
    return Promise.resolve(llmCache.get(content)!);
  }
  
  const result = await LLMConnoisseurDetector.isConnoisseurship(content);
  llmCache.set(content, result);
  return result;
}
```

### 4.2 批量推理

```typescript
// 批量处理减少推理开销
async function detectBatch(messages: Message[]): Promise<boolean[]> {
  const edgeCases = messages.filter(msg => {
    const score = ConnoisseurDetector.getScoreBreakdown(msg.content);
    return score.total >= 1 && score.total <= 2;
  });
  
  // 批量推理
  const results = await LLMConnoisseurDetector.batchInference(
    edgeCases.map(msg => msg.content)
  );
  
  // ...
}
```

---

## 五、评估指标

### 5.1 准确率提升

**测试集**：100条Octo团队真实消息
- 规则式准确率：~85% (预估)
- LLM增强准确率：~95% (目标)

### 5.2 性能指标

| 模式 | 平均延迟 | 吞吐量 (msgs/s) |
|------|----------|-----------------|
| 规则式 | 0.1ms | 10,000 |
| LLM (单条) | 50ms | 20 |
| LLM (batch=10) | 200ms | 50 |
| 混合 | 5ms | 200 |

---

## 六、依赖库

### 6.1 Transformers.js

```bash
npm install @xenova/transformers
```

**优势**：
- 浏览器+Node.js双端支持
- GGUF量化模型支持（CPU推理）
- 零依赖Python环境

### 6.2 ONNX Runtime

```bash
npm install onnxruntime-node
```

**优势**：
- 更快的推理速度
- 支持GPU加速（可选）

---

## 七、实施路线图

### Phase 2.1: 基础LLM集成 (1-2天)

- [ ] 集成Transformers.js
- [ ] 实现LLMConnoisseurDetector类
- [ ] Prompt工程和测试
- [ ] 混合检测模式实现

### Phase 2.2: 性能优化 (1天)

- [ ] 缓存机制
- [ ] 批量推理
- [ ] 配置化选项

### Phase 2.3: 评估验证 (1天)

- [ ] 构建测试集（100条真实消息）
- [ ] 对比规则式 vs LLM准确率
- [ ] 性能基准测试

---

## 八、风险与应对

### 8.1 模型下载大小

**风险**：Qwen2.5-0.5B-Instruct GGUF版本约500MB
**应对**：
- 首次运行时下载并缓存
- 提供离线安装选项
- 文档说明网络要求

### 8.2 推理速度

**风险**：CPU推理可能较慢
**应对**：
- 混合模式只对边缘案例使用LLM
- 批量推理优化
- 可选GPU加速

### 8.3 模型更新

**风险**：Qwen/Phi等模型持续迭代
**应对**：
- 抽象LLMProvider接口
- 支持多模型切换
- 版本锁定

---

## 九、备选方案

### 9.1 API调用

**OpenAI/Claude API**:
```typescript
const response = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  messages: [{ role: 'user', content: prompt }],
  response_format: { type: 'json_object' },
});
```

**优势**：无需本地模型，推理质量高  
**劣势**：需要API Key，成本较高

### 9.2 Fine-tuned小模型

**训练数据**：Octo团队标注的1000条消息  
**模型**：基于Qwen2.5-0.5B微调  
**优势**：定制化，准确率更高  
**劣势**：需要标注成本

---

## 十、总结

**推荐路线**：
1. **Phase 1完成** ✅：规则式检测（当前）
2. **Phase 2.1可选**：Qwen2.5-0.5B混合检测
3. **Phase 2.2可选**：Fine-tuned模型

**性价比最高**：混合模式（规则式快速筛选 + LLM处理边缘案例）

**下一步**：Phase 2 Step 4 (NetworkX高级算法) 优先实现

---

**文档版本**: v1.0  
**作者**: Mayo  
**审核**: 待YZ确认
