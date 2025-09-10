# Sky Canvas 架构重构说明

## 🎯 重构目标

将原本错位的底层渲染功能从Frontend UI层迁移到Render Engine层，建立清晰的架构分层。

## 📋 重构内容

### ✅ 已完成迁移

**从 `src/` 迁移到 `packages/render-engine/src/`：**

1. **动画系统** (`src/animation/` → `packages/render-engine/src/animation/`)
   - 高性能图形动画引擎
   - 属性补间、关键帧、路径动画
   - 粒子系统、时间轴管理

2. **滤镜系统** (`src/effects/` → `packages/render-engine/src/effects/`)
   - WebGL着色器滤镜
   - 基础滤镜（模糊、亮度、对比度等）
   - 高级效果（阴影、发光、自定义着色器）

3. **文本系统** (`src/text/` + `packages/render-engine/src/text/` 合并)
   - 字体加载管理（FontManager, FontLoader）
   - 富文本解析和渲染（RichTextParser, RichTextRenderer）
   - 国际化文本支持（I18nTextManager, BidiProcessor）

## 🏗️ 新的架构分层

### 1️⃣ Render Engine (`packages/render-engine/`)
**职责**：框架无关的底层图形渲染功能

- ✅ **核心渲染管道**：WebGL/Canvas2D/WebGPU适配器
- ✅ **批处理优化**：智能分组、实例化渲染、纹理图集
- ✅ **数学和几何运算**：向量、矩阵、碰撞检测
- ✅ **资源管理**：纹理、着色器、字体资源
- ✅ **高性能动画引擎**：补间、关键帧、粒子系统
- ✅ **WebGL滤镜系统**：着色器滤镜、后处理管道
- ✅ **文本渲染**：字体管理、富文本、国际化
- ✅ **性能基准测试**：渲染性能分析

### 2️⃣ Canvas SDK (`packages/canvas-sdk/`)  
**职责**：画布业务逻辑和交互管理

- ✅ **应用级服务**：选择、历史、图层、工具管理
- ✅ **UI交互动画**：界面过渡、用户反馈动画
- ✅ **工具系统**：绘制工具、选择工具、交互逻辑
- ✅ **插件架构**：扩展机制、AI集成
- ✅ **MVVM框架**：数据绑定、状态管理
- ✅ **事件系统适配**：业务事件处理
- 🔄 **Render Engine集成**：适配器模式访问底层功能

### 3️⃣ Frontend UI (`src/`)
**职责**：纯React UI组件层

- ✅ **React组件**：界面组件、布局管理  
- ✅ **UI状态管理**：Zustand状态管理
- ✅ **用户交互**：鼠标、键盘事件处理
- ✅ **Canvas SDK集成**：通过hooks使用SDK API
- 🆕 **Render Engine适配器**：访问底层渲染功能

## 🔗 系统集成方案

### Frontend UI → Canvas SDK → Render Engine

```
Frontend UI (React)
    ↓ hooks/contexts
Canvas SDK (Business Logic)
    ↓ adapters  
Render Engine (Graphics Core)
```

### 动画系统分工

- **Render Engine动画**：高性能图形动画（形状变形、粒子效果）
- **Canvas SDK动画**：应用级动画（工具切换、UI反馈）
- **Frontend UI动画**：界面动画（组件过渡、用户交互）

### 文本系统分工

- **Render Engine文本**：字体加载、富文本渲染、国际化布局
- **Canvas SDK文本**：文本工具、编辑逻辑、格式管理
- **Frontend UI文本**：文本输入组件、编辑界面

### 滤镜系统分工  

- **Render Engine滤镜**：WebGL着色器、图像处理算法
- **Canvas SDK滤镜**：滤镜应用逻辑、预设管理
- **Frontend UI滤镜**：滤镜选择界面、参数调节

## 📦 导出策略

### Render Engine导出
```typescript
// 底层图形功能
export * from './animation/index';    // TODO: 修复后启用
export * from './effects/index';      // TODO: 修复后启用  
export * from './text/index';         // ✅ 已启用
export * from './math/index';         // ✅ 数学库
export * from './performance/index';  // ✅ 性能监控
```

### Canvas SDK导出
```typescript
// 业务逻辑功能
export * from './services/index';     // ✅ 应用服务
export * from './tools/index';        // ✅ 交互工具
export * from './animation/index';    // ✅ 应用级动画
export * from './mvvm/index';         // ✅ MVVM框架
```

### Frontend UI导出  
```typescript
// UI组件和适配器
export * from './components/index';   // ✅ React组件
export * from './hooks/index';        // ✅ 自定义hooks
export * from './adapters/index';     // 🆕 底层功能适配器
```

## 🔄 待解决问题

1. **类型兼容性**：迁移的模块存在类型错误
2. **依赖关系**：需要清理循环依赖和冲突
3. **测试更新**：更新相关的测试文件路径
4. **文档更新**：更新API文档和使用示例

## 🎉 预期收益

- **职责清晰**：每层专注自己的核心功能
- **复用性强**：底层功能可被多个应用使用
- **性能优化**：专业的图形渲染优化
- **维护简单**：分层开发，独立测试
- **扩展性好**：新功能有明确的归属层级

---

*架构重构完成后，Sky Canvas将拥有更清晰的分层结构，为后续功能扩展和性能优化奠定坚实基础。*