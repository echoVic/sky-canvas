import { Vector2Tests } from './Vector2.test';
import { Matrix3x3Tests } from './Matrix3x3.test';
import { TransformTests } from './Transform.test';

/**
 * 数学库测试运行器
 */
export class MathLibraryTests {
  static runAllTests(): void {
    console.log('🚀 开始运行数学库测试套件...\n');
    
    try {
      Vector2Tests.runAllTests();
      console.log('');
      
      Matrix3x3Tests.runAllTests();
      console.log('');
      
      TransformTests.runAllTests();
      console.log('');
      
      console.log('🎉 所有数学库测试通过！');
      console.log('✨ 数学库已准备就绪，可以在项目中使用。');
      
    } catch (error) {
      console.error('❌ 测试失败:', error);
      throw error;
    }
  }
}

// 如果直接运行此文件，执行所有测试
if (typeof window === 'undefined') {
  // Node.js 环境
  MathLibraryTests.runAllTests();
}
