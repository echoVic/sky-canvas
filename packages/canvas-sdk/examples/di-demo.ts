/**
 * Canvas SDK DI 系统演示
 * 展示如何使用新的依赖注入架构
 */

import 'reflect-metadata' // 必须在最顶部引入

import {
  createCanvasSDK,
  createCanvasSDKWithPlugins,
  createCanvasSDKWithServices,
  createDebugCanvasSDK,
  createServiceIdentifier,
  type DICanvasSDK,
  type ICanvasSDKPlugin,
  ILogService,
  IShapeService,
  inject,
  injectable,
  type ServiceCollection,
} from '../src/di'

// ============== 基本使用演示 ==============

async function basicUsageDemo() {
  console.log('=== 基本使用演示 ===')

  // 创建一个虚拟画布用于演示
  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600

  try {
    // 创建 SDK 实例
    const sdk = await createCanvasSDK(canvas, {
      renderEngine: 'webgl',
      enableInteraction: true,
      enableAnimation: true,
      logLevel: 'info',
    })

    // SDK 初始化完成，可以开始使用
    console.log('SDK initialized successfully')

    // 添加形状
    const rect = {
      id: 'rect-1',
      type: 'rectangle',
      position: { x: 100, y: 100 },
      size: { width: 200, height: 100 },
      color: '#007ACC',
      visible: true,
      zIndex: 0,
    }

    sdk.addShape(rect)
    sdk.selectShape('rect-1')

    console.log('Selected shapes:', sdk.getSelectedShapes())
    console.log('All shapes:', sdk.getShapes())

    // 开始渲染
    sdk.startRender()

    console.log('Is rendering:', sdk.isRendering())

    // 清理
    sdk.dispose()
  } catch (error) {
    console.error('Basic usage demo failed:', error)
  }
}

// ============== 调试模式演示 ==============

async function debugModeDemo() {
  console.log('\\n=== 调试模式演示 ===')

  const canvas = document.createElement('canvas')

  try {
    const sdk = await createDebugCanvasSDK(canvas, {
      renderEngine: 'webgl',
      logLevel: 'debug',
    })

    console.log('Debug SDK created successfully')
    console.log('Config:', sdk.getConfig())

    // 获取一些调试信息
    console.log('Render stats:', sdk.getRenderStats())

    sdk.dispose()
  } catch (error) {
    console.error('Debug mode demo failed:', error)
  }
}

// ============== 自定义服务演示 ==============

// 定义自定义服务接口
interface ICustomService {
  performCustomAction(data: unknown): string
}

// 创建服务标识符
const ICustomService = createServiceIdentifier<ICustomService>('customService')

// 实现自定义服务
@injectable
class CustomService implements ICustomService {
  constructor(@inject(ILogService) private logger: ILogService) {}

  performCustomAction(data: unknown): string {
    this.logger.info('Performing custom action with data:', data)
    return `Processed: ${JSON.stringify(data)}`
  }
}

// 自定义形状服务
@injectable
class CustomShapeService implements IShapeService {
  private shapes = new Map<string, Record<string, unknown>>()

  constructor(@inject(ILogService) private logger: ILogService) {}

  addShape(shape: Record<string, unknown>): void {
    // 添加自定义属性
    const enhancedShape = {
      ...shape,
      createdAt: new Date().toISOString(),
      customProperty: 'This shape was created by CustomShapeService',
    }

    this.shapes.set(shape.id, enhancedShape)
    this.logger.info('Custom shape added:', shape.id)
  }

  removeShape(id: string): void {
    const shape = this.shapes.get(id)
    if (shape) {
      this.shapes.delete(id)
      this.logger.info('Custom shape removed:', id)
    }
  }

  getShape(id: string): Record<string, unknown> | undefined {
    return this.shapes.get(id)
  }

  getShapes(): Record<string, unknown>[] {
    return Array.from(this.shapes.values())
  }

  updateShape(id: string, updates: Record<string, unknown>): void {
    const shape = this.shapes.get(id)
    if (shape) {
      Object.assign(shape, updates, { updatedAt: new Date().toISOString() })
      this.logger.info('Custom shape updated:', id)
    }
  }

  clearShapes(): void {
    const _count = this.shapes.size
    this.shapes.clear()
    this.logger.info('All custom shapes cleared')
  }
}

async function customServiceDemo() {
  console.log('\\n=== 自定义服务演示 ===')

  const canvas = document.createElement('canvas')

  try {
    const sdk = await createCanvasSDKWithServices(
      canvas,
      {
        renderEngine: 'webgl',
        logLevel: 'debug',
      },
      (services) => {
        // 注册自定义服务
        services.addSingleton(ICustomService, CustomService)
        // 替换默认的形状服务
        services.addSingleton(IShapeService, CustomShapeService)
      }
    )

    // 添加形状，将使用自定义的形状服务
    const circle = {
      id: 'circle-1',
      type: 'circle',
      position: { x: 200, y: 200 },
      radius: 50,
      color: '#FF6B6B',
    }

    sdk.addShape(circle)

    const shapes = sdk.getShapes()
    console.log('Shapes with custom properties:', shapes)

    // 验证自定义属性
    const retrievedShape = sdk.getShape('circle-1')
    console.log('Custom properties:', {
      createdAt: retrievedShape?.createdAt,
      customProperty: retrievedShape?.customProperty,
    })

    sdk.dispose()
  } catch (error) {
    console.error('Custom service demo failed:', error)
  }
}

// ============== 插件演示 ==============

// 网格服务接口
interface IGridService {
  showGrid(enabled: boolean): void
  setGridSize(size: number): void
  getGridSize(): number
  isGridVisible(): boolean
}

const IGridService = createServiceIdentifier<IGridService>('gridService')

// 网格服务实现
@injectable
class GridService implements IGridService {
  private gridEnabled = false
  private gridSize = 20

  constructor(@inject(ILogService) private logger: ILogService) {}

  showGrid(enabled: boolean): void {
    this.gridEnabled = enabled
    this.logger.info('Grid visibility changed:', enabled)
  }

  setGridSize(size: number): void {
    const oldSize = this.gridSize
    this.gridSize = size
    this.logger.debug('Grid size changed from', oldSize, 'to', size)
  }

  getGridSize(): number {
    return this.gridSize
  }

  isGridVisible(): boolean {
    return this.gridEnabled
  }
}

// 网格插件
class GridPlugin implements ICanvasSDKPlugin {
  name = 'grid'
  version = '1.0.0'

  install(services: ServiceCollection): void {
    services.addSingleton(IGridService, GridService)
    console.log('Grid plugin services installed')
  }

  activate(sdk: DICanvasSDK): void {
    // 设置默认配置
    sdk.setConfigValue('grid.enabled', true)
    sdk.setConfigValue('grid.size', 20)
    sdk.setConfigValue('grid.color', '#E0E0E0')

    console.log('Grid plugin activated')
  }

  deactivate(): void {
    console.log('Grid plugin deactivated')
  }
}

async function pluginDemo() {
  console.log('\\n=== 插件演示 ===')

  const canvas = document.createElement('canvas')

  try {
    const gridPlugin = new GridPlugin()

    const sdk = await createCanvasSDKWithPlugins(
      canvas,
      {
        renderEngine: 'webgl',
        logLevel: 'debug',
      },
      [gridPlugin]
    )

    // 验证插件配置
    console.log('Grid config:', {
      enabled: sdk.getConfigValue('grid.enabled'),
      size: sdk.getConfigValue('grid.size'),
      color: sdk.getConfigValue('grid.color'),
    })

    // 修改配置触发事件
    sdk.setConfigValue('grid.size', 30)

    sdk.dispose()
  } catch (error) {
    console.error('Plugin demo failed:', error)
  }
}

// ============== 复杂依赖演示 ==============

interface IDataProcessor {
  processData(data: unknown): unknown
}

interface IValidator {
  validate(data: unknown): boolean
}

interface IFormatter {
  format(data: unknown): string
}

const IDataProcessor = createServiceIdentifier<IDataProcessor>('dataProcessor')
const IValidator = createServiceIdentifier<IValidator>('validator')
const IFormatter = createServiceIdentifier<IFormatter>('formatter')

@injectable
class Validator implements IValidator {
  constructor(@inject(ILogService) private logger: ILogService) {}

  validate(data: unknown): boolean {
    const isValid = data !== null && data !== undefined
    this.logger.debug('Data validation result:', isValid)
    return isValid
  }
}

@injectable
class Formatter implements IFormatter {
  constructor(@inject(ILogService) private logger: ILogService) {}

  format(data: unknown): string {
    const formatted = JSON.stringify(data, null, 2)
    this.logger.debug('Data formatted:', formatted.length, 'characters')
    return formatted
  }
}

@injectable
class DataProcessor implements IDataProcessor {
  constructor(
    @inject(IValidator) private validator: IValidator,
    @inject(IFormatter) private formatter: IFormatter,
    @inject(ILogService) private logger: ILogService
  ) {}

  processData(data: unknown): unknown {
    this.logger.info('Processing data...')

    if (!this.validator.validate(data)) {
      throw new Error('Data validation failed')
    }

    const processed = {
      original: data,
      processed: true,
      processedAt: new Date().toISOString(),
      formatted: this.formatter.format(data),
    }

    return processed
  }
}

async function complexDependencyDemo() {
  console.log('\\n=== 复杂依赖演示 ===')

  const canvas = document.createElement('canvas')

  try {
    const sdk = await createCanvasSDKWithServices(canvas, { logLevel: 'debug' }, (services) => {
      services.addSingleton(IValidator, Validator)
      services.addSingleton(IFormatter, Formatter)
      services.addSingleton(IDataProcessor, DataProcessor)
    })

    // 数据处理完成
    console.log('Data processing service registered')

    sdk.dispose()
  } catch (error) {
    console.error('Complex dependency demo failed:', error)
  }
}

// ============== 运行所有演示 ==============

export async function runAllDemos() {
  console.log('🚀 Canvas SDK DI 系统演示开始\\n')

  try {
    await basicUsageDemo()
    await debugModeDemo()
    await customServiceDemo()
    await pluginDemo()
    await complexDependencyDemo()

    console.log('\\n✅ 所有演示完成！')
  } catch (error) {
    console.error('❌ 演示过程中发生错误:', error)
  }
}

// 如果直接运行此文件
if (typeof window !== 'undefined') {
  // 浏览器环境
  document.addEventListener('DOMContentLoaded', () => {
    runAllDemos()
  })
} else if (typeof module !== 'undefined' && module.exports) {
  // Node.js 环境
  runAllDemos()
}
