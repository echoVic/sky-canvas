import { RenderEngine } from '../engine/RenderEngine';
import { Circle, Line, Rectangle, Text } from '../engine/core/shapes';

/**
 * 渲染引擎测试套件
 */
export class RenderEngineTests {
  private canvas: HTMLCanvasElement;
  private engine: RenderEngine;

  constructor() {
    // 创建测试用的Canvas元素
    this.canvas = document.createElement('canvas');
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.canvas.style.width = '800px';
    this.canvas.style.height = '600px';
    
    this.engine = new RenderEngine('canvas2d');
  }

  /**
   * 运行所有测试
   */
  runAllTests(): { passed: number; failed: number; results: Array<{ name: string; passed: boolean; error?: string }> } {
    const tests = [
      { name: '引擎初始化测试', test: () => this.testEngineInitialization() },
      { name: '基础图形绘制测试', test: () => this.testBasicShapeDrawing() },
      { name: '变换测试', test: () => this.testTransforms() },
      { name: '渲染状态测试', test: () => this.testRenderState() },
      { name: '视口管理测试', test: () => this.testViewportManagement() },
      { name: '碰撞检测测试', test: () => this.testHitTesting() },
      { name: '性能测试', test: () => this.testPerformance() }
    ];

    const results: Array<{ name: string; passed: boolean; error?: string }> = [];
    let passed = 0;
    let failed = 0;

    for (const { name, test } of tests) {
      try {
        test();
        results.push({ name, passed: true });
        passed++;
        console.log(`✅ ${name} - 通过`);
      } catch (error) {
        results.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) });
        failed++;
        console.error(`❌ ${name} - 失败:`, error);
      }
    }

    return { passed, failed, results };
  }

  /**
   * 测试引擎初始化
   */
  private testEngineInitialization(): void {
    // 测试引擎初始化
    this.engine.initialize(this.canvas);
    
    // 验证视口设置
    const viewport = this.engine.getViewport();
    if (viewport.width !== 800 || viewport.height !== 600) {
      throw new Error('视口设置不正确');
    }

    // 验证渲染器能力
    const capabilities = this.engine.getCapabilities();
    if (!capabilities.supportsTransforms) {
      throw new Error('渲染器应该支持变换');
    }

    console.log('引擎初始化成功，视口:', viewport);
    console.log('渲染器能力:', capabilities);
  }

  /**
   * 测试基础图形绘制
   */
  private testBasicShapeDrawing(): void {
    // 创建各种基础图形
    const rect = new Rectangle('rect1', 100, 100, 200, 150, true, {
      fillStyle: '#ff0000',
      strokeStyle: '#000000',
      lineWidth: 2
    });

    const circle = new Circle('circle1', 400, 200, 50, false, {
      strokeStyle: '#00ff00',
      lineWidth: 3
    });

    const line = new Line('line1', { x: 50, y: 50 }, { x: 200, y: 200 }, {
      strokeStyle: '#0000ff',
      lineWidth: 4
    });

    const text = new Text('text1', 'Hello Render Engine!', 300, 50, '24px Arial', {
      fillStyle: '#333333'
    });

    // 添加到引擎
    this.engine.addDrawable(rect);
    this.engine.addDrawable(circle);
    this.engine.addDrawable(line);
    this.engine.addDrawable(text);

    // 渲染一帧
    this.engine.render();

    // 验证对象已添加
    if (!this.engine.getDrawable('rect1')) {
      throw new Error('矩形未正确添加');
    }

    if (!this.engine.getDrawable('circle1')) {
      throw new Error('圆形未正确添加');
    }

    console.log('基础图形绘制测试通过');
  }

  /**
   * 测试变换功能
   */
  private testTransforms(): void {
    const rect = new Rectangle('transformRect', 0, 0, 100, 100, true, {
      fillStyle: '#ffaa00'
    });

    // 测试平移
    rect.transform.setPosition(200, 200);
    
    // 测试旋转
    rect.transform.setRotation(Math.PI / 4); // 45度

    // 测试缩放
    rect.transform.setScale(1.5, 1.5);

    this.engine.addDrawable(rect);
    this.engine.render();

    // 验证变换后的边界框
    const bounds = rect.getBounds();
    if (bounds.x < 100 || bounds.y < 100) {
      throw new Error('变换后的边界框计算不正确');
    }

    console.log('变换测试通过，变换后边界框:', bounds);
  }

  /**
   * 测试渲染状态管理
   */
  private testRenderState(): void {
    // 保存当前状态
    this.engine.pushState();

    // 修改渲染状态
    this.engine.setRenderState({
      fillStyle: '#ff00ff',
      strokeStyle: '#00ffff',
      lineWidth: 5,
      globalAlpha: 0.7
    });

    const state = this.engine.getRenderState();
    if (state.fillStyle !== '#ff00ff') {
      throw new Error('渲染状态设置不正确');
    }

    // 恢复状态
    this.engine.popState();

    const restoredState = this.engine.getRenderState();
    if (restoredState.fillStyle === '#ff00ff') {
      throw new Error('渲染状态恢复不正确');
    }

    console.log('渲染状态管理测试通过');
  }

  /**
   * 测试视口管理
   */
  private testViewportManagement(): void {
    // 设置新视口
    this.engine.setViewport({ x: 100, y: 50, width: 600, height: 400 });
    
    const viewport = this.engine.getViewport();
    if (viewport.x !== 100 || viewport.y !== 50) {
      throw new Error('视口设置不正确');
    }

    // 测试坐标转换
    const screenPoint = { x: 100, y: 100 };
    const worldPoint = this.engine.screenToWorld(screenPoint);
    const backToScreen = this.engine.worldToScreen(worldPoint);

    if (Math.abs(backToScreen.x - screenPoint.x) > 1 || Math.abs(backToScreen.y - screenPoint.y) > 1) {
      throw new Error('坐标转换不准确');
    }

    console.log('视口管理测试通过');
  }

  /**
   * 测试碰撞检测
   */
  private testHitTesting(): void {
    const rect = new Rectangle('hitRect', 100, 100, 200, 150);
    const circle = new Circle('hitCircle', 400, 200, 50);

    this.engine.addDrawable(rect);
    this.engine.addDrawable(circle);

    // 测试矩形碰撞检测
    if (!rect.hitTest({ x: 150, y: 150 })) {
      throw new Error('矩形内部点应该命中');
    }

    if (rect.hitTest({ x: 50, y: 50 })) {
      throw new Error('矩形外部点不应该命中');
    }

    // 测试圆形碰撞检测
    if (!circle.hitTest({ x: 400, y: 200 })) {
      throw new Error('圆心应该命中');
    }

    if (circle.hitTest({ x: 500, y: 200 })) {
      throw new Error('圆外部点不应该命中');
    }

    // 测试区域内对象查找
    const objectsInBounds = this.engine.getDrawablesInBounds({ x: 90, y: 90, width: 220, height: 170 });
    if (objectsInBounds.length !== 1 || objectsInBounds[0].id !== 'hitRect') {
      throw new Error('区域内对象查找不正确');
    }

    console.log('碰撞检测测试通过');
  }

  /**
   * 测试性能
   */
  private testPerformance(): void {
    const startTime = performance.now();
    
    // 创建大量图形对象
    for (let i = 0; i < 1000; i++) {
      const rect = new Rectangle(
        `perfRect${i}`,
        Math.random() * 700,
        Math.random() * 500,
        20 + Math.random() * 50,
        20 + Math.random() * 50,
        Math.random() > 0.5,
        {
          fillStyle: `hsl(${Math.random() * 360}, 70%, 50%)`,
          strokeStyle: '#000000',
          lineWidth: 1
        }
      );
      this.engine.addDrawable(rect);
    }

    const addTime = performance.now() - startTime;

    // 渲染性能测试
    const renderStart = performance.now();
    for (let i = 0; i < 10; i++) {
      this.engine.render();
    }
    const renderTime = (performance.now() - renderStart) / 10;

    if (addTime > 100) {
      throw new Error(`添加1000个对象耗时过长: ${addTime.toFixed(2)}ms`);
    }

    if (renderTime > 50) {
      throw new Error(`单帧渲染耗时过长: ${renderTime.toFixed(2)}ms`);
    }

    console.log(`性能测试通过 - 添加耗时: ${addTime.toFixed(2)}ms, 渲染耗时: ${renderTime.toFixed(2)}ms`);
  }

  /**
   * 创建演示场景
   */
  createDemoScene(): void {
    this.engine.initialize(this.canvas);
    this.engine.clear();

    // 背景
    const background = new Rectangle('bg', 0, 0, 800, 600, true, {
      fillStyle: '#f0f0f0'
    });

    // 彩色矩形
    const coloredRect = new Rectangle('colorRect', 50, 50, 150, 100, true, {
      fillStyle: '#ff6b6b'
    });
    coloredRect.transform.setRotation(Math.PI / 6);

    // 渐变圆形
    const circle = new Circle('gradientCircle', 300, 150, 60, true, {
      fillStyle: '#4ecdc4'
    });

    // 线条
    const line1 = new Line('line1', { x: 500, y: 100 }, { x: 700, y: 200 }, {
      strokeStyle: '#45b7d1',
      lineWidth: 5
    });

    const line2 = new Line('line2', { x: 500, y: 200 }, { x: 700, y: 100 }, {
      strokeStyle: '#96ceb4',
      lineWidth: 5
    });

    // 文本
    const title = new Text('title', '渲染引擎演示', 250, 300, '32px Arial', {
      fillStyle: '#2c3e50'
    });

    const subtitle = new Text('subtitle', 'Canvas2D 渲染器 + 数学库', 200, 350, '18px Arial', {
      fillStyle: '#7f8c8d'
    });

    // 添加所有对象
    [background, coloredRect, circle, line1, line2, title, subtitle].forEach(obj => {
      this.engine.addDrawable(obj);
    });

    // 渲染场景
    this.engine.render();

    console.log('演示场景创建完成');
  }

  /**
   * 获取Canvas元素（用于在页面中显示）
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * 销毁测试环境
   */
  dispose(): void {
    this.engine.dispose();
  }
}

// 导出便利函数
export function runRenderEngineTests(): { passed: number; failed: number; results: Array<{ name: string; passed: boolean; error?: string }> } {
  const tests = new RenderEngineTests();
  const results = tests.runAllTests();
  tests.dispose();
  return results;
}

export function createRenderEngineDemo(): HTMLCanvasElement {
  const demo = new RenderEngineTests();
  demo.createDemoScene();
  return demo.getCanvas();
}
