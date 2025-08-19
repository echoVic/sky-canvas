# Sky Canvas - 无限画布绘图应用

🎨 一个基于 React + TypeScript + Vite 构建的现代化无限画布绘图应用，提供流畅的绘图体验和强大的图形编辑功能。

## ✨ 功能特性

- 🖼️ **无限画布** - 支持无限缩放和平移的画布
- 🎨 **多种绘图工具** - 画笔、形状、文本等丰富的绘图工具
- 📐 **精确控制** - 支持网格对齐、标尺和精确定位
- 🔄 **撤销重做** - 完整的历史记录管理
- 📱 **响应式设计** - 适配不同屏幕尺寸
- ⚡ **高性能渲染** - 基于Canvas的高效渲染引擎
- 🎯 **图层管理** - 支持多图层编辑和管理
- 🎨 **属性面板** - 实时调整图形属性

## 🚀 技术栈

- **React 18** - 最新的并发特性，更好的性能和用户体验
- **TypeScript** - 类型安全，减少运行时错误，提升开发效率
- **Vite** - 极快的开发服务器，优秀的构建性能
- **Zustand** - 轻量级状态管理，简单易用
- **Tailwind CSS** - 原子化CSS，快速样式开发

## 📁 项目结构

```
src/
├── components/           # React组件
│   ├── Canvas/          # 画布相关组件
│   │   ├── InfiniteCanvas.tsx
│   │   ├── CanvasOverlay.tsx
│   │   ├── VirtualScrollbar.tsx
│   │   └── Minimap.tsx
│   ├── Tools/           # 工具相关组件
│   │   ├── Toolbar.tsx
│   │   ├── PropertyPanel.tsx
│   │   └── LayerPanel.tsx
│   └── UI/              # 通用UI组件
│       ├── Button.tsx
│       ├── Slider.tsx
│       └── ColorPicker.tsx
├── engine/              # 渲染引擎
│   ├── core/           # 核心接口和抽象
│   ├── renderers/      # 渲染器实现
│   ├── scene/          # 场景管理
│   ├── math/           # 数学库
│   └── utils/          # 工具函数
├── store/              # 状态管理
│   ├── canvasStore.ts
│   ├── historyStore.ts
│   └── toolStore.ts
├── hooks/              # 自定义Hooks
├── utils/              # 工具函数
└── types/              # 类型定义
```

## 🛠️ 开发指南

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
pnpm install
```

### 启动开发服务器

```bash
pnpm dev
```

### 构建生产版本

```bash
pnpm build
```

### 预览生产版本

```bash
pnpm preview
```

## 🎯 使用指南

1. **选择工具** - 从工具栏选择绘图工具
2. **开始绘制** - 在画布上点击或拖拽进行绘制
3. **调整属性** - 使用属性面板调整颜色、大小等
4. **管理图层** - 通过图层面板管理不同图层
5. **保存作品** - 支持导出为多种格式

## 🏗️ 架构设计

项目采用模块化架构，主要分为以下几个部分：

- **渲染引擎** - 负责高性能的图形渲染
- **状态管理** - 使用 Zustand 管理应用状态
- **组件系统** - 可复用的 React 组件
- **工具系统** - 可扩展的绘图工具架构

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## ✨ 核心功能

- **无限画布** - 支持平移和缩放的无限画布
- **多种工具** - 选择、平移、画笔、橡皮擦等工具
- **历史记录** - 撤销/重做功能
- **属性面板** - 动态调整工具属性
- **高性能渲染** - 基于 Canvas 的高效渲染引擎

## 🎯 快捷键

- `V` - 选择工具
- `H` - 平移工具  
- `B` - 画笔工具
- `E` - 橡皮擦工具
- `空格 + 拖拽` - 临时平移
- `滚轮` - 缩放画布
- `Ctrl+Z` - 撤销
- `Ctrl+Y` - 重做

## 🏗️ 架构设计

项目采用模块化架构，严格遵循代码质量标准：

- 每个文件不超过200行代码
- 每个文件夹不超过8个文件
- 避免循环依赖和代码重复
- 使用TypeScript确保类型安全

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
