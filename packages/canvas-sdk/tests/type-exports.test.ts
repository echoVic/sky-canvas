/**
 * 类型导出测试
 * 验证所有接口都可以作为类型导入
 */

import { describe, it, expect } from 'vitest';

// 测试类型导入
import type { ISceneManager } from '../src/managers';
import type { ICanvasManager } from '../src/managers';
import type { IToolManager } from '../src/managers';

// 测试值导入（装饰器）
import { ISceneManager as ISceneManagerDecorator } from '../src/managers';
import { ICanvasManager as ICanvasManagerDecorator } from '../src/managers';

describe('Type Exports', () => {
  it('should export ISceneManager as both type and value', () => {
    // 验证装饰器存在
    expect(ISceneManagerDecorator).toBeDefined();
    expect(typeof ISceneManagerDecorator).toBe('function');
    
    // 类型检查（编译时）
    const typeCheck: ISceneManager = {} as any;
    expect(typeCheck).toBeDefined();
  });

  it('should export ICanvasManager as both type and value', () => {
    // 验证装饰器存在
    expect(ICanvasManagerDecorator).toBeDefined();
    expect(typeof ICanvasManagerDecorator).toBe('function');
    
    // 类型检查（编译时）
    const typeCheck: ICanvasManager = {} as any;
    expect(typeCheck).toBeDefined();
  });

  it('should allow import type syntax', () => {
    // 这个测试主要是编译时检查
    // 如果 import type 失败，TypeScript 编译会报错
    const sceneManager: ISceneManager = {} as any;
    const canvasManager: ICanvasManager = {} as any;
    const toolManager: IToolManager = {} as any;
    
    expect(sceneManager).toBeDefined();
    expect(canvasManager).toBeDefined();
    expect(toolManager).toBeDefined();
  });
});
