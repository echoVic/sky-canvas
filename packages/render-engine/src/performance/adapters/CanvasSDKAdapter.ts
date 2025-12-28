/**
 * Canvas SDK 性能数据适配器
 * 从Canvas SDK收集性能指标
 */

import { 
  IDataSourceAdapter, 
  DataSourceType, 
  UnifiedMetricType 
} from '../UnifiedPerformanceMonitor';

// 类型定义 - 避免直接依赖Canvas SDK
interface PluginPerformanceMetrics {
  pluginId: string;
  loadTime: number;
  activateTime: number;
  memoryUsage: number;
  apiCallCount: number;
  errorCount: number;
  lastActivity: number;
}

interface PluginPerformanceMonitor {
  getAllMetrics(): PluginPerformanceMetrics[];
  getSystemMetrics(): {
    totalPlugins: number;
    activePlugins: number;
    totalMemoryUsage: number;
    averageLoadTime: number;
    averageActivateTime: number;
    totalApiCalls: number;
    totalErrors: number;
  };
}

interface InteractionMetrics {
  inputLatency: number;
  eventProcessingTime: number;
  gestureRecognitionTime: number;
  collisionDetectionTime: number;
  selectionTime: number;
}

interface CanvasSDKPerformanceProvider {
  pluginPerformanceMonitor?: PluginPerformanceMonitor;
  interactionMetrics?: InteractionMetrics;
  getCanvasMetrics?(): {
    shapeCount: number;
    selectedCount: number;
    visibleShapeCount: number;
    memoryUsage: number;
    cacheHitRate: number;
    updateTime: number;
  };
}

export class CanvasSDKAdapter implements IDataSourceAdapter {
  readonly sourceType = DataSourceType.CANVAS_SDK;
  readonly supportedMetrics = [
    UnifiedMetricType.UPDATE_TIME,
    UnifiedMetricType.MEMORY_USAGE,
    UnifiedMetricType.CACHE_HIT_RATE,
    UnifiedMetricType.PLUGIN_LOAD_TIME,
    UnifiedMetricType.PLUGIN_ACTIVATE_TIME,
    UnifiedMetricType.PLUGIN_API_CALLS,
    UnifiedMetricType.PLUGIN_ERRORS,
    UnifiedMetricType.INPUT_LATENCY,
    UnifiedMetricType.EVENT_PROCESSING_TIME,
    UnifiedMetricType.GESTURE_RECOGNITION_TIME
  ];
  
  private performanceProvider: CanvasSDKPerformanceProvider | null = null;
  private lastUpdateTime = 0;
  private updateFrameCount = 0;
  private frameTimeSum = 0;
  
  constructor(performanceProvider?: CanvasSDKPerformanceProvider) {
    this.performanceProvider = performanceProvider || null;
  }
  
  /**
   * 设置性能数据提供者
   */
  setPerformanceProvider(provider: CanvasSDKPerformanceProvider): void {
    this.performanceProvider = provider;
  }
  
  async initialize(): Promise<void> {
    // 初始化时间记录
    this.lastUpdateTime = performance.now();
    
    // 如果没有提供性能数据源，尝试从全局获取
    if (!this.performanceProvider) {
      this.tryGetGlobalProvider();
    }
  }
  
  async collect(): Promise<Map<UnifiedMetricType, number>> {
    const metrics = new Map<UnifiedMetricType, number>();
    
    // 收集基础Canvas指标
    const canvasMetrics = await this.collectCanvasMetrics();
    canvasMetrics.forEach((value, key) => {
      metrics.set(key, value);
    });
    
    // 收集插件性能指标
    const pluginMetrics = await this.collectPluginMetrics();
    pluginMetrics.forEach((value, key) => {
      metrics.set(key, value);
    });
    
    // 收集交互性能指标
    const interactionMetrics = await this.collectInteractionMetrics();
    interactionMetrics.forEach((value, key) => {
      metrics.set(key, value);
    });
    
    return metrics;
  }
  
  private async collectCanvasMetrics(): Promise<Map<UnifiedMetricType, number>> {
    const metrics = new Map<UnifiedMetricType, number>();
    
    if (!this.performanceProvider?.getCanvasMetrics) {
      return metrics;
    }
    
    try {
      const canvasMetrics = this.performanceProvider.getCanvasMetrics();
      
      // 记录更新时间
      this.mapMetric(metrics, UnifiedMetricType.UPDATE_TIME, canvasMetrics.updateTime);
      
      // 记录内存使用
      this.mapMetric(metrics, UnifiedMetricType.MEMORY_USAGE, canvasMetrics.memoryUsage);
      
      // 记录缓存命中率
      this.mapMetric(metrics, UnifiedMetricType.CACHE_HIT_RATE, canvasMetrics.cacheHitRate);
      
      // 计算平均更新时间
      const now = performance.now();
      if (this.lastUpdateTime > 0) {
        const frameTime = now - this.lastUpdateTime;
        this.frameTimeSum += frameTime;
        this.updateFrameCount++;
        
        if (this.updateFrameCount >= 60) {
          const avgUpdateTime = this.frameTimeSum / this.updateFrameCount;
          metrics.set(UnifiedMetricType.UPDATE_TIME, avgUpdateTime);
          
          // 重置计数器
          this.frameTimeSum = 0;
          this.updateFrameCount = 0;
        }
      }
      this.lastUpdateTime = now;
      
    } catch (error) {
      console.warn('Failed to collect canvas metrics:', error);
    }
    
    return metrics;
  }
  
  private async collectPluginMetrics(): Promise<Map<UnifiedMetricType, number>> {
    const metrics = new Map<UnifiedMetricType, number>();
    
    if (!this.performanceProvider?.pluginPerformanceMonitor) {
      return metrics;
    }
    
    try {
      const pluginMonitor = this.performanceProvider.pluginPerformanceMonitor;
      
      // 收集系统级插件指标
      const systemMetrics = pluginMonitor.getSystemMetrics();
      this.mapMetric(metrics, UnifiedMetricType.PLUGIN_LOAD_TIME, systemMetrics.averageLoadTime);
      this.mapMetric(metrics, UnifiedMetricType.PLUGIN_ACTIVATE_TIME, systemMetrics.averageActivateTime);
      this.mapMetric(metrics, UnifiedMetricType.PLUGIN_API_CALLS, systemMetrics.totalApiCalls);
      this.mapMetric(metrics, UnifiedMetricType.PLUGIN_ERRORS, systemMetrics.totalErrors);
      
      // 收集详细插件指标
      const allPluginMetrics = pluginMonitor.getAllMetrics();
      
      if (allPluginMetrics.length > 0) {
        // 计算最大加载时间（瓶颈插件）
        const maxLoadTime = Math.max(...allPluginMetrics.map(m => m.loadTime));
        metrics.set(UnifiedMetricType.PLUGIN_LOAD_TIME, maxLoadTime);
        
        // 计算最大激活时间
        const maxActivateTime = Math.max(...allPluginMetrics.map(m => m.activateTime));
        metrics.set(UnifiedMetricType.PLUGIN_ACTIVATE_TIME, maxActivateTime);
        
        // 计算总内存使用
        const totalPluginMemory = allPluginMetrics.reduce((sum, m) => sum + m.memoryUsage, 0);
        const currentMemory = metrics.get(UnifiedMetricType.MEMORY_USAGE) || 0;
        metrics.set(UnifiedMetricType.MEMORY_USAGE, currentMemory + totalPluginMemory);
        
        // 计算活跃插件的平均API调用频率
        const now = Date.now();
        const activePlugins = allPluginMetrics.filter(m => now - m.lastActivity < 30000); // 30秒内活跃
        if (activePlugins.length > 0) {
          const avgApiCalls = activePlugins.reduce((sum, m) => sum + m.apiCallCount, 0) / activePlugins.length;
          metrics.set(UnifiedMetricType.PLUGIN_API_CALLS, avgApiCalls);
        }
      }
      
    } catch (error) {
      console.warn('Failed to collect plugin metrics:', error);
    }
    
    return metrics;
  }
  
  private async collectInteractionMetrics(): Promise<Map<UnifiedMetricType, number>> {
    const metrics = new Map<UnifiedMetricType, number>();
    
    if (!this.performanceProvider?.interactionMetrics) {
      return metrics;
    }
    
    try {
      const interactionMetrics = this.performanceProvider.interactionMetrics;
      
      this.mapMetric(metrics, UnifiedMetricType.INPUT_LATENCY, interactionMetrics.inputLatency);
      this.mapMetric(metrics, UnifiedMetricType.EVENT_PROCESSING_TIME, interactionMetrics.eventProcessingTime);
      this.mapMetric(metrics, UnifiedMetricType.GESTURE_RECOGNITION_TIME, interactionMetrics.gestureRecognitionTime);
      
    } catch (error) {
      console.warn('Failed to collect interaction metrics:', error);
    }
    
    return metrics;
  }
  
  private mapMetric(
    metrics: Map<UnifiedMetricType, number>, 
    type: UnifiedMetricType, 
    value: number | undefined
  ): void {
    if (value !== undefined && !isNaN(value) && isFinite(value)) {
      metrics.set(type, value);
    }
  }
  
  private tryGetGlobalProvider(): void {
    // 尝试从全局对象获取性能数据提供者
    if (typeof window !== 'undefined') {
      const globalProvider = (window as any).canvasSDKPerformanceProvider;
      if (globalProvider) {
        this.performanceProvider = globalProvider;
      }
    }
  }
  
  dispose(): void {
    this.performanceProvider = null;
    this.lastUpdateTime = 0;
    this.updateFrameCount = 0;
    this.frameTimeSum = 0;
  }
}

/**
 * Canvas SDK 性能监控辅助类
 * 用于在Canvas SDK中收集和提供性能数据
 */
export class CanvasSDKPerformanceHelper {
  private metrics: InteractionMetrics = {
    inputLatency: 0,
    eventProcessingTime: 0,
    gestureRecognitionTime: 0,
    collisionDetectionTime: 0,
    selectionTime: 0
  };
  
  private canvasMetrics = {
    shapeCount: 0,
    selectedCount: 0,
    visibleShapeCount: 0,
    memoryUsage: 0,
    cacheHitRate: 0,
    updateTime: 0
  };
  
  private inputStartTime = 0;
  private eventStartTime = 0;
  private gestureStartTime = 0;
  
  /**
   * 记录输入开始
   */
  recordInputStart(): void {
    this.inputStartTime = performance.now();
  }
  
  /**
   * 记录输入结束
   */
  recordInputEnd(): void {
    if (this.inputStartTime > 0) {
      this.metrics.inputLatency = performance.now() - this.inputStartTime;
      this.inputStartTime = 0;
    }
  }
  
  /**
   * 记录事件处理开始
   */
  recordEventProcessingStart(): void {
    this.eventStartTime = performance.now();
  }
  
  /**
   * 记录事件处理结束
   */
  recordEventProcessingEnd(): void {
    if (this.eventStartTime > 0) {
      this.metrics.eventProcessingTime = performance.now() - this.eventStartTime;
      this.eventStartTime = 0;
    }
  }
  
  /**
   * 记录手势识别开始
   */
  recordGestureRecognitionStart(): void {
    this.gestureStartTime = performance.now();
  }
  
  /**
   * 记录手势识别结束
   */
  recordGestureRecognitionEnd(): void {
    if (this.gestureStartTime > 0) {
      this.metrics.gestureRecognitionTime = performance.now() - this.gestureStartTime;
      this.gestureStartTime = 0;
    }
  }
  
  /**
   * 更新Canvas指标
   */
  updateCanvasMetrics(metrics: Partial<typeof this.canvasMetrics>): void {
    Object.assign(this.canvasMetrics, metrics);
  }
  
  /**
   * 获取性能数据提供者
   */
  getPerformanceProvider(): CanvasSDKPerformanceProvider {
    return {
      interactionMetrics: { ...this.metrics },
      getCanvasMetrics: () => ({ ...this.canvasMetrics })
    };
  }
  
  /**
   * 创建性能装饰器
   */
  createPerformanceDecorator(metricType: keyof InteractionMetrics) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
      const originalMethod = descriptor.value;
      
      descriptor.value = function (...args: any[]) {
        const startTime = performance.now();
        const result = originalMethod.apply(this, args);
        const endTime = performance.now();
        
        // 更新性能指标
        if ((this as any).performanceHelper instanceof CanvasSDKPerformanceHelper) {
          (this as any).performanceHelper.metrics[metricType] = endTime - startTime;
        }
        
        return result;
      };
      
      return descriptor;
    };
  }
}