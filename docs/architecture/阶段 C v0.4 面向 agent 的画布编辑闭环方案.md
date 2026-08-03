# 阶段 C v0.4 面向 agent 的画布编辑闭环方案

> 目标:让 agent **观察 → 引用 → 编辑**一张**已存在**的画布,而不只是一次性灌一份全量 JSON。这是从"agent 会画图"到"agent 能持续操作画布"的关键一跃,也是 sky-canvas 作为**编辑器**(而非只读渲染器)的核心叙事。

## 背景

阶段 B(v0.3)已完成声明式渲染:一份 Scene JSON → 全量重画。它解决了"agent 生成一整张图"的场景,但**只有单向的写**,缺三件事:

1. **读**:agent 看不到画布当前有什么,只能凭自己上一次发的 JSON 记忆;
2. **引用**:节点没有稳定 id,agent 无法指名道姓"把那个登录按钮……";
3. **增量编辑**:任何小改动都得重发整份 JSON,既费 token 又易出错(重发时容易漏字段、改错别处)。

真实的 agent 编辑器,交互不是"每轮吐一份完整 JSON",而是一个循环:**看当前状态 → 拿到目标对象的句柄 → 发一小组修改 → 再看**。

## 借鉴:ego-lite「面向 agent 的浏览器」

[ego-lite](https://github.com/citrolabs/ego-lite) 是面向 agent 的浏览器,它抽掉浏览器外壳后,留下三条可直接迁移到画布的设计:

### 1. Snapshot:给 agent 一份「语义视图」,不是原始数据

ego 不把 DOM/HTML 甩给 agent,而是从无障碍树压缩出一份**几百 token 的结构化文本**——标题、可交互元素、角色和名字,每个元素配一个临时编号 `@N`。目的:让 agent 能决定"点哪个、填哪个",**无需原始 HTML 或屏幕坐标**。

对应到画布:agent 不需要拿到几万个顶点/实例数据,它需要的是"画布上有哪些**对象**、各自是什么、在哪、什么颜色"——一份**对象级语义快照**。

### 2. Ref 寻址:临时 `@N` + 稳定 `loc=` 双轨

ego 里 `@N` 只对**最近一次 snapshot** 有效(页面一变即失效),需要跨步骤稳定引用时用 `loc=` 选择器。这是"短期句柄 + 长期定位符"的双层寻址。

对应到画布:我们给每个节点一个**稳定 id**(长期),快照里额外给一个**短号 `@N`**(当轮方便),agent 两者都能用来寻址。

### 3. Code-base 而非 CLI-base:一趟批量执行

ego 最大的效率杠杆:agent 不是"调一个工具→看结果→再调"循环,而是**写一段脚本、一次性调用多个预注入 helper**,一趟执行完再回报。它宣称因此更快、token 更省。本质:**把多步压成一次输出**,砍掉往返。

对应到画布:agent **一次发一组 ops**(增/移/改色/连线/删),SDK 一趟应用、回一份新快照。

### 4. Runtime / Skill 两层解耦(集成方式)

ego 把系统拆成两层:

- **runtime**(`package/ego-browser/`):浏览器桥 + helper + 执行入口——**能力**;
- **skill**(`skills/ego-browser/`):`SKILL.md` 教 agent 怎么用 + `learnings/` 沉淀站点经验——**可积累的知识**。

关键设计:`ego-browser 自身不携带可变的 agent 经验`,默认从 skill bundle 加载 helper 扩展与学到的经验;两者解耦,**经验可以独立于 runtime 代码生长**。这正是"skill 更好地集成使用"的含义——skill 不是文档,是 agent 用这套 API 的**可分发、可积累的操作知识**。

## 方向(待与用户确认的边界见文末)

- **形态**:在声明式渲染之上,补齐 agent 编辑闭环——**snapshot(读)+ ops(增量写)+ 稳定 id(引用)**;
- **集成**:配一个 `canvas-agent` skill,教 agent 用这套 API,并预留 `learnings/` 经验目录;
- **范围**:MVP 先做**文档模型 + 快照 + 一组核心 ops**,ops 应用后仍走**全量重渲染**(增量渲染 diff 留到后续);渲染性能底座阶段 A 已够用。

## 设计

### 核心洞见:人和 agent 共用一份画布文档

就像 ego「人和 agent 共用一个浏览器」,我们是「人和 agent 共用一份画布**文档**」。声明式全量 JSON 只是其中一种 bulk-load 操作;人类编辑器的拖拽改色、和 agent 的 ops,**走同一套文档模型 + 同一组操作原语**。

```
        人类编辑器 UI  ──┐
                          ├──►  SceneDocument(带稳定 id 的节点集)──►  WebGPU 渲染
        agent ops    ──┘            ▲
                                     │
   agent 循环:snapshot() ─► 发一批 ops(按 id 寻址)─► apply → 重渲染 ─► 再 snapshot
```

### 1. SceneDocument:带稳定 id 的文档模型

阶段 B 的 `Scene` 是一份**无状态的**渲染输入(nodes 数组,无 id)。阶段 C 引入**有状态的** `SceneDocument`,持有节点集合,每个节点带稳定 id。

```typescript
interface DocNode {
  id: string            // 稳定 id(agent 的长期寻址句柄);新增时 SDK 生成
  node: SceneNode       // 复用阶段 B 的 SceneNode(rect/circle/line/text)
}

class SceneDocument {
  add(node: SceneNode, id?: string): string     // 返回 id
  update(id: string, patch: Partial<SceneNode>): boolean
  remove(id: string): boolean
  get(id: string): DocNode | undefined
  toScene(): Scene                               // 导出成阶段 B 的 Scene 供渲染
  static fromScene(scene: Scene): SceneDocument   // 从全量 JSON 装载(bulk-load)
}
```

- **id 生成不依赖随机数**(worker/测试环境 `Math.random` 不可用):用自增计数器 `n1/n2/...`,或调用方显式传入。
- `toScene()` 把文档摊平回阶段 B 的 `Scene`,**渲染完全复用 SceneRenderer**——阶段 C 不碰渲染层。

### 2. snapshot():对象级语义快照(读的那一半)

把文档压成一份**紧凑、agent 友好**的文本/结构,对标 ego 的 snapshot。

```typescript
function snapshot(doc: SceneDocument): SceneSnapshot
// 文本形态(给 LLM 读)示例:
// viewport: (0,0) zoom=1  |  4 objects
// @1 #n1 rect   (120,60) 360x320  #161b22
// @2 #n2 text   (150,110) "Sign In" size=26 #e6edf3
// @3 #n3 rect   (150,285) 300x46  #2f81f7
// @4 #n4 text   (258,314) "Log In" size=16 #ffffff
```

- 每行一个对象:`@N`(当轮短号)+ `#id`(稳定 id)+ 类型 + 关键几何 + 颜色 + 文本内容;
- **只读、不改状态**(和 ego 一致);
- 短号 `@N` 只在**本次 snapshot** 有效,`#id` 跨轮稳定——双轨寻址;
- 结构化形态 `SceneSnapshot { viewport, objects: {ref, id, type, summary}[] }` 供程序消费,文本形态供 LLM 直接读。

### 3. ops:按 id 寻址的编辑操作(增量写)

一小组**判别式联合**的操作,覆盖 agent 编辑画布的高频动作:

```typescript
type SceneOp =
  | { op: 'add';      node: SceneNode; id?: string }
  | { op: 'update';   id: string; patch: Partial<SceneNode> }   // 改坐标/尺寸/颜色/文本
  | { op: 'move';     id: string; dx: number; dy: number }       // 相对位移(高频,单列)
  | { op: 'remove';   id: string }
  | { op: 'setViewport'; viewport: SceneViewport }

interface OpResult { ok: boolean; id?: string; error?: string }  // 逐条结果,不抛错

function applyOps(doc: SceneDocument, ops: SceneOp[]): OpResult[]
```

- **批量一趟**:agent 一次发一组 ops,`applyOps` 顺序应用、每条返回结果(未知 id 记 error 而非抛错,对齐阶段 B「不抛错」的健壮性基调);
- `move` 单列而非都走 `update`:位移是最高频操作,给个语义化捷径(类比 ego 把 `click` 单列而非都走 `js()`);
- 应用后 `doc.toScene()` → `SceneRenderer.render()` **全量重渲染**(MVP 够用,阶段 A 性能扛得住)。

### 4. 纯函数 / 无 GPU 依赖(可单测)

`SceneDocument`、`snapshot`、`applyOps` **全部不依赖 WebGPU**,是对文档模型的纯操作,可在 vitest(jsdom)完整单测——延续阶段 B「转换层纯函数可测、渲染层留给本地 GPU 目视」的分层。

### 5. canvas-agent skill(集成层)

对齐 ego 的 runtime/skill 拆分:

```
skills/canvas-agent/
├── SKILL.md          # 教 agent:先 snapshot → 按 #id/@N 发 ops → 再 snapshot 的循环范式 + ops 速查
└── learnings/        # 预留:沉淀"画某类图的惯用手法"(如画柱状图/流程图的常用 ops 序列)
```

- **runtime = 我们的 SDK**(SceneDocument/snapshot/applyOps + 渲染);**skill = 怎么用 + 经验**;
- MVP 先只写 `SKILL.md`(讲清循环范式与 ops 契约),`learnings/` 建目录留结构,内容后续沉淀。

## 落地拆解(建议任务)

1. `SceneDocument`(带 id 的文档模型 + `toScene/fromScene`)
2. `snapshot()`(结构化 + 文本双形态)
3. `applyOps()` + `SceneOp`/`OpResult` 类型
4. 三者纯函数单测(add/update/move/remove、未知 id、bulk-load 往返、snapshot 文本格式)
5. 扩展 scene-demo:加一个「ops 控制台」——输入一组 ops JSON,应用后重渲染 + 显示新 snapshot,目视验证编辑闭环
6. `canvas-agent` skill 的 `SKILL.md`

## 验收标准

- `SceneDocument`/`snapshot`/`applyOps` 单测全绿(纯函数,不依赖 GPU);
- scene-demo「ops 控制台」`vite build` 通过;
- ⚠️ **画布运行时编辑闭环需本地(带 GPU 浏览器)目视验证**:snapshot 读出对象 → 发 ops → 画布正确更新(worker 无 GPU,同阶段 B)。

## 待确认的边界

1. **ops 集合的范围**:MVP 是否就 `add/update/move/remove/setViewport` 五个?是否要在阶段 C 就纳入 `connect`(连线,流程图/节点图刚需)、`group`(分组)?
2. **snapshot 详略**:是否需要视口裁剪(只快照可见对象,对标 ego 的 `only_within_viewport`)?还是 MVP 先全量快照?
3. **skill 深度**:阶段 C 只写 `SKILL.md`,还是要连 `learnings/` 的一两个示例经验一起做?
4. **是否真接一次 LLM**:阶段 B 用预置 JSON 证形态;阶段 C 是否要在 demo 里真的接一次 LLM,让它读 snapshot、吐 ops,跑通全闭环?
