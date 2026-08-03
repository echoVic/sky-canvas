# 阶段 B v0.3 声明式场景 SDK 方案

> 目标:让 agent/LLM 用一份**声明式 JSON** 描述画布,SDK 负责把它渲染出来——agent 只管"画布应该长什么样",不碰命令式渲染 API。这是 sky-canvas 区别于 PixiJS/tldraw 的独特叙事("给 agent 用的画布")。

## 背景

阶段 A 已完成 WebGPU 渲染底座:`drawInstancedRects/Circles/Lines`、`drawText`(SDF)、四叉树剔除,实测 3200 对象 116fps。但这些是**命令式** API(`ctx.drawXxx(...)`),要求调用方按顺序发绘制指令——这正是 LLM 不擅长的。LLM 擅长产出**结构化数据**。

阶段 B 在渲染底座之上加一层**声明式 → 命令式**的转换,让"喂一份 JSON → 画布渲染出来"成立。

## 方向(已与用户对齐)

- **形态**:声明式场景(JSON 描述画布,SDK 渲染),类比 React props → 引擎
- **验收**:demo 证明"一段 JSON / LLM 生成的 JSON → 渲染出来"可行
- **范围**:最小闭环,先全量重画,不做增量 diff(留待 v0.4)

## 设计

### 1. 场景 JSON schema(agent 友好)

一份场景 = 视口 + 节点数组。节点用 `type` 字段区分:

```jsonc
{
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "nodes": [
    { "type": "rect",   "x": 100, "y": 100, "width": 200, "height": 80, "color": "#4a9eff" },
    { "type": "circle", "cx": 400, "cy": 300, "radius": 40, "color": "#ff6b6b" },
    { "type": "line",   "x1": 0, "y1": 0, "x2": 500, "y2": 500, "width": 3, "color": "#3fb950" },
    { "type": "text",   "x": 120, "y": 140, "size": 24, "text": "Hello", "color": "#ffffff" }
  ]
}
```

agent 友好的关键选择:
- **颜色用 hex 字符串**(`"#4a9eff"`),不用 `{r,g,b,a}` 浮点——LLM 写 hex 更自然、更少出错。SDK 内部解析成 `Color`。
- **字段名贴近直觉**(rect 用 x/y/width/height,circle 用 cx/cy/radius),与底层 InstanceType 对齐,减少映射心智负担。
- **type 判别式** + 扁平结构,便于 LLM 生成、也便于 JSON schema 校验。

### 2. SceneRenderer(声明式 → 命令式转换)

新文件 `packages/render-engine/src/scene/SceneRenderer.ts`。核心职责:

```typescript
class SceneRenderer {
  constructor(renderer: WebGPURenderer)
  render(scene: Scene): void   // 一份场景 → 一帧命令式绘制调用
}
```

`render(scene)` 内部:
1. 按 `type` 把 nodes **分桶**(rects / circles / lines / texts);
2. 每桶转成对应的实例数组(`RectInstance[]` 等),颜色 hex → `Color`;
3. `beginFrame` → `drawInstancedRects(rects)` / `drawInstancedCircles(circles)` / `drawInstancedLines(lines)` / 逐条 `drawText` → `endFrame`;
4. viewport 映射到 `updateTransform`。

**关键收益**:分桶天然合批——不管 JSON 里 rect/circle 怎么交错,同类型合成一次实例化 draw call。这也顺带把上一版"文本逐段 draw call"的问题在场景层归拢(文本仍逐段,但归在一处,后续好优化)。

### 3. 纯函数抽出(可单测,不依赖 GPU)

把"JSON 节点 → 实例数组"的转换抽成纯函数,便于单测(与 packRectInstances 一致的策略):
- `parseColor(hex: string): Color` — hex/#rgb/#rgba → Color
- `sceneToInstances(scene): { rects, circles, lines, texts }` — 分桶 + 字段映射

SceneRenderer 只负责把这些结果喂给 GPU;转换逻辑全在纯函数里,单测覆盖字段映射、颜色解析、未知 type 跳过、空场景。

### 4. Demo:JSON → 画布

`examples/scene-demo/`(独立 vite,复用现有 WebGPU 初始化):
- 左侧一个 `<textarea>` 放场景 JSON(预填一个示例场景);
- 右侧画布实时渲染该 JSON;
- 编辑 JSON → 重新 render,证明"声明式数据驱动画布"。
- **LLM 环节**(证明 agent 可行):demo 里放一个"示例 prompt + 对应 JSON"的对照,或一个按钮贴入"LLM 生成的场景 JSON",渲染出来。第一版不接真 LLM API(避免密钥/网络依赖),用**预置的几段"LLM 风格 JSON"**证明 schema 是 LLM 能生成的形态即可;真接 LLM 留作后续。

## 复用清单(不重写)

| 复用 | 来源 |
|---|---|
| 所有绘制 API | `WebGPURenderer`(drawInstancedXxx/drawText/updateTransform/begin·endFrame) |
| 实例/颜色类型 | `RectInstance/CircleInstance/LineInstance/Color` |
| 文字图集 | `buildGlyphAtlas` + `setTextAtlas` |
| WebGPU 初始化 | 参照 `examples/perf-demo/main.ts` 的 device/context/format 流程 |

## 验收标准

1. `sceneToInstances` / `parseColor` 纯函数单测通过(字段映射、hex 解析、未知 type 跳过、空场景);
2. scene-demo vite build 通过;
3. 本地(带 GPU 浏览器)编辑 JSON → 画布正确渲染 rect/circle/line/text;
4. 主线 typecheck 零错误。

## 明确不做(推后)

- 增量 diff(新旧场景 diff、只重画变化部分)—— v0.4
- 真 LLM API 接入 —— 后续(第一版用预置 JSON 证明形态)
- 事件/交互(点击命中节点)、动画、嵌套/分组节点

## 风险

- **无 GPU 环境**:转换层(纯函数)可完整单测;实际渲染需本地带 GPU 浏览器验证。
- **schema 是对外契约**:第一版定的字段名/颜色格式会成为 agent 的接口,后续改动有兼容成本——所以第一版 schema 要尽量简单克制(只 4 种节点 + hex 颜色)。
