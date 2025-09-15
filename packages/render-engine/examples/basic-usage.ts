/**
 * RenderEngine 基础使用示例
 */

import { RenderEngine, type RenderEngineConfig, type IRenderable } from '../src';

// 示例 1: 最简单的使用 - 自动选择渲染器
function example1() {
  console.log('=== 示例 1: 自动选择渲染器 ===');

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;

  // 最简单的使用方式
  const engine = new RenderEngine(canvas);

  console.log('渲染器类型:', engine.getRendererType());
  console.log('渲染器能力:', engine.getCapabilities());

  // 启动渲染（会自动选择最佳渲染器）
  engine.start();

  // 停止渲染
  engine.stop();

  // 清理资源
  engine.dispose();
}

// 示例 2: 指定 WebGL 渲染器
function example2() {
  console.log('=== 示例 2: 指定 WebGL 渲染器 ===');

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;

  const config: RenderEngineConfig = {
    renderer: 'webgl',
    antialias: true,
    enableBatching: true,
    debug: true
  };

  const engine = new RenderEngine(canvas, config);

  console.log('渲染器类型:', engine.getRendererType());
  console.log('配置:', engine.getConfig());

  engine.start();

  // 清理
  setTimeout(() => {
    engine.dispose();
  }, 1000);
}

// 示例 3: 指定 Canvas2D 渲染器（移动端优化）
function example3() {
  console.log('=== 示例 3: Canvas2D 渲染器 ===');

  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;

  const config: RenderEngineConfig = {
    renderer: 'canvas2d',
    antialias: false,
    targetFPS: 30,
    debug: true
  };

  const engine = new RenderEngine(canvas, config);

  console.log('渲染器类型:', engine.getRendererType());
  console.log('是否运行中:', engine.isRunning());

  engine.start();
  console.log('启动后是否运行中:', engine.isRunning());

  engine.stop();
  console.log('停止后是否运行中:', engine.isRunning());

  engine.dispose();
}

// 示例 4: 添加可渲染对象
function example4() {
  console.log('=== 示例 4: 添加可渲染对象 ===');

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;

  const engine = new RenderEngine(canvas, { debug: true });

  // 创建一个简单的可渲染对象
  const simpleShape: IRenderable = {
    id: 'simple-rectangle',
    visible: true,
    zIndex: 0,

    render(context) {
      // 这里会根据渲染器类型自动适配
      console.log('渲染简单矩形');
    },

    hitTest(point) {
      // 简单的点击测试
      return point.x >= 100 && point.x <= 200 &&
             point.y >= 100 && point.y <= 200;
    },

    getBounds() {
      return {
        x: 100,
        y: 100,
        width: 100,
        height: 100
      };
    }
  };

  // 添加对象
  engine.addRenderable(simpleShape);
  console.log('已添加对象数量:', engine.getRenderables().length);

  // 获取对象
  const retrieved = engine.getRenderable('simple-rectangle');
  console.log('获取的对象:', retrieved?.id);

  // 设置视口
  engine.setViewport({
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
    zoom: 1
  });

  console.log('当前视口:', engine.getViewport());

  // 手动渲染一帧
  engine.render();

  // 移除对象
  engine.removeRenderable('simple-rectangle');
  console.log('移除后对象数量:', engine.getRenderables().length);

  engine.dispose();
}

// 示例 5: 多个对象和 z-index 排序
function example5() {
  console.log('=== 示例 5: 多个对象和排序 ===');

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;

  const engine = new RenderEngine(canvas, {
    renderer: 'canvas2d',  // 使用 Canvas2D 方便调试
    debug: true
  });

  // 创建多个对象
  const objects: IRenderable[] = [
    {
      id: 'background',
      visible: true,
      zIndex: 0,  // 最底层
      render: () => console.log('渲染背景'),
      hitTest: () => false,
      getBounds: () => ({ x: 0, y: 0, width: 800, height: 600 })
    },
    {
      id: 'shape1',
      visible: true,
      zIndex: 10,  // 中间层
      render: () => console.log('渲染形状1'),
      hitTest: () => false,
      getBounds: () => ({ x: 100, y: 100, width: 100, height: 100 })
    },
    {
      id: 'overlay',
      visible: true,
      zIndex: 20,  // 最顶层
      render: () => console.log('渲染覆盖层'),
      hitTest: () => false,
      getBounds: () => ({ x: 0, y: 0, width: 800, height: 100 })
    }
  ];

  // 乱序添加
  engine.addRenderable(objects[1]);  // shape1 先添加
  engine.addRenderable(objects[2]);  // overlay
  engine.addRenderable(objects[0]);  // background 最后添加

  console.log('添加的对象顺序:', engine.getRenderables().map(o => `${o.id}(z:${o.zIndex})`));

  // 手动渲染一帧（会按 z-index 排序）
  console.log('渲染顺序（按z-index排序）:');
  engine.render();

  // 清空所有对象
  engine.clearRenderables();
  console.log('清空后对象数量:', engine.getRenderables().length);

  engine.dispose();
}

// 示例 6: 渲染统计和性能监控
function example6() {
  console.log('=== 示例 6: 渲染统计 ===');

  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;

  const engine = new RenderEngine(canvas, {
    renderer: 'webgl',
    debug: true,
    enableBatching: true
  });

  // 添加一些对象
  for (let i = 0; i < 5; i++) {
    const shape: IRenderable = {
      id: `shape-${i}`,
      visible: true,
      zIndex: i,
      render: () => {},
      hitTest: () => false,
      getBounds: () => ({ x: i * 50, y: i * 50, width: 40, height: 40 })
    };
    engine.addRenderable(shape);
  }

  console.log('渲染器能力:', engine.getCapabilities());
  console.log('初始统计:', engine.getStats());

  // 渲染几帧
  engine.render();
  engine.render();
  engine.render();

  console.log('渲染后统计:', engine.getStats());

  engine.dispose();
}

// 在浏览器环境中运行
if (typeof document !== 'undefined') {
  // 依次运行所有示例
  try {
    example1();
    example2();
    example3();
    example4();
    example5();
    example6();
  } catch (error) {
    console.error('示例运行错误:', error);
  }
} else {
  console.log('这些示例需要在浏览器环境中运行');
}

// 导出示例函数供外部使用
export {
  example1,
  example2,
  example3,
  example4,
  example5,
  example6
};