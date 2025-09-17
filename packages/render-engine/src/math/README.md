# Math 模块

数学计算模块，提供渲染引擎所需的各种数学工具和算法。

## 主要组件

### Vector2
二维向量类，提供 2D 向量运算功能。

**主要操作：**
- 向量加法、减法、乘法
- 点积、叉积计算
- 向量长度和单位化
- 旋转和变换

### Matrix3
3x3 矩阵类，用于 2D 变换计算。

**变换类型：**
- 平移变换
- 旋转变换
- 缩放变换
- 复合变换

### Rectangle
矩形类，提供矩形相关的几何运算。

**功能包括：**
- 碰撞检测
- 包含关系测试
- 矩形合并和交集
- 边界计算

### Geometry
几何工具类，提供通用几何计算功能。

**计算功能：**
- 点到线距离
- 线段相交检测
- 多边形面积计算
- 几何体包围盒

### CollisionDetection
碰撞检测算法集合。

**检测类型：**
- AABB 碰撞检测
- 圆形碰撞检测
- 多边形碰撞检测
- SAT 分离轴定理

### SpatialPartitioning
空间分割算法，优化大规模对象的查询性能。

**分割方法：**
- 四叉树 (QuadTree)
- 网格分割 (Grid)
- BSP 树
- 空间哈希

## 使用示例

### 向量运算
```typescript
import { Vector2 } from './math';

// 创建向量
const v1 = new Vector2(3, 4);
const v2 = new Vector2(1, 2);

// 向量运算
const sum = v1.add(v2);        // 向量加法
const dot = v1.dot(v2);        // 点积
const length = v1.length();    // 向量长度
const normalized = v1.normalize(); // 单位化
```

### 矩阵变换
```typescript
import { Matrix3 } from './math';

// 创建变换矩阵
const matrix = Matrix3.identity()
  .translate(100, 50)
  .rotate(Math.PI / 4)
  .scale(2, 2);

// 应用变换
const point = new Vector2(10, 20);
const transformed = matrix.transformPoint(point);
```

### 碰撞检测
```typescript
import { CollisionDetection, Rectangle } from './math';

// 矩形碰撞检测
const rect1 = new Rectangle(0, 0, 100, 100);
const rect2 = new Rectangle(50, 50, 100, 100);
const collision = CollisionDetection.rectRect(rect1, rect2);

if (collision.intersects) {
  console.log('发生碰撞！');
}
```

### 空间分割
```typescript
import { SpatialPartitioning } from './math';

// 创建四叉树
const quadTree = new SpatialPartitioning.QuadTree({
  x: 0, y: 0, width: 1000, height: 1000
});

// 插入对象
quadTree.insert(object1);
quadTree.insert(object2);

// 查询区域内的对象
const objectsInRegion = quadTree.query({
  x: 100, y: 100, width: 200, height: 200
});
```

## 算法特性

### 高性能计算
- **SIMD 优化**：支持 SIMD 指令加速
- **内存池**：减少内存分配开销
- **批量处理**：批量向量运算优化
- **缓存友好**：数据结构优化内存访问

### 数值稳定性
- **浮点精度处理**：避免浮点误差
- **数值范围检查**：防止溢出和下溢
- **容差比较**：浮点数比较优化
- **数值归一化**：保持数值稳定性

## 性能优化

### 计算优化
- 预计算常用值（如三角函数表）
- 使用快速算法（如快速平方根倒数）
- 避免重复计算（缓存中间结果）
- 利用对称性和周期性

### 内存优化
- 对象池复用数学对象
- 紧凑的数据布局
- 减少间接访问
- 优化缓存命中率

## 相关模块

- `animation` - 动画数学计算
- `physics` - 物理模拟
- `graphics` - 图形变换
- `culling` - 空间查询