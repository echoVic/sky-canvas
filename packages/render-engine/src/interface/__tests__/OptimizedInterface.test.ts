/**
 * 优化接口系统测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  BatchCallManager,
  ObjectPoolManager,
  ObjectPool,
  DataTransferOptimizer,
  InterfaceInterceptor,
  GlobalInterfaceOptimizer
} from '../OptimizedInterface';

describe('BatchCallManager', () => {
  let batchManager: BatchCallManager;

  beforeEach(() => {
    batchManager = new BatchCallManager();
    batchManager.configure({ batchDelay: 50, maxBatchSize: 5 });
  });

  afterEach(() => {
    batchManager.dispose();
  });

  it('应该能够添加批处理调用', () => {
    const processor = vi.fn();
    
    batchManager.addCall('test', 'data1', processor);
    batchManager.addCall('test', 'data2', processor);
    
    expect(batchManager.getStats().totalPendingCalls).toBe(2);
  });

  it('应该在达到最大批次时立即处理', () => {
    const processor = vi.fn();
    
    // 添加到最大批次大小
    for (let i = 0; i < 5; i++) {
      batchManager.addCall('test', `data${i}`, processor);
    }
    
    expect(processor).toHaveBeenCalledWith(
      expect.arrayContaining([
        'data0', 'data1', 'data2', 'data3', 'data4'
      ])
    );
  });

  it('应该能够手动刷新批处理', () => {
    const processor = vi.fn();
    
    batchManager.addCall('test', 'data1', processor);
    batchManager.addCall('test', 'data2', processor);
    batchManager.flush();
    
    expect(processor).toHaveBeenCalledWith(['data1', 'data2']);
  });

  it('应该按处理器分组处理', () => {
    const processor1 = vi.fn();
    const processor2 = vi.fn();
    
    batchManager.addCall('test', 'data1', processor1);
    batchManager.addCall('test', 'data2', processor2);
    batchManager.addCall('test', 'data3', processor1);
    
    batchManager.flush();
    
    expect(processor1).toHaveBeenCalledWith(['data1', 'data3']);
    expect(processor2).toHaveBeenCalledWith(['data2']);
  });
});

describe('ObjectPool', () => {
  let pool: ObjectPool<{ value: number }>;
  
  beforeEach(() => {
    pool = new ObjectPool(
      () => ({ value: 0 }),
      (obj) => { obj.value = 0; },
      3
    );
  });

  afterEach(() => {
    pool.dispose();
  });

  it('应该能够获取和释放对象', () => {
    const obj1 = pool.get();
    const obj2 = pool.get();
    
    expect(obj1).toBeDefined();
    expect(obj2).toBeDefined();
    expect(obj1).not.toBe(obj2);
    
    pool.release(obj1);
    const obj3 = pool.get();
    
    expect(obj3).toBe(obj1); // 应该复用释放的对象
  });

  it('应该正确重置对象', () => {
    const obj = pool.get();
    obj.value = 100;
    
    pool.release(obj);
    const reusedObj = pool.get();
    
    expect(reusedObj.value).toBe(0); // 应该被重置
  });

  it('应该限制池大小', () => {
    const objects = [];
    
    for (let i = 0; i < 5; i++) {
      objects.push(pool.get());
    }
    
    // 释放所有对象
    objects.forEach(obj => pool.release(obj));
    
    const stats = pool.getStats();
    expect(stats.available).toBeLessThanOrEqual(3); // 不应超过最大大小
  });

  it('应该计算命中率统计', () => {
    // 第一次获取（miss）
    const obj1 = pool.get();
    
    // 释放并再次获取（hit）
    pool.release(obj1);
    const obj2 = pool.get();
    
    const stats = pool.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(0.5);
  });
});

describe('ObjectPoolManager', () => {
  let poolManager: ObjectPoolManager;

  beforeEach(() => {
    poolManager = new ObjectPoolManager();
  });

  afterEach(() => {
    poolManager.dispose();
  });

  it('应该能够创建和获取对象池', () => {
    const pool = poolManager.createPool(
      'test',
      () => ({ value: 0 }),
      (obj) => { obj.value = 0; }
    );
    
    expect(pool).toBeDefined();
    expect(poolManager.getPool('test')).toBe(pool);
  });

  it('应该能够通过管理器获取和释放对象', () => {
    poolManager.createPool(
      'test',
      () => ({ value: 0 }),
      (obj) => { obj.value = 0; }
    );
    
    const obj = poolManager.get('test');
    expect(obj).toBeDefined();
    
    poolManager.release('test', obj);
    
    // 下次获取应该得到同一个对象
    const obj2 = poolManager.get('test');
    expect(obj2).toBe(obj);
  });

  it('应该返回所有池的统计信息', () => {
    poolManager.createPool('pool1', () => ({}));
    poolManager.createPool('pool2', () => ({}));
    
    poolManager.get('pool1');
    poolManager.get('pool2');
    
    const stats = poolManager.getStats();
    expect(stats).toHaveProperty('pool1');
    expect(stats).toHaveProperty('pool2');
  });
});

describe('DataTransferOptimizer', () => {
  let optimizer: DataTransferOptimizer;

  beforeEach(() => {
    optimizer = new DataTransferOptimizer();
  });

  afterEach(() => {
    optimizer.dispose();
  });

  it('应该能够优化小数据传输', () => {
    const data = { small: 'data' };
    const result = optimizer.optimizeTransfer(data);
    
    expect(result.data).toBe(data);
    expect(result.metadata.compressed).toBe(false);
    expect(result.metadata.cached).toBe(false);
  });

  it('应该能够压缩大数据', () => {
    const largeData = {
      data: 'x'.repeat(2000) // 超过压缩阈值
    };
    
    const result = optimizer.optimizeTransfer(largeData, { compress: true });
    
    expect(result.metadata.originalSize).toBeGreaterThan(1000);
    expect(result.metadata.processedSize).toBeDefined();
  });

  it('应该能够缓存数据', () => {
    const data = { test: 'data' };
    
    // 首次访问
    const result1 = optimizer.optimizeTransfer(data, { 
      cache: true, 
      cacheKey: 'test' 
    });
    expect(result1.metadata.cached).toBe(false);
    
    // 再次访问应该命中缓存
    const result2 = optimizer.optimizeTransfer(data, { 
      cache: true, 
      cacheKey: 'test' 
    });
    expect(result2.metadata.cached).toBe(true);
  });

  it('应该能够恢复优化的数据', () => {
    const originalData = { test: 'data', value: 123 };
    
    const optimized = optimizer.optimizeTransfer(originalData, { compress: true });
    const restored = optimizer.restoreData(optimized);
    
    expect(restored).toEqual(originalData);
  });

  it('应该管理缓存大小', () => {
    // 添加大量缓存项
    for (let i = 0; i < 1200; i++) {
      optimizer.optimizeTransfer({ data: i }, { 
        cache: true, 
        cacheKey: `key${i}` 
      });
    }
    
    const stats = optimizer.getCacheStats();
    expect(stats.size).toBeLessThanOrEqual(stats.maxSize);
  });
});

describe('InterfaceInterceptor', () => {
  let interceptor: InterfaceInterceptor;

  beforeEach(() => {
    interceptor = new InterfaceInterceptor();
  });

  afterEach(() => {
    interceptor.dispose();
  });

  it('应该能够添加和执行前置拦截器', async () => {
    const beforeSpy = vi.fn().mockImplementation(async (context) => {
      context.args[0] = context.args[0] + ' modified';
      return context;
    });
    
    interceptor.addInterceptor('testMethod', { before: beforeSpy });
    
    const originalFn = vi.fn((arg: string) => `result: ${arg}`);
    const result = await interceptor.intercept('testMethod', originalFn, ['test']);
    
    expect(beforeSpy).toHaveBeenCalled();
    expect(originalFn).toHaveBeenCalledWith('test modified');
    expect(result).toBe('result: test modified');
  });

  it('应该能够添加和执行后置拦截器', async () => {
    const afterSpy = vi.fn().mockImplementation(async (context) => {
      context.result = context.result + ' modified';
      return context;
    });
    
    interceptor.addInterceptor('testMethod', { after: afterSpy });
    
    const originalFn = vi.fn(() => 'original result');
    const result = await interceptor.intercept('testMethod', originalFn, []);
    
    expect(afterSpy).toHaveBeenCalled();
    expect(result).toBe('original result modified');
  });

  it('应该能够处理错误拦截器', async () => {
    const errorSpy = vi.fn().mockImplementation(async (context) => {
      context.error = new Error('Modified error');
      return context;
    });
    
    interceptor.addInterceptor('testMethod', { error: errorSpy });
    
    const originalFn = vi.fn(() => {
      throw new Error('Original error');
    });
    
    await expect(
      interceptor.intercept('testMethod', originalFn, [])
    ).rejects.toThrow('Modified error');
    
    expect(errorSpy).toHaveBeenCalled();
  });

  it('应该收集调用统计', async () => {
    const originalFn = vi.fn(() => 'result');
    
    await interceptor.intercept('testMethod', originalFn, []);
    await interceptor.intercept('testMethod', originalFn, []);
    
    const metrics = interceptor.getMetrics('testMethod') as any;
    expect(metrics.calls).toBe(2);
    expect(metrics.successes).toBe(2);
    expect(metrics.errors).toBe(0);
  });

  it('应该处理异步方法', async () => {
    const asyncFn = vi.fn(async (delay: number) => {
      await new Promise(resolve => setTimeout(resolve, delay));
      return 'async result';
    });
    
    const result = await interceptor.intercept('asyncMethod', asyncFn, [10]);
    
    expect(result).toBe('async result');
    
    const metrics = interceptor.getMetrics('asyncMethod') as any;
    expect(metrics.successes).toBe(1);
    expect(metrics.averageDuration).toBeGreaterThan(0);
  });

  it('应该能够移除拦截器', async () => {
    const beforeSpy = vi.fn(async (context) => context);
    
    interceptor.addInterceptor('testMethod', { before: beforeSpy });
    interceptor.removeInterceptor('testMethod', { before: beforeSpy });
    
    const originalFn = vi.fn(() => 'result');
    await interceptor.intercept('testMethod', originalFn, []);
    
    expect(beforeSpy).not.toHaveBeenCalled();
  });
});

describe('GlobalInterfaceOptimizer', () => {
  it('应该是单例', () => {
    const instance1 = GlobalInterfaceOptimizer.getInstance();
    const instance2 = GlobalInterfaceOptimizer.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('应该提供综合统计', () => {
    const optimizer = GlobalInterfaceOptimizer.getInstance();
    const stats = optimizer.getComprehensiveStats();
    
    expect(stats).toHaveProperty('batch');
    expect(stats).toHaveProperty('pools');
    expect(stats).toHaveProperty('cache');
    expect(stats).toHaveProperty('calls');
  });

  it('应该能够配置各组件', () => {
    const optimizer = GlobalInterfaceOptimizer.getInstance();
    
    expect(() => {
      optimizer.configure({
        batchDelay: 20,
        maxBatchSize: 200,
        compressionThreshold: 2048
      });
    }).not.toThrow();
  });

  it('应该能够正确销毁', () => {
    const optimizer = GlobalInterfaceOptimizer.getInstance();
    
    expect(() => {
      optimizer.dispose();
    }).not.toThrow();
    
    // 销毁后应该能够创建新实例
    const newOptimizer = GlobalInterfaceOptimizer.getInstance();
    expect(newOptimizer).toBeDefined();
  });
});

describe('集成测试', () => {
  let optimizer: GlobalInterfaceOptimizer;

  beforeEach(() => {
    optimizer = GlobalInterfaceOptimizer.getInstance();
  });

  afterEach(() => {
    optimizer.dispose();
  });

  it('应该能够组合使用各种优化技术', async () => {
    // 配置优化器
    optimizer.configure({
      batchDelay: 10,
      maxBatchSize: 3
    });
    
    // 创建对象池
    const pool = optimizer.objectPoolManager.createPool(
      'testObjects',
      () => ({ value: 0 }),
      (obj) => { obj.value = 0; }
    );
    
    // 添加拦截器
    optimizer.interceptor.addInterceptor('processData', {
      before: async (context) => {
        context.pooledObj = pool.get();
        return context;
      },
      after: async (context) => {
        if (context.pooledObj) {
          pool.release(context.pooledObj);
        }
        return context;
      }
    });
    
    // 模拟方法调用
    const processData = vi.fn((data: any) => `processed: ${data}`);
    
    // 执行带拦截的方法调用
    const result = await optimizer.interceptor.intercept('processData', processData, ['test']);
    
    expect(result).toBe('processed: test');
    
    // 验证对象池使用
    const poolStats = pool.getStats();
    expect(poolStats.hits + poolStats.misses).toBeGreaterThan(0);
  });

  it('应该能够处理大量并发操作', async () => {
    const batchProcessor = vi.fn();
    const promises = [];
    
    // 并发添加大量批处理调用
    for (let i = 0; i < 100; i++) {
      promises.push(
        new Promise<void>((resolve) => {
          optimizer.batchManager.addCall(`batch${i % 10}`, i, batchProcessor);
          resolve();
        })
      );
    }
    
    await Promise.all(promises);
    
    // 手动刷新所有批处理
    optimizer.batchManager.flush();
    
    expect(batchProcessor).toHaveBeenCalled();
    
    const stats = optimizer.getComprehensiveStats();
    expect(stats.batch.pendingBatches).toBe(0);
  });

  it('应该能够在高负载下保持性能', async () => {
    const startTime = performance.now();
    
    // 创建大量操作
    const operations = Array.from({ length: 1000 }, (_, i) => async () => {
      // 批处理调用
      optimizer.batchManager.addCall('perfTest', i, (items) => {
        // 模拟处理
      });
      
      // 对象池使用
      const obj = optimizer.objectPoolManager.get('perfTest');
      if (obj) {
        optimizer.objectPoolManager.release('perfTest', obj);
      }
      
      // 数据优化
      optimizer.dataOptimizer.optimizeTransfer({ data: i });
    });
    
    // 并发执行
    await Promise.all(operations.map(op => op()));
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // 验证性能（这里的阈值可能需要根据实际环境调整）
    expect(duration).toBeLessThan(1000); // 应该在1秒内完成
    
    const stats = optimizer.getComprehensiveStats();
    expect(stats).toBeDefined();
  });
});