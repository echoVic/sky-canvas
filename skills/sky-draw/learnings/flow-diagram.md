# 经验:画流程图 / 节点图

## 结构

节点图 = N 个节点(circle 或 rect)+ M 条 connect 连线 + 每个节点上的 text 标签。

## 关键顺序

1. **先 add 所有节点,拿到它们的 #id**(add 按顺序返回 n1/n2…,或自己传 id 更好记)。
2. **再 connect**:连线按两端节点**中心**自动画线——所以你只管连 id,不用自己算线段端点。这是 connect 相对手画 line 的最大好处。
3. **最后加标签**:text 放在节点中心附近(circle 的 `(cx,cy)` 往左上偏一点,让文字大致居中)。

## 可复用 ops 骨架

```json
[
  {"op":"add","node":{"type":"circle","cx":150,"cy":120,"radius":34,"color":"#f778ba"},"id":"A"},
  {"op":"add","node":{"type":"circle","cx":350,"cy":120,"radius":34,"color":"#ffa657"},"id":"B"},
  {"op":"add","node":{"type":"circle","cx":250,"cy":300,"radius":34,"color":"#3fb950"},"id":"C"},
  {"op":"connect","from":"A","to":"B","width":2,"color":"#58a6ff"},
  {"op":"connect","from":"B","to":"C","width":2,"color":"#58a6ff"},
  {"op":"add","node":{"type":"text","x":140,"y":112,"size":15,"text":"A","color":"#0d1117"}}
]
```

## 移动整块

要把一个"子图"整体挪走:先 `group` 它的节点,再对 group id 发 `move`。**连线会自动跟随**——因为连线渲染时按节点当前中心重算,移动节点后线自然跟着走。这是文档模型 vs 手画 line 的核心区别:手画 line 移动节点后线会脱节。

## 坑

- 自定义节点 id 用有意义的名字(`A`/`login`/`db`),比 `n7` 好在后续 connect/move 时不用回查快照。
- connect 的端点必须是**已存在**的节点 id,否则该条 `OpResult.ok=false`。先 add 再 connect。
- 删节点用 `remove`:它会**连带删掉挂在它上面的连线**,不用手动清理悬空线。
