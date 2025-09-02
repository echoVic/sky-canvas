import { BaseSystem } from './SystemManager';
import { Extension, ExtensionType } from './ExtensionSystem';

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  updateTime: number;
  memoryUsage: number;
  gpuMemoryUsage: number;
  drawCalls: number;
  triangles: number;
  batchCount: number;
  culledObjects: number;
  cacheHitRate: number;
  lodSwitches: number;
}

/**
 * 性能警告类型
 */
export enum PerformanceWarningType {
  LOW_FPS = 'low_fps',
  HIGH_MEMORY = 'high_memory',
  HIGH_DRAW_CALLS = 'high_draw_calls',
  LOW_CACHE_HIT_RATE = 'low_cache_hit_rate',
  GPU_MEMORY_PRESSURE = 'gpu_memory_pressure'
}

/**
 * 性能警告
 */
export interface PerformanceWarning {
  type: PerformanceWarningType;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: number;
  value: number;
  threshold: number;
}

/**
 * 性能阈值配置
 */
interface PerformanceThresholds {
  minFPS: number;
  maxMemoryUsage: number;
  maxDrawCalls: number;
  minCacheHitRate: number;
  maxGPUMemoryUsage: number;
  maxFrameTime: number;
}

/**
 * 性能历史数据点
 */
interface PerformanceDataPoint {
  timestamp: number;
  metrics: PerformanceMetrics;
}

/**
 * 瓶颈检测结果
 */
export interface BottleneckAnalysis {
  type: 'cpu' | 'gpu' | 'memory' | 'io' | 'none';
  confidence: number;
  description: string;
  suggestions: string[];
}

/**
 * 实时性能监控系统
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'performance-monitor-system',
  priority: 700
})
export class PerformanceMonitorSystem extends BaseSystem {
  readonly name = 'performance-monitor-system';
  readonly priority = 700;
  
  private metrics: PerformanceMetrics = {
    fps: 0,
    frameTime: 0,
    renderTime: 0,
    updateTime: 0,
    memoryUsage: 0,
    gpuMemoryUsage: 0,
    drawCalls: 0,
    triangles: 0,
    batchCount: 0,
    culledObjects: 0,
    cacheHitRate: 0,
    lodSwitches: 0
  };
  
  private thresholds: PerformanceThresholds = {
    minFPS: 30,
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    maxDrawCalls: 1000,
    minCacheHitRate: 0.8,
    maxGPUMemoryUsage: 256 * 1024 * 1024, // 256MB
    maxFrameTime: 33.33 // 30 FPS
  };
  
  private warnings: PerformanceWarning[] = [];
  private history: PerformanceDataPoint[] = [];
  private maxHistorySize = 300; // 5分钟的历史数据（60fps）
  
  // FPS计算
  private frameCount = 0;
  private lastFPSUpdate = 0;
  private fpsUpdateInterval = 1000; // 1秒更新一次FPS
  
  // 性能分析
  private analysisInterval: number | null = null;
  private analysisIntervalTime = 5000; // 5秒分析一次
  
  // 仪表板状态
  private dashboardElement: HTMLElement | null = null;
  private enableDashboard = false;
  
  init(): void {
    this.startPerformanceAnalysis();
    if (this.enableDashboard) {
      this.createDashboard();
    }
  }
  
  /**
   * 更新性能指标
   */
  updateMetrics(newMetrics: Partial<PerformanceMetrics>): void {
    Object.assign(this.metrics, newMetrics);
    
    // 更新FPS
    this.updateFPS();
    
    // 检查警告
    this.checkWarnings();
    
    // 添加到历史记录
    this.addToHistory();
    
    // 更新仪表板
    if (this.enableDashboard && this.dashboardElement) {
      this.updateDashboard();
    }
  }
  
  /**
   * 更新FPS计算
   */
  private updateFPS(): void {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFPSUpdate >= this.fpsUpdateInterval) {
      this.metrics.fps = (this.frameCount * 1000) / (now - this.lastFPSUpdate);
      this.frameCount = 0;
      this.lastFPSUpdate = now;
    }
  }
  
  /**
   * 检查性能警告
   */
  private checkWarnings(): void {
    const now = Date.now();
    
    // 检查FPS
    if (this.metrics.fps < this.thresholds.minFPS) {
      this.addWarning({
        type: PerformanceWarningType.LOW_FPS,
        message: `FPS过低: ${this.metrics.fps.toFixed(1)}`,
        severity: this.metrics.fps < 15 ? 'high' : 'medium',
        timestamp: now,
        value: this.metrics.fps,
        threshold: this.thresholds.minFPS
      });
    }
    
    // 检查内存使用
    if (this.metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      this.addWarning({
        type: PerformanceWarningType.HIGH_MEMORY,
        message: `内存使用过高: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`,
        severity: 'medium',
        timestamp: now,
        value: this.metrics.memoryUsage,
        threshold: this.thresholds.maxMemoryUsage
      });
    }
    
    // 检查绘制调用
    if (this.metrics.drawCalls > this.thresholds.maxDrawCalls) {
      this.addWarning({
        type: PerformanceWarningType.HIGH_DRAW_CALLS,
        message: `绘制调用过多: ${this.metrics.drawCalls}`,
        severity: 'medium',
        timestamp: now,
        value: this.metrics.drawCalls,
        threshold: this.thresholds.maxDrawCalls
      });
    }
    
    // 检查缓存命中率
    if (this.metrics.cacheHitRate < this.thresholds.minCacheHitRate) {
      this.addWarning({
        type: PerformanceWarningType.LOW_CACHE_HIT_RATE,
        message: `缓存命中率过低: ${(this.metrics.cacheHitRate * 100).toFixed(1)}%`,
        severity: 'low',
        timestamp: now,
        value: this.metrics.cacheHitRate,
        threshold: this.thresholds.minCacheHitRate
      });
    }
    
    // 检查GPU内存
    if (this.metrics.gpuMemoryUsage > this.thresholds.maxGPUMemoryUsage) {
      this.addWarning({
        type: PerformanceWarningType.GPU_MEMORY_PRESSURE,
        message: `GPU内存压力: ${(this.metrics.gpuMemoryUsage / 1024 / 1024).toFixed(1)}MB`,
        severity: 'high',
        timestamp: now,
        value: this.metrics.gpuMemoryUsage,
        threshold: this.thresholds.maxGPUMemoryUsage
      });
    }
  }
  
  /**
   * 添加警告
   */
  private addWarning(warning: PerformanceWarning): void {
    // 避免重复警告（5秒内同类型警告只添加一次）
    const recentWarning = this.warnings.find(
      w => w.type === warning.type && warning.timestamp - w.timestamp < 5000
    );
    
    if (!recentWarning) {
      this.warnings.push(warning);
      
      // 限制警告数量
      if (this.warnings.length > 50) {
        this.warnings = this.warnings.slice(-50);
      }
      
      console.warn(`性能警告 [${warning.severity}]: ${warning.message}`);
    }
  }
  
  /**
   * 添加到历史记录
   */
  private addToHistory(): void {
    this.history.push({
      timestamp: Date.now(),
      metrics: { ...this.metrics }
    });
    
    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history = this.history.slice(-this.maxHistorySize);
    }
  }
  
  /**
   * 开始性能分析
   */
  private startPerformanceAnalysis(): void {
    this.analysisInterval = window.setInterval(() => {
      this.performBottleneckAnalysis();
    }, this.analysisIntervalTime);
  }
  
  /**
   * 执行瓶颈分析
   */
  private performBottleneckAnalysis(): BottleneckAnalysis {
    if (this.history.length < 10) {
      return {
        type: 'none',
        confidence: 0,
        description: '数据不足，无法分析',
        suggestions: []
      };
    }
    
    const recentData = this.history.slice(-30); // 最近30帧数据
    const avgMetrics = this.calculateAverageMetrics(recentData);
    
    // CPU瓶颈检测
    if (avgMetrics.frameTime > 16.67 && avgMetrics.updateTime > avgMetrics.renderTime) {
      return {
        type: 'cpu',
        confidence: 0.8,
        description: 'CPU处理时间过长，可能存在CPU瓶颈',
        suggestions: [
          '优化更新逻辑',
          '减少JavaScript计算复杂度',
          '使用Web Workers进行并行处理'
        ]
      };
    }
    
    // GPU瓶颈检测
    if (avgMetrics.drawCalls > 500 || avgMetrics.triangles > 100000) {
      return {
        type: 'gpu',
        confidence: 0.7,
        description: 'GPU渲染负载过高，可能存在GPU瓶颈',
        suggestions: [
          '减少绘制调用',
          '优化着色器',
          '使用LOD系统',
          '启用视锥剔除'
        ]
      };
    }
    
    // 内存瓶颈检测
    if (avgMetrics.memoryUsage > this.thresholds.maxMemoryUsage * 0.8) {
      return {
        type: 'memory',
        confidence: 0.6,
        description: '内存使用率过高，可能影响性能',
        suggestions: [
          '优化资源管理',
          '启用对象池',
          '清理未使用的资源'
        ]
      };
    }
    
    return {
      type: 'none',
      confidence: 0,
      description: '未检测到明显瓶颈',
      suggestions: []
    };
  }
  
  /**
   * 计算平均指标
   */
  private calculateAverageMetrics(data: PerformanceDataPoint[]): PerformanceMetrics {
    const sum = data.reduce((acc, point) => {
      Object.keys(point.metrics).forEach(key => {
        acc[key as keyof PerformanceMetrics] += point.metrics[key as keyof PerformanceMetrics];
      });
      return acc;
    }, {
      fps: 0, frameTime: 0, renderTime: 0, updateTime: 0,
      memoryUsage: 0, gpuMemoryUsage: 0, drawCalls: 0, triangles: 0,
      batchCount: 0, culledObjects: 0, cacheHitRate: 0, lodSwitches: 0
    });
    
    const count = data.length;
    Object.keys(sum).forEach(key => {
      sum[key as keyof PerformanceMetrics] /= count;
    });
    
    return sum as PerformanceMetrics;
  }
  
  /**
   * 创建性能仪表板
   */
  private createDashboard(): void {
    this.dashboardElement = document.createElement('div');
    this.dashboardElement.id = 'performance-dashboard';
    this.dashboardElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 5px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      max-height: 400px;
      overflow-y: auto;
    `;
    
    document.body.appendChild(this.dashboardElement);
  }
  
  /**
   * 更新仪表板显示
   */
  private updateDashboard(): void {
    if (!this.dashboardElement) return;
    
    const html = `
      <div style="margin-bottom: 10px; font-weight: bold;">性能监控</div>
      <div>FPS: ${this.metrics.fps.toFixed(1)}</div>
      <div>帧时间: ${this.metrics.frameTime.toFixed(2)}ms</div>
      <div>渲染时间: ${this.metrics.renderTime.toFixed(2)}ms</div>
      <div>更新时间: ${this.metrics.updateTime.toFixed(2)}ms</div>
      <div>内存: ${(this.metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
      <div>GPU内存: ${(this.metrics.gpuMemoryUsage / 1024 / 1024).toFixed(1)}MB</div>
      <div>绘制调用: ${this.metrics.drawCalls}</div>
      <div>三角形: ${this.metrics.triangles}</div>
      <div>批次: ${this.metrics.batchCount}</div>
      <div>剔除对象: ${this.metrics.culledObjects}</div>
      <div>缓存命中率: ${(this.metrics.cacheHitRate * 100).toFixed(1)}%</div>
      <div>LOD切换: ${this.metrics.lodSwitches}</div>
      ${this.warnings.length > 0 ? `
        <div style="margin-top: 10px; color: #ff6b6b; font-weight: bold;">警告:</div>
        ${this.warnings.slice(-3).map(w => `<div style="color: ${this.getWarningColor(w.severity)};">${w.message}</div>`).join('')}
      ` : ''}
    `;
    
    this.dashboardElement.innerHTML = html;
  }
  
  /**
   * 获取警告颜色
   */
  private getWarningColor(severity: string): string {
    switch (severity) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#fffa65';
      default: return '#ffffff';
    }
  }
  
  /**
   * 启用/禁用仪表板
   */
  setDashboardEnabled(enabled: boolean): void {
    this.enableDashboard = enabled;
    
    if (enabled && !this.dashboardElement) {
      this.createDashboard();
    } else if (!enabled && this.dashboardElement) {
      this.dashboardElement.remove();
      this.dashboardElement = null;
    }
  }
  
  /**
   * 获取当前指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  
  /**
   * 获取警告列表
   */
  getWarnings(): PerformanceWarning[] {
    return [...this.warnings];
  }
  
  /**
   * 获取历史数据
   */
  getHistory(): PerformanceDataPoint[] {
    return [...this.history];
  }
  
  /**
   * 清除警告
   */
  clearWarnings(): void {
    this.warnings = [];
  }
  
  /**
   * 设置性能阈值
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    Object.assign(this.thresholds, thresholds);
  }
  
  /**
   * 导出性能报告
   */
  exportReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      currentMetrics: this.metrics,
      thresholds: this.thresholds,
      warnings: this.warnings,
      history: this.history.slice(-100), // 最近100个数据点
      bottleneckAnalysis: this.performBottleneckAnalysis()
    };
    
    return JSON.stringify(report, null, 2);
  }
  
  /**
   * 销毁系统
   */
  dispose(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
    
    if (this.dashboardElement) {
      this.dashboardElement.remove();
      this.dashboardElement = null;
    }
    
    this.warnings = [];
    this.history = [];
  }
}