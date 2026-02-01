# Sky Canvas 文档导航

欢迎阅读 Sky Canvas 文档！

## 快速开始

- [项目 README](../README.md) - 项目概览与快速上手
- [贡献指南](../CONTRIBUTING.md) - 如何参与贡献

## 架构与设计

- [架构概述](./architecture/README.md) - 系统架构与设计原则
- [渲染管线](./architecture/render-pipeline.md) - 渲染流程详解
- [插件系统](./architecture/plugin-system.md) - 插件开发与扩展

## 包文档

| 包 | 描述 | 文档 |
|----|------|------|
| @sky-canvas/render-engine | 高性能渲染引擎 | [README](../packages/render-engine/README.md) |
| @sky-canvas/canvas-sdk | 画布功能 SDK | [README](../packages/canvas-sdk/README.md) |

## API 参考

API 文档通过 TypeDoc 生成，运行以下命令生成：

```bash
cd packages/render-engine
pnpm docs
```

生成的文档位于 `packages/render-engine/docs/` 目录。

## 示例代码

- [基础用法](../packages/render-engine/examples/basic-usage.ts)
- [动画示例](../packages/render-engine/examples/animation-example.ts)
- [粒子系统](../packages/render-engine/examples/particle-system-example.ts)
- [批量渲染](../packages/render-engine/examples/batch-rendering-example.ts)
- [滤镜效果](../packages/render-engine/examples/filter-effects-example.ts)

## 发布与版本

- [发布流程](./RELEASING.md) - 版本发布指南
- [变更日志](../CHANGELOG.md) - 版本历史

## 社区

- [行为准则](../CODE_OF_CONDUCT.md)
- [支持渠道](../SUPPORT.md)
- [项目治理](../GOVERNANCE.md)
