/**
 * 性能指标类型
 */
export interface PerformanceMetrics {
  // 渲染指标
  frameTime: number;
  fps: number;
  drawCalls: number;
  triangles: number;
  vertices: number;
  
  // GPU指标
  gpuMemoryUsed: number;
  textureMemoryUsed: number;
  bufferMemoryUsed: number;
  
  // 批处理指标
  batchCount: number;
  batchEfficiency: number;
  stateChanges: number;
  
  // 着色器指标
  shaderSwitches: number;
  uniformUpdates: number;
  
  // 纹理指标
  textureBinds: number;
  textureUploads: number;
}

/**
 * 性能警告级别
 */
export enum WarningLevel {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical'
}

/**
 * 性能警告
 */
export interface PerformanceWarning {
  level: WarningLevel;
  category: string;
  message: string;
  suggestion?: string;
  value?: number;
  threshold?: number;
}

/**
 * 性能基准
 */
export interface PerformanceBenchmark {
  targetFps: number;
  maxDrawCalls: number;
  maxStateChanges: number;
  maxMemoryUsage: number;
  maxBatchCount: number;
}

/**
 * 性能历史记录
 */
export interface PerformanceHistory {
  timestamp: number;
  metrics: PerformanceMetrics;
}

/**
 * WebGL性能分析器
 */
export class WebGLPerformanceAnalyzer {
  private metrics: PerformanceMetrics;
  private history: PerformanceHistory[] = [];
  private warnings: PerformanceWarning[] = [];
  private benchmark: PerformanceBenchmark;
  private isEnabled = true;
  private maxHistorySize = 300; // 5分钟的历史记录 (60fps)
  
  // 性能计时器
  private frameStartTime = 0;
  private frameEndTime = 0;
  private fpsCalculator = new FPSCalculator();
  
  // GPU查询对象
  private gpuTimer: WebGLQuery | null = null;
  private timerExt: EXT_disjoint_timer_query | null = null;

  constructor(
    private gl: WebGLRenderingContext,
    benchmark?: Partial<PerformanceBenchmark>
  ) {
    this.metrics = this.createEmptyMetrics();
    this.benchmark = {
      targetFps: 60,
      maxDrawCalls: 100,
      maxStateChanges: 50,
      maxMemoryUsage: 256 * 1024 * 1024, // 256MB
      maxBatchCount: 20,
      ...benchmark
    };

    this.initializeGPUTiming();
  }

  private createEmptyMetrics(): PerformanceMetrics {
    return {
      frameTime: 0,
      fps: 0,
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      gpuMemoryUsed: 0,
      textureMemoryUsed: 0,
      bufferMemoryUsed: 0,
      batchCount: 0,
      batchEfficiency: 0,
      stateChanges: 0,
      shaderSwitches: 0,
      uniformUpdates: 0,
      textureBinds: 0,
      textureUploads: 0
    };
  }

  private initializeGPUTiming(): void {
    this.timerExt = this.gl.getExtension('EXT_disjoint_timer_query');
    if (this.timerExt) {
      this.gpuTimer = this.timerExt.createQueryEXT();
    }
  }

  /**
   * 开始帧分析
   */
  beginFrame(): void {
    if (!this.isEnabled) return;

    this.frameStartTime = performance.now();
    this.metrics = this.createEmptyMetrics();

    // 开始GPU计时
    if (this.timerExt && this.gpuTimer) {
      this.timerExt.beginQueryEXT(this.timerExt.TIME_ELAPSED_EXT, this.gpuTimer);
    }
  }

  /**
   * 结束帧分析
   */
  endFrame(): void {
    if (!this.isEnabled) return;

    this.frameEndTime = performance.now();
    this.metrics.frameTime = this.frameEndTime - this.frameStartTime;

    // 结束GPU计时
    if (this.timerExt && this.gpuTimer) {
      this.timerExt.endQueryEXT(this.timerExt.TIME_ELAPSED_EXT);
    }

    // 更新FPS
    this.fpsCalculator.addFrame(this.frameEndTime);
    this.metrics.fps = this.fpsCalculator.getFPS();

    // 分析性能并生成警告
    this.analyzePerformance();

    // 记录历史
    this.recordHistory();
  }

  /**
   * 记录绘制调用
   */
  recordDrawCall(triangles: number, vertices: number): void {
    if (!this.isEnabled) return;
    
    this.metrics.drawCalls++;
    this.metrics.triangles += triangles;
    this.metrics.vertices += vertices;
  }

  /**
   * 记录批处理
   */
  recordBatch(efficiency: number): void {
    if (!this.isEnabled) return;
    
    this.metrics.batchCount++;
    this.metrics.batchEfficiency = (this.metrics.batchEfficiency + efficiency) / 2;
  }

  /**
   * 记录状态变更
   */
  recordStateChange(): void {
    if (!this.isEnabled) return;
    this.metrics.stateChanges++;
  }

  /**
   * 记录着色器切换
   */
  recordShaderSwitch(): void {
    if (!this.isEnabled) return;
    this.metrics.shaderSwitches++;
  }

  /**
   * 记录uniform更新
   */
  recordUniformUpdate(): void {
    if (!this.isEnabled) return;
    this.metrics.uniformUpdates++;
  }

  /**
   * 记录纹理绑定
   */
  recordTextureBind(): void {
    if (!this.isEnabled) return;
    this.metrics.textureBinds++;
  }

  /**
   * 记录纹理上传
   */
  recordTextureUpload(size: number): void {
    if (!this.isEnabled) return;
    this.metrics.textureUploads++;
    this.metrics.textureMemoryUsed += size;
  }

  /**
   * 更新内存使用情况
   */
  updateMemoryUsage(gpuMemory: number, bufferMemory: number): void {
    if (!this.isEnabled) return;
    
    this.metrics.gpuMemoryUsed = gpuMemory;
    this.metrics.bufferMemoryUsed = bufferMemory;
  }

  /**
   * 分析性能并生成警告
   */
  private analyzePerformance(): void {
    this.warnings = [];

    // FPS检查
    if (this.metrics.fps < this.benchmark.targetFps * 0.8) {
      this.warnings.push({
        level: this.metrics.fps < this.benchmark.targetFps * 0.5 ? WarningLevel.CRITICAL : WarningLevel.WARNING,
        category: 'Performance',
        message: `Low FPS detected: ${this.metrics.fps.toFixed(1)}`,
        suggestion: 'Consider reducing draw calls or complexity',
        value: this.metrics.fps,
        threshold: this.benchmark.targetFps
      });
    }

    // 绘制调用检查
    if (this.metrics.drawCalls > this.benchmark.maxDrawCalls) {
      this.warnings.push({
        level: this.metrics.drawCalls > this.benchmark.maxDrawCalls * 2 ? WarningLevel.CRITICAL : WarningLevel.WARNING,
        category: 'Draw Calls',
        message: `High draw call count: ${this.metrics.drawCalls}`,
        suggestion: 'Implement batching or instancing',
        value: this.metrics.drawCalls,
        threshold: this.benchmark.maxDrawCalls
      });
    }

    // 状态变更检查
    if (this.metrics.stateChanges > this.benchmark.maxStateChanges) {
      this.warnings.push({
        level: WarningLevel.WARNING,
        category: 'State Changes',
        message: `High state change count: ${this.metrics.stateChanges}`,
        suggestion: 'Sort draw calls by render state',
        value: this.metrics.stateChanges,
        threshold: this.benchmark.maxStateChanges
      });
    }

    // 内存使用检查
    if (this.metrics.gpuMemoryUsed > this.benchmark.maxMemoryUsage) {
      this.warnings.push({
        level: WarningLevel.CRITICAL,
        category: 'Memory',
        message: `High GPU memory usage: ${(this.metrics.gpuMemoryUsed / 1024 / 1024).toFixed(1)}MB`,
        suggestion: 'Free unused resources or reduce texture sizes',
        value: this.metrics.gpuMemoryUsed,
        threshold: this.benchmark.maxMemoryUsage
      });
    }

    // 批处理效率检查
    if (this.metrics.batchEfficiency < 0.5 && this.metrics.batchCount > 0) {
      this.warnings.push({
        level: WarningLevel.INFO,
        category: 'Batching',
        message: `Low batch efficiency: ${(this.metrics.batchEfficiency * 100).toFixed(1)}%`,
        suggestion: 'Improve geometry sorting or reduce state changes',
        value: this.metrics.batchEfficiency,
        threshold: 0.7
      });
    }
  }

  /**
   * 记录历史数据
   */
  private recordHistory(): void {
    const historyEntry: PerformanceHistory = {
      timestamp: Date.now(),
      metrics: { ...this.metrics }
    };

    this.history.push(historyEntry);

    // 限制历史记录大小
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取性能警告
   */
  getWarnings(): PerformanceWarning[] {
    return [...this.warnings];
  }

  /**
   * 获取历史记录
   */
  getHistory(): PerformanceHistory[] {
    return [...this.history];
  }

  /**
   * 获取性能统计摘要
   */
  getPerformanceSummary(): {
    averageFps: number;
    averageFrameTime: number;
    totalDrawCalls: number;
    peakMemoryUsage: number;
    warningCount: number;
  } {
    if (this.history.length === 0) {
      return {
        averageFps: 0,
        averageFrameTime: 0,
        totalDrawCalls: 0,
        peakMemoryUsage: 0,
        warningCount: 0
      };
    }

    const recent = this.history.slice(-60); // 最近1秒的数据
    const avgFps = recent.reduce((sum, h) => sum + h.metrics.fps, 0) / recent.length;
    const avgFrameTime = recent.reduce((sum, h) => sum + h.metrics.frameTime, 0) / recent.length;
    const totalDrawCalls = recent.reduce((sum, h) => sum + h.metrics.drawCalls, 0);
    const peakMemoryUsage = Math.max(...this.history.map(h => h.metrics.gpuMemoryUsed));

    return {
      averageFps: avgFps,
      averageFrameTime: avgFrameTime,
      totalDrawCalls: totalDrawCalls,
      peakMemoryUsage: peakMemoryUsage,
      warningCount: this.warnings.length
    };
  }

  /**
   * 生成性能报告
   */
  generatePerformanceReport(): string {
    const summary = this.getPerformanceSummary();
    const criticalWarnings = this.warnings.filter(w => w.level === WarningLevel.CRITICAL);
    const warnings = this.warnings.filter(w => w.level === WarningLevel.WARNING);

    let report = '=== WebGL Performance Report ===\n\n';
    
    report += 'Performance Summary:\n';
    report += `  Average FPS: ${summary.averageFps.toFixed(1)}\n`;
    report += `  Average Frame Time: ${summary.averageFrameTime.toFixed(2)}ms\n`;
    report += `  Total Draw Calls: ${summary.totalDrawCalls}\n`;
    report += `  Peak Memory Usage: ${(summary.peakMemoryUsage / 1024 / 1024).toFixed(1)}MB\n\n`;

    if (criticalWarnings.length > 0) {
      report += 'Critical Issues:\n';
      criticalWarnings.forEach(warning => {
        report += `  🔴 ${warning.message}\n`;
        if (warning.suggestion) {
          report += `     Suggestion: ${warning.suggestion}\n`;
        }
      });
      report += '\n';
    }

    if (warnings.length > 0) {
      report += 'Warnings:\n';
      warnings.forEach(warning => {
        report += `  ⚠️  ${warning.message}\n`;
        if (warning.suggestion) {
          report += `     Suggestion: ${warning.suggestion}\n`;
        }
      });
      report += '\n';
    }

    if (criticalWarnings.length === 0 && warnings.length === 0) {
      report += '✅ No performance issues detected\n';
    }

    return report;
  }

  /**
   * 启用/禁用分析器
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.metrics = this.createEmptyMetrics();
      this.warnings = [];
    }
  }

  /**
   * 重置历史记录
   */
  resetHistory(): void {
    this.history = [];
    this.warnings = [];
  }

  /**
   * 更新基准设置
   */
  updateBenchmark(benchmark: Partial<PerformanceBenchmark>): void {
    this.benchmark = { ...this.benchmark, ...benchmark };
  }

  /**
   * 销毁分析器
   */
  dispose(): void {
    if (this.timerExt && this.gpuTimer) {
      this.timerExt.deleteQueryEXT(this.gpuTimer);
    }
    
    this.history = [];
    this.warnings = [];
  }
}

/**
 * FPS计算器
 */
class FPSCalculator {
  private frames: number[] = [];
  private maxFrames = 60;

  addFrame(timestamp: number): void {
    this.frames.push(timestamp);
    
    if (this.frames.length > this.maxFrames) {
      this.frames.shift();
    }
  }

  getFPS(): number {
    if (this.frames.length < 2) return 0;
    
    const timeSpan = this.frames[this.frames.length - 1] - this.frames[0];
    const frameCount = this.frames.length - 1;
    
    return (frameCount / timeSpan) * 1000;
  }
}

/**
 * 性能监控器 - 提供实时监控界面
 */
export class WebGLPerformanceMonitor {
  private analyzer: WebGLPerformanceAnalyzer;
  private updateInterval: number | null = null;
  private callbacks: Array<(metrics: PerformanceMetrics) => void> = [];

  constructor(analyzer: WebGLPerformanceAnalyzer, updateFrequency = 1000) {
    this.analyzer = analyzer;
    this.startMonitoring(updateFrequency);
  }

  /**
   * 开始监控
   */
  private startMonitoring(frequency: number): void {
    this.updateInterval = window.setInterval(() => {
      const metrics = this.analyzer.getMetrics();
      this.callbacks.forEach(callback => callback(metrics));
    }, frequency);
  }

  /**
   * 添加监控回调
   */
  addCallback(callback: (metrics: PerformanceMetrics) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * 移除监控回调
   */
  removeCallback(callback: (metrics: PerformanceMetrics) => void): void {
    const index = this.callbacks.indexOf(callback);
    if (index !== -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 创建性能调试面板
   */
  createDebugPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 300px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      border-radius: 5px;
      z-index: 10000;
    `;

    const updatePanel = () => {
      const metrics = this.analyzer.getMetrics();
      const warnings = this.analyzer.getWarnings();
      
      panel.innerHTML = `
        <div style="color: #4CAF50; font-weight: bold; margin-bottom: 10px;">
          WebGL Performance Monitor
        </div>
        <div>FPS: ${metrics.fps.toFixed(1)}</div>
        <div>Frame Time: ${metrics.frameTime.toFixed(2)}ms</div>
        <div>Draw Calls: ${metrics.drawCalls}</div>
        <div>Triangles: ${metrics.triangles.toLocaleString()}</div>
        <div>Batches: ${metrics.batchCount}</div>
        <div>GPU Memory: ${(metrics.gpuMemoryUsed / 1024 / 1024).toFixed(1)}MB</div>
        ${warnings.length > 0 ? `
          <div style="color: #ff9800; margin-top: 10px; font-weight: bold;">
            Warnings: ${warnings.length}
          </div>
          ${warnings.slice(0, 3).map(w => `
            <div style="color: ${w.level === 'critical' ? '#f44336' : '#ff9800'};">
              ${w.message}
            </div>
          `).join('')}
        ` : ''}
      `;
    };

    this.addCallback(updatePanel);
    updatePanel();

    return panel;
  }

  /**
   * 停止监控
   */
  dispose(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.callbacks = [];
  }
}