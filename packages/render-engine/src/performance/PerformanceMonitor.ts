/**
 * 性能监控系统
 * 实时监控渲染性能、内存使用和GPU状态
 */
import EventEmitter3 from 'eventemitter3';

/**
 * 性能指标类型
 */
export enum MetricType {
  /** 帧率 */
  FPS = 'fps',
  /** 帧时间 */
  FRAME_TIME = 'frameTime',
  /** 绘制调用次数 */
  DRAW_CALLS = 'drawCalls',
  /** 顶点数量 */
  VERTICES = 'vertices',
  /** 三角形数量 */
  TRIANGLES = 'triangles',
  /** 内存使用 */
  MEMORY_USAGE = 'memoryUsage',
  /** GPU内存使用 */
  GPU_MEMORY = 'gpuMemory',
  /** 纹理内存 */
  TEXTURE_MEMORY = 'textureMemory',
  /** 缓冲区内存 */
  BUFFER_MEMORY = 'bufferMemory',
  /** 着色器编译时间 */
  SHADER_COMPILE_TIME = 'shaderCompileTime',
  /** 批处理效率 */
  BATCH_EFFICIENCY = 'batchEfficiency',
  /** CPU使用率 */
  CPU_USAGE = 'cpuUsage',
  /** 渲染队列长度 */
  RENDER_QUEUE_LENGTH = 'renderQueueLength'
}

/**
 * 性能数据点
 */
interface MetricDataPoint {
  timestamp: number;
  value: number;
}

/**
 * 性能统计
 */
interface MetricStats {
  min: number;
  max: number;
  avg: number;
  current: number;
  samples: number;
}

/**
 * 警告阈值配置
 */
interface PerformanceThresholds {
  fps: { min: number; max: number };
  frameTime: { max: number };
  drawCalls: { max: number };
  memoryUsage: { max: number };
  gpuMemory: { max: number };
}

/**
 * 性能监控配置
 */
interface PerformanceConfig {
  /** 采样间隔（毫秒） */
  sampleInterval: number;
  /** 历史数据保留时间（秒） */
  historyRetention: number;
  /** 启用自动分析 */
  enableAutoAnalysis: boolean;
  /** 启用性能警告 */
  enableWarnings: boolean;
  /** 警告阈值 */
  thresholds: PerformanceThresholds;
  /** 启用GPU查询 */
  enableGPUQueries: boolean;
  /** 启用内存分析器 */
  enableMemoryProfiler: boolean;
}

/**
 * 性能事件
 */
interface PerformanceEvents {
  'metric-updated': { type: MetricType; value: number; timestamp: number };
  'performance-warning': { type: string; message: string; severity: 'low' | 'medium' | 'high' };
  'fps-drop': { from: number; to: number; duration: number };
  'memory-leak': { type: string; trend: number };
  'gpu-bottleneck': { metric: string; value: number };
}

/**
 * GPU查询管理器
 */
class GPUQueryManager {
  private gl: WebGLRenderingContext;
  private ext: unknown | null = null; // EXT_disjoint_timer_query 扩展
  private queries = new Map<string, unknown>();
  
  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.initializeExtensions();
  }
  
  /**
   * 开始GPU时间查询
   */
  beginQuery(name: string): void {
    if (!this.ext || !this.isQueryAvailable()) return;
    
    // GPU查询实现（需要WebGL扩展支持）
    // 这里是简化的占位符实现
    console.log(`Begin GPU query: ${name}`);
  }
  
  /**
   * 结束GPU时间查询
   */
  endQuery(name: string): void {
    if (!this.ext || !this.isQueryAvailable()) return;
    
    console.log(`End GPU query: ${name}`);
  }
  
  /**
   * 获取查询结果
   */
  getQueryResult(name: string): number | null {
    if (!this.ext || !this.queries.has(name)) return null;
    
    // 返回GPU时间（微秒）
    return Math.random() * 1000; // 模拟数据
  }
  
  private initializeExtensions(): void {
    // 尝试获取GPU查询扩展
    this.ext = this.gl.getExtension('EXT_disjoint_timer_query') ||
               this.gl.getExtension('EXT_disjoint_timer_query_webgl2');
  }
  
  private isQueryAvailable(): boolean {
    return this.ext !== null;
  }
}

/**
 * 内存分析器
 */
class MemoryProfiler {
  private allocations = new Map<string, number>();
  private totalAllocated = 0;
  
  /**
   * 记录内存分配
   */
  recordAllocation(type: string, size: number): void {
    const current = this.allocations.get(type) || 0;
    this.allocations.set(type, current + size);
    this.totalAllocated += size;
  }
  
  /**
   * 记录内存释放
   */
  recordDeallocation(type: string, size: number): void {
    const current = this.allocations.get(type) || 0;
    this.allocations.set(type, Math.max(0, current - size));
    this.totalAllocated = Math.max(0, this.totalAllocated - size);
  }
  
  /**
   * 获取内存使用情况
   */
  getMemoryUsage(): { total: number; byType: Map<string, number> } {
    return {
      total: this.totalAllocated,
      byType: new Map(this.allocations)
    };
  }
  
  /**
   * 检测内存泄漏
   */
  detectMemoryLeaks(): Array<{ type: string; trend: number; severity: 'low' | 'medium' | 'high' }> {
    const leaks: Array<{ type: string; trend: number; severity: 'low' | 'medium' | 'high' }> = [];
    
    // 简化的内存泄漏检测逻辑
    for (const [type, usage] of this.allocations) {
      if (usage > 50 * 1024 * 1024) { // 50MB
        const severity: 'low' | 'medium' | 'high' = 
          usage > 200 * 1024 * 1024 ? 'high' : 
          usage > 100 * 1024 * 1024 ? 'medium' : 'low';
        
        leaks.push({
          type,
          trend: usage,
          severity
        });
      }
    }
    
    return leaks;
  }
}

/**
 * 帧率计算器
 */
class FPSCounter {
  private frameTimes: number[] = [];
  private lastFrameTime = 0;
  private frameCount = 0;
  private startTime = 0;
  
  constructor() {
    this.startTime = performance.now();
  }
  
  /**
   * 记录新帧
   */
  recordFrame(): void {
    const now = performance.now();
    
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimes.push(frameTime);
      
      // 保持最近60帧的数据
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }
    }
    
    this.lastFrameTime = now;
    this.frameCount++;
  }
  
  /**
   * 获取当前FPS
   */
  getCurrentFPS(): number {
    if (this.frameTimes.length < 2) return 0;
    
    const avgFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }
  
  /**
   * 获取平均帧时间
   */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
  }
  
  /**
   * 获取总体FPS
   */
  getOverallFPS(): number {
    const elapsed = performance.now() - this.startTime;
    return elapsed > 0 ? (this.frameCount * 1000) / elapsed : 0;
  }
}

// 性能监控器事件接口
export interface PerformanceMonitorEvents {
  // 标准事件
  update: PerformanceMonitor;
  destroy: PerformanceMonitor;

  // 性能监控事件
  'metric-updated': { type: MetricType; value: number; timestamp: number };
  'performance-warning': { type: string; message: string; severity: 'low' | 'medium' | 'high' };
  'fps-drop': { from: number; to: number; duration: number };
  'memory-leak': { type: string; trend: number };
  'gpu-bottleneck': { metric: string; value: number };
}

/**
 * 性能监控器
 */
export class PerformanceMonitor extends EventEmitter3<PerformanceMonitorEvents> {
  private config: PerformanceConfig;
  private metrics = new Map<MetricType, MetricDataPoint[]>();
  private stats = new Map<MetricType, MetricStats>();
  
  // 监控组件
  private fpsCounter: FPSCounter;
  private memoryProfiler: MemoryProfiler;
  private gpuQueryManager: GPUQueryManager | null = null;
  
  // 状态
  private isActive = false;
  private sampleTimer: number | null = null;
  private lastSampleTime = 0;
  
  // 渲染统计
  private renderStats = {
    drawCalls: 0,
    vertices: 0,
    triangles: 0,
    batchCount: 0,
    stateChanges: 0
  };
  
  constructor(gl?: WebGLRenderingContext, config?: Partial<PerformanceConfig>) {
    super();
    
    this.config = {
      sampleInterval: 1000, // 1秒
      historyRetention: 300, // 5分钟
      enableAutoAnalysis: true,
      enableWarnings: true,
      thresholds: {
        fps: { min: 30, max: 120 },
        frameTime: { max: 33.33 }, // 30fps = 33.33ms
        drawCalls: { max: 1000 },
        memoryUsage: { max: 512 * 1024 * 1024 }, // 512MB
        gpuMemory: { max: 256 * 1024 * 1024 } // 256MB
      },
      enableGPUQueries: false,
      enableMemoryProfiler: true,
      ...config
    };
    
    this.fpsCounter = new FPSCounter();
    this.memoryProfiler = new MemoryProfiler();
    
    if (gl && this.config.enableGPUQueries) {
      this.gpuQueryManager = new GPUQueryManager(gl);
    }
    
    this.initializeMetrics();
  }
  
  /**
   * 开始监控
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.lastSampleTime = performance.now();
    
    // 启动采样定时器
    this.sampleTimer = window.setInterval(() => {
      this.sampleMetrics();
    }, this.config.sampleInterval);
    
    // 开始帧率监控
    this.startFrameMonitoring();
  }
  
  /**
   * 停止监控
   */
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
  }
  
  /**
   * 记录帧
   */
  recordFrame(): void {
    if (!this.isActive) return;
    
    this.fpsCounter.recordFrame();
    
    // 实时更新FPS指标
    const fps = this.fpsCounter.getCurrentFPS();
    const frameTime = this.fpsCounter.getAverageFrameTime();
    
    this.updateMetric(MetricType.FPS, fps);
    this.updateMetric(MetricType.FRAME_TIME, frameTime);
  }
  
  /**
   * 记录绘制调用
   */
  recordDrawCall(vertices: number, triangles?: number): void {
    this.renderStats.drawCalls++;
    this.renderStats.vertices += vertices;
    if (triangles !== undefined) {
      this.renderStats.triangles += triangles;
    }
  }
  
  /**
   * 记录批处理
   */
  recordBatch(commandCount: number): void {
    this.renderStats.batchCount++;
    
    // 计算批处理效率
    if (this.renderStats.drawCalls > 0) {
      const efficiency = commandCount / this.renderStats.drawCalls;
      this.updateMetric(MetricType.BATCH_EFFICIENCY, efficiency);
    }
  }
  
  /**
   * 记录状态变化
   */
  recordStateChange(): void {
    this.renderStats.stateChanges++;
  }
  
  /**
   * 记录内存分配
   */
  recordMemoryAllocation(type: string, size: number): void {
    if (this.config.enableMemoryProfiler) {
      this.memoryProfiler.recordAllocation(type, size);
    }
  }
  
  /**
   * 记录内存释放
   */
  recordMemoryDeallocation(type: string, size: number): void {
    if (this.config.enableMemoryProfiler) {
      this.memoryProfiler.recordDeallocation(type, size);
    }
  }
  
  /**
   * 获取当前性能指标
   */
  getCurrentMetrics(): Record<MetricType, number> {
    const metrics: Record<string, number> = {};
    
    for (const [type, stat] of this.stats) {
      metrics[type] = stat.current;
    }
    
    return metrics as Record<MetricType, number>;
  }
  
  /**
   * 获取性能统计
   */
  getStats(metricType?: MetricType): MetricStats | Map<MetricType, MetricStats> {
    if (metricType) {
      return this.stats.get(metricType) || {
        min: 0, max: 0, avg: 0, current: 0, samples: 0
      };
    }
    return new Map(this.stats);
  }
  
  /**
   * 获取历史数据
   */
  getHistoryData(metricType: MetricType, duration?: number): MetricDataPoint[] {
    const data = this.metrics.get(metricType) || [];
    
    if (duration) {
      const cutoffTime = performance.now() - duration * 1000;
      return data.filter(point => point.timestamp >= cutoffTime);
    }
    
    return [...data];
  }
  
  /**
   * 生成性能报告
   */
  generateReport(): {
    summary: Record<MetricType, MetricStats>;
    warnings: string[];
    recommendations: string[];
  } {
    const summary: Record<string, MetricStats> = {};
    const warnings: string[] = [];
    const recommendations: string[] = [];
    
    // 收集所有指标统计
    for (const [type, stat] of this.stats) {
      summary[type] = { ...stat };
    }
    
    // 分析性能问题
    this.analyzePerformance(warnings, recommendations);
    
    return {
      summary: summary as Record<MetricType, MetricStats>,
      warnings,
      recommendations
    };
  }
  
  /**
   * 清除历史数据
   */
  clearHistory(): void {
    this.metrics.clear();
    this.stats.clear();
    this.initializeMetrics();
  }
  
  /**
   * 销毁监控器
   */
  dispose(): void {
    // 1. 先发送 destroy 事件
    this.emit('destroy', this);

    // 2. 停止监控
    this.stop();

    // 3. 清理资源
    this.clearHistory();

    // 4. 最后移除所有监听器
    this.removeAllListeners();
  }
  
  /**
   * 初始化指标存储
   */
  private initializeMetrics(): void {
    for (const metricType of Object.values(MetricType)) {
      this.metrics.set(metricType as MetricType, []);
      this.stats.set(metricType as MetricType, {
        min: Infinity,
        max: -Infinity,
        avg: 0,
        current: 0,
        samples: 0
      });
    }
  }
  
  /**
   * 采样指标
   */
  private sampleMetrics(): void {
    const now = performance.now();
    
    // 更新渲染统计指标
    this.updateMetric(MetricType.DRAW_CALLS, this.renderStats.drawCalls);
    this.updateMetric(MetricType.VERTICES, this.renderStats.vertices);
    this.updateMetric(MetricType.TRIANGLES, this.renderStats.triangles);
    
    // 更新内存指标
    if (this.config.enableMemoryProfiler) {
      const memoryUsage = this.memoryProfiler.getMemoryUsage();
      this.updateMetric(MetricType.MEMORY_USAGE, memoryUsage.total);
      
      // 检测内存泄漏
      const leaks = this.memoryProfiler.detectMemoryLeaks();
      for (const leak of leaks) {
        this.emit('memory-leak', { type: leak.type, trend: leak.trend });
      }
    }
    
    // 检查GPU内存（如果支持）
    this.updateGPUMetrics();
    
    // 重置帧统计
    this.resetFrameStats();
    
    // 清理过期数据
    this.cleanupOldData();
    
    // 执行自动分析
    if (this.config.enableAutoAnalysis) {
      this.performAutoAnalysis();
    }
    
    this.lastSampleTime = now;
  }
  
  /**
   * 更新指标
   */
  private updateMetric(type: MetricType, value: number): void {
    const now = performance.now();
    
    // 添加数据点
    const dataPoints = this.metrics.get(type) || [];
    dataPoints.push({ timestamp: now, value });
    
    // 更新统计
    const stat = this.stats.get(type);
    if (stat) {
      stat.current = value;
      stat.min = Math.min(stat.min, value);
      stat.max = Math.max(stat.max, value);
      stat.samples++;
      
      // 计算移动平均
      const recentPoints = dataPoints.slice(-10); // 最近10个样本
      stat.avg = recentPoints.reduce((sum, p) => sum + p.value, 0) / recentPoints.length;
    }
    
    // 发射更新事件
    this.emit('metric-updated', { type, value, timestamp: now });
    
    // 检查警告阈值
    this.checkThresholds(type, value);
  }
  
  /**
   * 检查警告阈值
   */
  private checkThresholds(type: MetricType, value: number): void {
    if (!this.config.enableWarnings) return;
    
    const thresholds = this.config.thresholds;
    
    switch (type) {
      case MetricType.FPS:
        if (value < thresholds.fps.min) {
          this.emit('performance-warning', {
            type: 'Low FPS',
            message: `FPS dropped to ${value.toFixed(1)}`,
            severity: value < 15 ? 'high' : 'medium'
          });
        }
        break;
      
      case MetricType.FRAME_TIME:
        if (value > thresholds.frameTime.max) {
          this.emit('performance-warning', {
            type: 'High Frame Time',
            message: `Frame time exceeded ${thresholds.frameTime.max}ms: ${value.toFixed(2)}ms`,
            severity: value > 50 ? 'high' : 'medium'
          });
        }
        break;
      
      case MetricType.DRAW_CALLS:
        if (value > thresholds.drawCalls.max) {
          this.emit('performance-warning', {
            type: 'High Draw Calls',
            message: `Draw calls exceeded ${thresholds.drawCalls.max}: ${value}`,
            severity: 'medium'
          });
        }
        break;
      
      case MetricType.MEMORY_USAGE:
        if (value > thresholds.memoryUsage.max) {
          this.emit('performance-warning', {
            type: 'High Memory Usage',
            message: `Memory usage exceeded ${(thresholds.memoryUsage.max / (1024 * 1024)).toFixed(0)}MB: ${(value / (1024 * 1024)).toFixed(1)}MB`,
            severity: 'high'
          });
        }
        break;
    }
  }
  
  /**
   * 开始帧监控
   */
  private startFrameMonitoring(): void {
    const frameCallback = () => {
      if (this.isActive) {
        this.recordFrame();
        requestAnimationFrame(frameCallback);
      }
    };
    requestAnimationFrame(frameCallback);
  }
  
  /**
   * 重置帧统计
   */
  private resetFrameStats(): void {
    this.renderStats = {
      drawCalls: 0,
      vertices: 0,
      triangles: 0,
      batchCount: 0,
      stateChanges: 0
    };
  }
  
  /**
   * 更新GPU指标
   */
  private updateGPUMetrics(): void {
    if (!this.gpuQueryManager) return;
    
    // 模拟GPU内存使用查询
    const gpuMemory = Math.random() * 100 * 1024 * 1024; // 随机GPU内存使用
    this.updateMetric(MetricType.GPU_MEMORY, gpuMemory);
  }
  
  /**
   * 清理过期数据
   */
  private cleanupOldData(): void {
    const cutoffTime = performance.now() - this.config.historyRetention * 1000;
    
    for (const [type, dataPoints] of this.metrics) {
      const filteredData = dataPoints.filter(point => point.timestamp >= cutoffTime);
      this.metrics.set(type, filteredData);
    }
  }
  
  /**
   * 执行自动分析
   */
  private performAutoAnalysis(): void {
    // 检测FPS下降
    const fpsData = this.metrics.get(MetricType.FPS) || [];
    if (fpsData.length >= 2) {
      const recent = fpsData.slice(-10);
      const earlier = fpsData.slice(-20, -10);
      
      if (recent.length > 0 && earlier.length > 0) {
        const recentAvg = recent.reduce((sum, p) => sum + p.value, 0) / recent.length;
        const earlierAvg = earlier.reduce((sum, p) => sum + p.value, 0) / earlier.length;
        
        if (earlierAvg - recentAvg > 10) { // FPS下降超过10
          this.emit('fps-drop', {
            from: earlierAvg,
            to: recentAvg,
            duration: (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000
          });
        }
      }
    }
  }
  
  /**
   * 分析性能问题
   */
  private analyzePerformance(warnings: string[], recommendations: string[]): void {
    const fps = this.stats.get(MetricType.FPS);
    const drawCalls = this.stats.get(MetricType.DRAW_CALLS);
    const memory = this.stats.get(MetricType.MEMORY_USAGE);
    const batchEfficiency = this.stats.get(MetricType.BATCH_EFFICIENCY);
    
    // FPS分析
    if (fps && fps.avg < 30) {
      warnings.push('平均FPS低于30，性能较差');
      recommendations.push('考虑减少绘制调用或降低渲染复杂度');
    }
    
    // 绘制调用分析
    if (drawCalls && drawCalls.avg > 500) {
      warnings.push('绘制调用数量过高');
      recommendations.push('使用批处理合并绘制调用');
    }
    
    // 内存分析
    if (memory && memory.avg > 256 * 1024 * 1024) {
      warnings.push('内存使用量较高');
      recommendations.push('检查是否存在内存泄漏，优化资源管理');
    }
    
    // 批处理效率分析
    if (batchEfficiency && batchEfficiency.avg < 0.5) {
      warnings.push('批处理效率较低');
      recommendations.push('优化批处理策略，提高合并率');
    }
  }
}