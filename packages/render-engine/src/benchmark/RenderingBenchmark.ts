/**
 * 渲染性能基准测试
 * 专门用于测试渲染引擎的各种渲染操作性能
 */

import { PerformanceBenchmark, BenchmarkResult } from './PerformanceBenchmark';
import { EnhancedBatcher } from '../batching/EnhancedBatcher';
import { TextureAtlas } from '../textures/TextureAtlas';
import { InstancedRenderer } from '../batching/InstancedRenderer';

/**
 * 渲染基准测试配置
 */
export interface RenderingBenchmarkConfig {
  canvasWidth: number;
  canvasHeight: number;
  objectCount: number;
  textureSize: number;
  iterations: number;
  enableProfiling?: boolean;
}

/**
 * 渲染性能指标
 */
export interface RenderingMetrics {
  fps: number;
  frameTime: number; // 毫秒
  drawCalls: number;
  triangles: number;
  vertices: number;
  batchCount: number;
  textureBinds: number;
  stateChanges: number;
  memoryUsage: number; // 字节
}

/**
 * 渲染基准测试套件
 */
export class RenderingBenchmark {
  private benchmark: PerformanceBenchmark;
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private batcher?: EnhancedBatcher;
  private textureAtlas?: TextureAtlas;
  private instancedRenderer?: InstancedRenderer;

  constructor(private config: RenderingBenchmarkConfig) {
    this.benchmark = new PerformanceBenchmark();
    this.canvas = this.createCanvas();
    this.gl = this.createWebGLContext();
  }

  /**
   * 运行所有渲染基准测试
   */
  async runAll(): Promise<Map<string, BenchmarkResult[]>> {
    // 批处理性能测试
    this.createBatchingSuite();
    
    // 纹理管理性能测试
    this.createTextureSuite();
    
    // 实例化渲染性能测试
    this.createInstancingSuite();
    
    // WebGL状态管理性能测试
    this.createStateSuite();
    
    // 几何处理性能测试
    this.createGeometrySuite();

    return await this.benchmark.runAll();
  }

  /**
   * 运行批处理性能测试套件
   */
  async runBatchingTests(): Promise<BenchmarkResult[]> {
    this.createBatchingSuite();
    return await this.benchmark.runSuite('Batching Performance');
  }

  /**
   * 运行纹理管理性能测试套件
   */
  async runTextureTests(): Promise<BenchmarkResult[]> {
    this.createTextureSuite();
    return await this.benchmark.runSuite('Texture Management');
  }

  /**
   * 创建批处理性能测试套件
   */
  private createBatchingSuite(): void {
    const suite = this.benchmark.suite('Batching Performance', {
      iterations: this.config.iterations,
      warmupIterations: 10,
      measureMemory: true,
      setup: async () => {
        this.batcher = new EnhancedBatcher(this.gl);
        await this.batcher.initialize();
      },
      teardown: async () => {
        this.batcher?.dispose();
      }
    });

    // 测试批量添加矩形
    suite.test('Batch Add Rectangles', async () => {
      if (!this.batcher) return;
      
      for (let i = 0; i < this.config.objectCount; i++) {
        this.batcher.addRectangle({
          x: Math.random() * this.config.canvasWidth,
          y: Math.random() * this.config.canvasHeight,
          width: 50,
          height: 50,
          color: [Math.random(), Math.random(), Math.random(), 1]
        });
      }
    });

    // 测试批处理渲染
    suite.test('Batch Render', async () => {
      if (!this.batcher) return;
      
      // 添加对象
      for (let i = 0; i < this.config.objectCount; i++) {
        this.batcher.addRectangle({
          x: Math.random() * this.config.canvasWidth,
          y: Math.random() * this.config.canvasHeight,
          width: 50,
          height: 50,
          color: [Math.random(), Math.random(), Math.random(), 1]
        });
      }
      
      // 渲染
      this.batcher.render();
      this.batcher.clear();
    });

    // 测试大量小对象批处理
    suite.test('Many Small Objects', async () => {
      if (!this.batcher) return;
      
      const objectCount = this.config.objectCount * 5;
      for (let i = 0; i < objectCount; i++) {
        this.batcher.addRectangle({
          x: Math.random() * this.config.canvasWidth,
          y: Math.random() * this.config.canvasHeight,
          width: 10,
          height: 10,
          color: [Math.random(), Math.random(), Math.random(), 1]
        });
      }
      
      this.batcher.render();
      this.batcher.clear();
    });
  }

  /**
   * 创建纹理管理性能测试套件
   */
  private createTextureSuite(): void {
    const suite = this.benchmark.suite('Texture Management', {
      iterations: this.config.iterations,
      warmupIterations: 5,
      measureMemory: true,
      setup: async () => {
        this.textureAtlas = new TextureAtlas({
          width: 2048,
          height: 2048,
          padding: 2
        });
      },
      teardown: async () => {
        this.textureAtlas?.dispose();
      }
    });

    // 测试纹理图集添加
    suite.test('Texture Atlas Add', async () => {
      if (!this.textureAtlas) return;
      
      const textureCount = Math.floor(this.config.objectCount / 10);
      for (let i = 0; i < textureCount; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = this.config.textureSize;
        canvas.height = this.config.textureSize;
        
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = `hsl(${Math.random() * 360}, 50%, 50%)`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        this.textureAtlas.addTexture({
          id: `texture_${i}`,
          image: canvas,
          width: canvas.width,
          height: canvas.height
        });
      }
    });

    // 测试纹理图集查找
    suite.test('Texture Atlas Lookup', async () => {
      if (!this.textureAtlas) return;
      
      // 先添加一些纹理
      for (let i = 0; i < 100; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        this.textureAtlas.addTexture({
          id: `lookup_texture_${i}`,
          image: canvas,
          width: canvas.width,
          height: canvas.height
        });
      }
      
      // 执行查找测试
      for (let i = 0; i < this.config.objectCount; i++) {
        const id = `lookup_texture_${Math.floor(Math.random() * 100)}`;
        this.textureAtlas.getEntry(id);
      }
    });
  }

  /**
   * 创建实例化渲染性能测试套件
   */
  private createInstancingSuite(): void {
    const suite = this.benchmark.suite('Instanced Rendering', {
      iterations: this.config.iterations,
      warmupIterations: 10,
      measureMemory: true,
      setup: async () => {
        this.instancedRenderer = new InstancedRenderer(this.gl);
      },
      teardown: async () => {
        this.instancedRenderer?.dispose();
      }
    });

    // 测试实例化矩形渲染
    suite.test('Instanced Rectangles', async () => {
      if (!this.instancedRenderer) return;
      
      const instances = [];
      for (let i = 0; i < this.config.objectCount; i++) {
        instances.push({
          transform: [
            Math.random() * this.config.canvasWidth,
            Math.random() * this.config.canvasHeight,
            50, 50 // width, height
          ],
          color: [Math.random(), Math.random(), Math.random(), 1]
        });
      }
      
      const batchId = 'rect_batch';
      this.instancedRenderer.createBatch(batchId, 'rectangle', instances.length);
      this.instancedRenderer.updateInstances(batchId, instances);
      
      // 模拟着色器程序（实际测试中需要真实的着色器）
      const mockProgram = {} as WebGLProgram;
      this.instancedRenderer.renderBatch(batchId, mockProgram);
    });

    // 测试大量实例更新
    suite.test('Instance Buffer Update', async () => {
      if (!this.instancedRenderer) return;
      
      const instances = [];
      for (let i = 0; i < this.config.objectCount * 2; i++) {
        instances.push({
          transform: [
            Math.random() * this.config.canvasWidth,
            Math.random() * this.config.canvasHeight,
            25, 25
          ],
          color: [Math.random(), Math.random(), Math.random(), 1]
        });
      }
      
      const batchId = 'update_batch';
      this.instancedRenderer.createBatch(batchId, 'rectangle', instances.length);
      
      // 多次更新测试
      for (let i = 0; i < 5; i++) {
        // 随机修改一些实例
        for (let j = 0; j < instances.length / 4; j++) {
          const idx = Math.floor(Math.random() * instances.length);
          instances[idx].transform[0] = Math.random() * this.config.canvasWidth;
          instances[idx].transform[1] = Math.random() * this.config.canvasHeight;
        }
        
        this.instancedRenderer.updateInstances(batchId, instances);
      }
    });
  }

  /**
   * 创建WebGL状态管理性能测试套件
   */
  private createStateSuite(): void {
    const suite = this.benchmark.suite('WebGL State Management', {
      iterations: this.config.iterations * 10, // 状态切换测试需要更多迭代
      warmupIterations: 50,
      measureMemory: false
    });

    // 测试缓冲区绑定切换
    suite.test('Buffer Binding', async () => {
      const buffers = [];
      for (let i = 0; i < 10; i++) {
        buffers.push(this.gl.createBuffer());
      }
      
      for (let i = 0; i < 100; i++) {
        const buffer = buffers[i % buffers.length];
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      }
      
      // 清理
      buffers.forEach(buffer => this.gl.deleteBuffer(buffer));
    });

    // 测试纹理绑定切换
    suite.test('Texture Binding', async () => {
      const textures = [];
      for (let i = 0; i < 8; i++) {
        const texture = this.gl.createTexture();
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texImage2D(
          this.gl.TEXTURE_2D, 0, this.gl.RGBA,
          32, 32, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null
        );
        textures.push(texture);
      }
      
      for (let i = 0; i < 100; i++) {
        const textureIndex = i % textures.length;
        this.gl.activeTexture(this.gl.TEXTURE0 + textureIndex);
        this.gl.bindTexture(this.gl.TEXTURE_2D, textures[textureIndex]);
      }
      
      // 清理
      textures.forEach(texture => this.gl.deleteTexture(texture));
    });

    // 测试Uniform设置
    suite.test('Uniform Setting', async () => {
      // 创建简单的着色器程序用于测试
      const vertexShader = this.createShader(this.gl.VERTEX_SHADER, `
        attribute vec2 position;
        uniform mat3 transform;
        uniform vec4 color;
        void main() {
          gl_Position = vec4((transform * vec3(position, 1.0)).xy, 0.0, 1.0);
        }
      `);
      
      const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, `
        precision mediump float;
        uniform vec4 color;
        void main() {
          gl_FragColor = color;
        }
      `);
      
      if (!vertexShader || !fragmentShader) return;
      
      const program = this.gl.createProgram()!;
      this.gl.attachShader(program, vertexShader);
      this.gl.attachShader(program, fragmentShader);
      this.gl.linkProgram(program);
      
      if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
        return;
      }
      
      this.gl.useProgram(program);
      const colorLocation = this.gl.getUniformLocation(program, 'color');
      const transformLocation = this.gl.getUniformLocation(program, 'transform');
      
      for (let i = 0; i < 1000; i++) {
        this.gl.uniform4f(colorLocation, Math.random(), Math.random(), Math.random(), 1);
        this.gl.uniformMatrix3fv(transformLocation, false, new Float32Array(9));
      }
      
      // 清理
      this.gl.deleteProgram(program);
      this.gl.deleteShader(vertexShader);
      this.gl.deleteShader(fragmentShader);
    });
  }

  /**
   * 创建几何处理性能测试套件
   */
  private createGeometrySuite(): void {
    const suite = this.benchmark.suite('Geometry Processing', {
      iterations: this.config.iterations,
      warmupIterations: 10,
      measureMemory: true
    });

    // 测试顶点缓冲区创建和更新
    suite.test('Vertex Buffer Operations', async () => {
      const vertexCount = this.config.objectCount * 4; // 每个矩形4个顶点
      const vertices = new Float32Array(vertexCount * 2); // x, y
      
      // 生成随机顶点数据
      for (let i = 0; i < vertices.length; i += 2) {
        vertices[i] = Math.random() * this.config.canvasWidth;
        vertices[i + 1] = Math.random() * this.config.canvasHeight;
      }
      
      const buffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      
      // 测试缓冲区数据上传
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.DYNAMIC_DRAW);
      
      // 测试部分更新
      for (let i = 0; i < 10; i++) {
        const offset = Math.floor(Math.random() * (vertices.length - 100)) * 4;
        const updateData = vertices.slice(offset / 4, offset / 4 + 100);
        this.gl.bufferSubData(this.gl.ARRAY_BUFFER, offset, updateData);
      }
      
      this.gl.deleteBuffer(buffer);
    });

    // 测试索引缓冲区操作
    suite.test('Index Buffer Operations', async () => {
      const quadCount = this.config.objectCount;
      const indices = new Uint16Array(quadCount * 6); // 每个四边形6个索引
      
      for (let i = 0; i < quadCount; i++) {
        const baseIndex = i * 4;
        const indexOffset = i * 6;
        
        // 三角形1
        indices[indexOffset] = baseIndex;
        indices[indexOffset + 1] = baseIndex + 1;
        indices[indexOffset + 2] = baseIndex + 2;
        
        // 三角形2
        indices[indexOffset + 3] = baseIndex;
        indices[indexOffset + 4] = baseIndex + 2;
        indices[indexOffset + 5] = baseIndex + 3;
      }
      
      const buffer = this.gl.createBuffer();
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, buffer);
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
      
      this.gl.deleteBuffer(buffer);
    });
  }

  /**
   * 获取渲染性能指标
   */
  getRenderingMetrics(): RenderingMetrics {
    const ext = this.gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? this.gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'Unknown';
    
    // 注意：这些是模拟指标，实际实现中需要从渲染器获取真实数据
    return {
      fps: 60, // 需要实际测量
      frameTime: 16.67,
      drawCalls: 0, // 需要从批处理器获取
      triangles: 0,
      vertices: 0,
      batchCount: 0,
      textureBinds: 0,
      stateChanges: 0,
      memoryUsage: 0
    };
  }

  /**
   * 创建Canvas元素
   */
  private createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.config.canvasWidth;
    canvas.height = this.config.canvasHeight;
    return canvas;
  }

  /**
   * 创建WebGL上下文
   */
  private createWebGLContext(): WebGLRenderingContext {
    const context = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    if (!context) {
      throw new Error('WebGL not supported');
    }
    return context as WebGLRenderingContext;
  }

  /**
   * 创建着色器
   */
  private createShader(type: number, source: string): WebGLShader | null {
    const shader = this.gl.createShader(type);
    if (!shader) return null;
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    
    return shader;
  }

  /**
   * 销毁基准测试
   */
  dispose(): void {
    this.batcher?.dispose();
    this.textureAtlas?.dispose();
    this.instancedRenderer?.dispose();
  }
}

/**
 * 创建渲染基准测试实例
 */
export function createRenderingBenchmark(config: RenderingBenchmarkConfig): RenderingBenchmark {
  return new RenderingBenchmark(config);
}