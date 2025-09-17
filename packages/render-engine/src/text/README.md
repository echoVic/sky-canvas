# Text 模块

文本渲染模块，提供高质量的文本渲染和字体管理功能。

## 主要功能

### 文本渲染
- **字体加载**：TrueType、OpenType 字体支持
- **文字绘制**：高质量文本渲染
- **文本布局**：多行文本排版
- **国际化支持**：多语言文本处理

### 字体管理
- **字体缓存**：字体资源缓存
- **字形图集**：字符纹理优化
- **动态加载**：按需加载字体
- **回退机制**：字体不可用时的处理

## 文本特性

### 基础功能
- **字体大小**：任意大小缩放
- **文本颜色**：丰富的颜色选项
- **对齐方式**：左、中、右对齐
- **行间距**：行高控制

### 高级功能
- **文本描边**：边框效果
- **阴影效果**：投影和发光
- **渐变文字**：渐变色填充
- **文本路径**：沿路径排列

## 使用示例

```typescript
import { TextRenderer, FontManager } from './text';

// 创建文本渲染器
const textRenderer = new TextRenderer();

// 加载字体
const fontManager = new FontManager();
await fontManager.loadFont('Arial', '/fonts/arial.ttf');

// 渲染文本
function renderText(context: RenderContext) {
  textRenderer.drawText(context, {
    text: 'Hello World',
    font: 'Arial',
    size: 24,
    color: '#333333',
    x: 100,
    y: 100,
    align: 'center'
  });
}

// 多行文本
function renderMultilineText(context: RenderContext) {
  textRenderer.drawText(context, {
    text: 'This is a long text that will wrap to multiple lines.',
    font: 'Arial',
    size: 16,
    color: '#666666',
    x: 50,
    y: 200,
    maxWidth: 300,
    lineHeight: 1.2
  });
}
```

## 字体技术

### SDF 字体
- **有向距离场**：平滑缩放
- **锐利边缘**：任意大小清晰
- **特效支持**：描边、阴影、发光
- **性能优化**：GPU 加速渲染

### 位图字体
- **预渲染字符**：固定大小字符
- **快速渲染**：直接纹理映射
- **内存效率**：紧凑存储
- **兼容性好**：广泛支持

## 文本布局

### 单行文本
- **基线对齐**：精确的文字对齐
- **字符间距**：调整字符间隔
- **文本测量**：获取文本尺寸
- **溢出处理**：文本截断

### 多行文本
- **自动换行**：智能换行算法
- **段落间距**：段落格式控制
- **文本对齐**：段落对齐方式
- **垂直对齐**：顶部、中间、底部

## 性能优化

### 渲染优化
- **字符缓存**：渲染结果缓存
- **批量渲染**：多文本批处理
- **LOD 支持**：距离级别细节
- **视锥体剔除**：不可见文本剔除

### 内存优化
- **字形复用**：相同字符共享
- **纹理打包**：紧凑纹理布局
- **动态释放**：未使用字符清理
- **压缩存储**：字体数据压缩

## 相关模块

- `graphics` - 图形渲染接口
- `resources` - 字体资源管理
- `textures` - 字符纹理管理
- `shaders` - 文本着色器