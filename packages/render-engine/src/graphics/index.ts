/**
 * 框架无关图形模块统一导出
 * 提供图形渲染基础抽象层
 */

// 适配器实现
export * from './adapters'
// 核心接口和类型
export * from './IGraphicsContext'
export * from './RenderCommand'

// 便捷创建函数
import {
  createGraphicsAdapterFactory,
  type GraphicsAdapterType,
  selectBestAdapterType,
} from './adapters'
import type { IGraphicsContext } from './IGraphicsContext'

/**
 * 创建图形上下文
 */
export async function createGraphicsContext<TCanvas>(
  canvas: TCanvas,
  adapterType?: GraphicsAdapterType
): Promise<IGraphicsContext> {
  const selectedAdapterType = adapterType || (await selectBestAdapterType())
  const factory = createGraphicsAdapterFactory(selectedAdapterType)
  return factory.createContext(canvas)
}

/**
 * 检查特定适配器是否支持
 */
export async function isAdapterSupported(adapterType: GraphicsAdapterType): Promise<boolean> {
  try {
    const factory = createGraphicsAdapterFactory(adapterType)
    return factory.isSupported()
  } catch {
    return false
  }
}
