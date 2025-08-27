# Sky Canvas 前端重构迁移说明

## 概述

本次重构将Sky Canvas React前端从直接操作渲染引擎改为通过Canvas SDK进行交互，实现了真正的UI与逻辑分离。

## 重构内容

### 1. 架构变更

#### 原架构
```
React Components → 直接操作 Canvas 2D Context
```

#### 新架构
```
React Components → Canvas SDK → Render Engine → Graphics Context
```

### 2. 新增组件和模块

#### Hooks (`src/hooks/`)
- `useCanvasSDK.ts` - Canvas SDK集成Hook
- `useDrawingTools.ts` - 绘图工具管理Hook
- `useCanvasInteraction.ts` - Canvas鼠标交互Hook
- `index.ts` - Hooks导出文件

#### 适配器 (`src/adapters/`)
- `Canvas2DAdapter.ts` - Canvas 2D图形上下文适配器
- `index.ts` - 适配器导出文件

#### 上下文 (`src/contexts/`)
- `CanvasProvider.tsx` - Canvas SDK提供者组件
- `index.ts` - 上下文导出文件

### 3. 重构的组件

#### Canvas (`src/components/Canvas/Canvas.tsx`)
- **原功能**: 简单的Canvas元素设置
- **新功能**: 
  - 集成Canvas SDK
  - 支持形状渲染和选择
  - 鼠标交互处理
  - 调试信息显示

#### StatusBar (`src/components/StatusBar/StatusBar.tsx`)
- **新增功能**:
  - 撤销/重做按钮
  - 实时形状和选择状态显示
  - 按钮状态管理

#### Store (`src/store/canvasStore.ts`)
- **变更**: 添加了TypeScript类型定义
- **保持**: UI状态管理不变，保持纯净

### 4. 依赖更新

#### package.json
```json
{
  "dependencies": {
    "@sky-canvas/canvas-sdk": "workspace:^1.0.0",
    "@sky-canvas/render-engine": "workspace:^1.0.0"
  }
}
```

## 功能特性

### 1. 绘图功能
- 支持矩形、圆形、线条等基础形状
- 拖拽创建形状
- 形状选择和取消选择
- 选择框显示

### 2. 交互功能
- 鼠标工具切换（选择、抓手、绘图工具）
- 点击选择形状
- 动态光标样式

### 3. 历史管理
- 撤销/重做功能
- 按钮状态自动更新

### 4. 状态管理
- SDK状态与React状态同步
- 实时UI更新

## 开发模式功能

在开发模式下，Canvas右上角会显示调试信息：
- 形状数量
- 选中形状数量
- 当前工具
- SDK初始化状态

## 使用方法

### 基本使用
```tsx
import { useCanvas } from '../contexts';

function MyComponent() {
  const [sdkState, sdkActions] = useCanvas();
  
  // 访问SDK状态
  console.log(sdkState.shapes);
  
  // 执行SDK操作
  sdkActions.addShape(myShape);
}
```

### 创建自定义形状
```tsx
import { createShape } from '../hooks';

const shape = createShape('rectangle', 
  { x: 100, y: 100 }, 
  { x: 200, y: 200 }
);

if (shape) {
  sdkActions.addShape(shape);
}
```

## 性能优化

### 1. 组件优化
- 使用React.memo优化重渲染
- useCallback优化事件处理器
- 合理的useEffect依赖

### 2. SDK集成
- 事件驱动的状态更新
- 避免不必要的重渲染
- 资源自动清理

### 3. 渲染优化
- 只渲染可见形状
- 选择框按需显示
- Canvas尺寸自适应

## 类型安全

### 严格的TypeScript类型
- 所有Hook都有完整类型定义
- SDK接口类型安全
- 工具类型统一管理

### 类型导出
```tsx
import type { 
  ToolType, 
  CanvasSDKState, 
  CanvasSDKActions 
} from '../hooks';
```

## 错误处理

### SDK初始化错误
- 初始化失败时的错误提示
- 资源清理和状态重置

### Hook使用错误
- Context Provider检查
- 详细的错误信息

## 扩展性

### 新工具添加
1. 在`ToolType`中添加工具类型
2. 在`createShape`中实现形状创建
3. 在UI store中添加工具配置

### 新形状类型
1. 实现`IShape`接口
2. 在工具Hook中注册
3. 添加渲染逻辑

### 自定义适配器
1. 实现`IGraphicsContext`接口
2. 实现`IGraphicsContextFactory`接口
3. 在初始化时使用

## 构建产物优化

通过使用SDK，前端构建产物将会：
- **更小的包体积** - 业务逻辑移至SDK
- **更少的依赖** - 减少直接图形操作代码
- **更好的缓存** - SDK可独立更新

## 开发建议

### 1. 组件开发
- 保持组件纯净，只处理UI逻辑
- 使用Context获取SDK实例
- 避免直接操作Canvas

### 2. 状态管理
- UI状态用Zustand管理
- 业务状态用SDK管理
- 避免状态混合

### 3. 测试策略
- 单元测试Hook功能
- 集成测试SDK交互
- E2E测试完整用户流程

## 故障排除

### 常见问题

1. **SDK初始化失败**
   - 检查Canvas元素是否存在
   - 确认适配器支持情况

2. **形状不显示**
   - 检查形状visible属性
   - 确认渲染方法实现

3. **交互不响应**
   - 检查事件监听器绑定
   - 确认工具类型匹配

### 调试工具
- 开发模式调试信息
- 浏览器开发者工具
- SDK状态日志

## 总结

本次重构成功实现了：
- ✅ UI与业务逻辑完全分离
- ✅ 通过SDK进行所有Canvas操作
- ✅ 保持现有UI设计和用户体验
- ✅ 提供完整TypeScript支持
- ✅ 优化性能和构建产物
- ✅ 增强代码可维护性

重构后的前端成为纯UI层，通过Canvas SDK API与画布交互，实现了真正的关注点分离。