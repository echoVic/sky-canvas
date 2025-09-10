/**
 * 动画系统测试设置
 * 模拟浏览器环境中的动画相关API
 */

import { vi } from 'vitest';

// 模拟 performance.now()
if (!global.performance) {
  global.performance = {
    now: vi.fn(() => Date.now())
  } as any;
}

// 模拟 requestAnimationFrame 和 cancelAnimationFrame
let animationId = 1;
const animationCallbacks = new Map<number, FrameRequestCallback>();

global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
  const id = animationId++;
  animationCallbacks.set(id, callback);
  
  // 异步执行回调以模拟真实的动画帧
  setTimeout(() => {
    const cb = animationCallbacks.get(id);
    if (cb) {
      cb(performance.now());
      animationCallbacks.delete(id);
    }
  }, 16); // 模拟 60fps
  
  return id;
});

global.cancelAnimationFrame = vi.fn((id: number) => {
  animationCallbacks.delete(id);
});

// 模拟 setTimeout 和 clearTimeout
global.setTimeout = vi.fn(global.setTimeout);
global.clearTimeout = vi.fn(global.clearTimeout);

// 创建测试用的动画目标对象
export function createTestTarget() {
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    opacity: 1,
    rotation: 0,
    scale: 1,
    transform: {
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1
    },
    style: {
      backgroundColor: '#ffffff',
      borderRadius: 0
    }
  };
}

// 测试工具函数
export class TestUtils {
  /**
   * 等待指定时间
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 等待下一个动画帧
   */
  static async waitForAnimationFrame(): Promise<void> {
    return new Promise(resolve => requestAnimationFrame(() => resolve()));
  }

  /**
   * 模拟时间流逝
   */
  static mockTimeElapse(ms: number): void {
    const now = performance.now();
    vi.mocked(performance.now).mockReturnValue(now + ms);
  }

  /**
   * 触发所有待处理的动画帧
   */
  static async flushAnimationFrames(): Promise<void> {
    // 等待一段时间让所有动画帧回调执行
    await this.wait(50);
  }

  /**
   * 重置时间模拟
   */
  static resetTimeMocks(): void {
    if (vi.mocked(performance.now).mockClear) {
      vi.mocked(performance.now).mockClear();
    }
    if (vi.mocked(requestAnimationFrame).mockClear) {
      vi.mocked(requestAnimationFrame).mockClear();
    }
    if (vi.mocked(cancelAnimationFrame).mockClear) {
      vi.mocked(cancelAnimationFrame).mockClear();
    }
  }
}