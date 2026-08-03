# 经验:画柱状图

## 结构

柱状图 = 一条 X 轴 + 一条 Y 轴 + N 根等距柱子 + N 个 X 轴标签(+ 标题)。

## 坐标节奏(关键)

- 先定**基线 y**(所有柱子底边对齐,如 `baseY=320`)和**轴原点 x**(如 `originX=90`)。
- 柱子从 `originX + 间距` 开始,**等距铺开**:第 i 根 `x = originX + 30 + i*70`,统一 `width=50`。
- 柱子**高度代表数值**,但 rect 是从左上角画的,所以 `y = baseY - height`、`height = 数值`。这是最容易画反的地方:**y 要随高度上移,不能固定**。
- X 轴标签 `text` 放在 `baseY` 下方(`y = baseY + 20`),x 与柱子对齐。

## 可复用 ops 骨架

```json
[
  {"op":"add","node":{"type":"text","x":90,"y":50,"size":20,"text":"Title","color":"#e6edf3"}},
  {"op":"add","node":{"type":"line","x1":90,"y1":320,"x2":520,"y2":320,"width":2,"color":"#8b949e"},"id":"xaxis"},
  {"op":"add","node":{"type":"line","x1":90,"y1":80,"x2":90,"y2":320,"width":2,"color":"#8b949e"},"id":"yaxis"},
  {"op":"add","node":{"type":"rect","x":120,"y":220,"width":50,"height":100,"color":"#3fb950"}},
  {"op":"add","node":{"type":"rect","x":190,"y":170,"width":50,"height":150,"color":"#3fb950"}}
]
```

## 坑

- **不要**把所有柱子固定同一个 y。高度不同则 y 不同(`y = baseY - height`)。
- 数值差异大时先做**归一化**(最高柱 ≈ 轴高的 80%),否则要么顶破画布、要么矮到看不见。
- 改某根柱子的值:`update` 同时改 `height` 和 `y`(两者联动),只改 height 会让柱子悬空或穿过基线。
