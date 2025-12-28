/**
 * WebGPU 渲染器
 * 负责实际的图形渲染操作
 */

import { WebGPUBufferManager } from './WebGPUBufferManager';
import { WebGPUPipelineManager } from './WebGPUPipelineManager';
import { WebGPUGeometry, Color } from './WebGPUGeometry';
import { ITransform } from '../../graphics/IGraphicsContext';

/**
 * 渲染器配置
 */
export interface WebGPURendererConfig {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  width: number;
  height: number;
}

/**
 * WebGPU 渲染器
 */
export class WebGPURenderer {
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private format: GPUTextureFormat;
  private width: number;
  private height: number;

  private bufferManager: WebGPUBufferManager;
  private pipelineManager: WebGPUPipelineManager;

  // 当前渲染状态
  private commandEncoder: GPUCommandEncoder | null = null;
  private renderPass: GPURenderPassEncoder | null = null;

  // Uniform 缓冲区
  private uniformBuffer: GPUBuffer | null = null;
  private uniformBindGroup: GPUBindGroup | null = null;

  // 统计信息
  private stats = {
    drawCalls: 0,
    triangles: 0,
    vertices: 0
  };

  constructor(config: WebGPURendererConfig) {
    this.device = config.device;
    this.context = config.context;
    this.format = config.format;
    this.width = config.width;
    this.height = config.height;

    this.bufferManager = new WebGPUBufferManager(this.device);
    this.pipelineManager = new WebGPUPipelineManager(this.device, this.format);

    this.setupUniformBuffer();
  }

  /**
   * 设置 Uniform 缓冲区
   */
  private setupUniformBuffer(): void {
    // mat3x3 需要 48 字节 (3 * vec4 对齐)，两个矩阵 = 96 字节
    this.uniformBuffer = this.bufferManager.createUniformBuffer(96, 'Transform Uniforms');
  }

  /**
   * 更新变换矩阵
   */
  updateTransform(transform: ITransform): void {
    if (!this.uniformBuffer) return;

    // 创建投影矩阵 (屏幕空间到 NDC)
    const projectionMatrix = new Float32Array([
      2 / this.width, 0, 0, 0,   // 第一列 + padding
      0, -2 / this.height, 0, 0, // 第二列 + padding
      -1, 1, 1, 0                 // 第三列 + padding
    ]);

    // 创建模型矩阵
    const modelMatrix = new Float32Array([
      transform.a, transform.b, 0, 0,
      transform.c, transform.d, 0, 0,
      transform.e, transform.f, 1, 0
    ]);

    // 更新 uniform 缓冲区
    this.device.queue.writeBuffer(this.uniformBuffer, 0, projectionMatrix);
    this.device.queue.writeBuffer(this.uniformBuffer, 48, modelMatrix);
  }

  /**
   * 开始渲染帧
   */
  beginFrame(): void {
    this.stats = { drawCalls: 0, triangles: 0, vertices: 0 };

    this.commandEncoder = this.device.createCommandEncoder({
      label: 'Frame Command Encoder'
    });

    const textureView = this.context.getCurrentTexture().createView();

    this.renderPass = this.commandEncoder.beginRenderPass({
      label: 'Main Render Pass',
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });

    // 设置 bind group
    this.setupBindGroup();
  }

  /**
   * 设置 bind group
   */
  private setupBindGroup(): void {
    if (!this.uniformBuffer) return;

    const { bindGroupLayout } = this.pipelineManager.getBasic2DPipeline();

    this.uniformBindGroup = this.device.createBindGroup({
      label: 'Transform Bind Group',
      layout: bindGroupLayout,
      entries: [{
        binding: 0,
        resource: { buffer: this.uniformBuffer }
      }]
    });
  }

  /**
   * 结束渲染帧
   */
  endFrame(): void {
    if (!this.renderPass || !this.commandEncoder) return;

    this.renderPass.end();
    this.renderPass = null;

    const commands = this.commandEncoder.finish();
    this.device.queue.submit([commands]);
    this.commandEncoder = null;
  }

  /**
   * 绘制填充矩形
   */
  fillRect(x: number, y: number, width: number, height: number, color: Color): void {
    if (!this.renderPass || !this.uniformBindGroup) return;

    const geometry = WebGPUGeometry.createRect(x, y, width, height, color);
    this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount);
  }

  /**
   * 绘制描边矩形
   */
  strokeRect(x: number, y: number, width: number, height: number, lineWidth: number, color: Color): void {
    if (!this.renderPass || !this.uniformBindGroup) return;

    const geometry = WebGPUGeometry.createRectStroke(x, y, width, height, lineWidth, color);
    this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount);
  }

  /**
   * 绘制填充圆
   */
  fillCircle(centerX: number, centerY: number, radius: number, color: Color): void {
    if (!this.renderPass || !this.uniformBindGroup) return;

    const geometry = WebGPUGeometry.createCircleFill(centerX, centerY, radius, color);
    this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount);
  }

  /**
   * 绘制线段
   */
  drawLine(x1: number, y1: number, x2: number, y2: number, lineWidth: number, color: Color): void {
    if (!this.renderPass || !this.uniformBindGroup) return;

    const geometry = WebGPUGeometry.createLine(x1, y1, x2, y2, lineWidth, color);
    if (geometry.indexCount === 0) return;

    this.drawGeometry(geometry.vertices, geometry.indices, geometry.indexCount);
  }

  /**
   * 绘制几何图形
   */
  private drawGeometry(vertices: Float32Array, indices: Uint16Array, indexCount: number): void {
    if (!this.renderPass || !this.uniformBindGroup) return;

    // 创建缓冲区
    const vertexBuffer = this.bufferManager.createVertexBuffer(vertices);
    const indexBuffer = this.bufferManager.createIndexBuffer(indices);

    // 设置管线
    const { pipeline } = this.pipelineManager.getBasic2DPipeline();
    this.renderPass.setPipeline(pipeline);
    this.renderPass.setBindGroup(0, this.uniformBindGroup);
    this.renderPass.setVertexBuffer(0, vertexBuffer);
    this.renderPass.setIndexBuffer(indexBuffer, 'uint16');
    this.renderPass.drawIndexed(indexCount);

    // 更新统计
    this.stats.drawCalls++;
    this.stats.triangles += indexCount / 3;
    this.stats.vertices += vertices.length / 6;

    // 销毁临时缓冲区
    vertexBuffer.destroy();
    indexBuffer.destroy();
  }

  /**
   * 调整大小
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  /**
   * 获取统计信息
   */
  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * 销毁资源
   */
  dispose(): void {
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
      this.uniformBuffer = null;
    }
    this.bufferManager.dispose();
    this.pipelineManager.dispose();
  }
}
