/**
 * Render Engine 性能数据适配器
 * 从渲染引擎收集性能指标
 */

import { 
  IDataSourceAdapter, 
  DataSourceType, 
  UnifiedMetricType 
} from '../UnifiedPerformanceMonitor';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { PerformanceMonitorSystem } from '../../core/systems/PerformanceMonitorSystem';

export class RenderEngineAdapter implements IDataSourceAdapter {
  readonly sourceType = DataSourceType.RENDER_ENGINE;
  readonly supportedMetrics = [
    UnifiedMetricType.FPS,
    UnifiedMetricType.FRAME_TIME,
    UnifiedMetricType.RENDER_TIME,
    UnifiedMetricType.DRAW_CALLS,
    UnifiedMetricType.VERTICES,
    UnifiedMetricType.TRIANGLES,
    UnifiedMetricType.BATCH_COUNT,
    UnifiedMetricType.GPU_MEMORY,
    UnifiedMetricType.SHADER_COMPILE_TIME,
    UnifiedMetricType.TEXTURE_MEMORY,
    UnifiedMetricType.BUFFER_MEMORY,
    UnifiedMetricType.CULLED_OBJECTS,
    UnifiedMetricType.CACHE_HIT_RATE,
    UnifiedMetricType.LOD_SWITCHES
  ];
  
  private performanceMonitor: PerformanceMonitor | null = null;
  private performanceMonitorSystem: PerformanceMonitorSystem | null = null;
  private gl: WebGLRenderingContext | null = null;
  
  constructor(
    performanceMonitor?: PerformanceMonitor,
    performanceMonitorSystem?: PerformanceMonitorSystem,
    gl?: WebGLRenderingContext
  ) {
    this.performanceMonitor = performanceMonitor || null;
    this.performanceMonitorSystem = performanceMonitorSystem || null;
    this.gl = gl || null;
  }
  
  async initialize(): Promise<void> {
    // 如果没有提供性能监控器，尝试创建一个
    if (!this.performanceMonitor && this.gl) {
      this.performanceMonitor = new PerformanceMonitor(this.gl, {
        enableGPUQueries: true,
        enableMemoryProfiler: true
      });
    }
  }
  
  async collect(): Promise<Map<UnifiedMetricType, number>> {
    const metrics = new Map<UnifiedMetricType, number>();
    
    // 从 PerformanceMonitor 收集数据
    if (this.performanceMonitor) {
      const currentMetrics = this.performanceMonitor.getCurrentMetrics();
      
      this.mapMetric(metrics, UnifiedMetricType.FPS, currentMetrics.fps);
      this.mapMetric(metrics, UnifiedMetricType.FRAME_TIME, currentMetrics.frameTime);
      this.mapMetric(metrics, UnifiedMetricType.DRAW_CALLS, currentMetrics.drawCalls);
      this.mapMetric(metrics, UnifiedMetricType.VERTICES, currentMetrics.vertices);
      this.mapMetric(metrics, UnifiedMetricType.TRIANGLES, currentMetrics.triangles);
      this.mapMetric(metrics, UnifiedMetricType.GPU_MEMORY, currentMetrics.gpuMemory);
      this.mapMetric(metrics, UnifiedMetricType.TEXTURE_MEMORY, currentMetrics.textureMemory);
      this.mapMetric(metrics, UnifiedMetricType.BUFFER_MEMORY, currentMetrics.bufferMemory);
      this.mapMetric(metrics, UnifiedMetricType.SHADER_COMPILE_TIME, currentMetrics.shaderCompileTime);
    }
    
    // 从 PerformanceMonitorSystem 收集数据
    if (this.performanceMonitorSystem) {
      const systemMetrics = this.performanceMonitorSystem.getMetrics();
      
      this.mapMetric(metrics, UnifiedMetricType.FPS, systemMetrics.fps);
      this.mapMetric(metrics, UnifiedMetricType.FRAME_TIME, systemMetrics.frameTime);
      this.mapMetric(metrics, UnifiedMetricType.RENDER_TIME, systemMetrics.renderTime);
      this.mapMetric(metrics, UnifiedMetricType.DRAW_CALLS, systemMetrics.drawCalls);
      this.mapMetric(metrics, UnifiedMetricType.TRIANGLES, systemMetrics.triangles);
      this.mapMetric(metrics, UnifiedMetricType.BATCH_COUNT, systemMetrics.batchCount);
      this.mapMetric(metrics, UnifiedMetricType.CULLED_OBJECTS, systemMetrics.culledObjects);
      this.mapMetric(metrics, UnifiedMetricType.CACHE_HIT_RATE, systemMetrics.cacheHitRate);
      this.mapMetric(metrics, UnifiedMetricType.LOD_SWITCHES, systemMetrics.lodSwitches);
      this.mapMetric(metrics, UnifiedMetricType.GPU_MEMORY, systemMetrics.gpuMemoryUsage);
    }
    
    // 收集WebGL上下文信息
    if (this.gl) {
      const webGLMetrics = await this.collectWebGLMetrics();
      webGLMetrics.forEach((value, key) => {
        metrics.set(key, value);
      });
    }
    
    // 收集内存信息
    const memoryMetrics = this.collectMemoryMetrics();
    memoryMetrics.forEach((value, key) => {
      metrics.set(key, value);
    });
    
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
  
  private async collectWebGLMetrics(): Promise<Map<UnifiedMetricType, number>> {
    const metrics = new Map<UnifiedMetricType, number>();
    
    if (!this.gl) return metrics;
    
    try {
      // 获取WebGL扩展信息
      const memoryInfo = this.gl.getExtension('WEBGL_debug_renderer_info');
      if (memoryInfo) {
        const renderer = this.gl.getParameter(memoryInfo.UNMASKED_RENDERER_WEBGL);
        // 根据渲染器信息推断GPU内存（简化实现）
        if (typeof renderer === 'string') {
          const gpuMemory = this.estimateGPUMemory(renderer);
          metrics.set(UnifiedMetricType.GPU_MEMORY, gpuMemory);
        }
      }
      
      // 获取纹理内存使用
      const textureUnits = this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS);
      const maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
      
      // 估算纹理内存使用（简化实现）
      const estimatedTextureMemory = Math.min(
        textureUnits * maxTextureSize * maxTextureSize * 4, // 假设RGBA格式
        64 * 1024 * 1024 // 最大64MB
      );
      metrics.set(UnifiedMetricType.TEXTURE_MEMORY, estimatedTextureMemory);
      
      // 获取顶点缓冲区信息
      const maxVertexAttribs = this.gl.getParameter(this.gl.MAX_VERTEX_ATTRIBS);
      const maxVertexUniformVectors = this.gl.getParameter(this.gl.MAX_VERTEX_UNIFORM_VECTORS);
      
      // 估算缓冲区内存（简化实现）
      const estimatedBufferMemory = (maxVertexAttribs * maxVertexUniformVectors) * 16; // 假设每个uniform 16字节
      metrics.set(UnifiedMetricType.BUFFER_MEMORY, estimatedBufferMemory);
      
    } catch (error) {
      console.warn('Failed to collect WebGL metrics:', error);
    }
    
    return metrics;
  }
  
  private collectMemoryMetrics(): Map<UnifiedMetricType, number> {
    const metrics = new Map<UnifiedMetricType, number>();
    
    // 收集JavaScript内存使用
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory && memory.usedJSHeapSize) {
        metrics.set(UnifiedMetricType.MEMORY_USAGE, memory.usedJSHeapSize);
      }
    }
    
    return metrics;
  }
  
  private estimateGPUMemory(renderer: string): number {
    // 根据GPU型号估算显存（简化实现）
    const gpuMemoryMap: Record<string, number> = {
      'gtx': 8 * 1024 * 1024 * 1024,      // 8GB
      'rtx': 12 * 1024 * 1024 * 1024,     // 12GB
      'radeon': 16 * 1024 * 1024 * 1024,  // 16GB
      'intel': 2 * 1024 * 1024 * 1024,    // 2GB (集成显卡)
      'apple': 8 * 1024 * 1024 * 1024,    // 8GB
      'mali': 4 * 1024 * 1024 * 1024,     // 4GB
      'adreno': 6 * 1024 * 1024 * 1024,   // 6GB
    };
    
    const rendererLower = renderer.toLowerCase();
    
    for (const [key, memory] of Object.entries(gpuMemoryMap)) {
      if (rendererLower.includes(key)) {
        return memory;
      }
    }
    
    // 默认返回4GB
    return 4 * 1024 * 1024 * 1024;
  }
  
  dispose(): void {
    // 清理资源
    if (this.performanceMonitor) {
      this.performanceMonitor.dispose();
      this.performanceMonitor = null;
    }
    
    if (this.performanceMonitorSystem) {
      this.performanceMonitorSystem.dispose();
      this.performanceMonitorSystem = null;
    }
    
    this.gl = null;
  }
}