# 交互系统文档

Render Engine 的统一交互系统提供了完整的用户输入处理、事件管理和手势识别功能。

## 📋 架构概览

```
交互系统架构
├── InteractionManager     # 统一交互管理器
├── EventTypes            # 统一事件类型定义
├── EventBridge          # 事件桥接器
└── events/              # 事件系统核心
    ├── EventBus         # 事件总线
    ├── EventEmitter3     # 事件分发器
    ├── InputEvents      # 输入事件定义
    ├── InputState       # 输入状态管理
    └── GestureRecognizer # 手势识别器
```

## 🚀 快速开始

### 基本使用

```typescript
import { InteractionManager, InputEventType } from '@sky-canvas/render-engine';

// 创建交互管理器
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const interactionManager = new InteractionManager(canvas, {
  enableGestures: true,
  enableMouse: true,
  enableTouch: true,
  enableKeyboard: true
});

// 监听鼠标事件
interactionManager.addEventListener(InputEventType.MOUSE_DOWN, (event) => {
  console.log('鼠标按下:', event.worldPosition);
});

// 监听触摸事件
interactionManager.addEventListener(InputEventType.TOUCH_START, (event) => {
  console.log('触摸开始:', event.touches.length + '个触点');
});

// 监听手势事件
interactionManager.addEventListener(InputEventType.GESTURE_CHANGE, (event) => {
  console.log('手势变化:', {
    scale: event.scale,
    rotation: event.rotation,
    center: event.center
  });
});
```

### 视口坐标转换

```typescript
import { ViewportTransform } from '@sky-canvas/render-engine';

// 实现视口变换
const viewportTransform: ViewportTransform = {
  screenToWorld: (point) => ({
    x: point.x + viewport.x,
    y: point.y + viewport.y
  }),
  worldToScreen: (point) => ({
    x: point.x - viewport.x,
    y: point.y - viewport.y
  })
};

// 设置视口变换
interactionManager.setViewportTransform(viewportTransform);
```

## 🎯 核心功能

### 1. InteractionManager - 统一交互管理器

提供统一的交互系统入口，整合所有输入处理功能。

#### 特性

- **多输入支持**：鼠标、触摸、键盘、手势
- **事件统一**：标准化的事件接口
- **状态管理**：自动维护输入状态
- **坐标转换**：自动处理屏幕-世界坐标转换
- **事件合成**：双击、长按等复合事件

#### 配置选项

```typescript
interface InteractionConfig {
  enableGestures?: boolean;     // 启用手势识别
  enableMouse?: boolean;        // 启用鼠标交互
  enableTouch?: boolean;        // 启用触摸交互
  enableKeyboard?: boolean;     // 启用键盘交互
  gestureConfig?: IGestureConfig; // 手势配置
  preventDefault?: boolean;     // 阻止默认行为
  stopPropagation?: boolean;    // 阻止事件冒泡
}
```

### 2. 事件系统

#### EventBus - 事件总线

基于 EventEmitter3 的类型安全事件系统。

```typescript
import { EventBus } from '@sky-canvas/render-engine';

const eventBus = new EventBus();

// 添加监听器
const disposable = eventBus.on('test', (data) => {
  console.log('收到事件:', data);
});

// 发射事件
eventBus.emit('test', { message: 'Hello World' });

// 移除监听器
disposable.dispose();
```

#### EventEmitter3 - 事件分发器

提供更高级的事件分发功能。

```typescript
import EventEmitter3 from 'eventemitter3';

const dispatcher = new EventEmitter3();

// 添加事件监听器
dispatcher.addEventListener('custom', (event) => {
  console.log('自定义事件:', event);
});

// 分发事件
const customEvent = {
  type: 'custom',
  timestamp: performance.now(),
  data: { value: 42 },
  preventDefault: () => {},
  stopPropagation: () => {},
  isDefaultPrevented: () => false,
  isPropagationStopped: () => false
};

dispatcher.dispatchEvent(customEvent);
```

### 3. 手势识别

#### GestureRecognizer - 手势识别器

支持多点触控手势识别。

```typescript
import { GestureRecognizer, GestureType } from '@sky-canvas/render-engine';

const gestureRecognizer = new GestureRecognizer({
  minDistance: 10,
  minScale: 0.1,
  minRotation: 0.1,
  longPressTimeout: 500
});

// 监听缩放手势
gestureRecognizer.addEventListener(GestureType.PINCH, (event) => {
  console.log('缩放手势:', event.scale);
});

// 监听旋转手势
gestureRecognizer.addEventListener(GestureType.ROTATE, (event) => {
  console.log('旋转手势:', event.rotation);
});
```

#### 支持的手势类型

- **PINCH** - 缩放（双指捏合）
- **ROTATE** - 旋转（双指旋转）
- **PAN** - 平移（双指拖拽）
- **TAP** - 点击
- **DOUBLE_TAP** - 双击
- **LONG_PRESS** - 长按

### 4. 事件桥接

#### EventBridge - 事件桥接器

Canvas SDK 与 Render Engine 之间的高性能事件通信桥梁。

```typescript
import { EventBridge, BridgeEventType, EventPriority } from '@sky-canvas/render-engine';

const bridge = new EventBridge();

// 添加事件监听器
bridge.addEventListener(BridgeEventType.MOUSE_MOVE, (event) => {
  console.log('鼠标移动:', event.data);
});

// 发射事件
bridge.emit(BridgeEventType.MOUSE_MOVE,
  { x: 100, y: 200 },
  EventPriority.NORMAL,
  'canvas-sdk'
);

// 批量发射事件
bridge.emitBatch([
  { type: BridgeEventType.MOUSE_DOWN, data: { x: 100, y: 200 } },
  { type: BridgeEventType.MOUSE_UP, data: { x: 100, y: 200 } }
]);
```

#### 事件优化特性

- **优先级队列**：不同优先级的事件分别处理
- **事件去重**：16ms 窗口内的重复事件自动过滤
- **批处理**：非紧急事件批量处理
- **时间片调度**：每帧最多处理 5ms 的事件
- **性能监控**：内置事件处理统计

### 5. 碰撞检测

#### CollisionDetector - 碰撞检测器

高性能的碰撞检测系统，支持空间分割优化。

```typescript
import { CollisionDetector, CollisionType } from '@sky-canvas/render-engine';

// 创建碰撞检测器
const collisionDetector = new CollisionDetector(100); // 100px 网格大小

// 添加碰撞对象
const collisionObject = {
  id: 'object1',
  bounds: { x: 0, y: 0, width: 100, height: 100 },
  geometry: {
    type: CollisionType.RECT,
    bounds: { x: 0, y: 0, width: 100, height: 100 }
  },
  visible: true,
  enabled: true,
  zIndex: 0
};

collisionDetector.addObject(collisionObject);

// 点击测试
const hitResult = collisionDetector.pointTest({ x: 50, y: 50 });
if (hitResult.hit) {
  console.log('点击到对象:', hitResult.object?.id);
}

// 射线投射
const raycastResult = collisionDetector.raycast(
  { x: 0, y: 0 },    // 起点
  { x: 1, y: 0 },    // 方向
  200                // 最大距离
);
```

## 📚 事件类型参考

### InputEventType - 输入事件类型

```typescript
enum InputEventType {
  // 鼠标事件
  MOUSE_DOWN = 'mousedown',
  MOUSE_MOVE = 'mousemove',
  MOUSE_UP = 'mouseup',
  MOUSE_WHEEL = 'mousewheel',

  // 触摸事件
  TOUCH_START = 'touchstart',
  TOUCH_MOVE = 'touchmove',
  TOUCH_END = 'touchend',

  // 键盘事件
  KEY_DOWN = 'keydown',
  KEY_UP = 'keyup',

  // 手势事件
  GESTURE_START = 'gesturestart',
  GESTURE_CHANGE = 'gesturechange',
  GESTURE_END = 'gestureend',

  // 组合事件
  CLICK = 'click',
  DOUBLE_CLICK = 'doubleclick',
  LONG_PRESS = 'longpress'
}
```

### 事件优先级

```typescript
enum EventPriority {
  IMMEDIATE = 0,    // 立即处理（鼠标点击）
  HIGH = 1,         // 高优先级（键盘输入）
  NORMAL = 2,       // 正常优先级（鼠标移动）
  LOW = 3,          // 低优先级（场景更新）
  IDLE = 4          // 空闲时处理（统计更新）
}
```

## 🎨 最佳实践

### 1. 性能优化

```typescript
// 使用事件委托减少监听器数量
interactionManager.addEventListener(InputEventType.MOUSE_MOVE, (event) => {
  // 批量处理，避免频繁操作
  requestAnimationFrame(() => {
    updateUI(event.worldPosition);
  });
});

// 使用防抖处理高频事件
const debouncedHandler = debounce((event) => {
  handleResize(event);
}, 100);

interactionManager.addEventListener(InputEventType.MOUSE_MOVE, debouncedHandler);
```

### 2. 内存管理

```typescript
// 总是清理事件监听器
const disposable = interactionManager.addEventListener('event', handler);

// 在组件销毁时清理
onDestroy(() => {
  disposable.dispose();
  interactionManager.dispose();
});
```

### 3. 错误处理

```typescript
// 使用 try-catch 包装事件处理器
interactionManager.addEventListener(InputEventType.MOUSE_DOWN, (event) => {
  try {
    handleMouseDown(event);
  } catch (error) {
    console.error('事件处理错误:', error);
  }
});
```

### 4. 类型安全

```typescript
// 使用类型断言确保类型安全
interactionManager.addEventListener(InputEventType.MOUSE_DOWN, (event) => {
  const mouseEvent = event as IMouseEvent;
  console.log('鼠标按键:', mouseEvent.button);
});
```

## 🔧 配置选项

### 事件常量

```typescript
const EVENT_CONSTANTS = {
  DOUBLE_CLICK_DELAY: 300,           // 双击间隔（毫秒）
  DOUBLE_CLICK_MAX_DISTANCE: 5,     // 双击最大距离（像素）
  LONG_PRESS_DELAY: 500,            // 长按延迟（毫秒）
  GESTURE_MIN_DISTANCE: 10,         // 手势最小距离
  GESTURE_MIN_SCALE: 0.1,           // 手势最小缩放
  GESTURE_MIN_ROTATION: 0.1,        // 手势最小旋转
  DEDUPLICATION_WINDOW: 16,         // 去重窗口（毫秒）
  EVENT_TIMEOUT: 5000,              // 事件超时（毫秒）
  MAX_QUEUE_SIZE: 1000,             // 最大队列大小
  MAX_LISTENERS_PER_EVENT: 50,      // 每个事件的最大监听器数
  TIME_SLICE: 5                     // 时间片（毫秒）
};
```

## 🐛 调试支持

### 调试工具

```typescript
// 启用调试模式
const interactionManager = new InteractionManager(canvas, {
  debug: true
});

// 获取输入状态
const inputState = interactionManager.inputState;
console.log('当前输入状态:', inputState.getDebugInfo());

// 获取事件统计
const eventBridge = new EventBridge();
console.log('事件统计:', eventBridge.getStats());
```

### 常见问题

1. **事件不触发**：检查元素的 `pointer-events` CSS 属性
2. **坐标不准确**：确保设置了正确的 `ViewportTransform`
3. **手势识别失败**：检查手势配置参数是否合理
4. **性能问题**：使用事件去重和批处理功能

## 📖 API 参考

详细的 API 文档请参考 TypeScript 类型定义文件。主要接口包括：

- `InteractionManager` - 主交互管理器
- `EventBus` - 事件总线
- `EventEmitter3` - 事件分发器
- `GestureRecognizer` - 手势识别器
- `CollisionDetector` - 碰撞检测器
- `EventBridge` - 事件桥接器

## 🚀 进阶用法

### 自定义手势

```typescript
// 实现自定义手势识别
class CustomGestureRecognizer extends GestureRecognizer {
  recognizeCustomGesture(touches: ITouch[]): boolean {
    // 自定义手势识别逻辑
    return false;
  }
}
```

### 事件过滤器

```typescript
// 添加事件过滤器
eventBridge.addFilter(BridgeEventType.MOUSE_MOVE, (event) => {
  // 只处理在特定区域内的鼠标移动
  return event.data.x > 100 && event.data.x < 500;
});
```

### 事件转换器

```typescript
// 添加事件转换器
eventBridge.addTransformer(BridgeEventType.MOUSE_MOVE, (event) => {
  // 转换坐标系
  return {
    ...event,
    data: {
      ...event.data,
      x: event.data.x * devicePixelRatio,
      y: event.data.y * devicePixelRatio
    }
  };
});
```