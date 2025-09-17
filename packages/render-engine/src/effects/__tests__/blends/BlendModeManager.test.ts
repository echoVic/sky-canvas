/**
 * BlendModeManager 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BlendMode, BlendModeConfig } from '../../blends';
import { BlendModeManager } from '../../blends/BlendModeManager';

// Mock Canvas API
const mockCanvas = {
  getContext: vi.fn().mockReturnValue({
    globalCompositeOperation: 'source-over',
    globalAlpha: 1.0
  })
};

Object.defineProperty(global, 'HTMLCanvasElement', {
  value: vi.fn().mockImplementation(() => mockCanvas),
  writable: true
});

describe('BlendModeManager', () => {
  let manager: BlendModeManager;
  let mockCtx: CanvasRenderingContext2D;

  beforeEach(() => {
    // 重置单例实例以确保每个测试都有干净的状态
    (BlendModeManager as any).instance = undefined;
    manager = BlendModeManager.getInstance();

    mockCtx = {
      globalCompositeOperation: 'source-over',
      globalAlpha: 1.0
    } as any;
  });

  describe('getInstance', () => {
    it('应该返回单例实例', () => {
      const instance1 = BlendModeManager.getInstance();
      const instance2 = BlendModeManager.getInstance();

      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(BlendModeManager);
    });
  });

  describe('getBlendMode', () => {
    it('应该返回正确的混合模式配置', () => {
      const normalConfig = manager.getBlendMode(BlendMode.NORMAL);

      expect(normalConfig).toBeDefined();
      expect(normalConfig?.mode).toBe(BlendMode.NORMAL);
      expect(normalConfig?.opacity).toBe(1.0);
      expect(normalConfig?.enabled).toBe(true);
    });

    it('应该为所有标准混合模式返回配置', () => {
      const modes = [
        BlendMode.NORMAL,
        BlendMode.MULTIPLY,
        BlendMode.SCREEN,
        BlendMode.OVERLAY,
        BlendMode.DARKEN,
        BlendMode.LIGHTEN,
        BlendMode.COLOR_BURN,
        BlendMode.COLOR_DODGE,
        BlendMode.DIFFERENCE,
        BlendMode.EXCLUSION
      ];

      modes.forEach(mode => {
        const config = manager.getBlendMode(mode);
        expect(config).toBeDefined();
        expect(config?.mode).toBe(mode);
      });
    });

    it('应该为不存在的混合模式返回undefined', () => {
      const config = manager.getBlendMode('non-existent' as BlendMode);
      expect(config).toBeUndefined();
    });
  });

  describe('setBlendMode', () => {
    it('应该能设置新的混合模式配置', () => {
      const customConfig: BlendModeConfig = {
        mode: BlendMode.MULTIPLY,
        opacity: 0.5,
        enabled: false
      };

      manager.setBlendMode(BlendMode.MULTIPLY, customConfig);
      const retrieved = manager.getBlendMode(BlendMode.MULTIPLY);

      expect(retrieved).toEqual(customConfig);
    });

    it('应该能设置全新的混合模式', () => {
      const newMode = 'custom-mode' as BlendMode;
      const customConfig: BlendModeConfig = {
        mode: newMode,
        opacity: 0.8,
        enabled: true
      };

      manager.setBlendMode(newMode, customConfig);
      const retrieved = manager.getBlendMode(newMode);

      expect(retrieved).toEqual(customConfig);
    });
  });

  describe('getAllBlendModes', () => {
    it('应该返回所有可用的混合模式', () => {
      const allModes = manager.getAllBlendModes();

      expect(allModes).toBeInstanceOf(Array);
      expect(allModes.length).toBeGreaterThan(0);
      expect(allModes).toContain(BlendMode.NORMAL);
      expect(allModes).toContain(BlendMode.MULTIPLY);
      expect(allModes).toContain(BlendMode.SCREEN);
    });

    it('添加新模式后应该包含在列表中', () => {
      const newMode = 'test-mode' as BlendMode;
      const config: BlendModeConfig = {
        mode: newMode,
        opacity: 1.0,
        enabled: true
      };

      const initialCount = manager.getAllBlendModes().length;
      manager.setBlendMode(newMode, config);
      const newModes = manager.getAllBlendModes();

      expect(newModes.length).toBe(initialCount + 1);
      expect(newModes).toContain(newMode);
    });
  });

  describe('isBlendModeAvailable', () => {
    it('应该为存在的混合模式返回true', () => {
      expect(manager.isBlendModeAvailable(BlendMode.NORMAL)).toBe(true);
      expect(manager.isBlendModeAvailable(BlendMode.MULTIPLY)).toBe(true);
    });

    it('应该为不存在的混合模式返回false', () => {
      expect(manager.isBlendModeAvailable('non-existent' as BlendMode)).toBe(false);
    });

    it('添加新模式后应该返回true', () => {
      const newMode = 'test-available' as BlendMode;
      const config: BlendModeConfig = {
        mode: newMode,
        opacity: 1.0,
        enabled: true
      };

      expect(manager.isBlendModeAvailable(newMode)).toBe(false);

      manager.setBlendMode(newMode, config);
      expect(manager.isBlendModeAvailable(newMode)).toBe(true);
    });
  });

  describe('applyBlendMode', () => {
    it('应该应用启用的混合模式', () => {
      const config: BlendModeConfig = {
        mode: BlendMode.MULTIPLY,
        opacity: 0.8,
        enabled: true
      };

      manager.applyBlendMode(mockCtx, config);

      expect(mockCtx.globalCompositeOperation).toBe('multiply');
      expect(mockCtx.globalAlpha).toBe(0.8);
    });

    it('应该忽略禁用的混合模式', () => {
      const originalOperation = mockCtx.globalCompositeOperation;
      const originalAlpha = mockCtx.globalAlpha;

      const config: BlendModeConfig = {
        mode: BlendMode.SCREEN,
        opacity: 0.5,
        enabled: false
      };

      manager.applyBlendMode(mockCtx, config);

      expect(mockCtx.globalCompositeOperation).toBe(originalOperation);
      expect(mockCtx.globalAlpha).toBe(originalAlpha);
    });

    it('应该处理不同的不透明度值', () => {
      const opacityValues = [0.0, 0.25, 0.5, 0.75, 1.0];

      opacityValues.forEach(opacity => {
        const config: BlendModeConfig = {
          mode: BlendMode.NORMAL,
          opacity,
          enabled: true
        };

        manager.applyBlendMode(mockCtx, config);
        expect(mockCtx.globalAlpha).toBe(opacity);
      });
    });
  });

  describe('resetBlendMode', () => {
    it('应该重置为默认的混合模式', () => {
      // 先设置一个非默认状态
      mockCtx.globalCompositeOperation = 'multiply' as GlobalCompositeOperation;
      mockCtx.globalAlpha = 0.5;

      manager.resetBlendMode(mockCtx);

      expect(mockCtx.globalCompositeOperation).toBe('source-over');
      expect(mockCtx.globalAlpha).toBe(1.0);
    });

    it('应该始终重置到相同的默认状态', () => {
      const iterations = 5;

      for (let i = 0; i < iterations; i++) {
        // 随机设置状态
        mockCtx.globalCompositeOperation = 'screen' as GlobalCompositeOperation;
        mockCtx.globalAlpha = Math.random();

        manager.resetBlendMode(mockCtx);

        expect(mockCtx.globalCompositeOperation).toBe('source-over');
        expect(mockCtx.globalAlpha).toBe(1.0);
      }
    });
  });

  describe('性能测试', () => {
    it('应该在合理时间内处理大量混合模式查询', () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        manager.getBlendMode(BlendMode.MULTIPLY);
        manager.isBlendModeAvailable(BlendMode.SCREEN);
        manager.getAllBlendModes();
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 应该在100ms内完成
      expect(duration).toBeLessThan(100);
    });

    it('应该在合理时间内应用混合模式', () => {
      const config: BlendModeConfig = {
        mode: BlendMode.OVERLAY,
        opacity: 0.7,
        enabled: true
      };

      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        manager.applyBlendMode(mockCtx, config);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 应该在50ms内完成
      expect(duration).toBeLessThan(50);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的上下文', () => {
      const config: BlendModeConfig = {
        mode: BlendMode.NORMAL,
        opacity: 1.0,
        enabled: true
      };

      expect(() => {
        manager.applyBlendMode(null as any, config);
      }).not.toThrow();

      expect(() => {
        manager.resetBlendMode(null as any);
      }).not.toThrow();
    });

    it('应该处理无效的配置', () => {
      expect(() => {
        manager.applyBlendMode(mockCtx, null as any);
      }).not.toThrow();

      expect(() => {
        manager.applyBlendMode(mockCtx, undefined as any);
      }).not.toThrow();
    });
  });

  describe('配置验证', () => {
    it('应该验证有效的混合模式配置', () => {
      const validConfigs: BlendModeConfig[] = [
        { mode: BlendMode.NORMAL, opacity: 1.0, enabled: true },
        { mode: BlendMode.MULTIPLY, opacity: 0.5, enabled: false },
        { mode: BlendMode.SCREEN, opacity: 0.0, enabled: true },
      ];

      validConfigs.forEach(config => {
        expect(() => {
          manager.setBlendMode(config.mode, config);
        }).not.toThrow();

        const retrieved = manager.getBlendMode(config.mode);
        expect(retrieved).toEqual(config);
      });
    });

    it('应该处理边界值', () => {
      const edgeCases: BlendModeConfig[] = [
        { mode: BlendMode.NORMAL, opacity: 0.0, enabled: true },
        { mode: BlendMode.MULTIPLY, opacity: 1.0, enabled: false },
      ];

      edgeCases.forEach(config => {
        expect(() => {
          manager.setBlendMode(config.mode, config);
          manager.applyBlendMode(mockCtx, config);
        }).not.toThrow();
      });
    });
  });
});