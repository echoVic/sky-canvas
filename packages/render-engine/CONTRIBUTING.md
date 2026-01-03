# Contributing to @sky-canvas/render-engine

感谢您对 Sky Canvas Render Engine 的关注！我们欢迎任何形式的贡献。

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm (推荐) 或 npm

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 监听文件变化并自动编译
pnpm dev

# 运行测试
pnpm test

# 运行测试并监听变化
pnpm test:watch

# 运行测试 UI
pnpm test:ui

# 构建
pnpm build
```

## 📝 贡献指南

### 提交 Issue

在提交 Issue 前，请先搜索已有的 Issue，避免重复。提交时请包含：

- 清晰的标题和描述
- 复现步骤
- 期望行为
- 实际行为
- 环境信息（浏览器、Node.js 版本等）
- 相关代码片段或截图

### 提交 Pull Request

1. **Fork 仓库**
   
   点击右上角的 Fork 按钮

2. **克隆到本地**
   
   ```bash
   git clone https://github.com/YOUR_USERNAME/sky-canvas.git
   cd sky-canvas/packages/render-engine
   ```

3. **创建分支**
   
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

4. **进行开发**
   
   - 遵循代码规范
   - 添加必要的测试
   - 更新相关文档

5. **提交代码**
   
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
   
   提交信息格式：
   - `feat:` 新功能
   - `fix:` 修复 bug
   - `docs:` 文档更新
   - `style:` 代码格式调整
   - `refactor:` 重构
   - `test:` 测试相关
   - `chore:` 构建或辅助工具变动

6. **推送到远程**
   
   ```bash
   git push origin feature/your-feature-name
   ```

7. **创建 Pull Request**
   
   在 GitHub 上创建 PR，并填写：
   - 变更说明
   - 相关 Issue 编号
   - 测试情况
   - 截图（如适用）

## 🎯 代码规范

### TypeScript

- 使用 TypeScript 严格模式
- 避免使用 `any` 类型
- 为所有公共 API 添加类型注解
- 使用 ES6+ 语法

### 命名规范

- 类名：PascalCase（如 `RenderEngine`）
- 接口：以 `I` 开头（如 `IGraphicsContext`）
- 函数/变量：camelCase（如 `createContext`）
- 常量：UPPER_SNAKE_CASE（如 `MAX_BATCH_SIZE`）
- 文件名：PascalCase 或 camelCase

### 代码风格

- 使用 2 空格缩进
- 使用单引号
- 行尾不加分号
- 每行最多 100 字符
- 函数参数过多时换行

### 注释规范

- 为复杂逻辑添加注释
- 使用 JSDoc 为公共 API 添加文档
- 注释应该解释"为什么"而不是"是什么"

示例：

```typescript
/**
 * 创建渲染引擎实例
 * @param canvas - HTML Canvas 元素
 * @param config - 渲染引擎配置
 * @returns 渲染引擎实例
 */
export const createRenderEngine = (
  canvas: HTMLCanvasElement,
  config?: IRenderEngineConfig
): RenderEngine => {
  return new RenderEngine(canvas, config)
}
```

## 🧪 测试要求

### 编写测试

- 所有新功能必须包含测试
- Bug 修复应该包含回归测试
- 测试覆盖率应保持在 80% 以上

### 测试结构

```typescript
import { describe, it, expect, beforeEach } from 'vitest'

describe('FeatureName', () => {
  beforeEach(() => {
    // 设置测试环境
  })

  it('should do something', () => {
    // 测试逻辑
    expect(result).toBe(expected)
  })
})
```

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定测试文件
pnpm test path/to/test.test.ts

# 查看测试覆盖率
pnpm test -- --coverage
```

## 📚 文档要求

### 更新文档

当你的改动涉及以下内容时，请更新相应文档：

- 新增或修改公共 API → 更新 README.md
- 新增功能 → 添加使用示例
- 修改配置选项 → 更新配置文档
- 架构变更 → 更新架构文档

### 文档风格

- 使用清晰简洁的语言
- 提供代码示例
- 包含实际用例
- 保持格式一致

## 🔍 代码审查

所有 PR 都需要经过代码审查。审查重点：

- 代码质量和可维护性
- 测试覆盖率
- 文档完整性
- 性能影响
- 向后兼容性

## 🎨 设计原则

### SOLID 原则

- **单一职责**：每个类/模块只负责一个功能
- **开闭原则**：对扩展开放，对修改关闭
- **里氏替换**：子类可以替换父类
- **接口隔离**：接口应该小而专注
- **依赖倒置**：依赖抽象而不是具体实现

### 其他原则

- **DRY**：不要重复自己
- **KISS**：保持简单
- **YAGNI**：你不会需要它（不要过度设计）

## 📦 发布流程

发布由维护者负责，流程如下：

1. 更新版本号（遵循语义化版本）
2. 更新 CHANGELOG.md
3. 运行完整测试
4. 构建并发布到 npm
5. 创建 GitHub Release
6. 更新文档

## 🤝 行为准则

请阅读并遵守我们的 [行为准则](CODE_OF_CONDUCT.md)。

## 💬 获取帮助

如有疑问，可以通过以下方式获取帮助：

- 提交 Issue
- 参与 Discussions
- 联系维护者

## 📄 许可证

通过贡献代码，您同意您的贡献将在 MIT 许可证下发布。

---

再次感谢您的贡献！🎉
