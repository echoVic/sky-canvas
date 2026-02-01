/**
 * RenderEngine 基础使用示例
 */

import {
  Canvas2DContextFactory,
  type IRenderable,
  type IRenderEngineConfig,
  RenderEngine,
} from '../src'

// 示例 1: 最简单的使用 - Canvas2D 渲染器
async function example1() {
  console.log('=== 示例 1: Canvas2D 渲染器 ===')

  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600

  const engine = new RenderEngine()
  const factory = new Canvas2DContextFactory()
  await engine.initialize(factory, canvas)

  console.log('上下文:', engine.getContext())
  console.log('视口:', engine.getViewport())

  engine.start()

  engine.stop()

  engine.dispose()
}

// 示例 2: 指定 WebGL 渲染器
async function example2() {
  console.log('=== 示例 2: 指定 WebGL 渲染器 ===')

  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600

  const config: IRenderEngineConfig = {
    targetFPS: 60,
    enableVSync: true,
    enableCulling: true,
  }

  const engine = new RenderEngine(config)

  const { WebGLContextFactory } = await import('../src/adapters/WebGLContext')
  const factory = new WebGLContextFactory()
  await engine.initialize(factory, canvas)

  console.log('上下文:', engine.getContext())
  console.log('视口:', engine.getViewport())

  engine.start()

  setTimeout(() => {
    engine.dispose()
  }, 1000)
}

// 示例 3: Canvas2D 渲染器配置
async function example3() {
  console.log('=== 示例 3: Canvas2D 渲染器配置 ===')

  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 300

  const config: IRenderEngineConfig = {
    targetFPS: 30,
    enableVSync: false,
  }

  const engine = new RenderEngine(config)
  const factory = new Canvas2DContextFactory()
  await engine.initialize(factory, canvas)

  console.log('是否运行中:', engine.isRunning())

  engine.start()
  console.log('启动后是否运行中:', engine.isRunning())

  engine.stop()
  console.log('停止后是否运行中:', engine.isRunning())

  engine.dispose()
}

// 示例 4: 添加可渲染对象
async function example4() {
  console.log('=== 示例 4: 添加可渲染对象 ===')

  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600

  const engine = new RenderEngine()
  const factory = new Canvas2DContextFactory()
  await engine.initialize(factory, canvas)

  const layer = engine.createLayer('main', 0)

  const simpleShape: IRenderable = {
    id: 'simple-rectangle',
    get bounds() {
      return {
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      }
    },
    visible: true,
    zIndex: 0,

    render(context) {
      console.log('渲染简单矩形')
    },

    hitTest(point) {
      return point.x >= 100 && point.x <= 200 && point.y >= 100 && point.y <= 200
    },

    getBounds() {
      return {
        x: 100,
        y: 100,
        width: 100,
        height: 100,
      }
    },

    dispose() {},
  }

  layer.addRenderable(simpleShape)
  console.log('已添加对象数量:', layer.getRenderables().length)

  engine.setViewport({
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
    zoom: 1,
  })

  console.log('当前视口:', engine.getViewport())

  engine.render()

  layer.removeRenderable('simple-rectangle')
  console.log('移除后对象数量:', layer.getRenderables().length)

  engine.dispose()
}

// 示例 5: 多个对象和 z-index 排序
async function example5() {
  console.log('=== 示例 5: 多个对象和排序 ===')

  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600

  const engine = new RenderEngine()
  const factory = new Canvas2DContextFactory()
  await engine.initialize(factory, canvas)

  const layer = engine.createLayer('main', 0)

  const objects: IRenderable[] = [
    {
      id: 'background',
      get bounds() {
        return { x: 0, y: 0, width: 800, height: 600 }
      },
      visible: true,
      zIndex: 0,
      render: () => console.log('渲染背景'),
      hitTest: () => false,
      getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 }),
      dispose: () => {},
    },
    {
      id: 'shape1',
      get bounds() {
        return { x: 100, y: 100, width: 100, height: 100 }
      },
      visible: true,
      zIndex: 10,
      render: () => console.log('渲染形状1'),
      hitTest: () => false,
      getBounds: () => ({ x: 100, y: 100, width: 100, height: 100 }),
      dispose: () => {},
    },
    {
      id: 'overlay',
      get bounds() {
        return { x: 0, y: 0, width: 800, height: 100 }
      },
      visible: true,
      zIndex: 20,
      render: () => console.log('渲染覆盖层'),
      hitTest: () => false,
      getBounds: () => ({ x: 0, y: 0, width: 800, height: 100 }),
      dispose: () => {},
    },
  ]

  layer.addRenderable(objects[1])
  layer.addRenderable(objects[2])
  layer.addRenderable(objects[0])

  console.log(
    '添加的对象顺序:',
    layer.getRenderables().map((o) => `${o.id}(z:${o.zIndex})`)
  )

  console.log('渲染顺序（按z-index排序）:')
  engine.render()

  layer.clear()
  console.log('清空后对象数量:', layer.getRenderables().length)

  engine.dispose()
}

// 示例 6: 渲染统计和性能监控
async function example6() {
  console.log('=== 示例 6: 渲染统计 ===')

  const canvas = document.createElement('canvas')
  canvas.width = 800
  canvas.height = 600

  const engine = new RenderEngine({
    targetFPS: 60,
    enableCulling: true,
  })

  const factory = new Canvas2DContextFactory()
  await engine.initialize(factory, canvas)

  const layer = engine.createLayer('main', 0)

  for (let i = 0; i < 5; i++) {
    const shape: IRenderable = {
      id: `shape-${i}`,
      get bounds() {
        return { x: i * 50, y: i * 50, width: 40, height: 40 }
      },
      visible: true,
      zIndex: i,
      render: () => {},
      hitTest: () => false,
      getBounds: () => ({ x: i * 50, y: i * 50, width: 40, height: 40 }),
      dispose: () => {},
    }
    layer.addRenderable(shape)
  }

  console.log('初始统计:', engine.getStats())

  engine.render()
  engine.render()
  engine.render()

  console.log('渲染后统计:', engine.getStats())

  engine.dispose()
}

// 在浏览器环境中运行
if (typeof document !== 'undefined') {
  ;(async () => {
    try {
      await example1()
      await example2()
      await example3()
      await example4()
      await example5()
      await example6()
    } catch (error) {
      console.error('示例运行错误:', error)
    }
  })()
} else {
  console.log('这些示例需要在浏览器环境中运行')
}

// 导出示例函数供外部使用
export { example1, example2, example3, example4, example5, example6 }
