# Sky Canvas 插件系统

## 概述

Sky Canvas 插件系统是一个强大且灵活的扩展框架，允许开发者创建自定义功能来扩展画布应用的能力。插件系统提供了完整的生命周期管理、权限控制、API访问和市场分发功能。

## 核心特性

### 🔧 扩展点系统
- **工具扩展**: 创建自定义绘图工具
- **渲染器扩展**: 实现自定义渲染后端
- **UI扩展**: 添加菜单项、工具栏按钮、面板
- **文件处理**: 自定义导入/导出格式
- **滤镜效果**: 图像处理和特效

### 🔒 安全权限控制
- 细粒度权限管理
- API访问控制
- 用户授权确认
- 安全策略配置

### 🚀 开发工具
- 完整的SDK和API
- 插件模板生成
- 开发调试工具
- 类型定义支持

### 🏪 插件市场
- 插件发现和安装
- 评分和评论系统
- 自动更新检查
- 分类和搜索

## 快速开始

### 1. 创建基础插件

```typescript
import { BasePlugin, createManifest } from '@sky-canvas/plugin-sdk';

// 创建插件清单
const manifest = createManifest()
  .id('my-awesome-plugin')
  .name('我的超棒插件')
  .version('1.0.0')
  .description('一个示例插件')
  .author('Your Name')
  .license('MIT')
  .main('index.js')
  .minEngineVersion('1.0.0')
  .addPermission('CANVAS_MODIFY')
  .build();

// 插件实现
export default class MyAwesomePlugin extends BasePlugin {
  protected async onActivate(): Promise<void> {
    this.log('info', '插件已激活');
    
    // 添加菜单项
    this.context.api.ui.addMenuItem({
      id: 'my-menu-item',
      label: '我的功能',
      action: () => {
        this.context.api.ui.showNotification({
          type: 'info',
          title: '插件通知',
          message: '功能已执行！'
        });
      }
    });
  }

  protected async onDeactivate(): Promise<void> {
    this.log('info', '插件已停用');
  }
}
```

### 2. 创建工具插件

```typescript
import { ToolPlugin, ToolBuilder } from '@sky-canvas/plugin-sdk';

export default class CircleToolPlugin extends ToolPlugin {
  protected createTool() {
    return new ToolBuilder()
      .id('circle-tool')
      .name('圆形工具')
      .icon('⭕')
      .cursor('crosshair')
      .shortcut('C')
      .onMouseDown((event) => {
        // 开始绘制圆形
        this.startDrawing(event);
      })
      .onMouseMove((event) => {
        // 更新圆形大小
        this.updateDrawing(event);
      })
      .onMouseUp((event) => {
        // 完成绘制
        this.finishDrawing(event);
      })
      .build();
  }
}
```

### 3. 创建UI插件

```typescript
import { UIPlugin } from '@sky-canvas/plugin-sdk';
import React from 'react';

export default class LayerManagerPlugin extends UIPlugin {
  protected async setupUI(): Promise<void> {
    // 添加面板
    this.addPanel({
      id: 'layer-panel',
      title: '图层管理器',
      component: LayerPanel,
      position: 'right'
    });

    // 添加工具栏按钮
    this.addToolbarButton({
      id: 'layer-button',
      label: '图层',
      icon: '📋',
      action: () => {
        // 切换面板显示
      }
    });
  }
}

const LayerPanel: React.FC = () => {
  return (
    <div className="p-4">
      <h3>图层管理</h3>
      {/* 图层列表 */}
    </div>
  );
};
```

## API 参考

### 插件上下文 (PluginContext)

插件上下文提供了访问系统功能的接口：

```typescript
interface PluginContext {
  manifest: PluginManifest;    // 插件清单
  api: PluginAPI;              // API访问器
  config: PluginConfig;        // 配置管理
  events: PluginEventEmitter;  // 事件系统
  resources: PluginResourceManager; // 资源管理
  logger: PluginLogger;        // 日志记录
}
```

### 画布API

```typescript
// 获取渲染器
const renderer = context.api.canvas.getRenderer();

// 添加图形
context.api.canvas.addShape({
  id: 'shape-1',
  type: 'circle',
  x: 100,
  y: 100,
  radius: 50,
  fill: '#3b82f6'
});

// 更新图形
context.api.canvas.updateShape('shape-1', {
  radius: 75
});

// 移除图形
context.api.canvas.removeShape('shape-1');

// 获取所有图形
const shapes = context.api.canvas.getShapes();

// 清空画布
context.api.canvas.clear();
```

### UI API

```typescript
// 添加菜单项
context.api.ui.addMenuItem({
  id: 'my-menu',
  label: '我的菜单',
  action: () => console.log('菜单点击')
});

// 添加工具栏按钮
context.api.ui.addToolbarButton({
  id: 'my-button',
  label: '我的按钮',
  icon: '🔧',
  action: () => console.log('按钮点击')
});

// 显示对话框
const result = await context.api.ui.showDialog({
  title: '确认',
  content: ConfirmDialog,
  buttons: [
    { label: '确定', action: () => true },
    { label: '取消', action: () => false }
  ]
});

// 显示通知
context.api.ui.showNotification({
  type: 'success',
  title: '成功',
  message: '操作完成'
});
```

### 文件API

```typescript
// 打开文件
const file = await context.api.file.open([
  { name: '图片文件', extensions: ['jpg', 'png'] }
]);

// 保存数据
await context.api.file.save(data, 'export.json');

// 导入数据
await context.api.file.import(importData);

// 导出数据
const exportData = await context.api.file.export('json');
```

### 工具API

```typescript
// 注册工具
context.api.tools.register(myTool);

// 设置活动工具
context.api.tools.setActive('my-tool');

// 获取当前工具
const activeTool = context.api.tools.getActive();

// 注销工具
context.api.tools.unregister('my-tool');
```

## 权限系统

插件系统使用细粒度的权限控制来保护用户数据和系统安全：

### 权限类型

- `READ_ONLY`: 只读访问（自动授予）
- `CANVAS_MODIFY`: 修改画布内容
- `UI_MODIFY`: 修改用户界面
- `FILE_ACCESS`: 文件系统访问
- `NETWORK_ACCESS`: 网络访问
- `SYSTEM_ACCESS`: 系统级访问（受限）

### 权限声明

在插件清单中声明所需权限：

```typescript
const manifest = createManifest()
  .addPermissions(
    'CANVAS_MODIFY',
    'UI_MODIFY',
    'FILE_ACCESS'
  )
  .build();
```

### 权限检查

系统会自动检查API调用权限，无需手动验证。

## 扩展点

### 预定义扩展点

- `canvas.tools`: 画布工具
- `canvas.renderers`: 渲染器
- `ui.menu`: 菜单项
- `ui.toolbar`: 工具栏按钮
- `ui.panels`: 面板
- `file.exporters`: 导出器
- `file.importers`: 导入器
- `canvas.filters`: 滤镜

### 自定义扩展点

```typescript
// 定义扩展点
extensionManager.defineExtensionPoint({
  id: 'my.custom.extension',
  type: ExtensionPointType.CUSTOM,
  name: '自定义扩展',
  description: '我的自定义扩展点',
  required: false
});

// 注册提供者
extensionManager.registerProvider('my.custom.extension', {
  pluginId: 'my-plugin',
  extensionId: 'my-extension',
  implementation: myImplementation,
  config: {}
});
```

## 配置管理

插件可以使用配置系统存储设置：

```typescript
// 设置配置
context.config.set('theme', 'dark');
context.config.set('autoSave', true);

// 获取配置
const theme = context.config.get('theme', 'light');
const autoSave = context.config.get('autoSave', false);

// 检查配置存在
if (context.config.has('customSetting')) {
  // 处理自定义设置
}

// 删除配置
context.config.delete('oldSetting');

// 获取所有配置
const allConfig = context.config.getAll();
```

## 事件系统

插件可以监听和发送事件：

```typescript
// 监听事件
context.events.on('canvas:changed', (data) => {
  console.log('画布已改变', data);
});

// 发送事件
context.events.emit('plugin:action', { action: 'save' });

// 一次性监听
context.events.once('app:ready', () => {
  console.log('应用已就绪');
});

// 移除监听
const handler = (data) => console.log(data);
context.events.on('test', handler);
context.events.off('test', handler);
```

## 资源管理

管理插件资源文件：

```typescript
// 加载资源
const icon = await context.resources.loadAsset('icons/tool.svg');
const config = await context.resources.loadAsset('config.json');

// 获取资源URL
const iconUrl = context.resources.getAssetUrl('icons/tool.svg');

// 预加载资源
await context.resources.preloadAssets([
  'icons/tool.svg',
  'templates/default.json'
]);
```

## 日志记录

使用内置日志系统：

```typescript
// 不同级别的日志
context.logger.debug('调试信息', { data: 'debug' });
context.logger.info('普通信息', { status: 'ok' });
context.logger.warn('警告信息', { warning: 'deprecated' });
context.logger.error('错误信息', { error: 'failed' });
```

## 插件市场

### 搜索插件

```typescript
import { PluginMarketplace } from '@sky-canvas/plugin-sdk';

const marketplace = new PluginMarketplace();

// 搜索插件
const result = await marketplace.searchPlugins({
  query: '绘图工具',
  category: 'tools',
  minRating: 4.0
});

// 获取热门插件
const featured = await marketplace.getFeaturedPlugins();

// 获取分类
const categories = await marketplace.getCategories();
```

### 安装插件

```typescript
// 下载插件
const pluginBlob = await marketplace.downloadPlugin('plugin-id');

// 检查更新
const updates = await marketplace.checkUpdates([
  { id: 'plugin-1', version: '1.0.0' },
  { id: 'plugin-2', version: '2.1.0' }
]);
```

## 最佳实践

### 1. 错误处理

```typescript
export default class MyPlugin extends BasePlugin {
  protected async onActivate(): Promise<void> {
    try {
      // 插件逻辑
      await this.initializePlugin();
    } catch (error) {
      this.log('error', '插件初始化失败', error);
      throw error;
    }
  }

  private async initializePlugin(): Promise<void> {
    // 具体实现
  }
}
```

### 2. 资源清理

```typescript
export default class MyPlugin extends BasePlugin {
  private intervalId?: number;
  private eventHandlers: Array<() => void> = [];

  protected async onActivate(): Promise<void> {
    // 设置定时器
    this.intervalId = window.setInterval(() => {
      // 定时任务
    }, 1000);

    // 注册事件处理器
    const handler = () => console.log('事件');
    this.context.events.on('test', handler);
    this.eventHandlers.push(() => {
      this.context.events.off('test', handler);
    });
  }

  protected async onDeactivate(): Promise<void> {
    // 清理定时器
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    // 清理事件处理器
    this.eventHandlers.forEach(cleanup => cleanup());
    this.eventHandlers = [];
  }
}
```

### 3. 性能优化

```typescript
// 使用防抖处理频繁事件
import { debounce } from 'lodash';

const debouncedHandler = debounce((data) => {
  // 处理逻辑
}, 100);

context.events.on('canvas:mousemove', debouncedHandler);

// 懒加载资源
const loadResourceLazily = async () => {
  if (!this.cachedResource) {
    this.cachedResource = await context.resources.loadAsset('large-file.json');
  }
  return this.cachedResource;
};
```

### 4. 类型安全

```typescript
// 定义严格的类型
interface MyPluginConfig {
  theme: 'light' | 'dark';
  autoSave: boolean;
  interval: number;
}

// 使用类型化的配置
const config: MyPluginConfig = {
  theme: context.config.get('theme', 'light'),
  autoSave: context.config.get('autoSave', true),
  interval: context.config.get('interval', 5000)
};
```

## 调试和测试

### 开发模式

```typescript
// 检查开发模式
if (process.env.NODE_ENV === 'development') {
  // 开发专用代码
  context.logger.debug('开发模式已启用');
}
```

### 单元测试

```typescript
import { describe, it, expect } from 'vitest';
import MyPlugin from './MyPlugin';

describe('MyPlugin', () => {
  it('应该正确初始化', async () => {
    const plugin = new MyPlugin();
    const mockContext = createMockContext();
    
    await plugin.activate(mockContext);
    
    expect(plugin.isActive).toBe(true);
  });
});
```

## 发布插件

### 1. 构建插件

```bash
npm run build
```

### 2. 打包插件

```bash
npm run package
```

### 3. 发布到市场

```bash
npm run publish
```

## 故障排除

### 常见问题

1. **权限被拒绝**: 检查插件清单中的权限声明
2. **API调用失败**: 确认权限已授予且API使用正确
3. **资源加载失败**: 检查资源路径和文件存在性
4. **插件无法激活**: 查看控制台错误信息和日志

### 调试技巧

```typescript
// 启用详细日志
context.logger.debug('详细调试信息', {
  state: this.currentState,
  config: context.config.getAll()
});

// 使用浏览器调试器
debugger; // 在关键位置设置断点
```

## 更多资源

- [API 完整文档](./API_REFERENCE.md)
- [插件示例](../src/engine/plugins/examples/)
- [开发工具](../src/engine/plugins/sdk/)
- [社区论坛](https://community.sky-canvas.com)

---

有问题或建议？欢迎提交 [Issue](https://github.com/sky-canvas/issues) 或参与讨论！
