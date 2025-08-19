import React, { useState } from 'react';
import { MathLibraryTests } from '../../tests';

export const MathTestPanel: React.FC = () => {
  const [testResults, setTestResults] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);

  const runTests = async () => {
    setIsRunning(true);
    setTestResults('');

    // 重定向 console.log 来捕获测试输出
    const originalLog = console.log;
    const originalError = console.error;
    const logs: string[] = [];

    console.log = (...args) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    console.error = (...args) => {
      logs.push(`ERROR: ${args.join(' ')}`);
      originalError(...args);
    };

    try {
      MathLibraryTests.runAllTests();
      logs.push('\n✅ 所有测试通过！数学库运行正常。');
    } catch (error) {
      logs.push(`\n❌ 测试失败: ${error}`);
    } finally {
      // 恢复原始的 console 方法
      console.log = originalLog;
      console.error = originalError;
      
      setTestResults(logs.join('\n'));
      setIsRunning(false);
    }
  };

  return (
    <div className="p-4 bg-white border border-gray-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">数学库测试面板</h3>
      
      <button
        onClick={runTests}
        disabled={isRunning}
        className={`px-4 py-2 rounded font-medium ${
          isRunning
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
        }`}
      >
        {isRunning ? '运行中...' : '运行数学库测试'}
      </button>

      {testResults && (
        <div className="mt-4">
          <h4 className="font-medium mb-2">测试结果:</h4>
          <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto max-h-96 whitespace-pre-wrap">
            {testResults}
          </pre>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600">
        <p><strong>数学库功能:</strong></p>
        <ul className="list-disc list-inside mt-2 space-y-1">
          <li><strong>Vector2:</strong> 2D向量运算（加减乘除、点积叉积、归一化、旋转等）</li>
          <li><strong>Matrix3x3:</strong> 3x3矩阵运算（乘法、逆矩阵、变换矩阵等）</li>
          <li><strong>Transform:</strong> 高级2D变换（位置、旋转、缩放的组合变换）</li>
        </ul>
      </div>
    </div>
  );
};
