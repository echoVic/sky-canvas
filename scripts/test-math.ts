#!/usr/bin/env tsx

/**
 * 数学库 TypeScript 命令行测试脚本
 */

import { MathLibraryTests } from '../src/tests/index';

console.log('🚀 开始运行数学库命令行测试...\n');

try {
  MathLibraryTests.runAllTests();
  console.log('\n✅ 所有测试通过！');
  process.exit(0);
} catch (error) {
  console.error('\n❌ 测试失败:', error instanceof Error ? error.message : String(error));
  if (error instanceof Error && error.stack) {
    console.error(error.stack);
  }
  process.exit(1);
}
