/**
 * 系统架构演示
 * 展示三层架构和系统管理
 */

import { RenderEngine } from '../engine/RenderEngine';
import { ExtensionManager, ExtensionType } from '../engine/core/systems/ExtensionSystem';
import { SystemManager } from '../engine/core/systems/SystemManager';
import { ArchitectureManager } from '../engine/core/ArchitectureLayers';

/**
 * 系统架构演示类
 */
export class SystemArchitectureDemo {
  private canvas: HTMLCanvasElement;
  private engine: RenderEngine;
  private extensionManager: ExtensionManager;
  private systemManager: SystemManager;
  private architectureManager: ArchitectureManager;
  
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    
    // 初始化渲染引擎
    this.engine = new RenderEngine('auto');
    
    // 获取管理器实例
    this.extensionManager = this.engine.getExtensionManager();
    this.systemManager = this.engine.getSystemManager();
    this.architectureManager = this.engine.getArchitectureManager();
  }
  
  /**
   * 初始化演示
   */
  async initialize(): Promise<void> {
    try {
      console.log('=== 系统架构演示初始化 ===');
      
      // 显示系统信息
      this.displaySystemInfo();
      
      // 显示扩展信息
      this.displayExtensionInfo();
      
      // 显示架构层信息
      this.displayArchitectureInfo();
      
      console.log('系统架构演示初始化完成');
    } catch (error) {
      console.error('系统架构演示初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 显示系统信息
   */
  private displaySystemInfo(): void {
    console.log('\n--- 系统管理器信息 ---');
    
    console.log('系统管理器已初始化');
    console.log('系统包括: RenderSystem, BatchRenderSystem, ResourceSystem, PerformanceSystem');
  }
  
  /**
   * 显示扩展信息
   */
  private displayExtensionInfo(): void {
    console.log('\n--- 扩展管理器信息 ---');
    
    // 显示各类型扩展
    const extensionTypes = ['renderer', 'system', 'plugin'] as const;
    
    extensionTypes.forEach(type => {
      const extensions = this.extensionManager.get(type as ExtensionType);
      if (Array.isArray(extensions)) {
        console.log(`${type} 扩展数量: ${extensions.length}`);
        extensions.forEach((ext, index) => {
          console.log(`  扩展 ${index + 1}: ${ext.constructor?.name || 'Unknown'}`);
        });
      }
    });
  }
  
  /**
   * 显示架构层信息
   */
  private displayArchitectureInfo(): void {
    console.log('\n--- 三层架构信息 ---');
    
    console.log('GL层 (WebGL底层抽象):');
    console.log('  - WebGL状态管理');
    console.log('  - 缓冲区管理');
    console.log('  - 纹理管理');
    console.log('  - 着色器管理');
    
    console.log('\nCore层 (核心渲染抽象):');
    console.log('  - 渲染上下文');
    console.log('  - 变换矩阵');
    console.log('  - 几何体管理');
    console.log('  - 材质系统');
    
    console.log('\nFeature层 (高级功能特性):');
    console.log('  - 动画系统');
    console.log('  - 交互系统');
    console.log('  - 滤镜系统');
    console.log('  - 粒子系统');
  }
  
  /**
   * 开始渲染循环
   */
  start(): void {
    console.log('\n=== 开始渲染循环 ===');
    
    // 简单的渲染逻辑已在系统中处理
    
    // 开始渲染
    this.engine.start();
    
    // 定期输出统计信息
    setInterval(() => {
      this.displayStats();
    }, 5000);
  }
  
  /**
   * 停止渲染循环
   */
  stopRender(): void {
    console.log('\n=== 停止渲染循环 ===');
    
    // 停止渲染
    this.engine.stop();
    
    console.log('渲染循环已停止');
  }
  
  /**
   * 显示统计信息
   */
  private displayStats(): void {
    const stats = this.engine.getStats();
    
    console.log('\n--- 渲染统计 ---');
    console.log(`绘制调用: ${stats.drawCalls}`);
    console.log(`三角形数: ${stats.triangles}`);
    console.log(`帧时间: ${stats.frameTime.toFixed(2)}ms`);
    
    // 显示系统统计
    if (stats.systems) {
      console.log('\n系统统计:');
      Object.entries(stats.systems).forEach(([systemName, systemStats]) => {
        console.log(`  ${systemName}:`, systemStats);
      });
    }
  }
  
  /**
   * 停止演示
   */
  stop(): void {
    console.log('\n=== 停止系统架构演示 ===');
    this.engine.stop();
  }
  
  /**
   * 销毁演示
   */
  destroy(): void {
    console.log('\n=== 销毁系统架构演示 ===');
    this.engine.dispose();
  }
}

/**
 * 创建并运行系统架构演示
 */
export async function runSystemArchitectureDemo(canvas: HTMLCanvasElement): Promise<SystemArchitectureDemo> {
  const demo = new SystemArchitectureDemo(canvas);
  
  try {
    await demo.initialize();
    demo.start();
    
    console.log('\n系统架构演示已启动！');
    console.log('查看控制台输出了解系统运行状态。');
    
    return demo;
  } catch (error) {
    console.error('系统架构演示启动失败:', error);
    demo.destroy();
    throw error;
  }
}

// 演示完成