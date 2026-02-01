/**
 * 插件管理器单元测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PluginManager } from '../../src/plugins/core/PluginManager'
import {
  type Plugin,
  type PluginContext,
  type PluginManifest,
  PluginPermission,
  PluginStatus,
} from '../../src/plugins/types/PluginTypes'

// Mock插件实现
class MockPlugin implements Plugin {
  private activated = false

  async activate(context: PluginContext): Promise<void> {
    this.activated = true
  }

  async deactivate(): Promise<void> {
    this.activated = false
  }

  isActivated(): boolean {
    return this.activated
  }
}

// 错误插件实现
class ErrorPlugin implements Plugin {
  async activate(context: PluginContext): Promise<void> {
    throw new Error('Activation failed')
  }

  async deactivate(): Promise<void> {
    throw new Error('Deactivation failed')
  }
}

// 创建测试清单
function createTestManifest(id: string, overrides: Partial<PluginManifest> = {}): PluginManifest {
  return {
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    description: 'A test plugin',
    author: 'Test Author',
    license: 'MIT',
    main: 'index.js',
    minEngineVersion: '1.0.0',
    permissions: [PluginPermission.READ_ONLY],
    extensionPoints: [],
    keywords: ['test'],
    ...overrides,
  }
}

describe('PluginManager', () => {
  let pluginManager: PluginManager

  beforeEach(() => {
    pluginManager = new PluginManager()
  })

  afterEach(async () => {
    await pluginManager.dispose()
  })

  describe('插件加载', () => {
    it('应该成功加载有效插件', async () => {
      const manifest = createTestManifest('test-plugin')
      const plugin = new MockPlugin()

      await pluginManager.loadPlugin(manifest, { default: MockPlugin })

      const instance = pluginManager.getPlugin('test-plugin')
      expect(instance).toBeDefined()
      expect(instance?.status).toBe(PluginStatus.LOADED)
      expect(instance?.manifest.id).toBe('test-plugin')
    })

    it('应该拒绝加载无效清单的插件', async () => {
      const invalidManifest = { id: 'invalid' } as PluginManifest

      await expect(
        pluginManager.loadPlugin(invalidManifest, { default: MockPlugin })
      ).rejects.toThrow()
    })

    it('应该拒绝加载重复ID的插件', async () => {
      const manifest = createTestManifest('duplicate-plugin')

      await pluginManager.loadPlugin(manifest, { default: MockPlugin })

      await expect(pluginManager.loadPlugin(manifest, { default: MockPlugin })).rejects.toThrow(
        'already loaded'
      )
    })

    it('应该正确处理加载错误', async () => {
      const manifest = createTestManifest('error-plugin')

      // 模拟模块加载错误
      await expect(pluginManager.loadPlugin(manifest, null)).rejects.toThrow()

      const instance = pluginManager.getPlugin('error-plugin')
      expect(instance?.status).toBe(PluginStatus.ERROR)
    })
  })

  describe('插件激活', () => {
    beforeEach(async () => {
      const manifest = createTestManifest('test-plugin')
      await pluginManager.loadPlugin(manifest, { default: MockPlugin })
    })

    it('应该成功激活已加载的插件', async () => {
      await pluginManager.activatePlugin('test-plugin')

      const instance = pluginManager.getPlugin('test-plugin')
      expect(instance?.status).toBe(PluginStatus.ACTIVE)
      expect((instance?.plugin as MockPlugin).isActivated()).toBe(true)
    })

    it('应该拒绝激活不存在的插件', async () => {
      await expect(pluginManager.activatePlugin('non-existent')).rejects.toThrow('not found')
    })

    it('应该正确处理激活错误', async () => {
      const manifest = createTestManifest('error-plugin')
      await pluginManager.loadPlugin(manifest, { default: ErrorPlugin })

      await expect(pluginManager.activatePlugin('error-plugin')).rejects.toThrow(
        'Activation failed'
      )

      const instance = pluginManager.getPlugin('error-plugin')
      expect(instance?.status).toBe(PluginStatus.ERROR)
    })

    it('应该跳过已激活的插件', async () => {
      await pluginManager.activatePlugin('test-plugin')

      // 再次激活应该不报错
      await pluginManager.activatePlugin('test-plugin')

      const instance = pluginManager.getPlugin('test-plugin')
      expect(instance?.status).toBe(PluginStatus.ACTIVE)
    })
  })

  describe('插件停用', () => {
    beforeEach(async () => {
      const manifest = createTestManifest('test-plugin')
      await pluginManager.loadPlugin(manifest, { default: MockPlugin })
      await pluginManager.activatePlugin('test-plugin')
    })

    it('应该成功停用已激活的插件', async () => {
      await pluginManager.deactivatePlugin('test-plugin')

      const instance = pluginManager.getPlugin('test-plugin')
      expect(instance?.status).toBe(PluginStatus.INACTIVE)
      expect((instance?.plugin as MockPlugin).isActivated()).toBe(false)
    })

    it('应该拒绝停用不存在的插件', async () => {
      await expect(pluginManager.deactivatePlugin('non-existent')).rejects.toThrow('not found')
    })

    it('应该跳过未激活的插件', async () => {
      await pluginManager.deactivatePlugin('test-plugin')

      // 再次停用应该不报错
      await pluginManager.deactivatePlugin('test-plugin')

      const instance = pluginManager.getPlugin('test-plugin')
      expect(instance?.status).toBe(PluginStatus.INACTIVE)
    })
  })

  describe('插件卸载', () => {
    beforeEach(async () => {
      const manifest = createTestManifest('test-plugin')
      await pluginManager.loadPlugin(manifest, { default: MockPlugin })
      await pluginManager.activatePlugin('test-plugin')
    })

    it('应该成功卸载插件', async () => {
      await pluginManager.unloadPlugin('test-plugin')

      const instance = pluginManager.getPlugin('test-plugin')
      expect(instance).toBeUndefined()
    })

    it('应该在卸载前自动停用插件', async () => {
      const instance = pluginManager.getPlugin('test-plugin')
      if (!instance) {
        throw new Error('Plugin not found')
      }
      const plugin = instance.plugin as MockPlugin
      expect(plugin.isActivated()).toBe(true)

      await pluginManager.unloadPlugin('test-plugin')

      expect(plugin.isActivated()).toBe(false)
    })

    it('应该跳过不存在的插件', async () => {
      // 应该不报错
      await pluginManager.unloadPlugin('non-existent')
    })
  })

  describe('插件查询', () => {
    beforeEach(async () => {
      const manifests = [
        createTestManifest('plugin-1'),
        createTestManifest('plugin-2'),
        createTestManifest('plugin-3'),
      ]

      for (const manifest of manifests) {
        await pluginManager.loadPlugin(manifest, { default: MockPlugin })
      }

      await pluginManager.activatePlugin('plugin-1')
      await pluginManager.activatePlugin('plugin-2')
    })

    it('应该返回所有插件', () => {
      const plugins = pluginManager.getAllPlugins()
      expect(plugins).toHaveLength(3)
    })

    it('应该返回激活的插件', () => {
      const activePlugins = pluginManager.getActivePlugins()
      expect(activePlugins).toHaveLength(2)
      expect(activePlugins.every((p) => p.status === PluginStatus.ACTIVE)).toBe(true)
    })

    it('应该正确检查插件存在性', () => {
      expect(pluginManager.hasPlugin('plugin-1')).toBe(true)
      expect(pluginManager.hasPlugin('non-existent')).toBe(false)
    })

    it('应该正确检查插件激活状态', () => {
      expect(pluginManager.isPluginActive('plugin-1')).toBe(true)
      expect(pluginManager.isPluginActive('plugin-3')).toBe(false)
      expect(pluginManager.isPluginActive('non-existent')).toBe(false)
    })

    it('应该返回正确的插件状态', () => {
      expect(pluginManager.getPluginStatus('plugin-1')).toBe(PluginStatus.ACTIVE)
      expect(pluginManager.getPluginStatus('plugin-3')).toBe(PluginStatus.LOADED)
      expect(pluginManager.getPluginStatus('non-existent')).toBeUndefined()
    })
  })

  describe('插件统计', () => {
    beforeEach(async () => {
      const manifests = [
        createTestManifest('active-plugin'),
        createTestManifest('inactive-plugin'),
        createTestManifest('disabled-plugin'),
      ]

      for (const manifest of manifests) {
        await pluginManager.loadPlugin(manifest, { default: MockPlugin })
      }

      // 激活 active-plugin 使其变为 ACTIVE 状态
      await pluginManager.activatePlugin('active-plugin')
      // 激活后停用 inactive-plugin 使其变为 INACTIVE 状态
      await pluginManager.activatePlugin('inactive-plugin')
      await pluginManager.deactivatePlugin('inactive-plugin')
      // 禁用 disabled-plugin 使其变为 DISABLED 状态
      await pluginManager.disablePlugin('disabled-plugin')
    })

    it('应该返回正确的统计信息', () => {
      const stats = pluginManager.getStats()

      expect(stats.total).toBe(3)
      expect(stats.active).toBe(1)
      expect(stats.inactive).toBe(1)
      expect(stats.disabled).toBe(1)
      expect(stats.error).toBe(0)
      expect(stats.loading).toBe(0)
    })
  })

  describe('事件系统', () => {
    it('应该触发插件加载事件', async () => {
      const loadingSpy = vi.fn()
      const loadedSpy = vi.fn()

      pluginManager.on('plugin:loading', loadingSpy)
      pluginManager.on('plugin:loaded', loadedSpy)

      const manifest = createTestManifest('event-plugin')
      await pluginManager.loadPlugin(manifest, { default: MockPlugin })

      expect(loadingSpy).toHaveBeenCalledWith('event-plugin')
      expect(loadedSpy).toHaveBeenCalledWith('event-plugin', expect.any(Object))
    })

    it('应该触发插件激活事件', async () => {
      const activatedSpy = vi.fn()
      pluginManager.on('plugin:activated', activatedSpy)

      const manifest = createTestManifest('event-plugin')
      await pluginManager.loadPlugin(manifest, { default: MockPlugin })
      await pluginManager.activatePlugin('event-plugin')

      expect(activatedSpy).toHaveBeenCalledWith('event-plugin')
    })

    it('应该触发插件停用事件', async () => {
      const deactivatedSpy = vi.fn()
      pluginManager.on('plugin:deactivated', deactivatedSpy)

      const manifest = createTestManifest('event-plugin')
      await pluginManager.loadPlugin(manifest, { default: MockPlugin })
      await pluginManager.activatePlugin('event-plugin')
      await pluginManager.deactivatePlugin('event-plugin')

      expect(deactivatedSpy).toHaveBeenCalledWith('event-plugin')
    })

    it('应该触发插件错误事件', async () => {
      const errorSpy = vi.fn()
      pluginManager.on('plugin:error', errorSpy)

      const manifest = createTestManifest('error-plugin')
      await pluginManager.loadPlugin(manifest, { default: ErrorPlugin })

      try {
        await pluginManager.activatePlugin('error-plugin')
      } catch {
        // 忽略错误，我们只关心事件
      }

      expect(errorSpy).toHaveBeenCalledWith('error-plugin', expect.any(Error))
    })
  })

  describe('权限管理', () => {
    it('应该检查插件权限', async () => {
      const manifest = createTestManifest('permission-plugin', {
        permissions: [PluginPermission.CANVAS_MODIFY, PluginPermission.UI_MODIFY],
      })

      // 模拟权限检查
      const permissionManager = pluginManager.getPermissionManager()
      const checkSpy = vi.spyOn(permissionManager, 'checkPermissions')

      await pluginManager.loadPlugin(manifest, { default: MockPlugin })

      expect(checkSpy).toHaveBeenCalledWith([
        PluginPermission.CANVAS_MODIFY,
        PluginPermission.UI_MODIFY,
      ])
    })
  })

  describe('扩展管理', () => {
    it('应该在插件停用时注销扩展', async () => {
      const manifest = createTestManifest('extension-plugin')
      await pluginManager.loadPlugin(manifest, { default: MockPlugin })
      await pluginManager.activatePlugin('extension-plugin')

      const extensionManager = pluginManager.getExtensionManager()
      const unregisterSpy = vi.spyOn(extensionManager, 'unregisterPluginProviders')

      await pluginManager.deactivatePlugin('extension-plugin')

      expect(unregisterSpy).toHaveBeenCalledWith('extension-plugin')
    })
  })
})
