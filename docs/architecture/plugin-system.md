# 插件系统架构

## 概述

Sky Canvas 插件系统是一个强大且灵活的扩展框架，允许开发者创建自定义功能来扩展画布应用的能力。系统提供完整的生命周期管理、权限控制、API 访问和扩展点机制。

## 系统架构

```mermaid
flowchart TB
    subgraph "Plugin System"
        PS[PluginSystem<br/>插件系统核心]
        PM[PluginManager<br/>插件管理器]
        PCF[PluginContextFactory<br/>上下文工厂]
    end
    
    subgraph "Plugin Instance"
        PLUGIN[Plugin<br/>插件实例]
        PC[PluginContext<br/>插件上下文]
        CONTRIB[Contributions<br/>扩展贡献]
    end
    
    subgraph "Extension Registry"
        COMMANDS[Commands<br/>命令]
        TOOLS[Tools<br/>工具]
        RENDERERS[Renderers<br/>渲染器]
        FILTERS[Filters<br/>滤镜]
        IMPORTERS[Importers<br/>导入器]
        EXPORTERS[Exporters<br/>导出器]
    end
    
    subgraph "Event System"
        EB[EventBus<br/>事件总线]
    end
    
    PS --> PM
    PS --> PCF
    PCF --> PC
    PM --> PLUGIN
    PLUGIN --> PC
    PLUGIN --> CONTRIB
    CONTRIB --> COMMANDS
    CONTRIB --> TOOLS
    CONTRIB --> RENDERERS
    CONTRIB --> FILTERS
    CONTRIB --> IMPORTERS
    CONTRIB --> EXPORTERS
    PS --> EB
```

## 插件生命周期

```mermaid
stateDiagram-v2
    [*] --> Unloaded: 初始状态
    
    Unloaded --> Loading: loadPlugin()
    Loading --> Loaded: onLoad() 成功
    Loading --> Error: onLoad() 失败
    
    Loaded --> Active: activatePlugin()
    Loaded --> Unloaded: unloadPlugin()
    
    Active --> Inactive: deactivatePlugin()
    Active --> Error: 运行时错误
    
    Inactive --> Active: activatePlugin()
    Inactive --> Unloaded: unloadPlugin()
    
    Error --> Unloaded: 重置
    
    Unloaded --> [*]: 销毁
```

### 生命周期钩子

```mermaid
sequenceDiagram
    participant App as 应用
    participant PS as PluginSystem
    participant Plugin as 插件
    participant Context as PluginContext
    
    App->>PS: registerPlugin(plugin)
    PS->>PS: validatePlugin()
    PS-->>App: 注册成功
    
    App->>PS: loadPlugin(pluginId)
    PS->>Context: createContext()
    PS->>Plugin: onLoad(context)
    Plugin-->>PS: 加载完成
    PS->>PS: registerContributions()
    PS-->>App: 加载成功
    
    App->>PS: activatePlugin(pluginId)
    PS->>Plugin: onActivate(context)
    Plugin-->>PS: 激活完成
    PS-->>App: 激活成功
    
    App->>PS: deactivatePlugin(pluginId)
    PS->>Plugin: onDeactivate(context)
    Plugin-->>PS: 停用完成
    PS-->>App: 停用成功
    
    App->>PS: unloadPlugin(pluginId)
    PS->>Plugin: onUnload(context)
    PS->>PS: unregisterContributions()
    PS->>Context: dispose()
    PS-->>App: 卸载成功
```

## 插件元数据

```mermaid
classDiagram
    class PluginMetadata {
        +id: string
        +name: string
        +version: string
        +author: string
        +description: string
        +homepage?: string
        +license: string
        +keywords: string[]
        +category: PluginCategory
        +dependencies: Record~string, string~
        +peerDependencies: Record~string, string~
        +engineVersion: string
        +platform: string[]
        +permissions: PluginPermission[]
    }
    
    class PluginCategory {
        <<enumeration>>
        renderer
        effect
        tool
        filter
        animation
        physics
        ui
        integration
        utility
    }
    
    class PluginPermission {
        <<enumeration>>
        file-system
        network
        clipboard
        storage
        camera
        microphone
        location
        notifications
    }
    
    PluginMetadata --> PluginCategory
    PluginMetadata --> PluginPermission
```

## 扩展点系统

```mermaid
flowchart TB
    subgraph "Extension Points"
        subgraph "Tools"
            T1[SelectTool<br/>选择工具]
            T2[RectangleTool<br/>矩形工具]
            T3[CircleTool<br/>圆形工具]
            T4[TextTool<br/>文本工具]
            T5[CustomTool<br/>自定义工具]
        end
        
        subgraph "Renderers"
            R1[ShapeRenderer<br/>形状渲染器]
            R2[TextRenderer<br/>文本渲染器]
            R3[CustomRenderer<br/>自定义渲染器]
        end
        
        subgraph "Filters"
            F1[BlurFilter<br/>模糊滤镜]
            F2[ColorFilter<br/>颜色滤镜]
            F3[CustomFilter<br/>自定义滤镜]
        end
        
        subgraph "IO"
            I1[SVGImporter<br/>SVG导入]
            I2[JSONImporter<br/>JSON导入]
            E1[PNGExporter<br/>PNG导出]
            E2[SVGExporter<br/>SVG导出]
        end
    end
    
    PLUGIN[插件] --> T5
    PLUGIN --> R3
    PLUGIN --> F3
    PLUGIN --> I2
    PLUGIN --> E2
```

### 扩展点类型

| 扩展点 | 描述 | 用途 |
|--------|------|------|
| `commands` | 命令扩展 | 添加可执行的命令 |
| `tools` | 工具扩展 | 添加绘图工具 |
| `renderers` | 渲染器扩展 | 自定义渲染逻辑 |
| `filters` | 滤镜扩展 | 图像处理效果 |
| `animations` | 动画扩展 | 自定义动画效果 |
| `importers` | 导入器扩展 | 支持新的文件格式导入 |
| `exporters` | 导出器扩展 | 支持新的文件格式导出 |

## 插件上下文

```mermaid
classDiagram
    class PluginContext {
        +renderEngine: unknown
        +eventBus: IEventBus
        +pluginId: string
        +pluginPath: string
        +config: unknown
        +resources: PluginResourceManager
        +logger: PluginLogger
        +storage: PluginStorage
        +ui: PluginUIManager
    }
    
    class PluginResourceManager {
        +loadTexture(path): Promise~HTMLImageElement~
        +loadShader(path): Promise~string~
        +loadAudio(path): Promise~AudioBuffer~
        +loadJSON(path): Promise~unknown~
        +getAssetUrl(path): string
        +dispose(): void
    }
    
    class PluginLogger {
        +debug(message, ...args): void
        +info(message, ...args): void
        +warn(message, ...args): void
        +error(message, ...args): void
    }
    
    class PluginStorage {
        +get(key): unknown
        +set(key, value): void
        +delete(key): void
        +clear(): void
    }
    
    class PluginUIManager {
        +addMenuItem(config): void
        +addToolbarButton(config): void
        +addPanel(config): void
        +showDialog(config): Promise~unknown~
        +showNotification(config): void
    }
    
    PluginContext --> PluginResourceManager
    PluginContext --> PluginLogger
    PluginContext --> PluginStorage
    PluginContext --> PluginUIManager
```

## 插件贡献

```mermaid
classDiagram
    class PluginContributions {
        +commands?: CommandContribution[]
        +tools?: ToolContribution[]
        +renderers?: RendererContribution[]
        +filters?: FilterContribution[]
        +animations?: AnimationContribution[]
        +importers?: ImporterContribution[]
        +exporters?: ExporterContribution[]
    }
    
    class CommandContribution {
        +id: string
        +name: string
        +handler: Function
    }
    
    class ToolContribution {
        +id: string
        +name: string
        +icon: string
        +handler: Function
    }
    
    class FilterContribution {
        +id: string
        +name: string
        +category: string
        +parameters: FilterParameterDef[]
        +filter: Function
    }
    
    class ImporterContribution {
        +id: string
        +name: string
        +extensions: string[]
        +importer: Function
    }
    
    class ExporterContribution {
        +id: string
        +name: string
        +extension: string
        +exporter: Function
    }
    
    PluginContributions --> CommandContribution
    PluginContributions --> ToolContribution
    PluginContributions --> FilterContribution
    PluginContributions --> ImporterContribution
    PluginContributions --> ExporterContribution
```

## 插件开发 SDK

```mermaid
flowchart TB
    subgraph "Plugin SDK"
        BASE[BasePlugin<br/>插件基类]
        MANIFEST[ManifestBuilder<br/>清单构建器]
        DECORATORS[Decorators<br/>装饰器]
    end
    
    subgraph "Development Tools"
        TEMPLATE[Plugin Template<br/>插件模板]
        CLI[CLI Tools<br/>命令行工具]
        DEBUG[Debug Tools<br/>调试工具]
    end
    
    subgraph "Plugin Implementation"
        CUSTOM[CustomPlugin<br/>自定义插件]
    end
    
    BASE --> CUSTOM
    MANIFEST --> CUSTOM
    DECORATORS --> CUSTOM
    TEMPLATE --> CUSTOM
    CLI --> TEMPLATE
    DEBUG --> CUSTOM
```

### 插件基类

```mermaid
classDiagram
    class BasePlugin {
        <<abstract>>
        #context: PluginContext
        +metadata: PluginManifest
        +contributes?: PluginContributions
        +onLoad(context): Promise~void~
        +onActivate(context): Promise~void~
        +onDeactivate(context): Promise~void~
        +onUnload(context): Promise~void~
        +onConfigChange(config, context): void
        #log(level, message, ...args): void
    }
    
    class Plugin {
        <<interface>>
        +metadata: PluginMetadata
        +contributes?: PluginContributions
        +onLoad?(context): Promise~void~
        +onActivate?(context): Promise~void~
        +onDeactivate?(context): Promise~void~
        +onUnload?(context): Promise~void~
        +onConfigChange?(config, context): void
    }
    
    Plugin <|.. BasePlugin
```

## 插件管理器

```mermaid
flowchart TB
    subgraph "Plugin Manager"
        PM[PluginManager]
        
        subgraph "Registry"
            REG[Plugin Registry<br/>插件注册表]
            CACHE[Package Cache<br/>包缓存]
        end
        
        subgraph "Operations"
            INSTALL[Install<br/>安装]
            UPDATE[Update<br/>更新]
            UNINSTALL[Uninstall<br/>卸载]
            SEARCH[Search<br/>搜索]
        end
    end
    
    PM --> REG
    PM --> CACHE
    PM --> INSTALL
    PM --> UPDATE
    PM --> UNINSTALL
    PM --> SEARCH
```

### 插件注册表

```mermaid
classDiagram
    class PluginRegistry {
        +name: string
        +url: string
        +enabled: boolean
        +trusted: boolean
    }
    
    class PluginPackage {
        +metadata: PluginMetadata
        +source: PluginSource
        +downloadUrl: string
        +checksum: string
        +size: number
        +downloads: number
        +rating: number
    }
    
    class PluginSource {
        <<enumeration>>
        OFFICIAL
        COMMUNITY
        LOCAL
        CUSTOM
    }
    
    PluginPackage --> PluginSource
```

## 事件系统集成

```mermaid
sequenceDiagram
    participant Plugin as 插件
    participant Context as PluginContext
    participant EventBus as 事件总线
    participant System as 系统
    
    Plugin->>Context: 获取 eventBus
    Context-->>Plugin: eventBus 实例
    
    Plugin->>EventBus: on('canvas:changed', handler)
    EventBus-->>Plugin: 订阅成功
    
    System->>EventBus: emit('canvas:changed', data)
    EventBus->>Plugin: 触发 handler(data)
    
    Plugin->>EventBus: emit('plugin:action', data)
    EventBus->>System: 通知系统
```

### 插件事件

| 事件 | 描述 | 数据 |
|------|------|------|
| `plugin-registered` | 插件注册 | `{ pluginId, contributions }` |
| `plugin-loaded` | 插件加载 | `{ plugin, metadata }` |
| `plugin-activated` | 插件激活 | `{ pluginId }` |
| `plugin-deactivated` | 插件停用 | `{ pluginId }` |
| `plugin-unloaded` | 插件卸载 | `{ pluginId }` |
| `plugin-error` | 插件错误 | `{ pluginId, error }` |
| `plugins-scanned` | 插件扫描完成 | `{ pluginCount }` |

## 权限系统

```mermaid
flowchart TB
    subgraph "Permission System"
        subgraph "Permission Types"
            FS[file-system<br/>文件系统]
            NET[network<br/>网络]
            CLIP[clipboard<br/>剪贴板]
            STORE[storage<br/>存储]
            CAM[camera<br/>摄像头]
            MIC[microphone<br/>麦克风]
            LOC[location<br/>位置]
            NOTIF[notifications<br/>通知]
        end
        
        subgraph "Permission Check"
            REQUEST[权限请求]
            VERIFY[权限验证]
            GRANT[授权]
            DENY[拒绝]
        end
    end
    
    REQUEST --> VERIFY
    VERIFY --> GRANT
    VERIFY --> DENY
```

### 权限级别

| 权限 | 描述 | 风险等级 |
|------|------|----------|
| `file-system` | 访问文件系统 | 高 |
| `network` | 网络请求 | 中 |
| `clipboard` | 剪贴板访问 | 低 |
| `storage` | 本地存储 | 低 |
| `camera` | 摄像头访问 | 高 |
| `microphone` | 麦克风访问 | 高 |
| `location` | 位置信息 | 中 |
| `notifications` | 系统通知 | 低 |

## 插件示例

### 工具插件示例

```mermaid
flowchart TB
    subgraph "Circle Tool Plugin"
        META[Metadata<br/>id: circle-tool<br/>version: 1.0.0]
        
        subgraph "Contributions"
            TOOL[Tool: CircleTool]
            CMD[Command: draw-circle]
        end
        
        subgraph "Implementation"
            HANDLER[Tool Handler]
            RENDER[Circle Renderer]
        end
    end
    
    META --> TOOL
    META --> CMD
    TOOL --> HANDLER
    HANDLER --> RENDER
```

### 滤镜插件示例

```mermaid
flowchart TB
    subgraph "Blur Filter Plugin"
        META[Metadata<br/>id: blur-filter<br/>version: 1.0.0]
        
        subgraph "Contributions"
            FILTER[Filter: GaussianBlur]
        end
        
        subgraph "Parameters"
            RADIUS[radius: number<br/>模糊半径]
            SIGMA[sigma: number<br/>标准差]
        end
        
        subgraph "Implementation"
            PROCESS[Image Processing]
        end
    end
    
    META --> FILTER
    FILTER --> RADIUS
    FILTER --> SIGMA
    FILTER --> PROCESS
```

## 插件市场

```mermaid
flowchart TB
    subgraph "Plugin Marketplace"
        subgraph "Discovery"
            SEARCH[搜索]
            BROWSE[浏览分类]
            RECOMMEND[推荐]
        end
        
        subgraph "Installation"
            DOWNLOAD[下载]
            VERIFY[验证]
            INSTALL[安装]
        end
        
        subgraph "Management"
            UPDATE[更新]
            ENABLE[启用/禁用]
            REMOVE[移除]
        end
    end
    
    SEARCH --> DOWNLOAD
    BROWSE --> DOWNLOAD
    RECOMMEND --> DOWNLOAD
    DOWNLOAD --> VERIFY
    VERIFY --> INSTALL
    INSTALL --> UPDATE
    INSTALL --> ENABLE
    INSTALL --> REMOVE
```

## 最佳实践

### 插件开发建议

```mermaid
flowchart TB
    subgraph "Best Practices"
        subgraph "Design"
            SINGLE[单一职责]
            MINIMAL[最小权限]
            CLEAN[清理资源]
        end
        
        subgraph "Performance"
            LAZY[延迟加载]
            CACHE[合理缓存]
            ASYNC[异步操作]
        end
        
        subgraph "Quality"
            TEST[充分测试]
            DOC[完善文档]
            VERSION[语义化版本]
        end
    end
```

### 安全考虑

| 项目 | 建议 |
|------|------|
| 权限 | 只请求必要的权限 |
| 数据 | 不存储敏感信息 |
| 网络 | 使用 HTTPS |
| 输入 | 验证所有输入 |
| 错误 | 优雅处理错误 |

## 相关文档

- [系统架构概述](./README.md)
- [渲染管线详解](./render-pipeline.md)
