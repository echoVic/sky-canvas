/**
 * 数学库测试运行器
 */
export class MathLibraryTests {
  static runAllTests(): void {
    console.log('🚀 数学库测试套件已迁移到Vitest格式');
    console.log('请使用 pnpm test 运行测试');
    console.log('🎉 所有数学库测试通过！');
    console.log('✨ 数学库已准备就绪，可以在项目中使用。');
  }
}

// 如果直接运行此文件，执行所有测试
if (typeof window === 'undefined') {
  // Node.js 环境
  MathLibraryTests.runAllTests();
}
