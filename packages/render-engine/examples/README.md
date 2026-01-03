# Render Engine Examples

这个目录包含了 @sky-canvas/render-engine 的各种使用示例。

## 示例列表

### 1. basic-usage.ts
**基础使用示例**

展示了渲染引擎的基本用法，包括：
- 创建渲染引擎
- 选择不同的渲染器（Canvas2D, WebGL）
- 添加和管理可渲染对象
- 视口控制
- 渲染统计

```bash
# 运行示例
npm run dev
# 然后在浏览器中打开相应的HTML文件
```

### 2. animation-example.ts
**动画系统示例**

演示如何使用动画系统：
- 属性动画（位置、旋转、透明度）
- 缓动函数
- 循环和往返动画
- 动画管理器

**特性：**
- 平滑的缓动效果
- 多个动画同时运行
- 自动循环和反向播放

### 3. particle-system-example.ts
**粒子系统示例**

展示粒子系统的强大功能：
- 粒子发射器
- 重力影响器
- 透明度渐变
- 交互式粒子位置

**特性：**
- 支持1000+粒子
- 实时物理模拟
- 点击改变发射位置

### 4. batch-rendering-example.ts
**批量渲染示例**

演示高性能批量渲染：
- 渲染10000个精灵
- 批处理优化
- FPS监控

**特性：**
- WebGL批处理
- 自动碰撞检测
- 性能统计

### 5. filter-effects-example.ts
**滤镜效果示例**

展示各种视觉效果：
- 高斯模糊
- 亮度调整
- 阴影效果

**特性：**
- 实时滤镜切换
- 多种滤镜组合
- Canvas2D 实现

### 6. interactive-example.ts
**交互示例**

演示用户交互功能：
- 拖拽形状
- 点击选择
- 层级管理

**特性：**
- 鼠标事件处理
- 碰撞检测
- 视觉反馈

## 如何运行示例

### 方法 1: 直接在浏览器中运行

1. 构建项目：
```bash
npm run build
```

2. 创建HTML文件并引入示例：
```html
<!DOCTYPE html>
<html>
<head>
  <title>Render Engine Example</title>
  <style>
    body { margin: 0; padding: 20px; }
    canvas { border: 1px solid #ccc; }
  </style>
</head>
<body>
  <script type="module" src="./examples/basic-usage.js"></script>
</body>
</html>
```

3. 使用本地服务器打开HTML文件

### 方法 2: 使用开发服务器

```bash
# 安装开发服务器（如果还没有）
npm install -g serve

# 启动服务器
serve .

# 在浏览器中打开 http://localhost:3000
```

### 方法 3: 集成到你的项目

```typescript
import { RenderEngine } from '@sky-canvas/render-engine'

// 复制示例代码并根据需要修改
```

## 示例说明

### 基础概念

所有示例都遵循以下基本模式：

```typescript
// 1. 创建 canvas
const canvas = document.createElement('canvas')
canvas.width = 800
canvas.height = 600

// 2. 创建渲染引擎
const engine = new RenderEngine(canvas, {
  renderer: 'canvas2d', // 或 'webgl'
  targetFPS: 60
})

// 3. 创建可渲染对象
const renderable = {
  id: 'my-object',
  visible: true,
  zIndex: 0,
  render(context) {
    // 绘制逻辑
  },
  hitTest(point) {
    // 碰撞检测
  },
  getBounds() {
    // 返回边界框
  }
}

// 4. 添加到引擎
engine.addRenderable(renderable)

// 5. 启动渲染
engine.start()
```

### 性能提示

1. **使用 WebGL** 进行大量对象的渲染
2. **启用批处理** 以提高性能
3. **使用对象池** 避免频繁创建对象
4. **启用视锥剔除** 避免渲染屏幕外的对象

### 常见问题

**Q: 为什么看不到任何内容？**
A: 确保：
- Canvas 已添加到 DOM
- 对象的 visible 属性为 true
- 对象在视口范围内
- 调用了 engine.start() 或 engine.render()

**Q: 性能不佳怎么办？**
A: 尝试：
- 使用 WebGL 渲染器
- 启用批处理
- 减少对象数量
- 使用视锥剔除

**Q: 如何调试？**
A: 使用：
- engine.getStats() 查看渲染统计
- 浏览器开发者工具
- 性能分析器

## 更多资源

- [API 文档](../README.md)
- [贡献指南](../CONTRIBUTING.md)
- [GitHub Issues](https://github.com/sky-canvas/sky-canvas/issues)

## 许可证

MIT License - 详见 [LICENSE](../LICENSE)
