# Interaction 模块

交互系统模块，提供用户输入处理和事件管理功能。

## 主要组件

### EventBridge
事件桥接器，连接底层输入事件和上层业务逻辑。

**主要功能：**
- 事件类型转换
- 事件冒泡处理
- 跨平台事件标准化
- 事件委托机制

### GestureRecognizer
手势识别器，识别复杂的触摸手势。

**支持手势：**
- 点击/双击
- 拖拽/滑动
- 缩放/旋转
- 多指操作

### InputEvents
输入事件管理器，处理各种输入设备的事件。

**支持设备：**
- 鼠标输入
- 触摸输入
- 键盘输入
- 手柄输入

### InteractionManager
交互管理器，统一管理所有交互行为。

## 使用示例

```typescript
import { InteractionManager, EventBridge } from './interaction';

// 创建交互管理器
const interactionManager = new InteractionManager(canvas);

// 注册事件监听
interactionManager.on('click', (event) => {
  console.log('点击位置:', event.position);
});

// 启用手势识别
interactionManager.enableGesture('pinch', (event) => {
  console.log('缩放手势:', event.scale);
});
```

## 事件类型

### 鼠标事件
- **mousedown/mouseup** - 鼠标按下/释放
- **mousemove** - 鼠标移动
- **wheel** - 滚轮滚动
- **click/dblclick** - 单击/双击

### 触摸事件
- **touchstart/touchend** - 触摸开始/结束
- **touchmove** - 触摸移动
- **touchcancel** - 触摸取消

### 键盘事件
- **keydown/keyup** - 按键按下/释放
- **keypress** - 按键输入

### 自定义手势
- **tap** - 轻击
- **pan** - 平移
- **pinch** - 缩放
- **rotate** - 旋转

## 特色功能

### 事件标准化
- **坐标转换**：屏幕坐标到世界坐标
- **设备适配**：不同设备的事件统一
- **性能优化**：事件节流和防抖
- **内存管理**：自动清理事件监听器

### 高级交互
- **碰撞检测**：准确的点击目标检测
- **事件穿透**：支持多层级事件处理
- **拖拽支持**：完整的拖拽生命周期
- **多点触控**：复杂的多指操作支持

## 相关模块

- `math` - 坐标变换计算
- `engine` - 渲染引擎集成
- `editor` - 编辑器交互