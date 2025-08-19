import { Transform } from '../engine/math/Transform';
import { Vector2 } from '../engine/math/Vector2';
import { Matrix3x3 } from '../engine/math/Matrix3x3';

/**
 * Transform 测试用例
 */
export class TransformTests {
  static runAllTests(): void {
    console.log('🧪 开始 Transform 测试...');
    
    this.testConstruction();
    this.testPropertyAccess();
    this.testTransformOperations();
    this.testPointTransformation();
    this.testCombination();
    this.testInverse();
    this.testStaticMethods();
    this.testUtilityMethods();
    
    console.log('✅ Transform 所有测试通过！');
  }

  static testConstruction(): void {
    console.log('测试 Transform 构造...');
    
    const t1 = new Transform();
    this.assert(t1.position.equals(Vector2.ZERO) && t1.rotation === 0 && t1.scale.equals(Vector2.ONE), 
                '默认构造应该为单位变换');
    
    const t2 = new Transform(new Vector2(5, 3), Math.PI / 4, new Vector2(2, 2));
    this.assert(t2.position.x === 5 && t2.position.y === 3, '参数构造应该正确设置位置');
    this.assert(Math.abs(t2.rotation - Math.PI / 4) < 1e-10, '参数构造应该正确设置旋转');
    this.assert(t2.scale.x === 2 && t2.scale.y === 2, '参数构造应该正确设置缩放');
    
    const t3 = t2.clone();
    this.assert(t3.equals(t2), '克隆应该创建相同的变换');
    this.assert(t3 !== t2, '克隆应该创建新对象');
  }

  static testPropertyAccess(): void {
    console.log('测试属性访问...');
    
    const t = new Transform();
    
    // 设置位置
    t.position = new Vector2(10, 20);
    this.assert(t.position.x === 10 && t.position.y === 20, '位置设置应该正确');
    
    // 设置旋转
    t.rotation = Math.PI / 2;
    this.assert(Math.abs(t.rotation - Math.PI / 2) < 1e-10, '旋转设置应该正确');
    
    // 设置缩放
    t.scale = new Vector2(3, 4);
    this.assert(t.scale.x === 3 && t.scale.y === 4, '缩放设置应该正确');
    
    // 获取矩阵
    const matrix = t.matrix;
    this.assert(matrix instanceof Matrix3x3, '应该返回 Matrix3x3 实例');
  }

  static testTransformOperations(): void {
    console.log('测试变换操作...');
    
    const t = new Transform();
    
    // 平移
    t.translate(new Vector2(5, 3));
    this.assert(t.position.x === 5 && t.position.y === 3, '平移应该正确更新位置');
    
    t.translateBy(2, 1);
    this.assert(t.position.x === 7 && t.position.y === 4, 'translateBy 应该正确累加位置');
    
    // 旋转
    t.rotate(Math.PI / 4);
    this.assert(Math.abs(t.rotation - Math.PI / 4) < 1e-10, '旋转应该正确累加角度');
    
    // 缩放
    t.scaleBy(2);
    this.assert(t.scale.x === 2 && t.scale.y === 2, '统一缩放应该正确');
    
    t.scaleBy(1.5, 2);
    this.assert(Math.abs(t.scale.x - 3) < 1e-10 && Math.abs(t.scale.y - 4) < 1e-10, '非统一缩放应该正确');
  }

  static testPointTransformation(): void {
    console.log('测试点变换...');
    
    // 仅平移
    const t1 = Transform.translation(5, 3);
    const p1 = new Vector2(1, 1);
    const transformed1 = t1.transformPoint(p1);
    this.assert(transformed1.x === 6 && transformed1.y === 4, '平移变换应该正确');
    
    // 仅旋转
    const t2 = Transform.rotation(Math.PI / 2);
    const p2 = new Vector2(1, 0);
    const transformed2 = t2.transformPoint(p2);
    this.assert(Math.abs(transformed2.x) < 1e-10 && Math.abs(transformed2.y - 1) < 1e-10, '旋转变换应该正确');
    
    // 仅缩放
    const t3 = Transform.scale(2, 3);
    const p3 = new Vector2(1, 1);
    const transformed3 = t3.transformPoint(p3);
    this.assert(transformed3.x === 2 && transformed3.y === 3, '缩放变换应该正确');
    
    // 方向变换
    const direction = new Vector2(1, 0);
    const transformedDir = t1.transformDirection(direction);
    this.assert(transformedDir.x === 1 && transformedDir.y === 0, '方向变换不应该受平移影响');
  }

  static testCombination(): void {
    console.log('测试变换组合...');
    
    const t1 = Transform.translation(5, 3);
    const t2 = Transform.rotation(Math.PI / 4);
    const t3 = Transform.scale(2, 2);
    
    // 组合变换
    const combined = t1.combine(t2).combine(t3);
    
    // 测试点变换
    const point = new Vector2(1, 0);
    const result1 = combined.transformPoint(point);
    
    // 分步变换进行验证
    const step1 = t3.transformPoint(point);
    const step2 = t2.transformPoint(step1);
    const step3 = t1.transformPoint(step2);
    
    this.assert(Math.abs(result1.x - step3.x) < 1e-10 && Math.abs(result1.y - step3.y) < 1e-10, 
                '组合变换应该等于分步变换');
  }

  static testInverse(): void {
    console.log('测试逆变换...');
    
    // 测试简单的单独变换
    
    // 1. 仅平移
    const t1 = new Transform(new Vector2(5, 3), 0, new Vector2(1, 1));
    const inv1 = t1.inverse();
    this.assert(inv1 !== null, '平移变换应该可逆');
    if (inv1) {
      const point = new Vector2(10, 20);
      const transformed = t1.transformPoint(point);
      const backTransformed = inv1.transformPoint(transformed);
      
      console.log('平移测试:');
      console.log('原始点:', point.x, point.y);
      console.log('变换后:', transformed.x, transformed.y);
      console.log('逆变换后:', backTransformed.x, backTransformed.y);
      console.log('差异:', Math.abs(backTransformed.x - point.x), Math.abs(backTransformed.y - point.y));
      console.log('逆变换参数:', inv1.position.x, inv1.position.y, inv1.rotation, inv1.scale.x, inv1.scale.y);
      
      this.assert(Math.abs(backTransformed.x - point.x) < 1e-6 && Math.abs(backTransformed.y - point.y) < 1e-6, 
                  '平移逆变换应该精确');
    }
    
    // 2. 仅旋转
    const t2 = new Transform(new Vector2(0, 0), Math.PI / 4, new Vector2(1, 1));
    const inv2 = t2.inverse();
    this.assert(inv2 !== null, '旋转变换应该可逆');
    if (inv2) {
      const point = new Vector2(10, 20);
      const transformed = t2.transformPoint(point);
      const backTransformed = inv2.transformPoint(transformed);
      
      console.log('旋转测试:');
      console.log('原始点:', point.x, point.y);
      console.log('变换后:', transformed.x, transformed.y);
      console.log('逆变换后:', backTransformed.x, backTransformed.y);
      console.log('差异:', Math.abs(backTransformed.x - point.x), Math.abs(backTransformed.y - point.y));
      
      this.assert(Math.abs(backTransformed.x - point.x) < 1e-6 && Math.abs(backTransformed.y - point.y) < 1e-6, 
                  '旋转逆变换应该精确');
    }
    
    // 3. 仅缩放
    const t3 = new Transform(new Vector2(0, 0), 0, new Vector2(2, 3));
    const inv3 = t3.inverse();
    this.assert(inv3 !== null, '缩放变换应该可逆');
    if (inv3) {
      const point = new Vector2(10, 20);
      const transformed = t3.transformPoint(point);
      const backTransformed = inv3.transformPoint(transformed);
      
      console.log('缩放测试:');
      console.log('原始点:', point.x, point.y);
      console.log('变换后:', transformed.x, transformed.y);
      console.log('逆变换后:', backTransformed.x, backTransformed.y);
      console.log('差异:', Math.abs(backTransformed.x - point.x), Math.abs(backTransformed.y - point.y));
      console.log('逆变换参数:', inv3.position.x, inv3.position.y, inv3.rotation, inv3.scale.x, inv3.scale.y);
      
      this.assert(Math.abs(backTransformed.x - point.x) < 1e-6 && Math.abs(backTransformed.y - point.y) < 1e-6, 
                  '缩放逆变换应该精确');
    }
  }

  static testStaticMethods(): void {
    console.log('测试静态方法...');
    
    // 单位变换
    const identity = Transform.identity();
    this.assert(identity.position.equals(Vector2.ZERO) && identity.rotation === 0 && identity.scale.equals(Vector2.ONE), 
                '单位变换应该正确');
    
    // 从矩阵创建
    const matrix = Matrix3x3.translation(5, 3).multiply(Matrix3x3.rotation(Math.PI / 4));
    const fromMatrix = Transform.fromMatrix(matrix);
    this.assert(Math.abs(fromMatrix.position.x - 5) < 1e-10 && Math.abs(fromMatrix.position.y - 3) < 1e-10, 
                '从矩阵创建应该正确提取位置');
    
    // 从对象创建
    const obj = { position: [10, 20] as [number, number], rotation: Math.PI / 2, scale: [2, 3] as [number, number] };
    const fromObj = Transform.fromObject(obj);
    this.assert(fromObj.position.x === 10 && fromObj.position.y === 20, '从对象创建应该正确');
    
    // 插值
    const t1 = Transform.translation(0, 0);
    const t2 = Transform.translation(10, 10);
    const lerped = Transform.lerp(t1, t2, 0.5);
    this.assert(lerped.position.x === 5 && lerped.position.y === 5, '变换插值应该正确');
  }

  static testUtilityMethods(): void {
    console.log('测试工具方法...');
    
    const t = new Transform(new Vector2(5, 3), Math.PI / 4, new Vector2(2, 2));
    
    // 转换为对象
    const obj = t.toObject();
    this.assert(obj.position[0] === 5 && obj.position[1] === 3, 'toObject 应该正确转换位置');
    this.assert(Math.abs(obj.rotation - Math.PI / 4) < 1e-10, 'toObject 应该正确转换旋转');
    this.assert(obj.scale[0] === 2 && obj.scale[1] === 2, 'toObject 应该正确转换缩放');
    
    // 字符串表示
    const str = t.toString();
    this.assert(str.includes('Transform') && str.includes('position'), '字符串表示应该包含关键信息');
    
    // 相等比较
    const t2 = new Transform(new Vector2(5, 3), Math.PI / 4, new Vector2(2, 2));
    this.assert(t.equals(t2), '相等比较应该正确');
    
    // 重置
    const t3 = t.clone();
    t3.reset();
    this.assert(t3.position.equals(Vector2.ZERO) && t3.rotation === 0 && t3.scale.equals(Vector2.ONE), 
                '重置应该恢复到单位变换');
  }

  static assert(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`断言失败: ${message}`);
    }
  }
}
