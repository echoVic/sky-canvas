#!/usr/bin/env node

/**
 * 数学库命令行测试脚本
 */

// 模拟浏览器环境
global.window = undefined;

// 导入测试
const { MathLibraryTests } = require('../dist/tests/index.js');

console.log('🚀 开始运行数学库命令行测试...\n');

try {
  MathLibraryTests.runAllTests();
  console.log('\n✅ 所有测试通过！');
  process.exit(0);
} catch (error) {
  console.error('\n❌ 测试失败:', error.message);
  console.error(error.stack);
  process.exit(1);
}
