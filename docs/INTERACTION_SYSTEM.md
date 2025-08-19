# 交互系统文档

## 概述

Sky Canvas 交互系统提供了完整的用户交互功能，包括选择、平移、缩放等基础操作。

## 核心组件

### 1. InteractionManager
统一的交互管理器，整合所有交互功能：
- 工具管理（选择、平移、缩放工具）
- 事件处理（鼠标、触摸、键盘）
- 坐标转换
- 碰撞检测集成

### 2. 交互工具

#### SelectTool - 选择工具
- 单击选择对象
- 拖拽框选多个对象
- Ctrl+点击多选
- Shift+点击范围选择
- Delete键删除选中对象

#### PanTool - 平移工具
- 拖拽平移视图
- 触摸手势支持

#### ZoomTool - 缩放工具
- 左键放大，右键缩小
- 鼠标滚轮缩放
- 触摸缩放手势

### 3. 选择管理
- 多种选择模式（单选、多选、切换、范围选择）
- 选择过滤器
- 选择事件通知

### 4. 碰撞检测
- 空间分割网格优化
- 点检测、区域检测
- 射线投射
- 多种形状碰撞检测

## 使用示例

```typescript
import { InteractionManager, Scene, Viewport } from '../engine';

// 创建交互管理器
const interactionManager = new InteractionManager();

// 初始化
interactionManager.initialize(canvas, scene, viewport);

// 切换工具
interactionManager.setActiveTool('select');

// 监听选择变化
interactionManager.addEventListener('selection-change', (event) => {
  console.log('选中的对象:', event.selectedNodes);
});

// 选择对象
interactionManager.select(node);

// 清空选择
interactionManager.clearSelection();
```

## 事件系统

### 支持的事件类型
- 鼠标事件（点击、移动、滚轮）
- 触摸事件（单点、多点触控）
- 键盘事件
- 手势事件（点击、双击、长按、平移、缩放、旋转、滑动）

### 手势识别
- 可配置的手势阈值
- 多点触控支持
- 手势状态管理

## 坐标系统

### 坐标转换
- 屏幕坐标 ↔ 世界坐标
- 视口变换支持
- 缩放和平移补偿

## 性能优化

### 空间分割
- 网格化碰撞检测
- 动态更新机制
- 大量对象优化

### 事件优化
- 事件节流
- 批量更新
- 脏标记系统

## 扩展性

### 自定义工具
```typescript
class CustomTool implements InteractionTool {
  name = 'custom';
  mode = InteractionMode.DRAW;
  cursor = 'crosshair';
  enabled = true;

  onActivate() { /* 激活逻辑 */ }
  onDeactivate() { /* 停用逻辑 */ }
  onMouseDown(event) { /* 鼠标按下处理 */ }
  // ... 其他事件处理
}

// 注册自定义工具
interactionManager.registerTool(new CustomTool());
```

### 自定义手势
```typescript
// 扩展手势识别器
gestureRecognizer.addCustomGesture('triple-tap', {
  threshold: 3,
  timeWindow: 500,
  callback: (event) => { /* 处理三击手势 */ }
});
```

## 调试功能

### 可视化调试
- 选择框显示
- 碰撞边界显示
- 空间网格显示

### 性能监控
- 碰撞检测性能
- 事件处理延迟
- 内存使用监控

## 配置选项

```typescript
const config = {
  // 手势配置
  gestures: {
    tapThreshold: 10,
    doubleTapInterval: 300,
    longPressDelay: 500,
    panThreshold: 5,
    pinchThreshold: 10
  },
  
  // 选择配置
  selection: {
    multiSelectKey: 'ctrl',
    rangeSelectKey: 'shift',
    selectionColor: '#007acc'
  },
  
  // 碰撞检测配置
  collision: {
    gridSize: 100,
    maxObjectsPerCell: 10
  }
};
```

## 注意事项

1. **性能考虑**：大量对象时使用空间分割优化
2. **内存管理**：及时清理事件监听器和资源
3. **兼容性**：支持鼠标和触摸设备
4. **可访问性**：提供键盘导航支持

## 集成示例

完整的集成示例请参考 `src/examples/InteractiveCanvasExample.tsx`，展示了：
- 完整的工具栏实现
- 属性面板集成
- 动态对象创建
- 实时交互反馈

## 未来扩展

- 撤销/重做系统
- 拖拽排序
- 对象分组
- 图层管理
- 动画交互
- 协作编辑
