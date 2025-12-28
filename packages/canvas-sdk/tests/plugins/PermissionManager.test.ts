/**
 * 权限管理器单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionManager } from '../../src/plugins/core/PermissionManager';
import { PluginPermission } from '../../src/plugins/types/PluginTypes';

describe.skip('PermissionManager', () => {
  let permissionManager: PermissionManager;

  beforeEach(() => {
    permissionManager = new PermissionManager();
    // 清除localStorage
    localStorage.clear();
  });

  describe('权限检查', () => {
    it('应该允许READ_ONLY权限', async () => {
      const result = await permissionManager.checkPermissions([PluginPermission.READ_ONLY]);
      expect(result).toBe(true);
    });

    it('应该拒绝高级权限（无用户同意）', async () => {
      // 模拟用户拒绝
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      const result = await permissionManager.checkPermissions([PluginPermission.CANVAS_MODIFY]);
      expect(result).toBe(false);
    });

    it('应该允许高级权限（有用户同意）', async () => {
      // 模拟用户同意
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const result = await permissionManager.checkPermissions([PluginPermission.CANVAS_MODIFY]);
      expect(result).toBe(true);
    });

    it('应该记住用户的权限决定', async () => {
      // 模拟用户同意
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      // 第一次检查
      await permissionManager.checkPermissions([PluginPermission.UI_MODIFY]);
      
      // 第二次检查不应该再次询问
      const confirmSpy = vi.spyOn(window, 'confirm');
      const result = await permissionManager.checkPermissions([PluginPermission.UI_MODIFY]);
      
      expect(result).toBe(true);
      expect(confirmSpy).not.toHaveBeenCalled();
    });

    it('应该处理多个权限', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      const permissions = [
        PluginPermission.READ_ONLY,
        PluginPermission.CANVAS_MODIFY,
        PluginPermission.UI_MODIFY
      ];

      const result = await permissionManager.checkPermissions(permissions);
      expect(result).toBe(true);
    });

    it('应该在任一权限被拒绝时返回false', async () => {
      // 第一个权限同意，第二个拒绝
      vi.spyOn(window, 'confirm')
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false);

      const permissions = [
        PluginPermission.CANVAS_MODIFY,
        PluginPermission.FILE_ACCESS
      ];

      const result = await permissionManager.checkPermissions(permissions);
      expect(result).toBe(false);
    });
  });

  describe('权限授予', () => {
    it('应该成功授予权限', () => {
      permissionManager.grantPermission('test-plugin', PluginPermission.CANVAS_MODIFY);
      
      const hasPermission = permissionManager.hasPermission('test-plugin', PluginPermission.CANVAS_MODIFY);
      expect(hasPermission).toBe(true);
    });

    it('应该授予多个权限', () => {
      const permissions = [
        PluginPermission.CANVAS_MODIFY,
        PluginPermission.UI_MODIFY,
        PluginPermission.FILE_ACCESS
      ];

      permissions.forEach(permission => {
        permissionManager.grantPermission('test-plugin', permission);
      });

      permissions.forEach(permission => {
        expect(permissionManager.hasPermission('test-plugin', permission)).toBe(true);
      });
    });

    it('应该持久化权限到localStorage', () => {
      permissionManager.grantPermission('test-plugin', PluginPermission.CANVAS_MODIFY);
      
      // 创建新的实例来测试持久化
      const newManager = new PermissionManager();
      expect(newManager.hasPermission('test-plugin', PluginPermission.CANVAS_MODIFY)).toBe(true);
    });
  });

  describe('权限撤销', () => {
    beforeEach(() => {
      permissionManager.grantPermission('test-plugin', PluginPermission.CANVAS_MODIFY);
      permissionManager.grantPermission('test-plugin', PluginPermission.UI_MODIFY);
    });

    it('应该成功撤销单个权限', () => {
      permissionManager.revokePermission('test-plugin', PluginPermission.CANVAS_MODIFY);
      
      expect(permissionManager.hasPermission('test-plugin', PluginPermission.CANVAS_MODIFY)).toBe(false);
      expect(permissionManager.hasPermission('test-plugin', PluginPermission.UI_MODIFY)).toBe(true);
    });

    it('应该撤销插件的所有权限', () => {
      permissionManager.revokeAllPermissions('test-plugin');
      
      expect(permissionManager.hasPermission('test-plugin', PluginPermission.CANVAS_MODIFY)).toBe(false);
      expect(permissionManager.hasPermission('test-plugin', PluginPermission.UI_MODIFY)).toBe(false);
    });

    it('应该从localStorage中移除撤销的权限', () => {
      permissionManager.revokePermission('test-plugin', PluginPermission.CANVAS_MODIFY);
      
      const newManager = new PermissionManager();
      expect(newManager.hasPermission('test-plugin', PluginPermission.CANVAS_MODIFY)).toBe(false);
    });
  });

  describe('权限查询', () => {
    beforeEach(() => {
      permissionManager.grantPermission('plugin-1', PluginPermission.CANVAS_MODIFY);
      permissionManager.grantPermission('plugin-1', PluginPermission.UI_MODIFY);
      permissionManager.grantPermission('plugin-2', PluginPermission.FILE_ACCESS);
    });

    it('应该返回插件的所有权限', () => {
      const permissions = permissionManager.getPluginPermissions('plugin-1');
      expect(permissions).toContain(PluginPermission.CANVAS_MODIFY);
      expect(permissions).toContain(PluginPermission.UI_MODIFY);
      expect(permissions).toHaveLength(2);
    });

    it('应该返回空数组（无权限插件）', () => {
      const permissions = permissionManager.getPluginPermissions('non-existent');
      expect(permissions).toEqual([]);
    });

    it('应该返回所有插件权限', () => {
      const allPermissions = permissionManager.getAllPermissions();
      
      expect(allPermissions['plugin-1']).toContain(PluginPermission.CANVAS_MODIFY);
      expect(allPermissions['plugin-1']).toContain(PluginPermission.UI_MODIFY);
      expect(allPermissions['plugin-2']).toContain(PluginPermission.FILE_ACCESS);
    });
  });

  describe('权限级别检查', () => {
    it('应该正确识别权限级别', () => {
      expect(permissionManager.isHighRiskPermission(PluginPermission.READ_ONLY)).toBe(false);
      expect(permissionManager.isHighRiskPermission(PluginPermission.CANVAS_MODIFY)).toBe(false);
      expect(permissionManager.isHighRiskPermission(PluginPermission.FILE_ACCESS)).toBe(true);
      expect(permissionManager.isHighRiskPermission(PluginPermission.NETWORK_ACCESS)).toBe(true);
      expect(permissionManager.isHighRiskPermission(PluginPermission.SYSTEM_ACCESS)).toBe(true);
    });

    it('应该为高风险权限要求确认', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

      await permissionManager.checkPermissions([PluginPermission.SYSTEM_ACCESS]);

      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('SYSTEM_ACCESS')
      );
    });

    it('应该为低风险权限跳过确认', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm');

      await permissionManager.checkPermissions([PluginPermission.CANVAS_MODIFY]);

      expect(confirmSpy).not.toHaveBeenCalled();
    });
  });

  describe('权限验证', () => {
    beforeEach(() => {
      permissionManager.grantPermission('authorized-plugin', PluginPermission.CANVAS_MODIFY);
    });

    it('应该验证有效权限', () => {
      const isValid = permissionManager.validatePermission(
        'authorized-plugin',
        PluginPermission.CANVAS_MODIFY
      );
      expect(isValid).toBe(true);
    });

    it('应该拒绝无效权限', () => {
      const isValid = permissionManager.validatePermission(
        'unauthorized-plugin',
        PluginPermission.CANVAS_MODIFY
      );
      expect(isValid).toBe(false);
    });

    it('应该拒绝未授权插件的权限', () => {
      const isValid = permissionManager.validatePermission(
        'authorized-plugin',
        PluginPermission.FILE_ACCESS
      );
      expect(isValid).toBe(false);
    });
  });

  describe('事件系统', () => {
    it('应该触发权限授予事件', () => {
      const grantedSpy = vi.fn();
      permissionManager.on('permission:granted', grantedSpy);

      permissionManager.grantPermission('test-plugin', PluginPermission.CANVAS_MODIFY);

      expect(grantedSpy).toHaveBeenCalledWith(
        'test-plugin',
        PluginPermission.CANVAS_MODIFY
      );
    });

    it('应该触发权限撤销事件', () => {
      const revokedSpy = vi.fn();
      permissionManager.on('permission:revoked', revokedSpy);

      permissionManager.grantPermission('test-plugin', PluginPermission.CANVAS_MODIFY);
      permissionManager.revokePermission('test-plugin', PluginPermission.CANVAS_MODIFY);

      expect(revokedSpy).toHaveBeenCalledWith(
        'test-plugin',
        PluginPermission.CANVAS_MODIFY
      );
    });

    it('应该触发权限检查事件', async () => {
      const checkedSpy = vi.fn();
      permissionManager.on('permission:checked', checkedSpy);

      vi.spyOn(window, 'confirm').mockReturnValue(true);
      await permissionManager.checkPermissions([PluginPermission.CANVAS_MODIFY]);

      expect(checkedSpy).toHaveBeenCalledWith([PluginPermission.CANVAS_MODIFY], true);
    });
  });

  describe('权限重置', () => {
    beforeEach(() => {
      permissionManager.grantPermission('plugin-1', PluginPermission.CANVAS_MODIFY);
      permissionManager.grantPermission('plugin-2', PluginPermission.UI_MODIFY);
    });

    it('应该重置所有权限', () => {
      permissionManager.resetAllPermissions();

      expect(permissionManager.getPluginPermissions('plugin-1')).toEqual([]);
      expect(permissionManager.getPluginPermissions('plugin-2')).toEqual([]);
    });

    it('应该清除localStorage中的权限', () => {
      permissionManager.resetAllPermissions();

      const newManager = new PermissionManager();
      expect(newManager.getAllPermissions()).toEqual({});
    });
  });

  describe('权限导入导出', () => {
    beforeEach(() => {
      permissionManager.grantPermission('plugin-1', PluginPermission.CANVAS_MODIFY);
      permissionManager.grantPermission('plugin-1', PluginPermission.UI_MODIFY);
      permissionManager.grantPermission('plugin-2', PluginPermission.FILE_ACCESS);
    });

    it('应该导出权限配置', () => {
      const exported = permissionManager.exportPermissions();
      
      expect(exported['plugin-1']).toContain(PluginPermission.CANVAS_MODIFY);
      expect(exported['plugin-1']).toContain(PluginPermission.UI_MODIFY);
      expect(exported['plugin-2']).toContain(PluginPermission.FILE_ACCESS);
    });

    it('应该导入权限配置', () => {
      const permissions = {
        'new-plugin': [PluginPermission.NETWORK_ACCESS, PluginPermission.SYSTEM_ACCESS]
      };

      permissionManager.importPermissions(permissions);

      expect(permissionManager.hasPermission('new-plugin', PluginPermission.NETWORK_ACCESS)).toBe(true);
      expect(permissionManager.hasPermission('new-plugin', PluginPermission.SYSTEM_ACCESS)).toBe(true);
    });

    it('应该在导入时覆盖现有权限', () => {
      const permissions = {
        'plugin-1': [PluginPermission.READ_ONLY]
      };

      permissionManager.importPermissions(permissions);

      const plugin1Permissions = permissionManager.getPluginPermissions('plugin-1');
      expect(plugin1Permissions).toEqual([PluginPermission.READ_ONLY]);
    });
  });
});
