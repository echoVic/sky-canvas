/**
 * 系统管理器
 * 管理渲染引擎中的各个子系统
 */

import { ExtensionType, ExtensionManager } from './ExtensionSystem';

/**
 * 系统接口
 */
export interface ISystem {
  readonly name: string;
  readonly priority: number;
  
  init?(): void | Promise<void>;
  update?(deltaTime: number): void;
  render?(): void;
  resize?(width: number, height: number): void;
  destroy?(): void;
}

/**
 * 系统管理器
 */
export class SystemManager {
  private systems = new Map<string, ISystem>();
  private sortedSystems: ISystem[] = [];
  private extensionManager: ExtensionManager;
  
  constructor(extensionManager: ExtensionManager) {
    this.extensionManager = extensionManager;
  }
  
  /**
   * 添加系统
   */
  addSystem(system: ISystem): void {
    if (this.systems.has(system.name)) {
      console.warn(`System ${system.name} already exists`);
      return;
    }
    
    this.systems.set(system.name, system);
    this.sortSystems();
  }
  
  /**
   * 移除系统
   */
  removeSystem(name: string): void {
    const system = this.systems.get(name);
    if (system) {
      if (system.destroy) {
        system.destroy();
      }
      this.systems.delete(name);
      this.sortSystems();
    }
  }
  
  /**
   * 获取系统
   */
  getSystem<T extends ISystem>(name: string): T | undefined {
    return this.systems.get(name) as T;
  }
  
  /**
   * 初始化所有系统
   */
  async initialize(): Promise<void> {
    const initErrors: Array<{ systemName: string; error: Error }> = [];
    
    try {
      // 从扩展管理器加载系统
      await this.loadSystemsFromExtensions();
      
      console.log(`Initializing ${this.sortedSystems.length} systems...`);
      
      // 初始化所有系统 - 按优先级顺序
      for (const system of this.sortedSystems) {
        try {
          if (system.init) {
            console.log(`Initializing system: ${system.name} (priority: ${system.priority})`);
            await system.init();
            console.log(`✓ System ${system.name} initialized successfully`);
          }
        } catch (error) {
          const initError = error as Error;
          initErrors.push({ systemName: system.name, error: initError });
          console.error(`✗ Failed to initialize system ${system.name}:`, initError.message);
        }
      }
      
      // 如果有初始化错误，报告但不完全失败
      if (initErrors.length > 0) {
        console.warn(`${initErrors.length} systems failed to initialize:`);
        initErrors.forEach(({ systemName, error }) => {
          console.warn(`- ${systemName}: ${error.message}`);
        });
        
        // 对于关键系统的失败，抛出错误
        const criticalSystems = ['render-system', 'resource-system'];
        const criticalFailures = initErrors.filter(err => 
          criticalSystems.includes(err.systemName)
        );
        
        if (criticalFailures.length > 0) {
          throw new Error(`Critical systems failed to initialize: ${criticalFailures.map(f => f.systemName).join(', ')}`);
        }
      }
      
      console.log('✓ System manager initialization completed');
    } catch (error) {
      console.error('System manager initialization failed:', error);
      throw error;
    }
  }
  
  /**
   * 更新所有系统
   */
  update(deltaTime: number): void {
    for (const system of this.sortedSystems) {
      if (system.update) {
        system.update(deltaTime);
      }
    }
  }
  
  /**
   * 渲染所有系统
   */
  render(): void {
    for (const system of this.sortedSystems) {
      if (system.render) {
        system.render();
      }
    }
  }
  
  /**
   * 调整所有系统大小
   */
  resize(width: number, height: number): void {
    for (const system of this.sortedSystems) {
      if (system.resize) {
        system.resize(width, height);
      }
    }
  }
  
  /**
   * 系统健康检查
   */
  performHealthCheck(): {
    healthy: boolean;
    systems: Array<{ name: string; status: 'healthy' | 'degraded' | 'failed'; message?: string }>;
  } {
    const systemHealth = this.sortedSystems.map(system => {
      try {
        // 基础健康检查
        if (system.name && typeof system.priority === 'number') {
          return {
            name: system.name,
            status: 'healthy' as const
          };
        } else {
          return {
            name: system.name || 'unknown',
            status: 'degraded' as const,
            message: 'System configuration is incomplete'
          };
        }
      } catch (error) {
        return {
          name: system.name || 'unknown',
          status: 'failed' as const,
          message: `Health check failed: ${error}`
        };
      }
    });
    
    const hasFailures = systemHealth.some(s => s.status === 'failed');
    const hasDegradation = systemHealth.some(s => s.status === 'degraded');
    
    return {
      healthy: !hasFailures && !hasDegradation,
      systems: systemHealth
    };
  }
  
  /**
   * 获取系统统计信息
   */
  getSystemStats() {
    return {
      totalSystems: this.systems.size,
      systemsByPriority: this.sortedSystems.map(s => ({
        name: s.name,
        priority: s.priority
      })),
      healthCheck: this.performHealthCheck()
    };
  }
  
  /**
   * 销毁所有系统
   */
  destroy(): void {
    console.log('Destroying all systems...');
    
    // 按相反优先级顺序销毁（先销毁优先级低的）
    const reverseSortedSystems = [...this.sortedSystems].reverse();
    
    for (const system of reverseSortedSystems) {
      try {
        if (system.destroy) {
          console.log(`Destroying system: ${system.name}`);
          system.destroy();
        }
      } catch (error) {
        console.error(`Failed to destroy system ${system.name}:`, error);
      }
    }
    
    this.systems.clear();
    this.sortedSystems = [];
    console.log('✓ All systems destroyed');
  }
  
  /**
   * 从扩展管理器加载系统
   */
  private async loadSystemsFromExtensions(): Promise<void> {
    const systemExtensions = this.extensionManager.get(ExtensionType.RenderSystem);
    const extensions = Array.isArray(systemExtensions) ? systemExtensions : [systemExtensions];
    
    for (const SystemClass of extensions) {
      if (typeof SystemClass === 'function') {
        const system = new (SystemClass as unknown as new () => ISystem)();
        this.addSystem(system);
      }
    }
  }
  
  /**
   * 按优先级排序系统
   */
  private sortSystems(): void {
    this.sortedSystems = Array.from(this.systems.values())
      .sort((a, b) => b.priority - a.priority);
  }
}

/**
 * 基础系统抽象类
 */
export abstract class BaseSystem implements ISystem {
  abstract readonly name: string;
  abstract readonly priority: number;
  
  init?(): void | Promise<void> {
    // 默认空实现
  }
  
  update?(_deltaTime: number): void {
    // 默认空实现
  }
  
  render?(): void {
    // 默认空实现
  }
  
  resize?(_width: number, _height: number): void {
    // 默认空实现
  }
  
  destroy?(): void {
    // 默认空实现
  }
}