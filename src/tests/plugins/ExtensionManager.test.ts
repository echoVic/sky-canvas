/**
 * 扩展管理器单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtensionManager } from '../../engine/plugins/core/ExtensionManager';
import { ExtensionPoint, ExtensionProvider } from '../../engine/plugins/types/PluginTypes';

// Mock扩展提供者
class MockExtensionProvider implements ExtensionProvider {
  constructor(
    public id: string,
    public pluginId: string,
    public data: any = {}
  ) {}

  provide(): any {
    return this.data;
  }
}

// 创建测试扩展点
function createTestExtensionPoint(id: string, overrides: Partial<ExtensionPoint> = {}): ExtensionPoint {
  return {
    id,
    name: `Test Extension Point ${id}`,
    description: 'A test extension point',
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        value: { type: 'number' }
      }
    },
    ...overrides
  };
}

describe('ExtensionManager', () => {
  let extensionManager: ExtensionManager;

  beforeEach(() => {
    extensionManager = new ExtensionManager();
  });

  describe('扩展点管理', () => {
    it('应该成功定义扩展点', () => {
      const extensionPoint = createTestExtensionPoint('test-point');
      
      extensionManager.defineExtensionPoint(extensionPoint);
      
      const retrieved = extensionManager.getExtensionPoint('test-point');
      expect(retrieved).toEqual(extensionPoint);
    });

    it('应该拒绝重复定义扩展点', () => {
      const extensionPoint = createTestExtensionPoint('duplicate-point');
      
      extensionManager.defineExtensionPoint(extensionPoint);
      
      expect(() => {
        extensionManager.defineExtensionPoint(extensionPoint);
      }).toThrow('already defined');
    });

    it('应该返回所有扩展点', () => {
      const points = [
        createTestExtensionPoint('point-1'),
        createTestExtensionPoint('point-2'),
        createTestExtensionPoint('point-3')
      ];

      points.forEach(point => extensionManager.defineExtensionPoint(point));

      const allPoints = extensionManager.getAllExtensionPoints();
      expect(allPoints).toHaveLength(3);
      expect(allPoints.map(p => p.id)).toEqual(['point-1', 'point-2', 'point-3']);
    });

    it('应该正确检查扩展点存在性', () => {
      const extensionPoint = createTestExtensionPoint('exists-point');
      extensionManager.defineExtensionPoint(extensionPoint);

      expect(extensionManager.hasExtensionPoint('exists-point')).toBe(true);
      expect(extensionManager.hasExtensionPoint('non-existent')).toBe(false);
    });
  });

  describe('扩展提供者管理', () => {
    beforeEach(() => {
      const extensionPoint = createTestExtensionPoint('test-point');
      extensionManager.defineExtensionPoint(extensionPoint);
    });

    it('应该成功注册扩展提供者', () => {
      const provider = new MockExtensionProvider('provider-1', 'plugin-1', { name: 'test' });
      
      extensionManager.registerProvider('test-point', provider);
      
      const providers = extensionManager.getProviders('test-point');
      expect(providers).toHaveLength(1);
      expect(providers[0]).toBe(provider);
    });

    it('应该拒绝为不存在的扩展点注册提供者', () => {
      const provider = new MockExtensionProvider('provider-1', 'plugin-1');
      
      expect(() => {
        extensionManager.registerProvider('non-existent', provider);
      }).toThrow('not found');
    });

    it('应该成功注销扩展提供者', () => {
      const provider = new MockExtensionProvider('provider-1', 'plugin-1');
      extensionManager.registerProvider('test-point', provider);

      extensionManager.unregisterProvider('test-point', 'provider-1');

      const providers = extensionManager.getProviders('test-point');
      expect(providers).toHaveLength(0);
    });

    it('应该支持多个提供者', () => {
      const providers = [
        new MockExtensionProvider('provider-1', 'plugin-1'),
        new MockExtensionProvider('provider-2', 'plugin-2'),
        new MockExtensionProvider('provider-3', 'plugin-1')
      ];

      providers.forEach(provider => {
        extensionManager.registerProvider('test-point', provider);
      });

      const registered = extensionManager.getProviders('test-point');
      expect(registered).toHaveLength(3);
    });

    it('应该按插件ID注销提供者', () => {
      const providers = [
        new MockExtensionProvider('provider-1', 'plugin-1'),
        new MockExtensionProvider('provider-2', 'plugin-2'),
        new MockExtensionProvider('provider-3', 'plugin-1')
      ];

      providers.forEach(provider => {
        extensionManager.registerProvider('test-point', provider);
      });

      extensionManager.unregisterPluginProviders('plugin-1');

      const remaining = extensionManager.getProviders('test-point');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].pluginId).toBe('plugin-2');
    });
  });

  describe('扩展数据获取', () => {
    beforeEach(() => {
      const extensionPoint = createTestExtensionPoint('test-point');
      extensionManager.defineExtensionPoint(extensionPoint);
    });

    it('应该获取所有扩展数据', () => {
      const providers = [
        new MockExtensionProvider('provider-1', 'plugin-1', { name: 'ext1', value: 1 }),
        new MockExtensionProvider('provider-2', 'plugin-2', { name: 'ext2', value: 2 })
      ];

      providers.forEach(provider => {
        extensionManager.registerProvider('test-point', provider);
      });

      const extensions = extensionManager.getExtensions('test-point');
      expect(extensions).toHaveLength(2);
      expect(extensions[0]).toEqual({ name: 'ext1', value: 1 });
      expect(extensions[1]).toEqual({ name: 'ext2', value: 2 });
    });

    it('应该为不存在的扩展点返回空数组', () => {
      const extensions = extensionManager.getExtensions('non-existent');
      expect(extensions).toEqual([]);
    });

    it('应该处理提供者错误', () => {
      const errorProvider = {
        id: 'error-provider',
        pluginId: 'error-plugin',
        provide: () => {
          throw new Error('Provider error');
        }
      };

      extensionManager.registerProvider('test-point', errorProvider);

      const extensions = extensionManager.getExtensions('test-point');
      expect(extensions).toEqual([]);
    });
  });

  describe('事件系统', () => {
    beforeEach(() => {
      const extensionPoint = createTestExtensionPoint('test-point');
      extensionManager.defineExtensionPoint(extensionPoint);
    });

    it('应该触发扩展点定义事件', () => {
      const definedSpy = vi.fn();
      extensionManager.on('extension-point:defined', definedSpy);

      const extensionPoint = createTestExtensionPoint('new-point');
      extensionManager.defineExtensionPoint(extensionPoint);

      expect(definedSpy).toHaveBeenCalledWith('new-point', extensionPoint);
    });

    it('应该触发提供者注册事件', () => {
      const registeredSpy = vi.fn();
      extensionManager.on('provider:registered', registeredSpy);

      const provider = new MockExtensionProvider('provider-1', 'plugin-1');
      extensionManager.registerProvider('test-point', provider);

      expect(registeredSpy).toHaveBeenCalledWith('test-point', provider);
    });

    it('应该触发提供者注销事件', () => {
      const unregisteredSpy = vi.fn();
      extensionManager.on('provider:unregistered', unregisteredSpy);

      const provider = new MockExtensionProvider('provider-1', 'plugin-1');
      extensionManager.registerProvider('test-point', provider);
      extensionManager.unregisterProvider('test-point', 'provider-1');

      expect(unregisteredSpy).toHaveBeenCalledWith('test-point', 'provider-1');
    });

    it('应该触发扩展更新事件', () => {
      const updatedSpy = vi.fn();
      extensionManager.on('extensions:updated', updatedSpy);

      const provider = new MockExtensionProvider('provider-1', 'plugin-1');
      extensionManager.registerProvider('test-point', provider);

      expect(updatedSpy).toHaveBeenCalledWith('test-point');
    });
  });

  describe('扩展查询', () => {
    beforeEach(() => {
      const points = [
        createTestExtensionPoint('tools', { name: 'Tools' }),
        createTestExtensionPoint('renderers', { name: 'Renderers' }),
        createTestExtensionPoint('ui-panels', { name: 'UI Panels' })
      ];

      points.forEach(point => extensionManager.defineExtensionPoint(point));

      const providers = [
        new MockExtensionProvider('tool-1', 'plugin-1'),
        new MockExtensionProvider('tool-2', 'plugin-2'),
        new MockExtensionProvider('renderer-1', 'plugin-1'),
        new MockExtensionProvider('panel-1', 'plugin-3')
      ];

      extensionManager.registerProvider('tools', providers[0]);
      extensionManager.registerProvider('tools', providers[1]);
      extensionManager.registerProvider('renderers', providers[2]);
      extensionManager.registerProvider('ui-panels', providers[3]);
    });

    it('应该按插件ID查找提供者', () => {
      const plugin1Providers = extensionManager.getProvidersByPlugin('plugin-1');
      expect(plugin1Providers).toHaveLength(2);
      expect(plugin1Providers.every(p => p.pluginId === 'plugin-1')).toBe(true);
    });

    it('应该按扩展点ID查找提供者', () => {
      const toolProviders = extensionManager.getProviders('tools');
      expect(toolProviders).toHaveLength(2);
      expect(toolProviders.every(p => p.id.startsWith('tool-'))).toBe(true);
    });

    it('应该获取扩展点统计信息', () => {
      const stats = extensionManager.getStats();
      
      expect(stats.extensionPoints).toBe(3);
      expect(stats.totalProviders).toBe(4);
      expect(stats.providersByPoint).toEqual({
        'tools': 2,
        'renderers': 1,
        'ui-panels': 1
      });
    });
  });

  describe('扩展验证', () => {
    it('应该验证扩展数据格式', () => {
      const extensionPoint = createTestExtensionPoint('validated-point', {
        schema: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string' },
            value: { type: 'number' }
          }
        }
      });

      extensionManager.defineExtensionPoint(extensionPoint);

      // 有效数据
      const validProvider = new MockExtensionProvider('valid', 'plugin-1', {
        name: 'test',
        value: 42
      });

      expect(() => {
        extensionManager.registerProvider('validated-point', validProvider);
      }).not.toThrow();

      // 无效数据
      const invalidProvider = new MockExtensionProvider('invalid', 'plugin-2', {
        value: 'not-a-number'
      });

      expect(() => {
        extensionManager.registerProvider('validated-point', invalidProvider);
      }).toThrow();
    });
  });

  describe('清理和销毁', () => {
    it('应该清理所有数据', () => {
      const extensionPoint = createTestExtensionPoint('cleanup-point');
      extensionManager.defineExtensionPoint(extensionPoint);

      const provider = new MockExtensionProvider('provider-1', 'plugin-1');
      extensionManager.registerProvider('cleanup-point', provider);

      extensionManager.dispose();

      expect(extensionManager.getAllExtensionPoints()).toHaveLength(0);
      expect(extensionManager.getProviders('cleanup-point')).toHaveLength(0);
    });
  });
});
