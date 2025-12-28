/**
 * 渲染优化类型定义
 */

/**
 * 优化状态
 */
export enum OptimizationState {
  DISABLED = 'disabled',
  INITIALIZING = 'initializing',
  ACTIVE = 'active',
  OPTIMIZING = 'optimizing',
  ERROR = 'error'
}

/**
 * 系统状态
 */
export interface SystemStatus {
  name: string;
  state: OptimizationState;
  lastUpdate: number;
  errorCount: number;
  performance: {
    averageTime: number;
    maxTime: number;
    minTime: number;
  };
}

/**
 * 优化指标
 */
export interface OptimizationMetrics {
  frameRate: {
    current: number;
    average: number;
    target: number;
    stability: number;
  };
  memory: {
    used: number;
    budget: number;
    efficiency: number;
  };
  rendering: {
    drawCalls: number;
    triangles: number;
    batches: number;
    culledObjects: number;
  };
  cache: {
    hitRate: number;
    size: number;
    efficiency: number;
  };
  gpu: {
    utilization: number;
    memoryUsage: number;
    bandwidth: number;
  };
}

/**
 * 优化建议
 */
export interface OptimizationRecommendation {
  type: 'performance' | 'memory' | 'quality' | 'stability';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  action: string;
  estimatedImpact: number;
  autoApplicable: boolean;
}

/**
 * 优化事件监听器
 */
export interface OptimizationListeners {
  onStateChange: Array<(state: OptimizationState) => void>;
  onMetricsUpdate: Array<(metrics: OptimizationMetrics) => void>;
  onRecommendation: Array<(recommendations: OptimizationRecommendation[]) => void>;
}

/**
 * 创建初始优化指标
 */
export function createInitialMetrics(): OptimizationMetrics {
  return {
    frameRate: { current: 0, average: 0, target: 60, stability: 0 },
    memory: { used: 0, budget: 0, efficiency: 0 },
    rendering: { drawCalls: 0, triangles: 0, batches: 0, culledObjects: 0 },
    cache: { hitRate: 0, size: 0, efficiency: 0 },
    gpu: { utilization: 0, memoryUsage: 0, bandwidth: 0 }
  };
}

/**
 * 创建初始监听器
 */
export function createInitialListeners(): OptimizationListeners {
  return {
    onStateChange: [],
    onMetricsUpdate: [],
    onRecommendation: []
  };
}
