---
name: canvas-agent
description: 用 Sky Canvas 的声明式场景 SDK 操作画布——先读 snapshot,再按稳定 id 发一组 ops 增量编辑,再读 snapshot 验证。适用于 agent 需要生成或持续编辑一张画布(卡片/图表/流程图/节点图)的场景。
---

# canvas-agent

教 agent 用 Sky Canvas 的场景 SDK 把一张画布"画出来并持续改"。核心是一个循环:**观察 → 引用 → 编辑 → 再观察**——而不是每次重发整份 JSON。

> 这份 skill 是「怎么用」的知识层;能力(runtime)由 `@sky-canvas/render-engine/scene` 提供。站点/领域经验沉淀在 `learnings/`,每次编辑前值得先扫一眼。

## 心智模型

画布是一份**有状态文档**(`SceneDocument`),人和 agent 共用它。每个对象有一个**稳定 id**(如 `n1`),这是你跨轮引用它的句柄。你不直接碰渲染,只做两件事:

1. **读**:`snapshotText(doc)` → 一份紧凑语义快照,每行一个对象;
2. **写**:`applyOps(doc, ops)` → 一组按 id 寻址的编辑操作。

## 循环范式(务必遵守)

```
1. 读快照:snapshotText(doc)   —— 看清画布现在有什么、各自的 #id
2. 想清楚要改什么,组一批 ops(能合并成一趟就不要分多次)
3. applyOps(doc, ops)          —— 一趟应用,逐条看 OpResult.ok
4. 再读快照确认               —— 改动是否如预期;失败的 op 看 error
```

**关键纪律**:
- **永远先 snapshot 再改**。不要凭记忆猜 id——画布可能已被别处改过。
- **用 `#id`(稳定)引用对象,不要用 `@N`(短号)**。`@N` 只在当次快照有效,换一轮就失效。
- **一趟发多个 ops**。把"移动+改色+加标签"合成一个数组,不要来回三次。
- ops 之间**顺序应用**:前面 `add` 出来的 id,后面的 op 可以立即引用。

## 快照格式

```
viewport: (0,0) zoom=1 | 4 objects (showing 4)
@1 #n1 rect   (120,60) 360x320 #161b22
@2 #n2 text   (150,110) "Sign In" size=26 #e6edf3
connections: c1 n1->n2
groups: g1 [n1,n2]
```

- 每行:`@短号 #稳定id 类型 几何 颜色`;text 额外显示内容。
- `(showing N)` < 总数,说明用了视口裁剪,视口外还有对象。
- 坐标是**世界坐标**;颜色是 hex 字符串。

## ops 速查

| op | 形状 | 说明 |
| --- | --- | --- |
| add | `{"op":"add","node":{...},"id"?}` | 新增节点,返回 id。node 见下 |
| update | `{"op":"update","id","patch":{...}}` | 局部改字段(**不能改 type**) |
| move | `{"op":"move","id","dx","dy"}` | 相对位移;id 可为**分组**(整体移动) |
| remove | `{"op":"remove","id"}` | 删除,连带清理其连线/分组成员 |
| connect | `{"op":"connect","from","to","color"?,"width"?}` | 连两节点,按中心画线 |
| group | `{"op":"group","members":[...],"id"?}` | 归组,之后可整体 move |
| setViewport | `{"op":"setViewport","viewport":{x,y,zoom}}` | 平移/缩放视口 |

节点类型(`node` / update 的 `patch`):
- `rect`  `{type,x,y,width,height,color?}`
- `circle` `{type,cx,cy,radius,color?}`
- `line`  `{type,x1,y1,x2,y2,width?,color?}`
- `text`  `{type,x,y,size,text,color?}`

## 健壮性约定

- 未知 id / 未知 op **不抛错**,只在对应 `OpResult.ok=false` + `error` 里报告;某条失败不影响同批其余 op。
- 颜色缺省或非法**回退白色**,不会让整帧崩。
- 所以:发完一批 ops 一定要**检查每条 OpResult**,失败的重新组织再发,别假设全成功。

## 典型任务

- **"把登录按钮改成绿色并下移 20px"** → snapshot 找到那个 rect 的 #id → `[{"op":"update","id":"n7","patch":{"color":"#3fb950"}},{"op":"move","id":"n7","dx":0,"dy":20}]`
- **"给这三个节点两两连线"** → snapshot 拿三个 #id → 三条 `connect`
- **"把整张卡片往右挪 100"** → 先 `group` 卡片所有成员 → 对 group id 发一条 `move`

更多领域惯用手法见 `learnings/`。
