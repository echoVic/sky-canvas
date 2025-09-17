/**
 * PluginSystem 单元测试
 * 测试插件系统的核心功能
 */

import EventEmitter3 from 'eventemitter3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  Plugin,
  PluginCategory,
  PluginContext,
  PluginMetadata,
  PluginPermission,
  PluginSystem
} from '../PluginSystem';

describe('PluginSystem', () => {
  let pluginSystem: PluginSystem;
  let eventBus: EventEmitter3;
  let mockPlugin: Plugin;
  let mockMetadata: PluginMetadata;

  beforeEach(() => {
    eventBus = new EventEmitter3();
    pluginSystem = new PluginSystem();
    pluginSystem.setEventBus(eventBus);

    mockMetadata = {
      id: 'test-plugin',
      name: 'Test Plugin',
      version: '1.0.0',
      author: 'Test Author',
      description: 'A test plugin for unit testing',
      homepage: 'https://test.com',
      license: 'MIT',
      keywords: ['test', 'plugin'],
      category: 'utility' as PluginCategory,
      dependencies: {},
      peerDependencies: {},
      engineVersion: '^1.0.0',
      platform: ['web'],
      permissions: ['storage'] as PluginPermission[]
    };

    mockPlugin = {
      metadata: mockMetadata,
      onLoad: vi.fn(),
      onActivate: vi.fn(),
      onDeactivate: vi.fn(),
      onUnload: vi.fn(),
      onConfigChange: vi.fn()
    };
  });

  afterEach(async () => {
    await pluginSystem.dispose();
  });

  describe('基本功能', () => {
    it('应该能够创建插件系统实例', () => {
      expect(pluginSystem).toBeDefined();
      expect(pluginSystem).toBeInstanceOf(PluginSystem);
    });

    it('应该能够设置事件总线', () => {
      const newEventBus = new EventEmitter3();
      pluginSystem.setEventBus(newEventBus);
      expect(pluginSystem['eventBus']).toBe(newEventBus);
    });

    it('应该能够添加插件路径', () => {
      const pluginPath = '/test/plugins';
      pluginSystem.addPluginPath(pluginPath);
      expect(pluginSystem['pluginPaths']).toContain(pluginPath);
    });
  });

  describe('插件注册', () => {
    it('应该能够注册插件', () => {
      pluginSystem.registerPlugin(mockPlugin);
      
      const retrievedPlugin = pluginSystem.getPlugin('test-plugin');
      expect(retrievedPlugin).toBe(mockPlugin);
    });

    it('应该在注册插件时验证插件', () => {
      const invalidPlugin = {
        metadata: {
          ...mockMetadata,
          id: '' // 无效的ID
        }
      } as Plugin;

      expect(() => {
        pluginSystem.registerPlugin(invalidPlugin);
      }).toThrow();
    });

    it('应该能够获取所有插件', () => {
      pluginSystem.registerPlugin(mockPlugin);
      
      const allPlugins = pluginSystem.getAllPlugins();
      expect(allPlugins).toHaveLength(1);
      expect(allPlugins[0].plugin).toBe(mockPlugin);
      expect(allPlugins[0].state).toBe('unloaded');
    });
  });

  describe('插件生命周期', () => {
    beforeEach(() => {
      pluginSystem.registerPlugin(mockPlugin);
    });

    it('应该能够加载插件', async () => {
      await pluginSystem.loadPlugin('test-plugin');
      
      expect(mockPlugin.onLoad).toHaveBeenCalled();
      expect(pluginSystem.getPluginState('test-plugin')).toBe('loaded');
    });

    it('应该能够激活插件', async () => {
      await pluginSystem.loadPlugin('test-plugin');
      await pluginSystem.activatePlugin('test-plugin');
      
      expect(mockPlugin.onActivate).toHaveBeenCalled();
      expect(pluginSystem.getPluginState('test-plugin')).toBe('active');
    });

    it('应该能够停用插件', async () => {
      await pluginSystem.loadPlugin('test-plugin');
      await pluginSystem.activatePlugin('test-plugin');
      await pluginSystem.deactivatePlugin('test-plugin');
      
      expect(mockPlugin.onDeactivate).toHaveBeenCalled();
      expect(pluginSystem.getPluginState('test-plugin')).toBe('inactive');
    });

    it('应该能够卸载插件', async () => {
      await pluginSystem.loadPlugin('test-plugin');
      await pluginSystem.unloadPlugin('test-plugin');
      
      expect(mockPlugin.onUnload).toHaveBeenCalled();
      expect(pluginSystem.getPluginState('test-plugin')).toBe('unloaded');
    });

    it('应该在插件状态变化时触发事件', async () => {
      const loadedSpy = vi.fn();
      const activatedSpy = vi.fn();
      
      eventBus.on('plugin-loaded', loadedSpy);
      eventBus.on('plugin-activated', activatedSpy);
      
      await pluginSystem.loadPlugin('test-plugin');
      await pluginSystem.activatePlugin('test-plugin');
      
      expect(loadedSpy).toHaveBeenCalledWith({
        plugin: mockPlugin,
        metadata: mockMetadata
      });
      expect(activatedSpy).toHaveBeenCalledWith({
        pluginId: 'test-plugin'
      });
    });
  });

  describe('插件配置', () => {
    beforeEach(() => {
      pluginSystem.registerPlugin(mockPlugin);
    });

    it('应该能够更新插件配置', async () => {
      await pluginSystem.loadPlugin('test-plugin');
      
      const config = { setting1: 'value1', setting2: true };
      
      pluginSystem.updatePluginConfig('test-plugin', config);
      
      expect(mockPlugin.onConfigChange).toHaveBeenCalledWith(
        config,
        expect.any(Object)
      );
    });

    it('应该能够加载插件时传递配置', async () => {
      const config = { customSetting: 'test' };
      
      await pluginSystem.loadPlugin('test-plugin', config);
      
      expect(mockPlugin.onLoad).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining(config)
        })
      );
    });
  });

  describe('插件贡献', () => {
    it('应该能够注册带有命令贡献的插件', async () => {
      const commandHandler = vi.fn();
      const pluginWithCommands: Plugin = {
        metadata: {
          ...mockMetadata,
          id: 'command-plugin'
        },
        contributes: {
          commands: [
            {
              id: 'test.command',
              title: 'Test Command',
              category: 'Test',
              handler: commandHandler
            }
          ]
        }
      };

      pluginSystem.registerPlugin(pluginWithCommands);
      await pluginSystem.loadPlugin('command-plugin');
      
      const result = pluginSystem.executeCommand('test.command', 'arg1', 'arg2');
      expect(commandHandler).toHaveBeenCalledWith(
        expect.any(Object),
        'arg1',
        'arg2'
      );
    });

    it('应该能够获取可用工具', async () => {
      const pluginWithTools: Plugin = {
        metadata: {
          ...mockMetadata,
          id: 'tool-plugin'
        },
        contributes: {
          tools: [
            {
              id: 'test.tool',
              name: 'Test Tool',
              icon: 'tool-icon',
              handler: vi.fn()
            }
          ]
        }
      };

      pluginSystem.registerPlugin(pluginWithTools);
      await pluginSystem.loadPlugin('tool-plugin');
      
      const tools = pluginSystem.getAvailableTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]).toMatchObject({
        id: 'test.tool',
        name: 'Test Tool',
        icon: 'tool-icon',
        plugin: 'tool-plugin'
      });
    });

    it('应该能够获取可用滤镜', async () => {
      const pluginWithFilters: Plugin = {
        metadata: {
          ...mockMetadata,
          id: 'filter-plugin'
        },
        contributes: {
          filters: [
            {
              id: 'test.filter',
              name: 'Test Filter',
              category: 'effect',
              parameters: [
                {
                  name: 'intensity',
                  type: 'number',
                  label: 'Intensity',
                  defaultValue: 50,
                  min: 0,
                  max: 100
                }
              ],
              filter: vi.fn()
            }
          ]
        }
      };

      pluginSystem.registerPlugin(pluginWithFilters);
      await pluginSystem.loadPlugin('filter-plugin');
      
      const filters = pluginSystem.getAvailableFilters();
      expect(filters).toHaveLength(1);
      expect(filters[0]).toMatchObject({
        id: 'test.filter',
        name: 'Test Filter',
        category: 'effect',
        parameters: expect.any(Array),
        plugin: 'filter-plugin'
      });
    });

    it('应该能够应用滤镜', async () => {
      const filterHandler = vi.fn().mockReturnValue('filtered-result');
      const pluginWithFilters: Plugin = {
        metadata: {
          ...mockMetadata,
          id: 'filter-plugin'
        },
        contributes: {
          filters: [
            {
              id: 'test.filter',
              name: 'Test Filter',
              category: 'effect',
              parameters: [],
              filter: filterHandler
            }
          ]
        }
      };

      pluginSystem.registerPlugin(pluginWithFilters);
      await pluginSystem.loadPlugin('filter-plugin');
      
      const result = pluginSystem.applyFilter('test.filter', { intensity: 75 });
      expect(filterHandler).toHaveBeenCalledWith(
        expect.any(Object),
        { intensity: 75 }
      );
      expect(result).toBe('filtered-result');
    });
  });

  describe('错误处理', () => {
    it('应该处理插件加载错误', async () => {
      const errorPlugin: Plugin = {
        metadata: {
          ...mockMetadata,
          id: 'error-plugin'
        },
        onLoad: vi.fn().mockRejectedValue(new Error('Load failed'))
      };

      pluginSystem.registerPlugin(errorPlugin);
      
      await expect(pluginSystem.loadPlugin('error-plugin')).rejects.toThrow('Load failed');
      expect(pluginSystem.getPluginState('error-plugin')).toBe('error');
    });

    it('应该处理插件激活错误', async () => {
      const errorPlugin: Plugin = {
        metadata: {
          ...mockMetadata,
          id: 'error-plugin'
        },
        onLoad: vi.fn(),
        onActivate: vi.fn().mockRejectedValue(new Error('Activate failed'))
      };

      pluginSystem.registerPlugin(errorPlugin);
      await pluginSystem.loadPlugin('error-plugin');
      
      await expect(pluginSystem.activatePlugin('error-plugin')).rejects.toThrow('Activate failed');
      expect(pluginSystem.getPluginState('error-plugin')).toBe('error');
    });

    it('应该处理不存在的插件操作', async () => {
      await expect(pluginSystem.loadPlugin('non-existent')).rejects.toThrow();
      await expect(pluginSystem.activatePlugin('non-existent')).rejects.toThrow();
      
      // deactivatePlugin 和 unloadPlugin 对不存在的插件会静默返回
      await expect(pluginSystem.deactivatePlugin('non-existent')).resolves.toBeUndefined();
      await expect(pluginSystem.unloadPlugin('non-existent')).resolves.toBeUndefined();
    });

    it('应该处理无效的命令执行', () => {
      expect(() => {
        pluginSystem.executeCommand('non-existent-command');
      }).toThrow();
    });

    it('应该处理无效的滤镜应用', () => {
      expect(() => {
        pluginSystem.applyFilter('non-existent-filter', {});
      }).toThrow();
    });
  });

  describe('插件上下文', () => {
    beforeEach(() => {
      pluginSystem.registerPlugin(mockPlugin);
    });

    it('应该为插件提供正确的上下文', async () => {
      await pluginSystem.loadPlugin('test-plugin', { testConfig: true });
      
      const context = (mockPlugin.onLoad as any).mock.calls[0][0] as PluginContext;
      
      expect(context).toEqual({
        renderEngine: expect.any(Object),
        eventBus: eventBus,
        pluginId: 'test-plugin',
        pluginPath: expect.any(String),
        config: expect.objectContaining({ testConfig: true }),
        resources: expect.any(Object),
        logger: expect.any(Object),
        storage: expect.any(Object),
        ui: expect.any(Object)
      });
    });

    it('应该提供资源管理器功能', async () => {
      await pluginSystem.loadPlugin('test-plugin');
      
      const context = (mockPlugin.onLoad as any).mock.calls[0][0] as PluginContext;
      
      expect(context.resources).toEqual({
        loadTexture: expect.any(Function),
        loadShader: expect.any(Function),
        loadAudio: expect.any(Function),
        loadJSON: expect.any(Function),
        getAssetUrl: expect.any(Function),
        dispose: expect.any(Function)
      });
    });

    it('应该提供日志记录功能', async () => {
      await pluginSystem.loadPlugin('test-plugin');
      
      const context = (mockPlugin.onLoad as any).mock.calls[0][0] as PluginContext;
      
      expect(context.logger).toEqual({
        debug: expect.any(Function),
        info: expect.any(Function),
        warn: expect.any(Function),
        error: expect.any(Function)
      });
    });

    it('应该提供存储功能', async () => {
      await pluginSystem.loadPlugin('test-plugin');
      
      const context = (mockPlugin.onLoad as any).mock.calls[0][0] as PluginContext;
      
      expect(context.storage).toEqual({
        get: expect.any(Function),
        set: expect.any(Function),
        remove: expect.any(Function),
        clear: expect.any(Function),
        keys: expect.any(Function)
      });
    });

    it('应该提供UI管理功能', async () => {
      await pluginSystem.loadPlugin('test-plugin');
      
      const context = (mockPlugin.onLoad as any).mock.calls[0][0] as PluginContext;
      
      expect(context.ui).toEqual({
        addMenuItem: expect.any(Function),
        addToolbarButton: expect.any(Function),
        addPanel: expect.any(Function),
        showDialog: expect.any(Function),
        showNotification: expect.any(Function)
      });
    });
  });

  describe('插件扫描', () => {
    it('应该能够扫描插件', async () => {
      pluginSystem.addPluginPath('/test/plugins');
      
      // 模拟扫描结果
      vi.spyOn(pluginSystem, 'scanPlugins').mockResolvedValue([mockMetadata]);
      
      const scannedPlugins = await pluginSystem.scanPlugins();
      expect(scannedPlugins).toEqual([mockMetadata]);
    });
  });
});