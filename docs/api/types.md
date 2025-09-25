# 类型定义 API 文档

## 核心类型

### Action 相关类型

#### Action

操作描述接口，定义了系统中所有操作的通用结构。

```typescript
interface Action {
  /** 操作类型，用于识别具体的操作 */
  type: string;

  /** 操作参数，包含执行操作所需的所有数据 */
  payload: Record<string, any>;

  /** 元数据信息 */
  metadata: ActionMetadata;
}
```

#### ActionMetadata

Action 的元数据信息。

```typescript
interface ActionMetadata {
  /** 操作创建时间戳 */
  timestamp: number;

  /** 操作来源 */
  source: ActionSource;

  /** 唯一标识符（可选） */
  id?: string;

  /** 是否为批量操作的一部分（可选） */
  batch?: boolean;

  /** 用户信息（可选） */
  user?: {
    id: string;
    name?: string;
  };

  /** 会话信息（可选） */
  session?: {
    id: string;
    device?: string;
  };
}
```

#### ActionSource

操作来源枚举。

```typescript
type ActionSource =
  | 'user'        // 用户手动操作
  | 'system'      // 系统自动操作
  | 'plugin'      // 插件触发操作
  | 'api'         // API 调用
  | 'import'      // 文件导入
  | 'collaboration'; // 协作同步
```

#### ActionResult

Action 处理结果。

```typescript
interface ActionResult {
  /** 是否成功执行 */
  success: boolean;

  /** 执行的命令实例（成功时存在） */
  command?: Command;

  /** 错误信息（失败时存在） */
  error?: string;

  /** 执行时间（毫秒） */
  executionTime: number;

  /** 额外的元数据信息 */
  metadata?: ActionResultMetadata;
}
```

#### ActionResultMetadata

ActionResult 的额外元数据。

```typescript
interface ActionResultMetadata {
  /** 重试次数（如果有重试） */
  retryCount?: number;

  /** 警告信息列表 */
  warnings?: string[];

  /** 性能指标 */
  performance?: {
    validationTime: number;
    executionTime: number;
    notificationTime: number;
  };

  /** 受影响的资源 */
  affectedResources?: {
    shapeIds: string[];
    selectionChanged: boolean;
    historyChanged: boolean;
  };
}
```

#### BatchActionResult

批量操作结果。

```typescript
interface BatchActionResult {
  /** 批量操作是否整体成功 */
  success: boolean;

  /** 成功执行的操作数量 */
  successCount: number;

  /** 失败的操作数量 */
  failureCount: number;

  /** 每个操作的详细结果 */
  results: ActionResult[];

  /** 总执行时间 */
  executionTime: number;

  /** 错误汇总 */
  errors?: string[];
}
```

### Shape 相关类型

#### ShapeData

形状数据接口，用于创建和更新形状。

```typescript
interface ShapeData {
  /** 形状 ID（可选，不提供则自动生成） */
  id?: string;

  /** 形状类型 */
  type: ShapeType;

  /** X 坐标 */
  x: number;

  /** Y 坐标 */
  y: number;

  /** 是否可见（默认 true） */
  visible?: boolean;

  /** Z-index 层级（默认 0） */
  zIndex?: number;

  /** 旋转角度（弧度，默认 0） */
  rotation?: number;

  /** X 轴缩放（默认 1） */
  scaleX?: number;

  /** Y 轴缩放（默认 1） */
  scaleY?: number;

  /** 样式配置 */
  style?: ShapeStyle;

  // 特定形状类型的属性
  /** 宽度（矩形、菱形） */
  width?: number;

  /** 高度（矩形、菱形） */
  height?: number;

  /** 半径（圆形） */
  radius?: number;

  /** 文本内容（文本） */
  text?: string;

  /** 路径点（路径） */
  points?: Point[];

  /** 圆角半径（矩形） */
  cornerRadius?: number;
}
```

#### ShapeType

支持的形状类型。

```typescript
type ShapeType =
  | 'rectangle'   // 矩形
  | 'circle'      // 圆形
  | 'text'        // 文本
  | 'path'        // 路径
  | 'diamond'     // 菱形
  | 'line'        // 直线
  | 'arrow'       // 箭头
  | 'polygon'     // 多边形
  | 'ellipse';    // 椭圆
```

#### ShapeStyle

形状样式配置。

```typescript
interface ShapeStyle {
  /** 填充颜色（支持颜色名、十六进制、RGB、HSL） */
  fill?: string;

  /** 描边颜色 */
  stroke?: string;

  /** 描边宽度 */
  strokeWidth?: number;

  /** 描边样式 */
  strokeStyle?: StrokeStyle;

  /** 透明度（0-1） */
  opacity?: number;

  /** 阴影配置 */
  shadow?: ShadowStyle;

  /** 渐变配置 */
  gradient?: GradientStyle;

  // 文本特有样式
  /** 字体大小（文本） */
  fontSize?: number;

  /** 字体族（文本） */
  fontFamily?: string;

  /** 字体粗细（文本） */
  fontWeight?: FontWeight;

  /** 字体样式（文本） */
  fontStyle?: FontStyle;

  /** 文本对齐（文本） */
  textAlign?: TextAlign;

  /** 行高（文本） */
  lineHeight?: number;
}
```

#### StrokeStyle

描边样式类型。

```typescript
type StrokeStyle =
  | 'solid'       // 实线
  | 'dashed'      // 虚线
  | 'dotted'      // 点线
  | 'dashdot'     // 点划线
  | number[];     // 自定义虚线模式
```

#### ShadowStyle

阴影样式配置。

```typescript
interface ShadowStyle {
  /** 阴影颜色 */
  color: string;

  /** 水平偏移 */
  offsetX: number;

  /** 垂直偏移 */
  offsetY: number;

  /** 模糊半径 */
  blur: number;

  /** 扩散距离 */
  spread?: number;
}
```

#### GradientStyle

渐变样式配置。

```typescript
interface GradientStyle {
  /** 渐变类型 */
  type: 'linear' | 'radial';

  /** 渐变色标 */
  stops: ColorStop[];

  /** 线性渐变的方向（角度，度） */
  angle?: number;

  /** 径向渐变的中心点 */
  centerX?: number;
  centerY?: number;

  /** 径向渐变的半径 */
  radius?: number;
}
```

#### ColorStop

渐变色标。

```typescript
interface ColorStop {
  /** 位置（0-1） */
  position: number;

  /** 颜色值 */
  color: string;
}
```

#### FontWeight

字体粗细。

```typescript
type FontWeight =
  | 'normal'
  | 'bold'
  | 'bolder'
  | 'lighter'
  | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
```

#### FontStyle

字体样式。

```typescript
type FontStyle = 'normal' | 'italic' | 'oblique';
```

#### TextAlign

文本对齐方式。

```typescript
type TextAlign = 'left' | 'center' | 'right' | 'justify';
```

### Geometry 相关类型

#### Point

二维点坐标。

```typescript
interface Point {
  /** X 坐标 */
  x: number;

  /** Y 坐标 */
  y: number;
}
```

#### Size

尺寸信息。

```typescript
interface Size {
  /** 宽度 */
  width: number;

  /** 高度 */
  height: number;
}
```

#### Rect

矩形区域。

```typescript
interface Rect {
  /** 左上角 X 坐标 */
  x: number;

  /** 左上角 Y 坐标 */
  y: number;

  /** 宽度 */
  width: number;

  /** 高度 */
  height: number;
}
```

#### Bounds

边界框信息。

```typescript
interface Bounds extends Rect {
  /** 右边界 */
  right: number;

  /** 下边界 */
  bottom: number;

  /** 中心点 X */
  centerX: number;

  /** 中心点 Y */
  centerY: number;
}
```

### Model 相关类型

#### ChangeDescription

模型变更描述。

```typescript
interface ChangeDescription {
  /** 变更类型 */
  type: ChangeType;

  /** 相关形状 ID（单个） */
  shapeId?: string;

  /** 相关形状 ID（多个） */
  shapeIds?: string[];

  /** 变更相关的数据 */
  data?: any;

  /** 变更时间戳 */
  timestamp: number;
}
```

#### ChangeType

模型变更类型。

```typescript
type ChangeType =
  // 形状相关
  | 'shape-added'       // 形状已添加
  | 'shape-removed'     // 形状已移除
  | 'shape-updated'     // 形状已更新
  | 'shapes-cleared'    // 形状已清空

  // 选择相关
  | 'selection-changed'  // 选择已更改
  | 'selection-added'    // 添加到选择
  | 'selection-removed'  // 从选择中移除
  | 'selection-cleared'  // 选择已清空

  // 批量操作
  | 'batch-completed'    // 批量操作完成
  | 'batch-notification'; // 批量通知
```

#### ModelListener

模型变更监听器。

```typescript
type ModelListener = (change: ChangeDescription) => void;
```

#### ModelStats

模型统计信息。

```typescript
interface ModelStats {
  /** 形状数量 */
  shapeCount: number;

  /** 选中形状数量 */
  selectionCount: number;

  /** 监听器数量 */
  listenerCount: number;

  /** 是否在批量操作中 */
  isBatching: boolean;

  /** 待发送通知数量 */
  pendingNotifications: number;
}
```

### Command 相关类型

#### CommandStatus

命令执行状态。

```typescript
enum CommandStatus {
  PENDING = 'pending',        // 待执行
  EXECUTING = 'executing',    // 执行中
  COMPLETED = 'completed',    // 已完成
  FAILED = 'failed',         // 执行失败
  ABORTED = 'aborted'        // 已中断
}
```

#### CommandRegistration

命令注册信息。

```typescript
interface CommandRegistration {
  /** 命令工厂函数 */
  factory: CommandFactory;

  /** 命令描述 */
  description?: string;

  /** 命令分类 */
  category?: string;

  /** 版本信息 */
  version?: string;

  /** 是否异步命令 */
  async?: boolean;

  /** 权限要求 */
  permissions?: string[];
}
```

#### CommandFactory

命令工厂函数。

```typescript
type CommandFactory = (model: CanvasModel, action: Action) => Command;
```

#### HistoryStats

历史记录统计信息。

```typescript
interface HistoryStats {
  /** 历史记录大小 */
  historySize: number;

  /** 活动命令数量 */
  activeCommands: number;

  /** 是否可以撤销 */
  canUndo: boolean;

  /** 是否可以重做 */
  canRedo: boolean;

  /** 当前位置 */
  currentPosition: number;

  /** 最大历史记录数 */
  maxSize: number;
}
```

### 配置相关类型

#### ProcessorConfig

ActionProcessor 配置。

```typescript
interface ProcessorConfig {
  /** 启用验证 */
  enableValidation?: boolean;

  /** 启用日志记录 */
  enableLogging?: boolean;

  /** 历史服务 */
  historyService?: HistoryService;

  /** 错误重试配置 */
  errorRetry?: ErrorRetryConfig;

  /** 性能监控配置 */
  performance?: PerformanceConfig;
}
```

#### ErrorRetryConfig

错误重试配置。

```typescript
interface ErrorRetryConfig {
  /** 最大重试次数 */
  maxRetries: number;

  /** 可重试的错误类型 */
  retryableErrors: string[];

  /** 重试间隔（毫秒） */
  backoffMs: number;

  /** 指数退避因子 */
  backoffFactor?: number;

  /** 最大退避时间 */
  maxBackoffMs?: number;
}
```

#### PerformanceConfig

性能监控配置。

```typescript
interface PerformanceConfig {
  /** 启用性能监控 */
  enabled: boolean;

  /** 慢操作阈值（毫秒） */
  slowThreshold: number;

  /** 统计窗口大小 */
  statsWindow: number;

  /** 内存监控 */
  memoryTracking: boolean;
}
```

### 文件操作相关类型

#### ImportOptions

文件导入选项。

```typescript
interface ImportOptions {
  /** 文件对象或文件 URL */
  file?: File;
  url?: string;

  /** 文件格式 */
  format: FileFormat;

  /** 是否替换现有内容 */
  replaceExisting?: boolean;

  /** 导入位置偏移 */
  position?: Point;

  /** 缩放因子 */
  scale?: number;

  /** 导入后是否选中 */
  selectAfterImport?: boolean;
}
```

#### ExportOptions

文件导出选项。

```typescript
interface ExportOptions {
  /** 导出文件名 */
  filename?: string;

  /** 导出格式 */
  format: FileFormat;

  /** 图片质量（0-1，仅适用于 JPEG） */
  quality?: number;

  /** 是否仅导出选中的形状 */
  includeOnlySelected?: boolean;

  /** 导出区域（可选） */
  bounds?: Rect;

  /** 背景色（图片格式） */
  backgroundColor?: string;

  /** DPI（图片格式） */
  dpi?: number;
}
```

#### FileFormat

支持的文件格式。

```typescript
type FileFormat =
  | 'json'        // JSON 格式
  | 'svg'         // SVG 矢量格式
  | 'png'         // PNG 图片格式
  | 'jpeg'        // JPEG 图片格式
  | 'pdf'         // PDF 文档格式
  | 'canvas'      // 原生画布格式
  | 'sketch'      // Sketch 格式
  | 'figma';      // Figma 格式
```

#### ImportResult

导入操作结果。

```typescript
interface ImportResult {
  /** 是否成功 */
  success: boolean;

  /** 导入的形状数量 */
  importedCount: number;

  /** 跳过的形状数量 */
  skippedCount: number;

  /** 导入的形状 ID 列表 */
  importedShapeIds: string[];

  /** 错误信息 */
  error?: string;

  /** 警告信息 */
  warnings?: string[];
}
```

#### ExportResult

导出操作结果。

```typescript
interface ExportResult {
  /** 是否成功 */
  success: boolean;

  /** 导出的文件名 */
  filename?: string;

  /** 导出格式 */
  format: FileFormat;

  /** 导出的数据（根据格式不同） */
  data?: string | Blob | ArrayBuffer;

  /** 文件大小（字节） */
  fileSize: number;

  /** 错误信息 */
  error?: string;
}
```

### 插件相关类型

#### Plugin

插件接口。

```typescript
interface Plugin {
  /** 插件元数据 */
  metadata: PluginMetadata;

  /** 初始化方法 */
  initialize(context: PluginContext): Promise<void>;

  /** 清理方法 */
  dispose(): Promise<void>;

  /** 注册的命令 */
  commands?: Record<string, CommandRegistration>;

  /** 注册的工具 */
  tools?: Record<string, ToolRegistration>;

  /** 设置界面 */
  settings?: PluginSettings;
}
```

#### PluginMetadata

插件元数据。

```typescript
interface PluginMetadata {
  /** 插件 ID */
  id: string;

  /** 插件名称 */
  name: string;

  /** 版本号 */
  version: string;

  /** 描述 */
  description?: string;

  /** 作者信息 */
  author?: string;

  /** 主页 URL */
  homepage?: string;

  /** 许可证 */
  license?: string;

  /** 依赖的插件 */
  dependencies?: string[];

  /** 最小系统版本 */
  minVersion?: string;
}
```

#### PluginContext

插件上下文。

```typescript
interface PluginContext {
  /** SDK 实例 */
  sdk: CanvasSDK;

  /** 模型实例 */
  model: CanvasModel;

  /** 处理器实例 */
  processor: ActionProcessor;

  /** 命令注册表 */
  registry: CommandRegistry;

  /** 日志记录器 */
  logger: Logger;

  /** 配置存储 */
  storage: PluginStorage;
}
```

### 事件相关类型

#### EventType

系统事件类型。

```typescript
type EventType =
  // ActionProcessor 事件
  | 'action-received'
  | 'command-created'
  | 'command-executed'
  | 'command-failed'
  | 'action-error'
  | 'action-retry'

  // Model 事件
  | 'model-change'
  | 'batch-start'
  | 'batch-end'

  // 历史事件
  | 'history-change'
  | 'undo'
  | 'redo'

  // 系统事件
  | 'error'
  | 'warning'
  | 'performance';
```

#### EventListener

事件监听器。

```typescript
type EventListener<T = any> = (...args: T[]) => void;
```

### 工具相关类型

#### Tool

工具接口。

```typescript
interface Tool {
  /** 工具类型 */
  type: string;

  /** 工具名称 */
  name: string;

  /** 工具图标 */
  icon?: string;

  /** 激活工具 */
  activate(): void;

  /** 停用工具 */
  deactivate(): void;

  /** 处理鼠标事件 */
  handleMouseEvent(event: MouseEvent): boolean;

  /** 处理键盘事件 */
  handleKeyboardEvent(event: KeyboardEvent): boolean;

  /** 工具配置 */
  config?: ToolConfig;
}
```

#### ToolConfig

工具配置。

```typescript
interface ToolConfig {
  /** 快捷键 */
  shortcuts?: string[];

  /** 光标样式 */
  cursor?: string;

  /** 是否可配置 */
  configurable?: boolean;

  /** 工具参数 */
  parameters?: Record<string, any>;
}
```

## 类型守卫

### isShape

检查对象是否为有效形状。

```typescript
function isShape(obj: any): obj is Shape {
  return obj &&
    typeof obj.id === 'string' &&
    typeof obj.x === 'number' &&
    typeof obj.y === 'number' &&
    typeof obj.render === 'function';
}
```

### isAction

检查对象是否为有效 Action。

```typescript
function isAction(obj: any): obj is Action {
  return obj &&
    typeof obj.type === 'string' &&
    obj.payload &&
    obj.metadata &&
    typeof obj.metadata.timestamp === 'number';
}
```

### isCommand

检查对象是否为有效命令。

```typescript
function isCommand(obj: any): obj is Command {
  return obj &&
    typeof obj.execute === 'function' &&
    typeof obj.undo === 'function' &&
    typeof obj.toString === 'function';
}
```

## 工具类型函数

### Partial 扩展

```typescript
// 深度部分类型
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 必需键类型
type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

// 排除 null 和 undefined
type NonNullable<T> = T extends null | undefined ? never : T;
```

### 联合类型操作

```typescript
// 提取联合类型中的某个成员
type ExtractByType<T, U> = T extends U ? T : never;

// 排除联合类型中的某个成员
type ExcludeByType<T, U> = T extends U ? never : T;
```

### 函数类型工具

```typescript
// 异步函数类型
type AsyncFunction<T extends any[] = any[], R = any> = (...args: T) => Promise<R>;

// 事件处理函数类型
type EventHandler<T = any> = (event: T) => void | boolean;

// 回调函数类型
type Callback<T = any> = (error?: Error, result?: T) => void;
```

这些类型定义为 Sky Canvas 的 Command-Action 系统提供了完整的类型安全保障，确保开发者能够准确地使用 API 并获得良好的 IDE 支持。