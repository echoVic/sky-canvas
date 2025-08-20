/**
 * 插件上下文单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginContext } from '../../engine/plugins/core/PluginContext';
import { PluginPermission } from '../../engine/plugins/types/PluginTypes';

// Mock依赖
const mockCanvas = {
  addElement: vi.fn(),
  removeElement: vi.fn(),
  updateElement: vi.fn(),
  getElement: vi.fn(),
  getAllElements: vi.fn(),
  clear: vi.fn(),
  setTool: vi.fn(),
  getTool: vi.fn(),
  undo: vi.fn(),
  redo: vi.fn(),
  zoom: vi.fn(),
  pan: vi.fn(),
  getViewport: vi.fn()
};

const mockUI = {
  addPanel: vi.fn(),
  removePanel: vi.fn(),
  showDialog: vi.fn(),
  showNotification: vi.fn(),
  addMenuItem: vi.fn(),
  removeMenuItem: vi.fn(),
  addToolbarButton: vi.fn(),
  removeToolbarButton: vi.fn()
};

const mockFileSystem = {
  readFile: vi.fn(),
  writeFile: vi.fn(),
  deleteFile: vi.fn(),
  listFiles: vi.fn(),
  createDirectory: vi.fn()
};

const mockPermissionManager = {
  hasPermission: vi.fn(),
  validatePermission: vi.fn(),
  checkPermissions: vi.fn()
};

describe('PluginContext', () => {
  let pluginContext: PluginContext;
  const pluginId = 'test-plugin';

  beforeEach(() => {
    vi.clearAllMocks();
    
    pluginContext = new PluginContext(
      pluginId,
      mockCanvas as any,
      mockUI as any,
      mockFileSystem as any,
      mockPermissionManager as any
    );
  });

  describe('画布API', () => {
    beforeEach(() => {
      mockPermissionManager.validatePermission.mockReturnValue(true);
    });

    it('应该添加画布元素', async () => {
      const element = { id: 'test-element', type: 'rectangle' };
      
      await pluginContext.canvas.addElement(element);
      
      expect(mockPermissionManager.validatePermission).toHaveBeenCalledWith(
        pluginId,
        PluginPermission.CANVAS_MODIFY
      );
      expect(mockCanvas.addElement).toHaveBeenCalledWith(element);
    });

    it('应该拒绝无权限的画布操作', async () => {
      mockPermissionManager.validatePermission.mockReturnValue(false);
      
      const element = { id: 'test-element', type: 'rectangle' };
      
      await expect(
        pluginContext.canvas.addElement(element)
      ).rejects.toThrow('Permission denied');
    });

    it('应该获取画布元素（只读权限）', async () => {
      mockPermissionManager.validatePermission.mockReturnValue(true);
      mockCanvas.getElement.mockReturnValue({ id: 'test-element' });
      
      const element = await pluginContext.canvas.getElement('test-element');
      
      expect(mockPermissionManager.validatePermission).toHaveBeenCalledWith(
        pluginId,
        PluginPermission.READ_ONLY
      );
      expect(element).toEqual({ id: 'test-element' });
    });

    it('应该设置画布工具', async () => {
      mockPermissionManager.validatePermission.mockReturnValue(true);
      
      await pluginContext.canvas.setTool('brush');
      
      expect(mockPermissionManager.validatePermission).toHaveBeenCalledWith(
        pluginId,
        PluginPermission.CANVAS_MODIFY
      );
      expect(mockCanvas.setTool).toHaveBeenCalledWith('brush');
    });

    it('应该执行撤销操作', async () => {
      mockPermissionManager.validatePermission.mockReturnValue(true);
      
      await pluginContext.canvas.undo();
      
      expect(mockCanvas.undo).toHaveBeenCalled();
    });
  });

  describe('UI API', () => {
    beforeEach(() => {
      mockPermissionManager.validatePermission.mockReturnValue(true);
    });

    it('应该添加UI面板', async () => {
      const panel = { id: 'test-panel', title: 'Test Panel', content: 'div' };
      
      await pluginContext.ui.addPanel(panel);
      
      expect(mockPermissionManager.validatePermission).toHaveBeenCalledWith(
        pluginId,
        PluginPermission.UI_MODIFY
      );
      expect(mockUI.addPanel).toHaveBeenCalledWith(panel);
    });

    it('应该显示通知', async () => {
      await pluginContext.ui.showNotification('Test message', 'info');
      
      expect(mockPermissionManager.validatePermission).toHaveBeenCalledWith(
        pluginId,
        PluginPermission.UI_MODIFY
      );
      expect(mockUI.showNotification).toHaveBeenCalledWith('Test message', 'info');
    });

    it('应该添加菜单项', async () => {
      const menuItem = { id: 'test-menu', label: 'Test', action: vi.fn() };
      
      await pluginContext.ui.addMenuItem(menuItem);
      
      expect(mockUI.addMenuItem).toHaveBeenCalledWith(menuItem);
    });

    it('应该拒绝无权限的UI操作', async () => {
      mockPermissionManager.validatePermission.mockReturnValue(false);
      
      await expect(
        pluginContext.ui.addPanel({ id: 'test', title: 'Test', content: 'div' })
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('文件系统API', () => {
    beforeEach(() => {
      mockPermissionManager.validatePermission.mockReturnValue(true);
    });

    it('应该读取文件', async () => {
      mockFileSystem.readFile.mockResolvedValue('file content');
      
      const content = await pluginContext.fileSystem.readFile('test.txt');
      
      expect(mockPermissionManager.validatePermission).toHaveBeenCalledWith(
        pluginId,
        PluginPermission.FILE_ACCESS
      );
      expect(content).toBe('file content');
    });

    it('应该写入文件', async () => {
      await pluginContext.fileSystem.writeFile('test.txt', 'content');
      
      expect(mockPermissionManager.validatePermission).toHaveBeenCalledWith(
        pluginId,
        PluginPermission.FILE_ACCESS
      );
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith('test.txt', 'content');
    });

    it('应该列出文件', async () => {
      mockFileSystem.listFiles.mockResolvedValue(['file1.txt', 'file2.txt']);
      
      const files = await pluginContext.fileSystem.listFiles('/path');
      
      expect(files).toEqual(['file1.txt', 'file2.txt']);
    });

    it('应该拒绝无权限的文件操作', async () => {
      mockPermissionManager.validatePermission.mockReturnValue(false);
      
      await expect(
        pluginContext.fileSystem.readFile('test.txt')
      ).rejects.toThrow('Permission denied');
    });
  });

  describe('配置管理', () => {
    it('应该设置配置值', () => {
      pluginContext.config.set('key1', 'value1');
      
      expect(pluginContext.config.get('key1')).toBe('value1');
    });

    it('应该获取配置值', () => {
      pluginContext.config.set('key2', { nested: 'value' });
      
      const value = pluginContext.config.get('key2');
      expect(value).toEqual({ nested: 'value' });
    });

    it('应该返回默认值', () => {
      const value = pluginContext.config.get('non-existent', 'default');
      expect(value).toBe('default');
    });

    it('应该检查配置存在性', () => {
      pluginContext.config.set('exists', true);
      
      expect(pluginContext.config.has('exists')).toBe(true);
      expect(pluginContext.config.has('not-exists')).toBe(false);
    });

    it('应该删除配置', () => {
      pluginContext.config.set('to-delete', 'value');
      pluginContext.config.delete('to-delete');
      
      expect(pluginContext.config.has('to-delete')).toBe(false);
    });

    it('应该清空所有配置', () => {
      pluginContext.config.set('key1', 'value1');
      pluginContext.config.set('key2', 'value2');
      
      pluginContext.config.clear();
      
      expect(pluginContext.config.has('key1')).toBe(false);
      expect(pluginContext.config.has('key2')).toBe(false);
    });

    it('应该持久化配置到localStorage', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
      
      pluginContext.config.set('persistent', 'value');
      
      expect(setItemSpy).toHaveBeenCalledWith(
        `plugin-config-${pluginId}`,
        expect.stringContaining('persistent')
      );
    });
  });

  describe('事件系统', () => {
    it('应该注册事件监听器', () => {
      const handler = vi.fn();
      
      pluginContext.events.on('test-event', handler);
      pluginContext.events.emit('test-event', 'data');
      
      expect(handler).toHaveBeenCalledWith('data');
    });

    it('应该注销事件监听器', () => {
      const handler = vi.fn();
      
      pluginContext.events.on('test-event', handler);
      pluginContext.events.off('test-event', handler);
      pluginContext.events.emit('test-event', 'data');
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('应该支持一次性监听器', () => {
      const handler = vi.fn();
      
      pluginContext.events.once('test-event', handler);
      pluginContext.events.emit('test-event', 'data1');
      pluginContext.events.emit('test-event', 'data2');
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('data1');
    });

    it('应该支持多个监听器', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      pluginContext.events.on('test-event', handler1);
      pluginContext.events.on('test-event', handler2);
      pluginContext.events.emit('test-event', 'data');
      
      expect(handler1).toHaveBeenCalledWith('data');
      expect(handler2).toHaveBeenCalledWith('data');
    });
  });

  describe('资源管理', () => {
    it('应该注册资源', () => {
      const resource = { dispose: vi.fn() };
      
      pluginContext.resources.register('test-resource', resource);
      
      expect(pluginContext.resources.has('test-resource')).toBe(true);
    });

    it('应该获取资源', () => {
      const resource = { dispose: vi.fn() };
      pluginContext.resources.register('test-resource', resource);
      
      const retrieved = pluginContext.resources.get('test-resource');
      expect(retrieved).toBe(resource);
    });

    it('应该释放单个资源', () => {
      const resource = { dispose: vi.fn() };
      pluginContext.resources.register('test-resource', resource);
      
      pluginContext.resources.release('test-resource');
      
      expect(resource.dispose).toHaveBeenCalled();
      expect(pluginContext.resources.has('test-resource')).toBe(false);
    });

    it('应该释放所有资源', () => {
      const resource1 = { dispose: vi.fn() };
      const resource2 = { dispose: vi.fn() };
      
      pluginContext.resources.register('resource1', resource1);
      pluginContext.resources.register('resource2', resource2);
      
      pluginContext.resources.releaseAll();
      
      expect(resource1.dispose).toHaveBeenCalled();
      expect(resource2.dispose).toHaveBeenCalled();
    });

    it('应该处理资源释放错误', () => {
      const resource = {
        dispose: vi.fn().mockImplementation(() => {
          throw new Error('Disposal error');
        })
      };
      
      pluginContext.resources.register('error-resource', resource);
      
      // 应该不抛出错误
      expect(() => {
        pluginContext.resources.release('error-resource');
      }).not.toThrow();
    });
  });

  describe('日志记录', () => {
    let consoleSpy: any;

    beforeEach(() => {
      consoleSpy = {
        log: vi.spyOn(console, 'log').mockImplementation(),
        warn: vi.spyOn(console, 'warn').mockImplementation(),
        error: vi.spyOn(console, 'error').mockImplementation(),
        debug: vi.spyOn(console, 'debug').mockImplementation()
      };
    });

    it('应该记录信息日志', () => {
      pluginContext.logger.info('Test message');
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining(`[${pluginId}]`),
        'Test message'
      );
    });

    it('应该记录警告日志', () => {
      pluginContext.logger.warn('Warning message');
      
      expect(consoleSpy.warn).toHaveBeenCalledWith(
        expect.stringContaining(`[${pluginId}]`),
        'Warning message'
      );
    });

    it('应该记录错误日志', () => {
      pluginContext.logger.error('Error message');
      
      expect(consoleSpy.error).toHaveBeenCalledWith(
        expect.stringContaining(`[${pluginId}]`),
        'Error message'
      );
    });

    it('应该记录调试日志', () => {
      pluginContext.logger.debug('Debug message');
      
      expect(consoleSpy.debug).toHaveBeenCalledWith(
        expect.stringContaining(`[${pluginId}]`),
        'Debug message'
      );
    });

    it('应该支持格式化参数', () => {
      pluginContext.logger.info('Message with %s and %d', 'string', 42);
      
      expect(consoleSpy.log).toHaveBeenCalledWith(
        expect.stringContaining(`[${pluginId}]`),
        'Message with %s and %d',
        'string',
        42
      );
    });
  });

  describe('上下文清理', () => {
    it('应该清理所有资源', () => {
      const resource1 = { dispose: vi.fn() };
      const resource2 = { dispose: vi.fn() };
      
      pluginContext.resources.register('resource1', resource1);
      pluginContext.resources.register('resource2', resource2);
      
      pluginContext.dispose();
      
      expect(resource1.dispose).toHaveBeenCalled();
      expect(resource2.dispose).toHaveBeenCalled();
    });

    it('应该移除所有事件监听器', () => {
      const handler = vi.fn();
      
      pluginContext.events.on('test-event', handler);
      pluginContext.dispose();
      pluginContext.events.emit('test-event', 'data');
      
      expect(handler).not.toHaveBeenCalled();
    });

    it('应该清空配置', () => {
      pluginContext.config.set('test', 'value');
      pluginContext.dispose();
      
      expect(pluginContext.config.has('test')).toBe(false);
    });
  });
});
