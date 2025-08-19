# 核心数学库文档

## 概述

Sky Canvas 的核心数学库提供了完整的 2D 图形数学运算功能，包括向量运算、矩阵变换和高级变换操作。

## 核心类

### Vector2 - 2D向量类

```typescript
import { Vector2 } from '../engine/math';

// 创建向量
const v1 = new Vector2(3, 4);
const v2 = Vector2.fromAngle(Math.PI / 4, 5); // 从角度和长度创建

// 基础运算
const sum = v1.add(v2);
const diff = v1.subtract(v2);
const scaled = v1.multiply(2);

// 向量属性
const length = v1.length(); // 5
const normalized = v1.normalize();

// 向量关系
const dotProduct = v1.dot(v2);
const crossProduct = v1.cross(v2);
const distance = v1.distance(v2);

// 变换
const rotated = v1.rotate(Math.PI / 2);
const reflected = v1.reflect(Vector2.UP);
```

### Matrix3x3 - 3x3矩阵类

```typescript
import { Matrix3x3 } from '../engine/math';

// 创建矩阵
const identity = new Matrix3x3(); // 单位矩阵
const translation = Matrix3x3.translation(10, 5);
const rotation = Matrix3x3.rotation(Math.PI / 4);
const scale = Matrix3x3.scale(2, 3);

// 矩阵运算
const combined = translation.multiply(rotation).multiply(scale);
const inverse = combined.inverse();

// 向量变换
const point = new Vector2(1, 1);
const transformed = combined.transformVector(point);

// 矩阵属性
const determinant = combined.determinant();
const transposed = combined.transpose();
```

### Transform - 高级变换类

```typescript
import { Transform, Vector2 } from '../engine/math';

// 创建变换
const transform = new Transform(
  new Vector2(10, 20), // 位置
  Math.PI / 4,         // 旋转
  new Vector2(2, 2)    // 缩放
);

// 属性访问
transform.position = new Vector2(5, 5);
transform.rotation = Math.PI / 2;
transform.scale = new Vector2(1.5, 1.5);

// 变换操作
transform.translate(new Vector2(5, 0));
transform.rotate(Math.PI / 6);
transform.scaleBy(1.2);

// 点变换
const point = new Vector2(1, 1);
const transformedPoint = transform.transformPoint(point);
const originalPoint = transform.inverseTransformPoint(transformedPoint);

// 变换组合
const t1 = Transform.translation(5, 3);
const t2 = Transform.rotation(Math.PI / 4);
const combined = t1.combine(t2);
```

## 使用示例

### 画布变换

```typescript
import { Transform, Vector2 } from '../engine/math';

class CanvasTransform {
  private viewTransform: Transform;

  constructor() {
    this.viewTransform = new Transform();
  }

  // 设置视图变换
  setView(position: Vector2, zoom: number, rotation: number = 0) {
    this.viewTransform.setPosition(position);
    this.viewTransform.setScale(zoom, zoom);
    this.viewTransform.setRotation(rotation);
  }

  // 世界坐标转屏幕坐标
  worldToScreen(worldPoint: Vector2): Vector2 {
    return this.viewTransform.transformPoint(worldPoint);
  }

  // 屏幕坐标转世界坐标
  screenToWorld(screenPoint: Vector2): Vector2 {
    return this.viewTransform.inverseTransformPoint(screenPoint);
  }
}
```

### 物理模拟

```typescript
import { Vector2 } from '../engine/math';

class PhysicsObject {
  position: Vector2;
  velocity: Vector2;
  acceleration: Vector2;

  constructor(pos: Vector2) {
    this.position = pos.clone();
    this.velocity = Vector2.ZERO.clone();
    this.acceleration = Vector2.ZERO.clone();
  }

  update(deltaTime: number) {
    // 更新速度
    this.velocity.addInPlace(this.acceleration.multiply(deltaTime));
    
    // 更新位置
    this.position.addInPlace(this.velocity.multiply(deltaTime));
    
    // 应用阻力
    this.velocity.multiplyInPlace(0.99);
  }

  applyForce(force: Vector2) {
    this.acceleration.addInPlace(force);
  }
}
```

### 碰撞检测

```typescript
import { Vector2 } from '../engine/math';

class CollisionUtils {
  // 点与圆的碰撞
  static pointCircleCollision(point: Vector2, center: Vector2, radius: number): boolean {
    return point.distance(center) <= radius;
  }

  // 圆与圆的碰撞
  static circleCircleCollision(
    center1: Vector2, radius1: number,
    center2: Vector2, radius2: number
  ): boolean {
    return center1.distance(center2) <= (radius1 + radius2);
  }

  // 线段与圆的碰撞
  static lineCircleCollision(
    lineStart: Vector2, lineEnd: Vector2,
    center: Vector2, radius: number
  ): boolean {
    const line = lineEnd.subtract(lineStart);
    const toCenter = center.subtract(lineStart);
    
    const projection = toCenter.dot(line) / line.lengthSquared();
    const clampedProjection = Math.max(0, Math.min(1, projection));
    
    const closestPoint = lineStart.add(line.multiply(clampedProjection));
    return closestPoint.distance(center) <= radius;
  }
}
```

## 性能优化建议

### 1. 使用 InPlace 方法
```typescript
// 避免创建新对象
vector.addInPlace(other);
matrix.multiplyInPlace(other);

// 而不是
vector = vector.add(other);
matrix = matrix.multiply(other);
```

### 2. 重用对象
```typescript
class VectorPool {
  private pool: Vector2[] = [];

  get(): Vector2 {
    return this.pool.pop() || new Vector2();
  }

  release(vector: Vector2): void {
    vector.set(0, 0);
    this.pool.push(vector);
  }
}
```

### 3. 缓存计算结果
```typescript
class CachedTransform extends Transform {
  private matrixCache?: Matrix3x3;
  private matrixDirty = true;

  get matrix(): Matrix3x3 {
    if (this.matrixDirty) {
      this.matrixCache = super.matrix;
      this.matrixDirty = false;
    }
    return this.matrixCache!;
  }
}
```

## 测试

运行数学库测试：

```typescript
import { MathLibraryTests } from '../tests';

// 运行所有测试
MathLibraryTests.runAllTests();
```

测试覆盖：
- ✅ Vector2: 构造、运算、变换、工具方法
- ✅ Matrix3x3: 构造、运算、变换、分解
- ✅ Transform: 构造、组合、逆变换、插值

## API 参考

### Vector2 静态常量
- `Vector2.ZERO` - (0, 0)
- `Vector2.ONE` - (1, 1)
- `Vector2.UP` - (0, -1)
- `Vector2.DOWN` - (0, 1)
- `Vector2.LEFT` - (-1, 0)
- `Vector2.RIGHT` - (1, 0)

### Matrix3x3 静态常量
- `Matrix3x3.IDENTITY` - 单位矩阵
- `Matrix3x3.ZERO` - 零矩阵

### 常用变换矩阵
- `Matrix3x3.translation(x, y)` - 平移矩阵
- `Matrix3x3.rotation(angle)` - 旋转矩阵
- `Matrix3x3.scale(x, y)` - 缩放矩阵
- `Matrix3x3.shear(x, y)` - 剪切矩阵

数学库已完全实现并经过测试，可以在整个项目中安全使用。
