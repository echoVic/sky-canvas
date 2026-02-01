# Sky Canvas 文档导航

欢迎阅读 Sky Canvas 文档！本文档提供了项目的完整技术文档和使用指南。

## 📚 文档结构

```
docs/
├── README.md                    # 文档导航（本文件）
├── architecture/                # 架构设计文档
│   ├── README.md               # 架构概述
│   ├── render-pipeline.md      # 渲染管线详解
│   └── plugin-system.md        # 插件系统架构
├── INTERACTION_SYSTEM.md       # 交互系统设计
├── MATH_LIBRARY.md             # 数学库设计
└── RELEASING.md                # 发布流程指南
```

## 🚀 快速开始

- [项目 README](../README.md) - 项目概览与快速上手
- [贡献指南](../CONTRIBUTING.md) - 如何参与贡献

## 🏗️ 架构与设计

### 系统架构

- [架构概述](./architecture/README.md) - 系统架构与设计原则
  - Monorepo 结构
  - 分层架构（MVVM + Manager + DI）
  - 数据流设计
  - 技术栈说明

### 核心模块

- [渲染管线](./architecture/render-pipeline.md) - 渲染流程详解
  - 多阶段渲染管线
  - 批处理优化
  - 视锥剔除
  - 后处理效果

- [插件系统](./architecture/plugin-system.md) - 插件开发与扩展
  - 插件生命周期
  - 扩展点定义
  - 权限管理
  - 插件 SDK

### 功能模块

- [交互系统](./INTERACTION_SYSTEM.md) - 事件处理与交互
  - 事件分发
  - 手势识别
  - 输入管理

- [数学库设计](./MATH_LIBRARY.md) - 向量、矩阵、变换
  - Vector2/Vector3
  - Matrix2D/Matrix3x3
  - Transform 组件
  - 几何计算

## 📦 包文档

| 包 | 描述 | 文档 |
|----|------|------|
| @sky-canvas/render-engine | 高性能渲染引擎 | [README](../packages/render-engine/README.md) |
| @sky-canvas/canvas-sdk | 画布功能 SDK | [README](../packages/canvas-sdk/README.md) |

### render-engine 子文档

- [性能优化指南](../packages/render-engine/src/performance/README.md) - 性能调优
- [性能测试文档](../packages/render-engine/src/performance/PERFORMANCE_TESTING.md) - 基准测试
- [资源管理](../packages/render-engine/src/resources/README.md) - 资源加载与缓存
- [图形适配器](../packages/render-engine/src/graphics/README.md) - 渲染后端
- [接口桥接](../packages/render-engine/src/interface/README.md) - 跨层通信
- [富文本渲染](../packages/render-engine/src/text/RICH_TEXT.md) - 富文本支持
- [字体加载](../packages/render-engine/src/text/FONT_LOADING.md) - 字体管理

### canvas-sdk 子文档

- [SDK 架构设计](../packages/canvas-sdk/docs/ARCHITECTURE.md) - 分层架构详解
- [MVVM 集成指南](../packages/canvas-sdk/docs/MVVM_INTEGRATION.md) - MVVM 模式使用
- [MVVM 架构指南](../packages/canvas-sdk/docs/MVVM-Architecture-Guide.md) - 最佳实践
- [类型导出](../packages/canvas-sdk/docs/TYPE_EXPORTS.md) - 类型定义说明
- [AI 扩展](../packages/canvas-sdk/src/ai/README.md) - AI 协议与集成

## 🔧 API 参考

API 文档通过 TypeDoc 生成，运行以下命令生成：

```bash
# 生成 render-engine API 文档
cd packages/render-engine
pnpm docs

# 生成 canvas-sdk API 文档
cd packages/canvas-sdk
pnpm docs
```

生成的文档位于各包的 `docs/api/` 目录。

## 🎮 示例代码

### render-engine 示例

| 示例 | 描述 |
|------|------|
| [basic-usage.ts](../packages/render-engine/examples/basic-usage.ts) | 基础渲染用法 |
| [animation-example.ts](../packages/render-engine/examples/animation-example.ts) | 动画系统示例 |
| [particle-system-example.ts](../packages/render-engine/examples/particle-system-example.ts) | 粒子系统示例 |
| [batch-rendering-example.ts](../packages/render-engine/examples/batch-rendering-example.ts) | 批量渲染示例 |
| [filter-effects-example.ts](../packages/render-engine/examples/filter-effects-example.ts) | 滤镜效果示例 |
| [interactive-example.ts](../packages/render-engine/examples/interactive-example.ts) | 交互示例 |

### canvas-sdk 示例

| 示例 | 描述 |
|------|------|
| [di-demo.ts](../packages/canvas-sdk/examples/di-demo.ts) | 依赖注入示例 |

### 框架无关示例

| 示例 | 描述 |
|------|------|
| [framework-agnostic-rendering.html](../examples/framework-agnostic-rendering.html) | 纯 HTML/JS 渲染示例 |

## 📋 发布与版本

- [发布流程](./RELEASING.md) - 版本发布指南
- [变更日志](../CHANGELOG.md) - 版本历史
- [render-engine 变更日志](../packages/render-engine/CHANGELOG.md)
- [canvas-sdk 变更日志](../packages/canvas-sdk/CHANGELOG.md)

## 👥 社区

- [行为准则](../CODE_OF_CONDUCT.md) - 社区行为规范
- [支持渠道](../SUPPORT.md) - 获取帮助
- [项目治理](../GOVERNANCE.md) - 项目管理
- [安全政策](../SECURITY.md) - 安全漏洞报告
- [维护者](../MAINTAINERS.md) - 项目维护者

## 🛠️ 开发指南

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 常用命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 运行测试
pnpm test

# 运行所有包的测试
pnpm test:packages

# 代码检查
pnpm lint

# 代码格式化
pnpm format

# 构建所有包
pnpm build:packages
```

### 项目结构

```
sky-canvas/
├── packages/
│   ├── render-engine/     # 渲染引擎核心
│   └── canvas-sdk/        # 画布 SDK
├── docs/                  # 文档
├── examples/              # 示例
├── .github/               # GitHub 配置
└── ...
```

## 📖 推荐阅读顺序

1. **入门**
   - [项目 README](../README.md)
   - [架构概述](./architecture/README.md)

2. **深入理解**
   - [渲染管线](./architecture/render-pipeline.md)
   - [插件系统](./architecture/plugin-system.md)
   - [MVVM 架构](../packages/canvas-sdk/docs/ARCHITECTURE.md)

3. **实践**
   - [示例代码](#示例代码)
   - [API 参考](#api-参考)

4. **贡献**
   - [贡献指南](../CONTRIBUTING.md)
   - [发布流程](./RELEASING.md)
