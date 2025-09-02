/**
 * 权限管理器 - 负责插件API访问权限控制
 */

import { PluginPermission } from '../types/PluginTypes';

export interface PermissionRequest {
  permission: PluginPermission;
  reason: string;
  pluginId: string;
}

export interface PermissionGrant {
  permission: PluginPermission;
  granted: boolean;
  timestamp: number;
  permanent: boolean;
}

export class PermissionManager {
  private grantedPermissions = new Map<string, Map<PluginPermission, PermissionGrant>>();
  private permissionCallbacks = new Map<PluginPermission, Set<Function>>();
  private securityPolicies = new Map<PluginPermission, SecurityPolicy>();
  private eventListeners = new Map<string, Set<Function>>();

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * 初始化默认安全策略
   */
  private initializeDefaultPolicies(): void {
    // 只读权限 - 自动授予
    this.securityPolicies.set(PluginPermission.READ_ONLY, {
      autoGrant: true,
      requiresUserConsent: false,
      riskLevel: 'low'
    });

    // 画布修改权限 - 需要用户确认
    this.securityPolicies.set(PluginPermission.CANVAS_MODIFY, {
      autoGrant: false,
      requiresUserConsent: true,
      riskLevel: 'medium'
    });

    // UI修改权限 - 需要用户确认
    this.securityPolicies.set(PluginPermission.UI_MODIFY, {
      autoGrant: false,
      requiresUserConsent: true,
      riskLevel: 'medium'
    });

    // 文件访问权限 - 需要用户确认
    this.securityPolicies.set(PluginPermission.FILE_ACCESS, {
      autoGrant: false,
      requiresUserConsent: true,
      riskLevel: 'high'
    });

    // 网络访问权限 - 需要用户确认
    this.securityPolicies.set(PluginPermission.NETWORK_ACCESS, {
      autoGrant: false,
      requiresUserConsent: true,
      riskLevel: 'high'
    });

    // 系统访问权限 - 严格控制
    this.securityPolicies.set(PluginPermission.SYSTEM_ACCESS, {
      autoGrant: false,
      requiresUserConsent: true,
      riskLevel: 'critical'
    });
  }

  /**
   * 检查权限
   */
  async checkPermissions(permissions: PluginPermission[]): Promise<boolean> {
    try {
      for (const permission of permissions) {
        const policy = this.securityPolicies.get(permission);
        if (!policy) {
          this.emit('permission:checked', permissions, false);
          return false;
        }

        if (policy.riskLevel === 'critical') {
          this.emit('permission:checked', permissions, false);
          return false;
        }
      }
      
      this.emit('permission:checked', permissions, true);
      return true;
    } catch (error) {
      this.emit('permission:checked', permissions, false);
      return false;
    }
  }

  /**
   * 请求权限
   */
  async requestPermission(
    pluginId: string, 
    permission: PluginPermission, 
    reason: string
  ): Promise<boolean> {
    // 检查是否已经授予权限
    if (this.hasPermission(pluginId, permission)) {
      return true;
    }

    const policy = this.securityPolicies.get(permission);
    if (!policy) {
      throw new Error(`Unknown permission: ${permission}`);
    }

    // 自动授予的权限
    if (policy.autoGrant) {
      this.grantPermission(pluginId, permission, true);
      return true;
    }

    // 需要用户确认的权限
    if (policy.requiresUserConsent) {
      const granted = await this.requestUserConsent({
        permission,
        reason,
        pluginId
      });

      if (granted) {
        this.grantPermission(pluginId, permission, true);
      }

      return granted;
    }

    return false;
  }

  /**
   * 批量请求权限
   */
  async requestPermissions(
    pluginId: string, 
    permissions: PluginPermission[], 
    reason: string
  ): Promise<Map<PluginPermission, boolean>> {
    const results = new Map<PluginPermission, boolean>();

    for (const permission of permissions) {
      try {
        const granted = await this.requestPermission(pluginId, permission, reason);
        results.set(permission, granted);
      } catch (error) {
        console.error(`Error requesting permission '${permission}' for plugin '${pluginId}'`, error);
        results.set(permission, false);
      }
    }

    return results;
  }

  /**
   * 授予权限
   */
  grantPermission(
    pluginId: string, 
    permission: PluginPermission, 
    permanent: boolean = false
  ): void {
    if (!this.grantedPermissions.has(pluginId)) {
      this.grantedPermissions.set(pluginId, new Map());
    }

    const pluginPermissions = this.grantedPermissions.get(pluginId)!;
    pluginPermissions.set(permission, {
      permission,
      granted: true,
      timestamp: Date.now(),
      permanent
    });

    // 触发权限授予回调
    this.triggerPermissionCallbacks(permission, pluginId, true);
    
    // 触发权限授予事件
    this.emit('permission:granted', pluginId, permission);
  }

  /**
   * 撤销权限
   */
  revokePermission(pluginId: string, permission: PluginPermission): void {
    const pluginPermissions = this.grantedPermissions.get(pluginId);
    if (pluginPermissions) {
      pluginPermissions.delete(permission);
      
      // 如果插件没有任何权限了，移除整个条目
      if (pluginPermissions.size === 0) {
        this.grantedPermissions.delete(pluginId);
      }
      
      // 触发权限撤销回调
      this.triggerPermissionCallbacks(permission, pluginId, false);
      
      // 触发权限撤销事件
      this.emit('permission:revoked', pluginId, permission);
    }
  }

  /**
   * 撤销插件的所有权限
   */
  revokeAllPermissions(pluginId: string): void {
    const pluginPermissions = this.grantedPermissions.get(pluginId);
    if (pluginPermissions) {
      for (const permission of pluginPermissions.keys()) {
        this.triggerPermissionCallbacks(permission, pluginId, false);
      }
      this.grantedPermissions.delete(pluginId);
    }
  }

  /**
   * 检查是否有权限
   */
  hasPermission(pluginId: string, permission: PluginPermission): boolean {
    const pluginPermissions = this.grantedPermissions.get(pluginId);
    return pluginPermissions?.has(permission) ?? false;
  }

  /**
   * 检查是否有所有权限
   */
  hasAllPermissions(pluginId: string, permissions: PluginPermission[]): boolean {
    return permissions.every(permission => this.hasPermission(pluginId, permission));
  }

  /**
   * 获取插件的所有权限
   */
  getPluginPermissions(pluginId: string): PluginPermission[] {
    const pluginPermissions = this.grantedPermissions.get(pluginId);
    return pluginPermissions ? Array.from(pluginPermissions.keys()) : [];
  }

  /**
   * 获取权限详情
   */
  getPermissionGrant(pluginId: string, permission: PluginPermission): PermissionGrant | undefined {
    const pluginPermissions = this.grantedPermissions.get(pluginId);
    return pluginPermissions?.get(permission);
  }

  /**
   * 验证API调用权限
   */
  validateAPICall(pluginId: string, apiPath: string): boolean {
    const requiredPermission = this.getRequiredPermissionForAPI(apiPath);
    if (!requiredPermission) {
      return true; // 不需要特殊权限的API
    }

    return this.hasPermission(pluginId, requiredPermission);
  }

  /**
   * 获取API所需权限
   */
  private getRequiredPermissionForAPI(apiPath: string): PluginPermission | null {
    const apiPermissionMap: Record<string, PluginPermission> = {
      // 画布API
      'canvas.addShape': PluginPermission.CANVAS_MODIFY,
      'canvas.removeShape': PluginPermission.CANVAS_MODIFY,
      'canvas.updateShape': PluginPermission.CANVAS_MODIFY,
      'canvas.clear': PluginPermission.CANVAS_MODIFY,
      'canvas.getShapes': PluginPermission.READ_ONLY,
      'canvas.getRenderer': PluginPermission.READ_ONLY,
      // 兼容方法权限
      'canvas.addElement': PluginPermission.CANVAS_MODIFY,
      'canvas.removeElement': PluginPermission.CANVAS_MODIFY,
      'canvas.updateElement': PluginPermission.CANVAS_MODIFY,
      'canvas.getElement': PluginPermission.READ_ONLY,
      'canvas.getAllElements': PluginPermission.READ_ONLY,
      'canvas.setTool': PluginPermission.CANVAS_MODIFY,
      'canvas.getTool': PluginPermission.READ_ONLY,
      'canvas.undo': PluginPermission.CANVAS_MODIFY,
      'canvas.redo': PluginPermission.CANVAS_MODIFY,
      'canvas.zoom': PluginPermission.CANVAS_MODIFY,
      'canvas.pan': PluginPermission.CANVAS_MODIFY,
      'canvas.getViewport': PluginPermission.READ_ONLY,

      // UI API
      'ui.addMenuItem': PluginPermission.UI_MODIFY,
      'ui.removeMenuItem': PluginPermission.UI_MODIFY,
      'ui.addToolbarButton': PluginPermission.UI_MODIFY,
      'ui.removeToolbarButton': PluginPermission.UI_MODIFY,
      'ui.addPanel': PluginPermission.UI_MODIFY,
      'ui.removePanel': PluginPermission.UI_MODIFY,
      'ui.showDialog': PluginPermission.UI_MODIFY,
      'ui.showNotification': PluginPermission.UI_MODIFY,

      // 文件API
      'file.open': PluginPermission.FILE_ACCESS,
      'file.save': PluginPermission.FILE_ACCESS,
      'file.import': PluginPermission.FILE_ACCESS,
      'file.export': PluginPermission.FILE_ACCESS,

      // 文件系统API
      'fileSystem.readFile': PluginPermission.FILE_ACCESS,
      'fileSystem.writeFile': PluginPermission.FILE_ACCESS,
      'fileSystem.deleteFile': PluginPermission.FILE_ACCESS,
      'fileSystem.listFiles': PluginPermission.FILE_ACCESS,
      'fileSystem.createDirectory': PluginPermission.FILE_ACCESS,

      // 工具API
      'tools.register': PluginPermission.CANVAS_MODIFY,
      'tools.unregister': PluginPermission.CANVAS_MODIFY,
      'tools.setActive': PluginPermission.CANVAS_MODIFY,

      // 渲染器API
      'renderers.register': PluginPermission.CANVAS_MODIFY,
      'renderers.unregister': PluginPermission.CANVAS_MODIFY
    };

    return apiPermissionMap[apiPath] || null;
  }

  /**
   * 请求用户同意
   */
  private async requestUserConsent(request: PermissionRequest): Promise<boolean> {
    // 在实际应用中，这里应该显示一个权限请求对话框
    // 现在我们简单地返回true作为演示
    console.log(`Permission request for plugin '${request.pluginId}':`, {
      permission: request.permission,
      reason: request.reason
    });

    // 模拟用户同意（在实际应用中应该是真实的用户交互）
    return new Promise((resolve) => {
      setTimeout(() => {
        // 对于演示目的，我们自动授予非系统级权限
        const policy = this.securityPolicies.get(request.permission);
        resolve(policy?.riskLevel !== 'critical');
      }, 100);
    });
  }

  /**
   * 注册权限变更回调
   */
  onPermissionChange(
    permission: PluginPermission, 
    callback: (pluginId: string, granted: boolean) => void
  ): void {
    if (!this.permissionCallbacks.has(permission)) {
      this.permissionCallbacks.set(permission, new Set());
    }
    this.permissionCallbacks.get(permission)!.add(callback);
  }

  /**
   * 移除权限变更回调
   */
  offPermissionChange(
    permission: PluginPermission, 
    callback: (pluginId: string, granted: boolean) => void
  ): void {
    const callbacks = this.permissionCallbacks.get(permission);
    if (callbacks) {
      callbacks.delete(callback);
    }
  }

  /**
   * 触发权限变更回调
   */
  private triggerPermissionCallbacks(
    permission: PluginPermission, 
    pluginId: string, 
    granted: boolean
  ): void {
    const callbacks = this.permissionCallbacks.get(permission);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(pluginId, granted);
        } catch (error) {
          console.error('Error in permission change callback', error);
        }
      }
    }
  }

  /**
   * 设置安全策略
   */
  setSecurityPolicy(permission: PluginPermission, policy: SecurityPolicy): void {
    this.securityPolicies.set(permission, policy);
  }

  /**
   * 获取安全策略
   */
  getSecurityPolicy(permission: PluginPermission): SecurityPolicy | undefined {
    return this.securityPolicies.get(permission);
  }

  /**
   * 获取权限统计
   */
  getPermissionStats(): {
    totalPlugins: number;
    permissionCounts: Record<PluginPermission, number>;
    riskDistribution: Record<string, number>;
  } {
    const stats = {
      totalPlugins: this.grantedPermissions.size,
      permissionCounts: {} as Record<PluginPermission, number>,
      riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 }
    };

    // 初始化权限计数
    for (const permission of Object.values(PluginPermission)) {
      stats.permissionCounts[permission] = 0;
    }

    // 统计权限使用情况
    for (const pluginPermissions of this.grantedPermissions.values()) {
      for (const permission of pluginPermissions.keys()) {
        stats.permissionCounts[permission]++;
        
        const policy = this.securityPolicies.get(permission);
        if (policy) {
          stats.riskDistribution[policy.riskLevel]++;
        }
      }
    }

    return stats;
  }

  /**
   * 导出权限配置
   */
  exportPermissions(): Record<string, PluginPermission[]> {
    const exported: Record<string, PluginPermission[]> = {};
    
    for (const [pluginId, permissions] of this.grantedPermissions) {
      exported[pluginId] = Array.from(permissions.keys());
    }
    
    return exported;
  }

  /**
   * 导入权限配置
   */
  importPermissions(permissions: Record<string, PluginPermission[]>): void {
    // 清除现有权限
    this.grantedPermissions.clear();
    
    // 导入新权限
    for (const [pluginId, pluginPermissions] of Object.entries(permissions)) {
      for (const permission of pluginPermissions) {
        this.grantPermission(pluginId, permission, true);
      }
    }
  }

  /**
   * 重置所有权限
   */
  resetAllPermissions(): void {
    this.grantedPermissions.clear();
    this.permissionCallbacks.clear();
  }

  /**
   * 获取所有权限
   */
  getAllPermissions(): Record<string, PluginPermission[]> {
    return this.exportPermissions();
  }

  /**
   * 验证权限
   */
  validatePermission(pluginId: string, permission: PluginPermission): boolean {
    return this.hasPermission(pluginId, permission);
  }

  /**
   * 检查是否为高风险权限
   */
  isHighRiskPermission(permission: PluginPermission): boolean {
    const policy = this.securityPolicies.get(permission);
    return policy ? (policy.riskLevel === 'high' || policy.riskLevel === 'critical') : false;
  }

  /**
   * 注册事件监听器
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, ...args: any[]): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      }
    }
  }

  /**
   * 清理所有权限
   */
  clear(): void {
    this.grantedPermissions.clear();
    this.permissionCallbacks.clear();
    this.eventListeners.clear();
  }
}

interface SecurityPolicy {
  autoGrant: boolean;
  requiresUserConsent: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}
