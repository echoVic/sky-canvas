/**
 * WebGPU 上下文适配器实现
 * 提供基于 WebGPU 的高性能图形渲染上下文
 */

import { Matrix3 } from '../../math/Matrix3';
import { Rectangle } from '../../math/Rectangle';
import { Vector2 } from '../../math/Vector2';
import {
  IGraphicsCapabilities,
  IGraphicsContext,
  IGraphicsState,
  IGraphicsStyle,
  IImageData,
  IPoint,
  ITextStyle,
  ITransform
} from '../interface/IGraphicsContext';

/**
 * WebGPU 设备信息
 */
export interface WebGPUDeviceInfo {
  name: string;
  vendor: string;
  architecture: string;
  maxTextureSize: number;
  maxBufferSize: number;
}

/**
 * WebGPU 上下文配置
 */
export interface WebGPUContextConfig {
  powerPreference?: 'low-power' | 'high-performance';
  forceFallbackAdapter?: boolean;
  antialias?: boolean;
  alpha?: boolean;
  premultipliedAlpha?: boolean;
  preserveDrawingBuffer?: boolean;
  desynchronized?: boolean;
}

/**
 * WebGPU 渲染状态
 */
export interface WebGPURenderState {
  viewport: Rectangle;
  scissorTest: boolean;
  scissorRect?: Rectangle;
  blendMode: string;
  cullMode: 'none' | 'front' | 'back';
  depthTest: boolean;
}

/**
 * WebGPU 缓冲区管理器
 */
export class WebGPUBufferManager {
  private device: GPUDevice;
  private buffers: Map<string, GPUBuffer> = new Map();

  constructor(device: GPUDevice) {
    this.device = device;
  }

  createBuffer(
    id: string,
    size: number,
    usage: GPUBufferUsageFlags,
    data?: ArrayBuffer | ArrayBufferView
  ): GPUBuffer {
    const buffer = this.device.createBuffer({
      size,
      usage,
      mappedAtCreation: !!data
    });

    if (data) {
      const mappedBuffer = buffer.getMappedRange();
      if (data instanceof ArrayBuffer) {
        new Uint8Array(mappedBuffer).set(new Uint8Array(data));
      } else {
        new Uint8Array(mappedBuffer).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      }
      buffer.unmap();
    }

    this.buffers.set(id, buffer);
    return buffer;
  }

  getBuffer(id: string): GPUBuffer | undefined {
    return this.buffers.get(id);
  }

  destroyBuffer(id: string): void {
    const buffer = this.buffers.get(id);
    if (buffer) {
      buffer.destroy();
      this.buffers.delete(id);
    }
  }

  dispose(): void {
    for (const buffer of this.buffers.values()) {
      buffer.destroy();
    }
    this.buffers.clear();
  }
}

/**
 * WebGPU 着色器管理器
 */
export class WebGPUShaderManager {
  private device: GPUDevice;
  private shaders: Map<string, GPUShaderModule> = new Map();
  private pipelines: Map<string, GPURenderPipeline> = new Map();

  constructor(device: GPUDevice) {
    this.device = device;
  }

  createShader(id: string, code: string): GPUShaderModule {
    const shader = this.device.createShaderModule({ code });
    this.shaders.set(id, shader);
    return shader;
  }

  createRenderPipeline(
    id: string,
    vertexShader: string,
    fragmentShader: string,
    vertexLayout: GPUVertexBufferLayout[]
  ): GPURenderPipeline {
    const pipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: this.getShader(vertexShader)!,
        entryPoint: 'vs_main',
        buffers: vertexLayout
      },
      fragment: {
        module: this.getShader(fragmentShader)!,
        entryPoint: 'fs_main',
        targets: [{
          format: 'bgra8unorm' as GPUTextureFormat,
          blend: {
            color: {
              srcFactor: 'src-alpha' as GPUBlendFactor,
              dstFactor: 'one-minus-src-alpha' as GPUBlendFactor,
              operation: 'add' as GPUBlendOperation
            },
            alpha: {
              srcFactor: 'one' as GPUBlendFactor,
              dstFactor: 'one-minus-src-alpha' as GPUBlendFactor,
              operation: 'add' as GPUBlendOperation
            }
          }
        }]
      },
      primitive: {
        topology: 'triangle-list'
      }
    });

    this.pipelines.set(id, pipeline);
    return pipeline;
  }

  getShader(id: string): GPUShaderModule | undefined {
    return this.shaders.get(id);
  }

  getPipeline(id: string): GPURenderPipeline | undefined {
    return this.pipelines.get(id);
  }

  dispose(): void {
    this.shaders.clear();
    this.pipelines.clear();
  }
}

/**
 * WebGPU 上下文实现
 */
export class WebGPUContext implements IGraphicsContext {
  public readonly width: number;
  public readonly height: number;
  public readonly devicePixelRatio: number = window.devicePixelRatio || 1;

  private adapter: GPUAdapter;
  private device: GPUDevice;
  private canvas: HTMLCanvasElement;
  private context: GPUCanvasContext;
  private format: GPUTextureFormat = 'bgra8unorm';

  // 管理器
  private bufferManager: WebGPUBufferManager;
  private shaderManager: WebGPUShaderManager;

  // 渲染状态
  private commandEncoder: GPUCommandEncoder | null = null;
  private renderPass: GPURenderPassEncoder | null = null;

  // 变换和状态管理
  private transformStack: Matrix3[] = [];
  private currentTransform: Matrix3;
  private stateStack: Array<{
    transform: Matrix3;
    fillStyle: string;
    strokeStyle: string;
    lineWidth: number;
    globalAlpha: number;
  }> = [];

  // 当前样式状态
  private fillStyle: string = '#000000';
  private strokeStyle: string = '#000000';
  private lineWidth: number = 1;
  private globalAlpha: number = 1;

  // 路径状态
  private currentPath: { x: number; y: number }[] = [];
  private pathStarted: boolean = false;

  constructor(
    adapter: GPUAdapter,
    device: GPUDevice,
    canvas: HTMLCanvasElement
  ) {
    this.adapter = adapter;
    this.device = device;
    this.canvas = canvas;
    this.width = canvas.width;
    this.height = canvas.height;

    // 获取 WebGPU canvas context
    this.context = canvas.getContext('webgpu') as GPUCanvasContext;
    if (!this.context) {
      throw new Error('Failed to get WebGPU context');
    }

    // 配置 canvas
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied'
    });

    // 初始化管理器
    this.bufferManager = new WebGPUBufferManager(device);
    this.shaderManager = new WebGPUShaderManager(device);

    // 初始化变换矩阵
    this.currentTransform = Matrix3.identity();

    // 创建基础着色器
    this.initializeShaders();
  }

  private initializeShaders(): void {
    // 基础顶点着色器
    const vertexShaderCode = `
      struct VertexInput {
        @location(0) position: vec2<f32>,
        @location(1) color: vec4<f32>,
        @location(2) uv: vec2<f32>,
      }

      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) color: vec4<f32>,
        @location(1) uv: vec2<f32>,
      }

      struct Uniforms {
        transform: mat3x3<f32>,
        projection: mat3x3<f32>,
      }

      @group(0) @binding(0) var<uniform> uniforms: Uniforms;

      @vertex
      fn vs_main(input: VertexInput) -> VertexOutput {
        var output: VertexOutput;

        // 应用变换矩阵
        let pos = vec3<f32>(input.position, 1.0);
        let transformed = uniforms.transform * pos;
        let projected = uniforms.projection * transformed;

        output.position = vec4<f32>(projected.xy, 0.0, 1.0);
        output.color = input.color;
        output.uv = input.uv;

        return output;
      }
    `;

    // 基础片段着色器
    const fragmentShaderCode = `
      struct VertexOutput {
        @builtin(position) position: vec4<f32>,
        @location(0) color: vec4<f32>,
        @location(1) uv: vec2<f32>,
      }

      @fragment
      fn fs_main(input: VertexOutput) -> @location(0) vec4<f32> {
        return input.color;
      }
    `;

    this.shaderManager.createShader('basic_vertex', vertexShaderCode);
    this.shaderManager.createShader('basic_fragment', fragmentShaderCode);

    // 创建基础渲染管线
    const vertexLayout: GPUVertexBufferLayout[] = [{
      arrayStride: 32, // 2 floats (position) + 4 floats (color) + 2 floats (uv)
      attributes: [
        {
          shaderLocation: 0,
          offset: 0,
          format: 'float32x2' // position
        },
        {
          shaderLocation: 1,
          offset: 8,
          format: 'float32x4' // color
        },
        {
          shaderLocation: 2,
          offset: 24,
          format: 'float32x2' // uv
        }
      ]
    }];

    this.shaderManager.createRenderPipeline(
      'basic',
      'basic_vertex',
      'basic_fragment',
      vertexLayout
    );
  }

  // IGraphicsContext 实现

  // 状态管理
  save(): void {
    this.stateStack.push({
      transform: this.currentTransform.clone(),
      fillStyle: this.fillStyle,
      strokeStyle: this.strokeStyle,
      lineWidth: this.lineWidth,
      globalAlpha: this.globalAlpha
    });
    this.transformStack.push(this.currentTransform.clone());
  }

  restore(): void {
    const state = this.stateStack.pop();
    if (state) {
      this.currentTransform = state.transform;
      this.fillStyle = state.fillStyle;
      this.strokeStyle = state.strokeStyle;
      this.lineWidth = state.lineWidth;
      this.globalAlpha = state.globalAlpha;
    }

    const transform = this.transformStack.pop();
    if (transform) {
      this.currentTransform = transform;
    }
  }

  getState(): IGraphicsState {
    const e = this.currentTransform.elements;
    return {
      transform: {
        a: e[0],
        b: e[1],
        c: e[3],
        d: e[4],
        e: e[6],
        f: e[7]
      },
      style: {
        fillColor: this.fillStyle,
        strokeColor: this.strokeStyle,
        lineWidth: this.lineWidth,
        opacity: this.globalAlpha
      }
    };
  }

  setState(state: Partial<IGraphicsState>): void {
    if (state.transform) {
      this.setTransform(state.transform);
    }
    if (state.style) {
      this.setStyle(state.style);
    }
  }

  // 变换操作
  setTransform(transform: ITransform): void {
    this.currentTransform.set(
      transform.a, transform.c, transform.e,
      transform.b, transform.d, transform.f,
      0, 0, 1
    );
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    const matrix = new Matrix3(
      a, c, e,
      b, d, f,
      0, 0, 1
    );
    this.currentTransform.multiply(matrix);
  }

  translate(x: number, y: number): void {
    this.currentTransform.translate(x, y);
  }

  rotate(angle: number): void {
    this.currentTransform.rotate(angle);
  }

  scale(x: number, y: number): void {
    this.currentTransform.scale(x, y);
  }

  resetTransform(): void {
    this.currentTransform = Matrix3.identity();
  }

  // 样式设置
  setStyle(style: Partial<IGraphicsStyle>): void {
    if (style.fillColor) {
      this.setFillColor(style.fillColor as string);
    }
    if (style.strokeColor) {
      this.setStrokeColor(style.strokeColor as string);
    }
    if (style.lineWidth) {
      this.setLineWidth(style.lineWidth);
    }
    if (style.opacity !== undefined) {
      this.setOpacity(style.opacity);
    }
  }

  setFillColor(color: string): void {
    this.fillStyle = color;
  }

  setStrokeColor(color: string): void {
    this.strokeStyle = color;
  }

  setFillStyle(color: string): void {
    this.setFillColor(color);
  }

  setStrokeStyle(color: string): void {
    this.setStrokeColor(color);
  }

  setLineWidth(width: number): void {
    this.lineWidth = width;
  }

  setOpacity(opacity: number): void {
    this.setGlobalAlpha(opacity);
  }

  setGlobalAlpha(alpha: number): void {
    this.globalAlpha = Math.max(0, Math.min(1, alpha));
  }

  setLineDash(segments: number[]): void {
    // WebGPU 中的线条破折号需要在着色器中实现
    console.log('WebGPU setLineDash not fully implemented');
  }

  setTextAlign(align: 'left' | 'center' | 'right' | 'start' | 'end'): void {
    // 文本对齐在 WebGPU 中需要特殊处理
    console.log('WebGPU setTextAlign not fully implemented');
  }

  setTextBaseline(baseline: 'top' | 'middle' | 'bottom' | 'alphabetic' | 'hanging'): void {
    // 文本基线在 WebGPU 中需要特殊处理
    console.log('WebGPU setTextBaseline not fully implemented');
  }

  setFont(font: string): void {
    // 字体设置在 WebGPU 中需要文本渲染系统
    console.log('WebGPU setFont not fully implemented');
  }

  // 清除和渲染
  clear(): void {
    this.beginRenderPass();
    // 渲染通道会自动清除
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    // WebGPU 中部分清除需要特殊实现
    console.log('WebGPU clearRect not fully implemented - clearing entire surface');
    this.clear();
  }

  present(): void {
    this.endRenderPass();
    this.submitCommands();
  }

  // 路径绘制
  beginPath(): void {
    this.currentPath = [];
    this.pathStarted = true;
  }

  closePath(): void {
    if (this.currentPath.length > 0) {
      const firstPoint = this.currentPath[0];
      this.currentPath.push({ x: firstPoint.x, y: firstPoint.y });
    }
  }

  moveTo(x: number, y: number): void {
    this.currentPath.push({ x, y });
    this.pathStarted = true;
  }

  lineTo(x: number, y: number): void {
    if (!this.pathStarted) {
      this.moveTo(x, y);
    } else {
      this.currentPath.push({ x, y });
    }
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    // 将二次贝塞尔曲线转换为多条线段
    const segments = 16;
    const currentPoint = this.currentPath[this.currentPath.length - 1] || { x: 0, y: 0 };

    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const t2 = t * t;
      const mt = 1 - t;
      const mt2 = mt * mt;

      const px = mt2 * currentPoint.x + 2 * mt * t * cpx + t2 * x;
      const py = mt2 * currentPoint.y + 2 * mt * t * cpy + t2 * y;

      this.lineTo(px, py);
    }
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    // 将三次贝塞尔曲线转换为多条线段
    const segments = 16;
    const currentPoint = this.currentPath[this.currentPath.length - 1] || { x: 0, y: 0 };

    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const t2 = t * t;
      const t3 = t2 * t;
      const mt = 1 - t;
      const mt2 = mt * mt;
      const mt3 = mt2 * mt;

      const px = mt3 * currentPoint.x + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * x;
      const py = mt3 * currentPoint.y + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * y;

      this.lineTo(px, py);
    }
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    const segments = Math.max(16, Math.ceil(Math.abs(endAngle - startAngle) * 32 / (2 * Math.PI)));
    const angleStep = (endAngle - startAngle) / segments * (counterclockwise ? -1 : 1);

    for (let i = 0; i <= segments; i++) {
      const angle = startAngle + angleStep * i;
      const pointX = x + Math.cos(angle) * radius;
      const pointY = y + Math.sin(angle) * radius;

      if (i === 0 && !this.pathStarted) {
        this.moveTo(pointX, pointY);
      } else {
        this.lineTo(pointX, pointY);
      }
    }
  }

  rect(x: number, y: number, width: number, height: number): void {
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.lineTo(x, y + height);
    this.closePath();
  }

  // 绘制方法
  fill(): void {
    if (this.currentPath.length < 3) return;

    const triangles = this.triangulatePolygon(this.currentPath);
    if (triangles.length === 0) return;

    this.renderTriangles(triangles, this.parseColor(this.fillStyle));
  }

  stroke(): void {
    if (this.currentPath.length < 2) return;

    this.renderPathStroke(this.currentPath, this.parseColor(this.strokeStyle), this.lineWidth);
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    const vertices = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height }
    ];

    this.renderTriangles(vertices, this.parseColor(this.fillStyle));
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    const path = [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
      { x, y } // 闭合路径
    ];

    this.renderPathStroke(path, this.parseColor(this.strokeStyle), this.lineWidth);
  }

  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    const path = [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    this.renderPathStroke(path, this.parseColor(this.strokeStyle), this.lineWidth);
  }

  drawRect(rect: { x: number; y: number; width: number; height: number }, fill?: boolean, stroke?: boolean): void {
    if (fill) {
      this.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
    if (stroke) {
      this.strokeRect(rect.x, rect.y, rect.width, rect.height);
    }
  }

  // 圆形绘制
  fillCircle(x: number, y: number, radius: number): void {
    const segments = Math.max(16, Math.ceil(radius));
    const vertices: { x: number; y: number }[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius
      });
    }

    this.renderTriangles(vertices, this.parseColor(this.fillStyle));
  }

  strokeCircle(x: number, y: number, radius: number): void {
    const segments = Math.max(16, Math.ceil(radius));
    const vertices: { x: number; y: number }[] = [];

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      vertices.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius
      });
    }

    this.renderPathStroke(vertices, this.parseColor(this.strokeStyle), this.lineWidth);
  }

  drawCircle(center: IPoint, radius: number, fill?: boolean, stroke?: boolean): void {
    if (fill) {
      this.fillCircle(center.x, center.y, radius);
    }
    if (stroke) {
      this.strokeCircle(center.x, center.y, radius);
    }
  }

  // 文本绘制（简化实现）
  fillText(text: string, x: number, y: number, style?: ITextStyle): void {
    console.log('WebGPU fillText not fully implemented');
  }

  strokeText(text: string, x: number, y: number, style?: ITextStyle): void {
    console.log('WebGPU strokeText not fully implemented');
  }

  measureText(text: string, style?: ITextStyle): { width: number; height: number } {
    console.log('WebGPU measureText not fully implemented');
    return { width: text.length * 8, height: 16 }; // 近似值
  }

  // 图像操作（简化实现）
  drawImage(imageData: IImageData, dx: number, dy: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw: number, dh: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw?: number, dh?: number): void {
    console.log('WebGPU drawImage not fully implemented');
  }

  getImageData(x: number, y: number, width: number, height: number): IImageData {
    console.log('WebGPU getImageData not fully implemented');
    const data = new Uint8ClampedArray(width * height * 4);
    return { width, height, data };
  }

  putImageData(imageData: IImageData, x: number, y: number): void {
    console.log('WebGPU putImageData not fully implemented');
  }

  // 裁剪（简化实现）
  clip(): void {
    console.log('WebGPU clip not fully implemented');
  }

  clipRect(x: number, y: number, width: number, height: number): void {
    console.log('WebGPU clipRect not fully implemented');
  }

  // 坐标转换
  screenToWorld(point: IPoint): IPoint {
    const inverse = this.currentTransform.clone().inverse();
    if (!inverse) {
      // 如果矩阵不可逆，返回原点
      return { x: point.x, y: point.y };
    }
    const result = inverse.transformPoint(new Vector2(point.x, point.y));
    return { x: result.x, y: result.y };
  }

  worldToScreen(point: IPoint): IPoint {
    const result = this.currentTransform.transformPoint(new Vector2(point.x, point.y));
    return { x: result.x, y: result.y };
  }

  // 资源管理
  dispose(): void {
    this.bufferManager.dispose();
    this.shaderManager.dispose();
  }

  // 私有辅助方法

  private beginRenderPass(): void {
    if (!this.commandEncoder) {
      this.commandEncoder = this.device.createCommandEncoder();
    }

    const textureView = this.context.getCurrentTexture().createView();

    this.renderPass = this.commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: textureView,
        clearValue: { r: 1, g: 1, b: 1, a: 1 },
        loadOp: 'clear',
        storeOp: 'store'
      }]
    });
  }

  private endRenderPass(): void {
    if (this.renderPass) {
      this.renderPass.end();
      this.renderPass = null;
    }
  }

  private submitCommands(): void {
    if (this.commandEncoder) {
      this.device.queue.submit([this.commandEncoder.finish()]);
      this.commandEncoder = null;
    }
  }

  private parseColor(color: string): [number, number, number, number] {
    // 简化的颜色解析，实际应该更完善
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16) / 255;
      const g = parseInt(hex.slice(2, 4), 16) / 255;
      const b = parseInt(hex.slice(4, 6), 16) / 255;
      return [r, g, b, this.globalAlpha];
    }
    return [0, 0, 0, this.globalAlpha];
  }

  private triangulatePolygon(path: { x: number; y: number }[]): { x: number; y: number }[] {
    if (path.length < 3) return [];

    // 简化的三角扇形实现
    const triangles: { x: number; y: number }[] = [];
    const center = path[0];

    for (let i = 1; i < path.length - 1; i++) {
      triangles.push(center, path[i], path[i + 1]);
    }

    return triangles;
  }

  private renderTriangles(vertices: { x: number; y: number }[], color: [number, number, number, number]): void {
    if (!this.renderPass || vertices.length === 0) return;

    // 创建顶点数据
    const vertexData = new Float32Array(vertices.length * 8); // 每个顶点 8 个值
    for (let i = 0; i < vertices.length; i++) {
      const offset = i * 8;
      vertexData[offset] = vertices[i].x;
      vertexData[offset + 1] = vertices[i].y;
      vertexData[offset + 2] = color[0];
      vertexData[offset + 3] = color[1];
      vertexData[offset + 4] = color[2];
      vertexData[offset + 5] = color[3];
      vertexData[offset + 6] = 0; // u
      vertexData[offset + 7] = 0; // v
    }

    // 创建并绑定顶点缓冲区
    const vertexBuffer = this.bufferManager.createBuffer(
      `vertices_${Date.now()}`,
      vertexData.byteLength,
      GPUBufferUsage.VERTEX,
      vertexData
    );

    // 设置渲染管线
    const pipeline = this.shaderManager.getPipeline('basic');
    if (pipeline) {
      this.renderPass.setPipeline(pipeline);
      this.renderPass.setVertexBuffer(0, vertexBuffer);
      this.renderPass.draw(vertices.length);
    }
  }

  private renderPathStroke(
    path: { x: number; y: number }[],
    color: [number, number, number, number],
    lineWidth: number
  ): void {
    if (!this.renderPass || path.length < 2) return;

    // 为每条边生成线条几何体
    const vertices: { x: number; y: number }[] = [];

    for (let i = 0; i < path.length - 1; i++) {
      const start = path[i];
      const end = path[i + 1];

      // 计算线条方向和垂直向量
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.sqrt(dx * dx + dy * dy);

      if (length === 0) continue;

      const nx = -dy / length;
      const ny = dx / length;
      const halfWidth = lineWidth / 2;

      // 创建线条的四边形顶点
      vertices.push(
        { x: start.x + nx * halfWidth, y: start.y + ny * halfWidth },
        { x: end.x + nx * halfWidth, y: end.y + ny * halfWidth },
        { x: end.x - nx * halfWidth, y: end.y - ny * halfWidth },
        { x: start.x - nx * halfWidth, y: start.y - ny * halfWidth }
      );
    }

    this.renderTriangles(vertices, color);
  }
}

// 静态方法用于创建和检查支持
export namespace WebGPUContext {
  export async function create(canvas: HTMLCanvasElement): Promise<WebGPUContext> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('Failed to get WebGPU adapter');
    }

    const device = await adapter.requestDevice();
    if (!device) {
      throw new Error('Failed to get WebGPU device');
    }

    return new WebGPUContext(adapter, device, canvas);
  }

  export function isSupported(): boolean {
    return !!navigator.gpu;
  }

  export function getCapabilities(): IGraphicsCapabilities {
    return {
      supportsHardwareAcceleration: true,
      supportsTransforms: true,
      supportsFilters: true,
      supportsBlending: true,
      maxTextureSize: 8192,
      supportedFormats: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'dds', 'ktx2']
    };
  }
}