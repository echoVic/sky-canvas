import { Vector2 } from '../engine/math/Vector2';

/**
 * Vector2 测试用例
 */
export class Vector2Tests {
  static runAllTests(): void {
    console.log('🧪 开始 Vector2 测试...');
    
    this.testConstruction();
    this.testBasicOperations();
    this.testVectorMath();
    this.testTransformations();
    this.testStaticMethods();
    this.testUtilityMethods();
    
    console.log('✅ Vector2 所有测试通过！');
  }

  static testConstruction(): void {
    console.log('测试 Vector2 构造...');
    
    const v1 = new Vector2();
    this.assert(v1.x === 0 && v1.y === 0, '默认构造应该为 (0, 0)');
    
    const v2 = new Vector2(3, 4);
    this.assert(v2.x === 3 && v2.y === 4, '参数构造应该正确设置值');
    
    const v3 = v2.clone();
    this.assert(v3.x === 3 && v3.y === 4, '克隆应该创建相同的向量');
    this.assert(v3 !== v2, '克隆应该创建新对象');
  }

  static testBasicOperations(): void {
    console.log('测试基础运算...');
    
    const v1 = new Vector2(1, 2);
    const v2 = new Vector2(3, 4);
    
    // 加法
    const sum = v1.add(v2);
    this.assert(sum.x === 4 && sum.y === 6, '向量加法应该正确');
    
    // 减法
    const diff = v2.subtract(v1);
    this.assert(diff.x === 2 && diff.y === 2, '向量减法应该正确');
    
    // 标量乘法
    const scaled = v1.multiply(2);
    this.assert(scaled.x === 2 && scaled.y === 4, '标量乘法应该正确');
    
    // 标量除法
    const divided = scaled.divide(2);
    this.assert(divided.x === 1 && divided.y === 2, '标量除法应该正确');
  }

  static testVectorMath(): void {
    console.log('测试向量数学运算...');
    
    const v1 = new Vector2(3, 4);
    
    // 长度
    const length = v1.length();
    this.assert(Math.abs(length - 5) < 1e-10, '向量长度应该为 5');
    
    // 长度平方
    const lengthSq = v1.lengthSquared();
    this.assert(lengthSq === 25, '向量长度平方应该为 25');
    
    // 归一化
    const normalized = v1.normalize();
    this.assert(Math.abs(normalized.length() - 1) < 1e-10, '归一化向量长度应该为 1');
    
    // 点积
    const v2 = new Vector2(1, 0);
    const dot = v1.dot(v2);
    this.assert(dot === 3, '点积应该正确计算');
    
    // 叉积
    const cross = v1.cross(v2);
    this.assert(cross === -4, '叉积应该正确计算');
    
    // 距离
    const distance = v1.distance(Vector2.ZERO);
    this.assert(Math.abs(distance - 5) < 1e-10, '距离计算应该正确');
  }

  static testTransformations(): void {
    console.log('测试向量变换...');
    
    const v1 = new Vector2(1, 0);
    
    // 旋转 90 度
    const rotated = v1.rotate(Math.PI / 2);
    this.assert(Math.abs(rotated.x) < 1e-10 && Math.abs(rotated.y - 1) < 1e-10, '90度旋转应该正确');
    
    // 垂直向量
    const perp = v1.perpendicular();
    this.assert(perp.x === 0 && perp.y === 1, '垂直向量应该正确');
    
    // 反射
    const normal = new Vector2(0, 1);
    const reflected = new Vector2(1, -1).reflect(normal);
    this.assert(Math.abs(reflected.x - 1) < 1e-10 && Math.abs(reflected.y - 1) < 1e-10, '反射应该正确');
  }

  static testStaticMethods(): void {
    console.log('测试静态方法...');
    
    // 从角度创建
    const v1 = Vector2.fromAngle(0, 5);
    this.assert(Math.abs(v1.x - 5) < 1e-10 && Math.abs(v1.y) < 1e-10, '从角度创建应该正确');
    
    // 从数组创建
    const v2 = Vector2.fromArray([3, 4]);
    this.assert(v2.x === 3 && v2.y === 4, '从数组创建应该正确');
    
    // 插值
    const v3 = new Vector2(0, 0);
    const v4 = new Vector2(10, 10);
    const lerped = Vector2.lerp(v3, v4, 0.5);
    this.assert(lerped.x === 5 && lerped.y === 5, '插值应该正确');
  }

  static testUtilityMethods(): void {
    console.log('测试工具方法...');
    
    const v1 = new Vector2(3.14159, 2.71828);
    
    // 转换为数组
    const arr = v1.toArray();
    this.assert(arr[0] === v1.x && arr[1] === v1.y, '转换为数组应该正确');
    
    // 相等比较
    const v2 = new Vector2(3.14159, 2.71828);
    this.assert(v1.equals(v2), '相等比较应该正确');
    
    // 字符串表示
    const str = v1.toString();
    this.assert(str.includes('3.142') && str.includes('2.718'), '字符串表示应该包含正确值');
  }

  static assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`断言失败: ${message}`);
    }
  }
}
