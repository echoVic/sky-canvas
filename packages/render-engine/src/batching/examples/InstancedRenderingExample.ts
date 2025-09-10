/**
 * 实例化渲染使用示例
 * 展示如何使用EnhancedBatcher和InstancedRenderer进行高性能批量渲染
 */

import { EnhancedBatcher } from '../EnhancedBatcher';
import { IRenderable } from '../../core/IRenderEngine';

// 示例：简单矩形可渲染对象
class SimpleRectangle implements IRenderable {
  constructor(
    public x: number,
    public y: number,
    public width: number,
    public height: number,
    public color: [number, number, number, number] = [1, 1, 1, 1]
  ) {}

  render(context: any): void {
    // 基础矩形渲染实现
    if (context instanceof WebGLRenderingContext || context instanceof WebGL2RenderingContext) {
      // WebGL渲染逻辑
      this.renderWebGL(context);
    } else {
      // Canvas 2D渲染逻辑
      this.render2D(context);
    }
  }

  private renderWebGL(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    // WebGL矩形渲染（简化实现）
    // 实际实现中需要设置顶点缓冲区、着色器等
  }

  private render2D(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = `rgba(${this.color[0] * 255}, ${this.color[1] * 255}, ${this.color[2] * 255}, ${this.color[3]})`;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  getBounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height
    };
  }

  // 实例化渲染所需的方法
  prepareRender(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    // 设置顶点缓冲区、纹理绑定等
  }

  getVertexCount(): number {
    return 6; // 矩形需要6个顶点（2个三角形）
  }
}

// 实例化渲染示例类
export class InstancedRenderingExample {
  private batcher: EnhancedBatcher;
  private canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2')!;
    
    if (!this.gl) {
      throw new Error('WebGL2 context not supported');
    }

    this.batcher = new EnhancedBatcher();
    this.batcher.initializeWebGL(this.gl);

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.batcher.on('instancedRenderExecuted', (event) => {
      console.log(`实例化渲染完成: ${event.batchKey}, 实例数量: ${event.instanceCount}`);
    });

    this.batcher.on('batchCreated', (batch) => {
      console.log(`创建新批次: ${batch.key}, 预计成本: ${batch.estimatedCost}`);
    });

    this.batcher.on('textureAtlasUpdated', (event) => {
      console.log(`纹理图集更新: ${event.atlasId}, 纹理: ${event.textureIds.join(', ')}`);
    });
  }

  /**
   * 创建大量相似对象的场景（粒子系统）
   */
  createParticleSystem(particleCount: number = 1000): void {
    console.log(`创建粒子系统，粒子数量: ${particleCount}`);

    // 清空现有批次
    this.batcher.clear();

    // 创建大量相似的粒子
    for (let i = 0; i < particleCount; i++) {
      const particle = new SimpleRectangle(
        Math.random() * this.canvas.width,   // 随机X位置
        Math.random() * this.canvas.height,  // 随机Y位置
        5 + Math.random() * 10,              // 随机宽度 (5-15px)
        5 + Math.random() * 10,              // 随机高度 (5-15px)
        [
          Math.random(),                     // 随机红色分量
          Math.random(),                     // 随机绿色分量
          Math.random(),                     // 随机蓝色分量
          0.7 + Math.random() * 0.3         // 透明度 (0.7-1.0)
        ]
      );

      this.batcher.addToBatch(particle);
    }

    console.log('粒子系统创建完成');
    this.printStats();
  }

  /**
   * 创建UI元素批次（相同类型的按钮）
   */
  createUIButtonBatch(buttonCount: number = 100): void {
    console.log(`创建UI按钮批次，按钮数量: ${buttonCount}`);

    // 创建相同样式的按钮
    for (let i = 0; i < buttonCount; i++) {
      const row = Math.floor(i / 10);
      const col = i % 10;
      
      const button = new SimpleRectangle(
        col * 120 + 10,                      // 排列位置X
        row * 40 + 10,                       // 排列位置Y
        100,                                 // 固定宽度
        30,                                  // 固定高度
        [0.3, 0.6, 0.9, 1.0]                // 统一按钮颜色
      );

      this.batcher.addToBatch(button);
    }

    console.log('UI按钮批次创建完成');
    this.printStats();
  }

  /**
   * 创建混合场景（不同类型的对象）
   */
  createMixedScene(): void {
    console.log('创建混合场景');

    this.batcher.clear();

    // 背景元素（大矩形）
    for (let i = 0; i < 20; i++) {
      const background = new SimpleRectangle(
        i * 60,
        0,
        50,
        this.canvas.height,
        [0.1, 0.1, 0.1, 0.5]
      );
      this.batcher.addToBatch(background);
    }

    // 前景粒子（小矩形）
    for (let i = 0; i < 500; i++) {
      const particle = new SimpleRectangle(
        Math.random() * this.canvas.width,
        Math.random() * this.canvas.height,
        3,
        3,
        [1, 1, 1, 0.8]
      );
      this.batcher.addToBatch(particle);
    }

    // UI元素（中等矩形）
    for (let i = 0; i < 50; i++) {
      const uiElement = new SimpleRectangle(
        10 + (i % 10) * 80,
        10 + Math.floor(i / 10) * 50,
        70,
        40,
        [0.2, 0.7, 0.3, 1.0]
      );
      this.batcher.addToBatch(uiElement);
    }

    console.log('混合场景创建完成');
    this.printStats();
  }

  /**
   * 执行渲染
   */
  render(): void {
    // 清空画布
    this.gl.clearColor(0, 0, 0, 1);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // 执行批量渲染
    const shader = this.createBasicShader();
    this.batcher.renderBatches(this.gl, shader);

    console.log('渲染完成');
    this.printStats();
  }

  /**
   * 创建基础着色器程序（简化实现）
   */
  private createBasicShader(): WebGLProgram {
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec4 a_instanceTransform;
      attribute vec4 a_instanceTint;
      
      uniform mat4 u_projectionMatrix;
      
      varying vec4 v_color;
      
      void main() {
        vec2 position = a_position * a_instanceTransform.zw + a_instanceTransform.xy;
        gl_Position = u_projectionMatrix * vec4(position, 0.0, 1.0);
        v_color = a_instanceTint;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      
      varying vec4 v_color;
      
      void main() {
        gl_FragColor = v_color;
      }
    `;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('着色器程序链接失败:', this.gl.getProgramInfoLog(program));
    }

    return program;
  }

  /**
   * 创建着色器
   */
  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('着色器编译失败:', this.gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  /**
   * 打印性能统计信息
   */
  printStats(): void {
    const stats = this.batcher.getStats();
    
    console.log('=== 批处理统计 ===');
    console.log(`总批次数: ${stats.totalBatches}`);
    console.log(`实例化批次数: ${stats.instancedBatches}`);
    console.log(`总对象数: ${stats.totalItems}`);
    console.log(`平均批次大小: ${stats.averageBatchSize.toFixed(2)}`);
    console.log(`预计绘制调用数: ${stats.drawCalls}`);
    console.log(`纹理绑定数: ${stats.textureBinds}`);
    
    if (stats.instancedRenderer) {
      console.log('=== 实例化渲染器统计 ===');
      console.log(`支持实例化渲染: ${stats.instancedRenderer.supportedInstancedRendering}`);
      console.log(`缓冲批次数: ${stats.instancedRenderer.bufferedBatches}`);
      console.log(`平均实例数: ${stats.instancedRenderer.averageInstancesPerBatch.toFixed(2)}`);
    }
    
    console.log('==================');
  }

  /**
   * 优化批次
   */
  optimizeBatches(): void {
    console.log('开始优化批次...');
    this.batcher.optimizeBatches();
    console.log('批次优化完成');
    this.printStats();
  }

  /**
   * 销毁示例
   */
  dispose(): void {
    this.batcher.dispose();
  }
}

// 使用示例
export function runInstancedRenderingExample(canvas: HTMLCanvasElement): void {
  try {
    const example = new InstancedRenderingExample(canvas);

    console.log('=== 实例化渲染示例开始 ===');

    // 示例1：粒子系统
    console.log('\n--- 测试1: 粒子系统 ---');
    example.createParticleSystem(1000);
    example.render();

    // 示例2：UI按钮批次
    console.log('\n--- 测试2: UI按钮批次 ---');
    example.createUIButtonBatch(100);
    example.render();

    // 示例3：混合场景
    console.log('\n--- 测试3: 混合场景 ---');
    example.createMixedScene();
    example.render();

    // 示例4：批次优化
    console.log('\n--- 测试4: 批次优化 ---');
    example.optimizeBatches();
    example.render();

    console.log('\n=== 实例化渲染示例完成 ===');
    
    // 清理资源
    example.dispose();
    
  } catch (error) {
    console.error('实例化渲染示例失败:', error);
  }
}