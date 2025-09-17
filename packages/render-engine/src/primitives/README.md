# Primitives 模块

图元基础模块，提供基本几何图形的创建和渲染功能。

## 主要组件

### GraphicPrimitive
图形基元基类，定义所有图形的通用接口。

**基础功能：**
- 变换操作（位移、旋转、缩放）
- 样式设置（填充、描边、透明度）
- 边界计算
- 渲染接口

### RectanglePrimitive
矩形图元，支持各种矩形变体。

**特性：**
- 普通矩形
- 圆角矩形
- 带边框矩形
- 渐变填充

### CirclePrimitive
圆形图元，支持圆形和椭圆。

**特性：**
- 标准圆形
- 椭圆形状
- 扇形和弧形
- 环形图形

### PathPrimitive
路径图元，支持复杂路径图形。

**功能：**
- 贝塞尔曲线
- 自定义路径
- 路径合并
- 路径变形

## 使用示例

```typescript
import {
  RectanglePrimitive,
  CirclePrimitive,
  PathPrimitive
} from './primitives';

// 创建矩形
const rectangle = new RectanglePrimitive({
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  fillColor: '#ff6600',
  strokeColor: '#333333',
  strokeWidth: 2
});

// 创建圆形
const circle = new CirclePrimitive({
  centerX: 200,
  centerY: 200,
  radius: 80,
  fillColor: '#0066ff'
});

// 创建路径
const path = new PathPrimitive();
path.moveTo(50, 50);
path.lineTo(150, 100);
path.quadraticCurveTo(200, 50, 250, 100);
path.closePath();

// 渲染图元
function render(context: RenderContext) {
  rectangle.render(context);
  circle.render(context);
  path.render(context);
}
```

## 图元特性

### 样式系统
- **填充样式**：纯色、渐变、纹理填充
- **描边样式**：线条颜色、宽度、样式
- **透明度**：全局和局部透明度
- **混合模式**：各种图层混合效果

### 变换系统
- **平移变换**：位置移动
- **旋转变换**：角度旋转
- **缩放变换**：大小缩放
- **复合变换**：多重变换组合

### 交互支持
- **点击检测**：精确的点击判断
- **拖拽支持**：拖拽操作处理
- **选择状态**：选中状态显示
- **编辑控制**：图形编辑句柄

## 高级功能

### 形状生成
- **参数化图形**：通过参数生成复杂形状
- **程序化生成**：算法生成图形
- **形状库**：预定义的常用形状
- **自定义图形**：用户自定义图元

### 性能优化
- **几何缓存**：缓存几何计算结果
- **批量渲染**：相似图元批处理
- **LOD 支持**：距离级别细节
- **视锥体剔除**：不可见图元剔除

## 相关模块

- `math` - 几何数学计算
- `graphics` - 图形渲染
- `batch` - 批处理渲染
- `effects` - 视觉效果