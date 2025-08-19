import { Matrix3x3 } from '../engine/math/Matrix3x3';
import { Vector2 } from '../engine/math/Vector2';

/**
 * Matrix3x3 测试用例
 */
export class Matrix3x3Tests {
  static runAllTests(): void {
    console.log('🧪 开始 Matrix3x3 测试...');
    
    this.testConstruction();
    this.testBasicOperations();
    this.testMatrixMath();
    this.testTransformations();
    this.testStaticMethods();
    this.testUtilityMethods();
    
    console.log('✅ Matrix3x3 所有测试通过！');
  }

  static testConstruction(): void {
    console.log('测试 Matrix3x3 构造...');
    
    const m1 = new Matrix3x3();
    this.assert(m1.elements[0] === 1 && m1.elements[4] === 1 && m1.elements[8] === 1, '默认构造应该为单位矩阵');
    
    const m2 = new Matrix3x3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    this.assert(m2.elements[0] === 1 && m2.elements[3] === 2 && m2.elements[6] === 3, '参数构造应该正确设置值');
    
    const m3 = m2.clone();
    this.assert(m3.equals(m2), '克隆应该创建相同的矩阵');
    this.assert(m3 !== m2, '克隆应该创建新对象');
  }

  static testBasicOperations(): void {
    console.log('测试基础运算...');
    
    const m1 = new Matrix3x3(1, 0, 0, 0, 1, 0, 0, 0, 1);
    const m2 = new Matrix3x3(2, 0, 0, 0, 2, 0, 0, 0, 1);
    
    // 矩阵乘法
    const product = m1.multiply(m2);
    this.assert(product.equals(m2), '单位矩阵乘法应该保持不变');
    
    // 标量乘法
    const scaled = m1.multiplyScalar(2);
    this.assert(scaled.elements[0] === 2 && scaled.elements[4] === 2, '标量乘法应该正确');
    
    // 矩阵加法
    const sum = m1.add(m1);
    this.assert(sum.elements[0] === 2 && sum.elements[4] === 2, '矩阵加法应该正确');
  }

  static testMatrixMath(): void {
    console.log('测试矩阵数学运算...');
    
    // 行列式
    const m1 = new Matrix3x3(1, 2, 3, 0, 1, 4, 5, 6, 0);
    const det = m1.determinant();
    this.assert(det === 1, '行列式计算应该正确');
    
    // 转置
    const m2 = new Matrix3x3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    const transposed = m2.transpose();
    this.assert(transposed.elements[1] === 4 && transposed.elements[3] === 2, '转置应该正确');
    
    // 逆矩阵
    const m3 = new Matrix3x3(1, 0, 0, 0, 1, 0, 0, 0, 1);
    const inverse = m3.inverse();
    this.assert(inverse !== null && inverse.equals(m3), '单位矩阵的逆应该是自身');
  }

  static testTransformations(): void {
    console.log('测试变换矩阵...');
    
    // 平移矩阵
    const translation = Matrix3x3.translation(5, 3);
    const point = new Vector2(1, 1);
    const translated = translation.transformVector(point);
    this.assert(translated.x === 6 && translated.y === 4, '平移变换应该正确');
    
    // 旋转矩阵
    const rotation = Matrix3x3.rotation(Math.PI / 2);
    const rotated = rotation.transformVector(new Vector2(1, 0));
    this.assert(Math.abs(rotated.x) < 1e-10 && Math.abs(rotated.y - 1) < 1e-10, '90度旋转应该正确');
    
    // 缩放矩阵
    const scale = Matrix3x3.scale(2, 3);
    const scaled = scale.transformVector(new Vector2(1, 1));
    this.assert(scaled.x === 2 && scaled.y === 3, '缩放变换应该正确');
  }

  static testStaticMethods(): void {
    console.log('测试静态方法...');
    
    // 从数组创建
    const arr = [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const m1 = Matrix3x3.fromArray(arr);
    this.assert(m1.elements[0] === 1 && m1.elements[4] === 1, '从数组创建应该正确');
    
    // 矩阵乘法静态方法
    const m2 = new Matrix3x3();
    const m3 = Matrix3x3.scale(2, 2);
    const product = Matrix3x3.multiply(m2, m3);
    this.assert(product.equals(m3), '静态乘法应该正确');
    
    // 插值
    const m4 = Matrix3x3.IDENTITY;
    const m5 = Matrix3x3.scale(2, 2);
    const lerped = Matrix3x3.lerp(m4, m5, 0.5);
    this.assert(Math.abs(lerped.elements[0] - 1.5) < 1e-10, '矩阵插值应该正确');
  }

  static testUtilityMethods(): void {
    console.log('测试工具方法...');
    
    const m1 = new Matrix3x3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    
    // 转换为数组
    const arr = m1.toArray();
    this.assert(arr.length === 9 && arr[0] === 1, '转换为数组应该正确');
    
    // 相等比较
    const m2 = new Matrix3x3(1, 2, 3, 4, 5, 6, 7, 8, 9);
    this.assert(m1.equals(m2), '相等比较应该正确');
    
    // 字符串表示
    const str = m1.toString();
    this.assert(str.includes('Matrix3x3'), '字符串表示应该包含类名');
    
    // 变换分解 - 注意：矩阵乘法顺序影响分解结果
    // 正确的变换顺序应该是 T * R * S（先缩放，再旋转，最后平移）
    const scale = Matrix3x3.scale(2, 2);
    const rotation = Matrix3x3.rotation(Math.PI / 4);
    const translation = Matrix3x3.translation(5, 3);
    const transform = translation.multiply(rotation).multiply(scale);
    
    const extractedTranslation = transform.getTranslation();
    const extractedRotation = transform.getRotation();
    const extractedScale = transform.getScale();
    
    this.assert(Math.abs(extractedTranslation.x - 5) < 1e-10 && Math.abs(extractedTranslation.y - 3) < 1e-10, '平移提取应该正确');
    this.assert(Math.abs(extractedRotation - Math.PI / 4) < 1e-10, '旋转提取应该正确');
    
    this.assert(Math.abs(extractedScale.x - 2) < 1e-6 && Math.abs(extractedScale.y - 2) < 1e-6, '缩放提取应该正确');
  }

  static assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`断言失败: ${message}`);
    }
  }
}
