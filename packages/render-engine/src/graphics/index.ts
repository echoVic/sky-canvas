/**
 * 框架无关图形模块统一导出
 * 提供完整的图形渲染抽象层
 */

// 核心接口和类型
export * from './IGraphicsContext';
export * from './RenderCommand';
export * from './FrameworkAgnosticRenderEngine';

// 适配器实现
export * from './adapters';

// 便捷创建函数
import { FrameworkAgnosticRenderEngine } from './FrameworkAgnosticRenderEngine';
import { GraphicsAdapterType, createGraphicsAdapterFactory, selectBestAdapterType } from './adapters';
import { IGraphicsContext } from './IGraphicsContext';

/**
 * 渲染引擎配置选项
 */
export interface RenderEngineOptions<TCanvas = unknown> {
  /** 适配器类型，如果不指定则自动选择最佳适配器 */
  adapterType?: GraphicsAdapterType;
  /** 画布元素或其他渲染目标 */
  canvas: TCanvas;
  /** 是否启用自动渲染循环 */
  autoRender?: boolean;
  /** 目标帧率 */
  targetFPS?: number;
}

/**
 * 创建框架无关的渲染引擎
 */
export async function createRenderEngine<TCanvas = unknown>(options: RenderEngineOptions<TCanvas>): Promise<FrameworkAgnosticRenderEngine> {
  const {
    canvas,
    adapterType,
    autoRender = true,
    targetFPS = 60
  } = options;

  // 选择适配器类型
  const selectedAdapterType = adapterType || await selectBestAdapterType();
  
  // 创建图形上下文工厂
  const contextFactory = createGraphicsAdapterFactory(selectedAdapterType);
  
  // 创建渲染引擎配置
  const engineConfig = {
    targetFPS,
    enableVSync: true,
    enableBatching: true,
    enableCulling: true,
    maxBatchSize: 1000,
    cullMargin: 50
  };
  
  // 创建渲染引擎
  const engine = new FrameworkAgnosticRenderEngine(engineConfig);
  
  // 初始化引擎
  await engine.initialize(contextFactory, canvas);
  
  // 启动自动渲染
  if (autoRender) {
    engine.start();
  }
  
  return engine;
}

/**
 * 创建图形上下文
 */
export async function createGraphicsContext<TCanvas>(
  canvas: TCanvas,
  adapterType?: GraphicsAdapterType
): Promise<IGraphicsContext> {
  const selectedAdapterType = adapterType || await selectBestAdapterType();
  const factory = createGraphicsAdapterFactory(selectedAdapterType);
  return factory.createContext(canvas);
}

/**
 * 检查特定适配器是否支持
 */
export async function isAdapterSupported(adapterType: GraphicsAdapterType): Promise<boolean> {
  try {
    const factory = createGraphicsAdapterFactory(adapterType);
    return factory.isSupported();
  } catch {
    return false;
  }
}