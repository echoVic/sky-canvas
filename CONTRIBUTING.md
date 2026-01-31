# Contributing to Sky Canvas

感谢你参与 Sky Canvas 的建设！本指南适用于仓库根目录与 packages 下的所有模块。

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

## 开发与测试

### 根应用

```bash
pnpm dev
pnpm test
pnpm build
```

### Render Engine

```bash
pnpm -C packages/render-engine test
pnpm -C packages/render-engine build
```

### Canvas SDK

```bash
pnpm -C packages/canvas-sdk test
pnpm -C packages/canvas-sdk build
```

## 提交 Issue

- 使用仓库 Issue 模板提交 Bug 或功能建议
- 复现步骤、期望行为与实际行为尽量完整
- 涉及安全问题请参考 [SECURITY.md](./SECURITY.md)

## 提交 Pull Request

1. Fork 仓库并创建分支
2. 完成改动并添加或更新测试
3. 更新相关文档与 CHANGELOG（如果对外行为有变化）
4. 在 PR 中说明变更内容与验证方式

## 行为准则

参与社区请遵守 [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)。
