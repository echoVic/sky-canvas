## 多包版本策略

本仓库采用独立版本策略，各包版本独立演进，通过 Changesets 维护变更与版本发布。

### 适用包

- @sky-canvas/render-engine
- @sky-canvas/canvas-sdk

## 发布流程

### 1. 产生变更集

```bash
pnpm changeset
```

### 2. 合并变更集

变更集会在合并后由 Release 工作流自动生成版本更新 PR。

### 3. 发布到 npm

当版本 PR 合并到 main 后，Release 工作流会自动构建并发布。

## 本地手动发布

```bash
pnpm version-packages
pnpm release
```

## 发布要求

- 已设置 npm 发布密钥：NPM_TOKEN
- 已通过 CI 测试
