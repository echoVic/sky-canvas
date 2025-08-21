/**
 * 基础渲染示例
 * 展示如何使用框架无关的渲染引擎
 */

import {
  createRenderEngine,
  IRenderable,
  IGraphicsContext,
  IRect,
  IPoint,
  GraphicsAdapterType
} from '../engine/graphics';

/**
 * 简单的矩形渲染对象
 */
class Rectangle implements IRenderable {
  public readonly id: string;
  public visible = true;
  public zIndex = 0;
  
  constructor(
    id: string,
    private x: number,
    private y: number,
    private width: number,
    private height: number,
    private color: string = '#ff0000'
  ) {
    this.id = id;
  }
  
  get bounds(): IRect {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }
  
  render(context: IGraphicsContext): void {
    context.save();
    context.setStyle({ fillColor: this.color });
    context.fillRect(this.x, this.y, this.width, this.height);
    context.restore();
  }
  
  hitTest(point: IPoint): boolean {
    return point.x >= this.x && 
           point.x <= this.x + this.width &&
           point.y >= this.y && 
           point.y <= this.y + this.height;
  }
  
  getBounds(): IRect {
    return this.bounds;
  }
}

/**
 * 简单的圆形渲染对象
 */
class Circle implements IRenderable {
  public readonly id: string;
  public visible = true;
  public zIndex = 0;
  
  constructor(
    id: string,
    private x: number,
    private y: number,
    private radius: number,
    private color: string = '#00ff00'
  ) {
    this.id = id;
  }
  
  get bounds(): IRect {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2
    };
  }
  
  render(context: IGraphicsContext): void {
    context.save();
    context.setStyle({ fillColor: this.color });
    context.beginPath();
    context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  
  hitTest(point: IPoint): boolean {
    const dx = point.x - this.x;
    const dy = point.y - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.radius;
  }
  
  getBounds(): IRect {
    return this.bounds;
  }
}

/**
 * 基础渲染示例
 */
export async function basicRenderingExample(canvas: HTMLCanvasElement): Promise<void> {
  try {
    // 创建渲染引擎
    const engine = await createRenderEngine({
      canvas,
      adapterType: GraphicsAdapterType.CANVAS_2D, // 明确指定使用Canvas2D
      autoRender: false, // 手动控制渲染
      targetFPS: 60
    });
    
    console.log('渲染引擎创建成功');
    
    // 创建渲染层
    const backgroundLayer = engine.createLayer('background', 0);
    const objectLayer = engine.createLayer('objects', 1);
    
    // 创建渲染对象
    const rect1 = new Rectangle('rect1', 50, 50, 100, 80, '#ff6b6b');
    const rect2 = new Rectangle('rect2', 200, 100, 120, 60, '#4ecdc4');
    const circle1 = new Circle('circle1', 150, 200, 40, '#45b7d1');
    const circle2 = new Circle('circle2', 300, 180, 35, '#f9ca24');
    
    // 添加对象到层
    backgroundLayer.addRenderable(rect1);
    objectLayer.addRenderable(rect2);
    objectLayer.addRenderable(circle1);
    objectLayer.addRenderable(circle2);
    
    // 设置视口
    engine.setViewport({
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
      zoom: 1
    });
    
    // 执行单次渲染
    engine.render();
    
    console.log('渲染完成');
    console.log('渲染统计:', engine.getStats());
    
    // 添加交互示例
    canvas.addEventListener('click', (event) => {
      const rect = canvas.getBoundingClientRect();
      const point = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      
      const hitObject = engine.hitTest(point);
      if (hitObject) {
        console.log('点击了对象:', hitObject.id);
      } else {
        console.log('点击了空白区域');
      }
    });
    
    // 启动渲染循环（可选）
    // engine.start();
    
  } catch (error) {
    console.error('渲染引擎初始化失败:', error);
  }
}

/**
 * WebGL渲染示例
 */
export async function webglRenderingExample(canvas: HTMLCanvasElement): Promise<void> {
  try {
    // 创建WebGL渲染引擎
    const engine = await createRenderEngine({
      canvas,
      adapterType: GraphicsAdapterType.WEBGL,
      autoRender: true,
      targetFPS: 60
    });
    
    console.log('WebGL渲染引擎创建成功');
    
    // 创建简单的渲染对象
    const rect = new Rectangle('webgl-rect', 100, 100, 200, 150, '#9b59b6');
    const circle = new Circle('webgl-circle', 250, 200, 60, '#e74c3c');
    
    // 创建层并添加对象
    const layer = engine.createLayer('main', 0);
    layer.addRenderable(rect);
    layer.addRenderable(circle);
    
    // 设置视口
    engine.setViewport({
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
      zoom: 1
    });
    
    console.log('WebGL渲染设置完成');
    
  } catch (error) {
    console.error('WebGL渲染引擎初始化失败:', error);
    console.log('回退到Canvas2D渲染');
    
    // 回退到Canvas2D
    await basicRenderingExample(canvas);
  }
}