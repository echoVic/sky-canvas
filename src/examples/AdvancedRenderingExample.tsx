import React, { useEffect, useRef, useState } from 'react';
import { RenderEngine } from '../engine/RenderEngine';
import { RendererFactory } from '../engine/renderers';
import { Transform } from '../engine/math';
import { Circle, Rectangle, Shape } from '../engine/core/shapes';

interface RendererInfo {
  name: string;
  type: string;
  supported: boolean;
}

export const AdvancedRenderingExample: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderEngine, setRenderEngine] = useState<RenderEngine | null>(null);
  const [currentRenderer, setCurrentRenderer] = useState<string>('canvas2d');
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{
    fps: number;
    capabilities: {
      supportsTransforms: boolean;
      supportsFilters: boolean;
      supportsBlending: boolean;
      maxTextureSize: number;
    };
    rendererType: string;
  } | null>(null);

  // 检查渲染器支持情况
  const renderers: RendererInfo[] = [
    {
      name: 'Canvas 2D',
      type: 'canvas2d',
      supported: RendererFactory.isRendererSupported('canvas2d')
    },
    {
      name: 'WebGL',
      type: 'webgl',
      supported: RendererFactory.isRendererSupported('webgl')
    },
    {
      name: 'WebGL 2',
      type: 'webgl2',
      supported: RendererFactory.isRendererSupported('webgl2')
    },
    {
      name: 'WebGPU',
      type: 'webgpu',
      supported: RendererFactory.isRendererSupported('webgpu')
    }
  ];

  // 初始化渲染引擎
  const initializeRenderer = async (rendererType: string) => {
    if (!canvasRef.current) return;

    try {
      setError(null);
      setIsInitialized(false);

      // 清理旧的渲染引擎
      if (renderEngine) {
        renderEngine.dispose();
      }

      // 创建新的渲染引擎
      const engine = new RenderEngine(rendererType);
      await engine.initialize(canvasRef.current);

      // 创建示例场景
      createExampleScene(engine);

      setRenderEngine(engine);
      setCurrentRenderer(rendererType);
      setIsInitialized(true);

      // 开始渲染循环
      engine.start();

      // 更新统计信息
      const updateStats = () => {
        if (engine) {
          const capabilities = engine.getCapabilities();
          const fps = engine.getCurrentFPS();
          setStats({
            fps,
            capabilities,
            rendererType
          });
        }
      };

      const statsInterval = setInterval(updateStats, 1000);
      return () => clearInterval(statsInterval);

    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化失败');
      console.error('渲染器初始化失败:', err);
    }
  };

  // 创建示例场景
  const createExampleScene = (engine: RenderEngine) => {
    // 创建一些基础图形
    const shapes: Shape[] = [];

    // 创建旋转的矩形
    for (let i = 0; i < 5; i++) {
      const rect = new Rectangle(
        `rect_${i}`,
        100 + i * 120,
        100,
        80,
        60,
        true,
        { fillStyle: `hsl(${i * 60}, 70%, 50%)`, strokeStyle: '#333', lineWidth: 2 }
      );
      
      const transform = new Transform();
      transform.setPosition(100 + i * 120, 100);
      transform.setRotation(i * 0.5);
      rect.setTransform(transform);
      
      shapes.push(rect);
      engine.addDrawable(rect);
    }

    // 创建弹跳的圆形
    for (let i = 0; i < 3; i++) {
      const circle = new Circle(
        `circle_${i}`,
        150 + i * 200,
        300,
        40,
        true,
        { fillStyle: `hsl(${i * 120 + 180}, 80%, 60%)`, strokeStyle: '#fff', lineWidth: 3 }
      );
      
      shapes.push(circle);
      engine.addDrawable(circle);
    }

    // 添加动画
    let time = 0;
    const animate = () => {
      time += 0.016; // ~60fps

      // 旋转矩形
      shapes.slice(0, 5).forEach((shape, i) => {
        const transform = new Transform();
        transform.setPosition(100 + i * 120, 100 + Math.sin(time + i) * 20);
        transform.setRotation(time + i * 0.5);
        shape.setTransform(transform);
      });

      // 弹跳圆形
      shapes.slice(5).forEach((shape, i) => {
        const y = 300 + Math.abs(Math.sin(time * 2 + i)) * 100;
        const transform = new Transform();
        transform.setPosition(150 + i * 200, y);
        shape.setTransform(transform);
      });

      if (engine) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  // 切换渲染器
  const switchRenderer = (rendererType: string) => {
    if (rendererType !== currentRenderer) {
      initializeRenderer(rendererType);
    }
  };

  // 组件挂载时初始化
  useEffect(() => {
    initializeRenderer(currentRenderer);

    return () => {
      if (renderEngine) {
        renderEngine.dispose();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">
          高级渲染系统演示
        </h1>

        {/* 渲染器选择 */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3">选择渲染器</h2>
          <div className="flex flex-wrap gap-3">
            {renderers.map((renderer) => (
              <button
                key={renderer.type}
                onClick={() => switchRenderer(renderer.type)}
                disabled={!renderer.supported}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentRenderer === renderer.type
                    ? 'bg-blue-500 text-white'
                    : renderer.supported
                    ? 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {renderer.name}
                {!renderer.supported && ' (不支持)'}
              </button>
            ))}
          </div>
        </div>

        {/* 错误信息 */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-300 rounded-lg">
            <p className="text-red-700">错误: {error}</p>
          </div>
        )}

        {/* 渲染画布 */}
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              className="border border-gray-300 rounded"
              style={{ display: 'block', margin: '0 auto' }}
            />
          </div>
        </div>

        {/* 统计信息 */}
        {isInitialized && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3">渲染统计</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>当前渲染器:</span>
                  <span className="font-mono">{stats.rendererType}</span>
                </div>
                <div className="flex justify-between">
                  <span>FPS:</span>
                  <span className="font-mono">{stats.fps}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="text-lg font-semibold mb-3">渲染器能力</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>支持变换:</span>
                  <span>{stats.capabilities.supportsTransforms ? '✓' : '✗'}</span>
                </div>
                <div className="flex justify-between">
                  <span>支持滤镜:</span>
                  <span>{stats.capabilities.supportsFilters ? '✓' : '✗'}</span>
                </div>
                <div className="flex justify-between">
                  <span>支持混合:</span>
                  <span>{stats.capabilities.supportsBlending ? '✓' : '✗'}</span>
                </div>
                <div className="flex justify-between">
                  <span>最大纹理尺寸:</span>
                  <span className="font-mono">{stats.capabilities.maxTextureSize}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 功能说明 */}
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="text-lg font-semibold mb-3">功能特性</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">渲染器支持</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Canvas 2D - 基础2D渲染</li>
                <li>• WebGL - 硬件加速渲染</li>
                <li>• WebGL 2 - 增强WebGL功能</li>
                <li>• WebGPU - 下一代图形API</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">性能优化</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 批量渲染优化</li>
                <li>• 着色器管理系统</li>
                <li>• 资源池化管理</li>
                <li>• 内存自动回收</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
