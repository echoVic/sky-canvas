import { Point, Rect, RenderContext } from '../../types';
import { BaseRenderer, Drawable, RendererCapabilities, RenderState } from '../core';
import { RenderStats } from '../core/RenderTypes';
import { Matrix3x3, Vector2 } from '../math';

// WebGPU渲染上下文
export interface WebGPURenderContext extends RenderContext {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
}

// WebGPU着色器源码
const WebGPUShaders = {
  basic: {
    vertex: `
      struct VertexInput {
        @location(0) position: vec2<f32>,
        @location(1) color: vec4<f32>,
      }
      
      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) color: vec4<f32>,
      }
      
      struct Uniforms {
        projection: mat3x3<f32>,
        transform: mat3x3<f32>,
      }
      
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      
      @vertex
      fn vs_main(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        let pos = uniforms.projection * uniforms.transform * vec3<f32>(input.position, 1.0);
        output.position = vec4<f32>(pos.xy, 0.0, 1.0);
        output.color = input.color;
        return output;
      }
    `,
    fragment: `
      struct FragmentInput {
        @location(0) color: vec4<f32>,
      }
      
      @fragment
      fn fs_main(input: FragmentInput) -> @location(0) vec4<f32> {
        return input.color;
      }
    `
  },
  
  textured: {
    vertex: `
      struct VertexInput {
        @location(0) position: vec2<f32>,
        @location(1) texCoord: vec2<f32>,
        @location(2) color: vec4<f32>,
      }
      
      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) texCoord: vec2<f32>,
        @location(1) color: vec4<f32>,
      }
      
      struct Uniforms {
        projection: mat3x3<f32>,
        transform: mat3x3<f32>,
      }
      
      @group(0) @binding(0) var<uniform> uniforms: Uniforms;
      
      @vertex
      fn vs_main(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;
        let pos = uniforms.projection * uniforms.transform * vec3<f32>(input.position, 1.0);
        output.position = vec4<f32>(pos.xy, 0.0, 1.0);
        output.texCoord = input.texCoord;
        output.color = input.color;
        return output;
      }
    `,
    fragment: `
      struct FragmentInput {
        @location(0) texCoord: vec2<f32>,
        @location(1) color: vec4<f32>,
      }
      
      @group(0) @binding(1) var textureSampler: sampler;
      @group(0) @binding(2) var textureData: texture_2d<f32>;
      
      @fragment
      fn fs_main(input: FragmentInput) -> @location(0) vec4<f32> {
        let texColor = textureSample(textureData, textureSampler, input.texCoord);
        return texColor * input.color;
      }
    `
  }
};

// WebGPU缓冲区
export class WebGPUBuffer {
  private device: GPUDevice;
  private buffer: GPUBuffer;
  
  constructor(device: GPUDevice, size: number, usage: GPUBufferUsageFlags) {
    this.device = device;
    this.buffer = device.createBuffer({
      size,
      usage,
      mappedAtCreation: false
    });
  }

  update(data: ArrayBuffer, offset: number = 0): void {
    this.device.queue.writeBuffer(this.buffer, offset, data);
  }

  getBuffer(): GPUBuffer {
    return this.buffer;
  }

  dispose(): void {
    this.buffer.destroy();
  }
}

// WebGPU纹理
export class WebGPUTexture {
  private device: GPUDevice;
  private texture: GPUTexture;
  private view: GPUTextureView;
  
  constructor(device: GPUDevice, width: number, height: number, format: GPUTextureFormat = 'rgba8unorm') {
    this.device = device;
    this.texture = device.createTexture({
      size: { width, height },
      format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
    });
    this.view = this.texture.createView();
  }

  update(data: ArrayBuffer | ImageData): void {
    if (data instanceof ImageData) {
      this.device.queue.copyExternalImageToTexture(
        { source: data },
        { texture: this.texture },
        { width: data.width, height: data.height }
      );
    } else {
      // 处理ArrayBuffer数据
      const bytesPerRow = this.texture.width * 4; // 假设RGBA格式
      this.device.queue.writeTexture(
        { texture: this.texture },
        data,
        { bytesPerRow },
        { width: this.texture.width, height: this.texture.height }
      );
    }
  }

  getView(): GPUTextureView {
    return this.view;
  }

  dispose(): void {
    this.texture.destroy();
  }
}

export class WebGPURenderer extends BaseRenderer {
  private device: GPUDevice | null = null;
  private context: GPUCanvasContext | null = null;
  private format: GPUTextureFormat = 'bgra8unorm';
  private currentRenderContext: WebGPURenderContext | null = null;
  
  // 渲染管线
  private basicPipeline: GPURenderPipeline | null = null;
  private texturedPipeline: GPURenderPipeline | null = null;
  
  // 缓冲区
  private vertexBuffer: WebGPUBuffer | null = null;
  private indexBuffer: WebGPUBuffer | null = null;
  private uniformBuffer: WebGPUBuffer | null = null;
  
  // 绑定组
  private uniformBindGroup: GPUBindGroup | null = null;
  
  // 批量渲染
  private vertices: Float32Array = new Float32Array(60000); // 10000 vertices * 6 components
  private indices: Uint16Array = new Uint16Array(60000); // 10000 quads * 6 indices
  private vertexCount = 0;
  private indexCount = 0;
  private maxBatchSize = 10000;
  
  // 投影矩阵
  private projectionMatrix = Matrix3x3.identity();
  
  // 渲染统计
  private stats: RenderStats = {
    drawCalls: 0,
    triangles: 0,
    vertices: 0,
    batches: 0,
    textureBinds: 0,
    shaderSwitches: 0,
    frameTime: 0
  };

  async initialize(canvas: HTMLCanvasElement): Promise<boolean> {
    try {
      // 检查WebGPU支持
      if (!navigator.gpu) {
        console.error('WebGPU not supported');
        return false;
      }

      // 获取适配器和设备
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.error('No WebGPU adapter found');
        return false;
      }

      this.device = await adapter.requestDevice();
      
      // 配置画布上下文
      this.context = canvas.getContext('webgpu') as GPUCanvasContext | null;
      if (!this.context) {
        console.error('Failed to get WebGPU context');
        return false;
      }

      this.format = navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({
        device: this.device,
        format: this.format,
        alphaMode: 'premultiplied'
      });

      // 创建渲染管线
      await this.createRenderPipelines();
      
      // 创建缓冲区
      this.createBuffers();
      
      // 创建绑定组
      this.createBindGroups();

      return true;
    } catch (error) {
      console.error('Failed to initialize WebGPU:', error);
      return false;
    }
  }

  private async createRenderPipelines(): Promise<void> {
    if (!this.device) return;

    // 创建基础渲染管线
    const basicVertexShader = this.device.createShaderModule({
      code: WebGPUShaders.basic.vertex
    });

    const basicFragmentShader = this.device.createShaderModule({
      code: WebGPUShaders.basic.fragment
    });

    this.basicPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: basicVertexShader,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 6 * 4, // position(2) + color(4) = 6 floats
          attributes: [
            { format: 'float32x2', offset: 0, shaderLocation: 0 }, // position
            { format: 'float32x4', offset: 2 * 4, shaderLocation: 1 } // color
          ]
        }]
      },
      fragment: {
        module: basicFragmentShader,
        entryPoint: 'fs_main',
        targets: [{
          format: this.format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha'
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha'
            }
          }
        }]
      },
      primitive: {
        topology: 'triangle-list'
      }
    });

    // 创建纹理渲染管线
    const texturedVertexShader = this.device.createShaderModule({
      code: WebGPUShaders.textured.vertex
    });

    const texturedFragmentShader = this.device.createShaderModule({
      code: WebGPUShaders.textured.fragment
    });

    this.texturedPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: texturedVertexShader,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 8 * 4, // position(2) + texCoord(2) + color(4) = 8 floats
          attributes: [
            { format: 'float32x2', offset: 0, shaderLocation: 0 }, // position
            { format: 'float32x2', offset: 2 * 4, shaderLocation: 1 }, // texCoord
            { format: 'float32x4', offset: 4 * 4, shaderLocation: 2 } // color
          ]
        }]
      },
      fragment: {
        module: texturedFragmentShader,
        entryPoint: 'fs_main',
        targets: [{
          format: this.format,
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha'
            },
            alpha: {
              srcFactor: 'one',
              dstFactor: 'one-minus-src-alpha'
            }
          }
        }]
      },
      primitive: {
        topology: 'triangle-list'
      }
    });
  }

  private createBuffers(): void {
    if (!this.device) return;

    // 创建顶点缓冲区
    this.vertexBuffer = new WebGPUBuffer(
      this.device,
      this.vertices.byteLength,
      GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    );

    // 创建索引缓冲区
    this.indexBuffer = new WebGPUBuffer(
      this.device,
      this.indices.byteLength,
      GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    );

    // 创建uniform缓冲区
    this.uniformBuffer = new WebGPUBuffer(
      this.device,
      64, // 两个3x3矩阵 = 18 * 4 bytes，对齐到64
      GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    );
  }

  private createBindGroups(): void {
    if (!this.device || !this.basicPipeline || !this.uniformBuffer) return;

    this.uniformBindGroup = this.device.createBindGroup({
      layout: this.basicPipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: {
          buffer: this.uniformBuffer.getBuffer()
        }
      }]
    });
  }

  render(context: RenderContext): void {
    if (!this.device || !this.context || !this.basicPipeline) return;

    this.currentRenderContext = context as WebGPURenderContext;
    const startTime = performance.now();

    // 重置统计和批次
    this.resetStats();
    this.resetBatch();

    // 更新投影矩阵
    this.updateProjectionMatrix(context.viewport);
    this.updateUniforms();

    // 获取当前纹理
    const textureView = this.context.getCurrentTexture().createView();

    // 创建命令编码器
    const commandEncoder = this.device.createCommandEncoder();
    
    // 开始渲染通道
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });

    // 设置渲染管线和绑定组
    renderPass.setPipeline(this.basicPipeline);
    renderPass.setBindGroup(0, this.uniformBindGroup!);

    // 渲染所有可见对象
    for (const drawable of this.drawables) {
      if (drawable.visible && this.isDrawableInViewport(drawable, context.viewport)) {
        this.addDrawableToCurrentBatch(drawable);
      }
    }

    // 刷新批次
    this.flushCurrentBatch(renderPass);

    // 结束渲染通道
    renderPass.end();

    // 提交命令
    this.device.queue.submit([commandEncoder.finish()]);

    // 更新统计
    this.stats.frameTime = performance.now() - startTime;
  }

  private resetStats(): void {
    this.stats.drawCalls = 0;
    this.stats.triangles = 0;
    this.stats.vertices = 0;
    this.stats.batches = 0;
    this.stats.textureBinds = 0;
    this.stats.shaderSwitches = 0;
  }

  private resetBatch(): void {
    this.vertexCount = 0;
    this.indexCount = 0;
  }

  private updateProjectionMatrix(viewport: Rect): void {
    const left = viewport.x;
    const right = viewport.x + viewport.width;
    const bottom = viewport.y + viewport.height;
    const top = viewport.y;

    this.projectionMatrix = Matrix3x3.orthographic(left, right, bottom, top);
  }

  private updateUniforms(): void {
    if (!this.uniformBuffer) return;

    // 创建uniform数据
    const uniformData = new Float32Array(16); // 两个3x3矩阵，填充到4x4对齐
    
    // 投影矩阵
    const proj = this.projectionMatrix.elements;
    uniformData[0] = proj[0]; uniformData[1] = proj[1]; uniformData[2] = proj[2];
    uniformData[4] = proj[3]; uniformData[5] = proj[4]; uniformData[6] = proj[5];
    uniformData[8] = proj[6]; uniformData[9] = proj[7]; uniformData[10] = proj[8];
    
    // 变换矩阵（单位矩阵）
    uniformData[12] = 1; uniformData[13] = 0; uniformData[14] = 0;
    uniformData[16] = 0; uniformData[17] = 1; uniformData[18] = 0;
    uniformData[20] = 0; uniformData[21] = 0; uniformData[22] = 1;

    this.uniformBuffer.update(uniformData.buffer);
  }

  private addDrawableToCurrentBatch(drawable: Drawable): void {
    const bounds = drawable.getBounds();
    const transform = drawable.transform;

    // 创建四边形顶点
    let vertices = [
      new Vector2(bounds.x, bounds.y),
      new Vector2(bounds.x + bounds.width, bounds.y),
      new Vector2(bounds.x + bounds.width, bounds.y + bounds.height),
      new Vector2(bounds.x, bounds.y + bounds.height)
    ];

    // 应用变换
    if (transform) {
      vertices = vertices.map(v => transform.transformPoint(v));
    }

    // 检查批次容量
    if (this.vertexCount + 4 > this.maxBatchSize) {
      return; // 批次已满
    }

    // 添加顶点数据
    const baseVertex = this.vertexCount;
    for (let i = 0; i < 4; i++) {
      const offset = (baseVertex + i) * 6;
      this.vertices[offset] = vertices[i].x;
      this.vertices[offset + 1] = vertices[i].y;
      this.vertices[offset + 2] = 1; // r
      this.vertices[offset + 3] = 1; // g
      this.vertices[offset + 4] = 1; // b
      this.vertices[offset + 5] = 1; // a
    }

    // 添加索引数据
    const indices = [0, 1, 2, 0, 2, 3];
    for (let i = 0; i < 6; i++) {
      this.indices[this.indexCount + i] = baseVertex + indices[i];
    }

    this.vertexCount += 4;
    this.indexCount += 6;
  }

  private flushCurrentBatch(renderPass: GPURenderPassEncoder): void {
    if (this.vertexCount === 0 || !this.vertexBuffer || !this.indexBuffer) return;

    // 更新缓冲区数据
    this.vertexBuffer.update(this.vertices.buffer.slice(0, this.vertexCount * 6 * 4));
    this.indexBuffer.update(this.indices.buffer.slice(0, this.indexCount * 2));

    // 设置缓冲区
    renderPass.setVertexBuffer(0, this.vertexBuffer.getBuffer());
    renderPass.setIndexBuffer(this.indexBuffer.getBuffer(), 'uint16');

    // 绘制
    renderPass.drawIndexed(this.indexCount);

    // 更新统计
    this.stats.drawCalls++;
    this.stats.batches++;
    this.stats.vertices += this.vertexCount;
    this.stats.triangles += this.indexCount / 3;

    // 重置批次
    this.resetBatch();
  }

  clear(): void {
    // WebGPU的清除在渲染通道开始时处理
  }

  getCapabilities(): RendererCapabilities {
    if (!this.device) {
      return {
        supportsTransforms: false,
        supportsFilters: false,
        supportsBlending: false,
        maxTextureSize: 0,
        supportedFormats: []
      };
    }

    return {
      supportsTransforms: true,
      supportsFilters: true,
      supportsBlending: true,
      maxTextureSize: this.device.limits.maxTextureDimension2D,
      supportedFormats: ['png', 'jpg', 'jpeg', 'webp']
    };
  }

  getRenderStats(): RenderStats {
    return { ...this.stats };
  }

  // 绘制基础图形方法
  drawLine(start: Point, end: Point, style?: Partial<RenderState>): void {
    // WebGPU线段绘制实现
  }

  drawRect(x: number, y: number, width: number, height: number, filled = false, style?: Partial<RenderState>): void {
    // WebGPU矩形绘制实现
  }

  drawCircle(center: Point, radius: number, filled = false, style?: Partial<RenderState>): void {
    // WebGPU圆形绘制实现
  }

  private isDrawableInViewport(drawable: Drawable, viewport: Rect): boolean {
    const bounds = drawable.getBounds();
    return this.boundsIntersect(bounds, viewport);
  }

  dispose(): void {
    this.vertexBuffer?.dispose();
    this.indexBuffer?.dispose();
    this.uniformBuffer?.dispose();
    
    this.device = null;
    this.context = null;
    this.currentRenderContext = null;
    
    super.dispose();
  }
}
