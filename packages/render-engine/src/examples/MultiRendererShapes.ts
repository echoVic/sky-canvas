/**
 * 多渲染器 Shape 渲染示例
 * 演示如何在不同渲染器中渲染相同的 Shape 对象
 */
import { Canvas2DContext } from '../core/context/Canvas2DContext';
import { WebGLContext } from '../core/context/WebGLContext';
import { WebGPUContext } from '../core/context/WebGPUContext';
import { CanvasRenderer } from '../core/renderers/CanvasRenderer';
import { checkWebGPUSupport } from '../core/renderers/WebGPURenderer';
import { Circle, Line, Rectangle, Shape } from '../renderables';

/**
 * 多渲染器示例类
 */
export class MultiRendererShapesExample {
  private canvasElement: HTMLCanvasElement;
  private canvas2DRenderer: CanvasRenderer;
  private webglContext: WebGLContext | null = null;
  private webgpuSupported: boolean = false;

  // 示例图形
  private shapes: Shape[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvasElement = canvas;
    this.canvas2DRenderer = new CanvasRenderer();
    this.webgpuSupported = checkWebGPUSupport().supported;
    this.initializeShapes();
  }

  /**
   * 初始化示例图形
   */
  private initializeShapes(): void {
    // 创建圆形
    const circle = new Circle({
      x: 100,
      y: 100,
      radius: 50,
      style: {
        fill: '#ff6b6b',
        stroke: '#e55555',
        strokeWidth: 2
      }
    });

    // 创建矩形
    const rectangle = new Rectangle({
      x: 200,
      y: 80,
      width: 100,
      height: 60,
      cornerRadius: 10,
      style: {
        fill: '#4ecdc4',
        stroke: '#45b7aa',
        strokeWidth: 2
      }
    });

    // 创建线条
    const line = new Line({
      points: [50, 200, 150, 250, 250, 200, 350, 250],
      style: {
        stroke: '#95a5a6',
        strokeWidth: 3
      }
    });

    // 创建旋转的圆形
    const rotatedCircle = new Circle({
      x: 300,
      y: 150,
      radius: 30,
      rotation: Math.PI / 4,
      style: {
        fill: '#f39c12',
        stroke: '#d68910',
        strokeWidth: 2
      }
    });

    this.shapes = [circle, rectangle, line, rotatedCircle];

    // 添加形状到渲染器
    this.shapes.forEach(shape => {
      this.canvas2DRenderer.addRenderable(shape);
    });
  }

  /**
   * 使用 Canvas2D 渲染
   */
  async renderWithCanvas2D(): Promise<void> {
    console.log('渲染使用 Canvas2D...');

    try {
      const context = Canvas2DContext.create(this.canvasElement);

      // 清空画布
      context.clear();

      // 渲染所有图形
      this.shapes.forEach(shape => {
        if (shape.visible) {
          shape.render(context);
        }
      });

      console.log('Canvas2D 渲染完成');
    } catch (error) {
      console.error('Canvas2D 渲染失败:', error);
    }
  }

  /**
   * 使用 WebGL 渲染
   */
  async renderWithWebGL(): Promise<void> {
    console.log('渲染使用 WebGL...');

    try {
      const gl = this.canvasElement.getContext('webgl');
      if (!gl) {
        throw new Error('WebGL 不支持');
      }

      this.webglContext = new WebGLContext(gl, this.canvasElement);

      // 清空画布
      this.webglContext.clear();

      // 渲染所有图形
      this.shapes.forEach(shape => {
        if (shape.visible) {
          shape.render(this.webglContext!);
        }
      });

      // 提交渲染通道
      this.webglContext.present();

      console.log('WebGL 渲染完成');
    } catch (error) {
      console.error('WebGL 渲染失败:', error);
    }
  }

  /**
   * 使用 WebGPU 渲染
   */
  async renderWithWebGPU(): Promise<void> {
    console.log('渲染使用 WebGPU...');

    if (!this.webgpuSupported) {
      console.warn('WebGPU 不支持，跳过渲染');
      return;
    }

    try {
      const webgpuContext = await WebGPUContext.create(this.canvasElement);

      // 清空画布
      webgpuContext.clear();

      // 渲染所有图形
      this.shapes.forEach(shape => {
        if (shape.visible) {
          shape.render(webgpuContext);
        }
      });

      // 提交渲染通道
      webgpuContext.present();

      console.log('WebGPU 渲染完成');
    } catch (error) {
      console.error('WebGPU 渲染失败:', error);
    }
  }

  /**
   * 比较渲染器性能
   */
  async performanceComparison(iterations: number = 100): Promise<{
    canvas2D: number;
    webgl: number;
    webgpu?: number;
  }> {
    console.log(`开始性能比较 (${iterations} 次迭代)...`);

    // Canvas2D 性能测试
    const canvas2DStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await this.renderWithCanvas2D();
    }
    const canvas2DTime = performance.now() - canvas2DStart;

    // WebGL 性能测试
    const webglStart = performance.now();
    for (let i = 0; i < iterations; i++) {
      await this.renderWithWebGL();
    }
    const webglTime = performance.now() - webglStart;

    const results: any = {
      canvas2D: canvas2DTime,
      webgl: webglTime
    };

    // WebGPU 性能测试（如果支持）
    if (this.webgpuSupported) {
      const webgpuStart = performance.now();
      for (let i = 0; i < iterations; i++) {
        await this.renderWithWebGPU();
      }
      const webgpuTime = performance.now() - webgpuStart;
      results.webgpu = webgpuTime;

      console.log('性能比较结果:');
      console.log(`Canvas2D: ${canvas2DTime.toFixed(2)}ms`);
      console.log(`WebGL: ${webglTime.toFixed(2)}ms`);
      console.log(`WebGPU: ${webgpuTime.toFixed(2)}ms`);
      console.log(`WebGL vs Canvas2D: ${(canvas2DTime / webglTime).toFixed(2)}x`);
      console.log(`WebGPU vs Canvas2D: ${(canvas2DTime / webgpuTime).toFixed(2)}x`);
    } else {
      console.log('性能比较结果:');
      console.log(`Canvas2D: ${canvas2DTime.toFixed(2)}ms`);
      console.log(`WebGL: ${webglTime.toFixed(2)}ms`);
      console.log(`WebGL vs Canvas2D: ${(canvas2DTime / webglTime).toFixed(2)}x`);
      console.log('WebGPU: 不支持');
    }

    return results;
  }

  /**
   * 动态切换渲染器
   */
  async switchRenderer(renderer: 'canvas2d' | 'webgl' | 'webgpu'): Promise<void> {
    console.log(`切换到 ${renderer.toUpperCase()} 渲染器...`);

    switch (renderer) {
      case 'canvas2d':
        await this.renderWithCanvas2D();
        break;
      case 'webgl':
        await this.renderWithWebGL();
        break;
      case 'webgpu':
        if (this.webgpuSupported) {
          await this.renderWithWebGPU();
        } else {
          console.warn('WebGPU 不支持，回退到 WebGL');
          await this.renderWithWebGL();
        }
        break;
      default:
        console.error('未知渲染器类型:', renderer);
    }
  }

  /**
   * 添加新的图形到场景
   */
  addShape(shape: Shape): void {
    this.shapes.push(shape);
    this.canvas2DRenderer.addRenderable(shape);
  }

  /**
   * 移除图形从场景
   */
  removeShape(shape: Shape): void {
    const index = this.shapes.indexOf(shape);
    if (index >= 0) {
      this.shapes.splice(index, 1);
      this.canvas2DRenderer.removeRenderable(shape.id);
    }
  }

  /**
   * 获取当前场景中的图形列表
   */
  getShapes(): Shape[] {
    return [...this.shapes];
  }

  /**
   * 清理资源
   */
  dispose(): void {
    if (this.webglContext) {
      this.webglContext.dispose();
      this.webglContext = null;
    }
  }
}

/**
 * 创建并运行示例
 */
export async function runMultiRendererExample(canvas: HTMLCanvasElement): Promise<MultiRendererShapesExample> {
  const example = new MultiRendererShapesExample(canvas);

  console.log('=== 多渲染器 Shape 渲染示例 ===');

  // 1. Canvas2D 渲染
  await example.renderWithCanvas2D();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 2. WebGL 渲染
  await example.renderWithWebGL();
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 3. 性能比较
  await example.performanceComparison(10);

  // 4. 动态切换演示
  console.log('\n=== 动态切换渲染器演示 ===');
  for (let i = 0; i < 3; i++) {
    await example.switchRenderer('canvas2d');
    await new Promise(resolve => setTimeout(resolve, 500));

    await example.switchRenderer('webgl');
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('示例运行完成!');
  return example;
}

/**
 * 浏览器环境的便捷函数
 */
export function createMultiRendererDemo(): void {
  // 检查浏览器环境
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('该示例需要在浏览器环境中运行');
    return;
  }

  // 创建画布元素
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.style.border = '1px solid #ccc';

  // 添加到页面
  document.body.appendChild(canvas);

  // 创建控制面板
  const controls = document.createElement('div');
  controls.style.marginTop = '10px';

  const canvas2dBtn = document.createElement('button');
  canvas2dBtn.textContent = 'Canvas2D 渲染';

  const webglBtn = document.createElement('button');
  webglBtn.textContent = 'WebGL 渲染';

  const perfBtn = document.createElement('button');
  perfBtn.textContent = '性能测试';

  controls.appendChild(canvas2dBtn);
  controls.appendChild(webglBtn);
  controls.appendChild(perfBtn);
  document.body.appendChild(controls);

  // 运行示例
  runMultiRendererExample(canvas).then(example => {
    canvas2dBtn.onclick = () => example.renderWithCanvas2D();
    webglBtn.onclick = () => example.renderWithWebGL();
    perfBtn.onclick = () => example.performanceComparison(50);

    console.log('多渲染器演示已就绪，点击按钮进行测试！');
  }).catch(error => {
    console.error('示例初始化失败:', error);
  });
}