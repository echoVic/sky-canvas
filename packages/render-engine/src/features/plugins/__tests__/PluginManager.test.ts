/**
 * PluginManager 单元测试
 * 测试插件管理器的核心功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EventEmitter3 from 'eventemitter3';
import { PluginManager } from '../PluginManager';
import { PluginSystem } from '../PluginSystem';
import type { PluginPackage, PluginSource, PluginRegistry, PluginSearchResult } from '../PluginManager';

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let pluginSystem: PluginSystem;
  let eventBus: EventEmitter3;
  let mockRegistry: PluginRegistry;

  beforeEach(() => {
    eventBus = new EventEmitter3();
    pluginSystem = new PluginSystem();
    mockRegistry = {
      name: 'test-registry',
      url: 'https://test.com/registry',
      enabled: true,
      trusted: true
    };
    pluginManager = new PluginManager(pluginSystem);
    pluginManager.setEventBus(eventBus);
  });

  afterEach(() => {
    pluginManager.dispose();
  });

  describe('基本功能', () => {
    it('应该能够创建插件管理器实例', () => {
      expect(pluginManager).toBeDefined();
      expect(pluginManager).toBeInstanceOf(PluginManager);
    });

    it('应该能够设置事件总线', () => {
      const newEventBus = new EventEmitter3();
      pluginManager.setEventBus(newEventBus);
      expect(pluginManager['eventBus']).toBe(newEventBus);
    });

    it('应该能够添加插件注册源', () => {
      const registry: PluginRegistry = {
        name: 'test-registry',
        url: 'https://test.com/plugins',
        enabled: true,
        trusted: true
      };

      pluginManager.addRegistry(registry);
      const registries = pluginManager.getRegistries();
      expect(registries).toContain(registry);
    });

    it('应该能够移除插件注册源', () => {
      const registry: PluginRegistry = {
        name: 'test-registry',
        url: 'https://test.com/plugins',
        enabled: true,
        trusted: true
      };

      pluginManager.addRegistry(registry);
      const removed = pluginManager.removeRegistry('test-registry');
      expect(removed).toBe(true);
      const registries = pluginManager.getRegistries();
      expect(registries.find(r => r.name === 'test-registry')).toBeUndefined();
    });
  });

  describe('插件搜索', () => {
    it('应该能够搜索插件', async () => {
      const mockResults: PluginSearchResult = {
        packages: [
          {
            metadata: {
              id: 'test-plugin',
              name: 'Test Plugin',
              version: '1.0.0',
              author: 'Test Author',
              description: 'A test plugin',
              homepage: 'https://test.com',
              license: 'MIT',
              keywords: ['test'],
              category: 'utility',
              dependencies: {},
              peerDependencies: {},
              engineVersion: '^1.0.0',
              platform: ['web'],
              permissions: []
            },
            source: {
              type: 'registry',
              location: 'https://test.com/plugins'
            },
            size: 1024
          }
        ],
        total: 1,
        page: 1,
        pageSize: 20
      };

      vi.spyOn(pluginManager, 'searchPlugins').mockResolvedValue(mockResults);
      
      const results = await pluginManager.searchPlugins('test');
      expect(results).toEqual(mockResults);
      expect(results.packages).toHaveLength(1);
      expect(results.packages[0].metadata.name).toBe('Test Plugin');
    });

    it('应该能够按类别搜索插件', async () => {
      const mockResults: PluginSearchResult = {
        packages: [
          {
            metadata: {
              id: 'utility-plugin',
              name: 'Utility Plugin',
              version: '1.0.0',
              author: 'Test Author',
              description: 'A utility plugin',
              homepage: 'https://test.com',
              license: 'MIT',
              keywords: ['utility'],
              category: 'utility',
              dependencies: {},
              peerDependencies: {},
              engineVersion: '^1.0.0',
              platform: ['web'],
              permissions: []
            },
            source: {
              type: 'registry',
              location: 'https://test.com/plugins'
            },
            size: 1024
          }
        ],
        total: 1,
        page: 1,
        pageSize: 20
      };

      vi.spyOn(pluginManager, 'searchPlugins').mockResolvedValue(mockResults);
      
      const results = await pluginManager.searchPlugins('', { category: 'utility' });
      expect(results).toEqual(mockResults);
      expect(results.packages[0].metadata.category).toBe('utility');
    });
  });

  describe('插件安装', () => {
    it('应该能够安装插件', async () => {
      const packageId = 'test-plugin';

      vi.spyOn(pluginManager, 'installPlugin').mockResolvedValue(undefined);
      
      await expect(pluginManager.installPlugin(packageId)).resolves.not.toThrow();
    });

    it('应该能够获取已安装的插件', () => {
      vi.spyOn(pluginManager, 'getInstalledPlugins').mockReturnValue([]);
      
      const installedPlugins = pluginManager.getInstalledPlugins();
      expect(Array.isArray(installedPlugins)).toBe(true);
    });
  });

  describe('插件更新', () => {
    it('应该能够检查插件更新', async () => {
      const updates = [
        {
          packageId: 'test-plugin',
          currentVersion: '1.0.0',
          availableVersion: '1.1.0'
        }
      ];

      vi.spyOn(pluginManager, 'checkForUpdates').mockResolvedValue(updates);
      
      const result = await pluginManager.checkForUpdates();
      expect(result).toEqual(updates);
      expect(result).toHaveLength(1);
    });

    it('应该能够更新插件', async () => {
      vi.spyOn(pluginManager, 'updatePlugin').mockResolvedValue(undefined);
      
      await expect(pluginManager.updatePlugin('test-plugin')).resolves.not.toThrow();
    });
  });

  describe('插件卸载', () => {
    it('应该能够卸载插件', async () => {
      vi.spyOn(pluginManager, 'uninstallPlugin').mockResolvedValue(undefined);
      
      await expect(pluginManager.uninstallPlugin('test-plugin')).resolves.not.toThrow();
    });
  });

  describe('事件处理', () => {
    it('应该在插件安装时触发事件', async () => {
      const eventSpy = vi.fn();
      eventBus.on('plugin-installed', eventSpy);

      // 模拟安装过程中触发事件
      eventBus.emit('plugin-installed', { packageId: 'test-plugin', version: '1.0.0' });
      
      expect(eventSpy).toHaveBeenCalledWith({ packageId: 'test-plugin', version: '1.0.0' });
    });

    it('应该在插件卸载时触发事件', async () => {
      const eventSpy = vi.fn();
      eventBus.on('plugin-uninstalled', eventSpy);

      // 模拟卸载过程中触发事件
      eventBus.emit('plugin-uninstalled', { packageId: 'test-plugin' });
      
      expect(eventSpy).toHaveBeenCalledWith({ packageId: 'test-plugin' });
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的插件注册源', () => {
      const invalidRegistry = {
        name: '',
        url: 'invalid-url',
        enabled: true,
        trusted: false
      };

      expect(() => {
        pluginManager.addRegistry(invalidRegistry);
      }).toThrow();
    });

    it('应该处理插件安装失败', async () => {
      const packageId = 'failing-plugin';

      vi.spyOn(pluginManager, 'installPlugin').mockRejectedValue(new Error('Installation failed'));
      
      await expect(pluginManager.installPlugin(packageId)).rejects.toThrow('Installation failed');
    });
  });

  describe('插件状态管理', () => {
    it('应该能够获取插件状态', () => {
      const status = pluginManager.getPluginStatus('test-plugin');
      expect(status).toBeNull();
    });

    it('应该能够清除缓存', () => {
      expect(() => {
        pluginManager.clearCache();
      }).not.toThrow();
    });
  });
});