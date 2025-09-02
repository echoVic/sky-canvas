/**
 * WebGPU 图形适配器实现
 * 提供基于 WebGPU 的高性能图形渲染能力
 */

import {
  IColor,
  IGraphicsCapabilities,
  IGraphicsContext,
  IGraphicsContextFactory,
  IGraphicsState,
  IGraphicsStyle,
  IImageData,
  IPoint,
  ITextStyle,
  ITransform
} from '../IGraphicsContext';

/**
 * WebGPU 图形上下文实现
 */
export class WebGPUGraphicsContext implements IGraphicsContext {
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private canvas: HTMLCanvasElement;
  private commandEncoder?: GPUCommandEncoder;
  private renderPassEncoder?: GPURenderPassEncoder;
  private currentState: IGraphicsState;
  private stateStack: IGraphicsState[] = [];
  private fillRectPipeline?: GPURenderPipeline;
  private strokeLinePipeline?: GPURenderPipeline;
  private fillCirclePipeline?: GPURenderPipeline;
  private strokeCirclePipeline?: GPURenderPipeline;
  private clearRectPipeline?: GPURenderPipeline;
  private vertexBuffer?: GPUBuffer;
  private uniformBuffer?: GPUBuffer;
  private bindGroup?: GPUBindGroup;
  private tempBuffers: GPUBuffer[] = []; // 临时缓冲区数组，用于延迟销毁

  constructor(device: GPUDevice, context: GPUCanvasContext, canvas: HTMLCanvasElement) {
    this.device = device;
    this.context = context;
    this.canvas = canvas;
    
    // 初始化默认状态
    this.currentState = {
      transform: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
      style: {
        fillColor: { r: 0, g: 0, b: 0, a: 1 },
        strokeColor: { r: 0, g: 0, b: 0, a: 1 },
        lineWidth: 1
      }
    };
    
    // 初始化 WebGPU 渲染管道
    this.initRenderPipeline();
  }
  
  // 基础属性
  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  get devicePixelRatio(): number {
    return window.devicePixelRatio || 1;
  }

  // 状态管理
  save(): void {
    this.stateStack.push(JSON.parse(JSON.stringify(this.currentState)));
  }

  restore(): void {
    if (this.stateStack.length > 0) {
      this.currentState = this.stateStack.pop()!;
    }
  }

  getState(): IGraphicsState {
    return JSON.parse(JSON.stringify(this.currentState));
  }

  setState(state: Partial<IGraphicsState>): void {
    this.currentState = { ...this.currentState, ...state };
  }

  // 变换操作
  setTransform(transform: ITransform): void {
    this.currentState.transform = { ...transform };
  }

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    const t = this.currentState.transform;
    this.currentState.transform = {
      a: t.a * a + t.c * b,
      b: t.b * a + t.d * b,
      c: t.a * c + t.c * d,
      d: t.b * c + t.d * d,
      e: t.a * e + t.c * f + t.e,
      f: t.b * e + t.d * f + t.f
    };
  }

  translate(x: number, y: number): void {
    this.transform(1, 0, 0, 1, x, y);
  }

  rotate(angle: number): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    this.transform(cos, sin, -sin, cos, 0, 0);
  }

  scale(x: number, y: number): void {
    this.transform(x, 0, 0, y, 0, 0);
  }

  resetTransform(): void {
    this.currentState.transform = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  }

  // 样式设置
  setStyle(style: Partial<IGraphicsStyle>): void {
    this.currentState.style = { ...this.currentState.style, ...style };
  }

  setFillColor(color: IColor | string): void {
    this.currentState.style.fillColor = color;
  }

  setStrokeColor(color: IColor | string): void {
    this.currentState.style.strokeColor = color;
  }

  setLineWidth(width: number): void {
    this.currentState.style.lineWidth = width;
  }

  setOpacity(opacity: number): void {
    this.currentState.style.opacity = opacity;
  }

  // 清除操作
  clear(): void {
    // WebGPU 清除整个画布
    console.log('WebGPU clear canvas');
    
    // 如果有正在进行的渲染通道，先结束它
    if (this.renderPassEncoder) {
      this.endRenderPass();
    }
    
    // 创建新的命令编码器进行清除操作
    this.commandEncoder = this.device.createCommandEncoder();
    
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
        loadOp: 'clear' as const,  // 使用clear来清除画布
        storeOp: 'store' as const
      }]
    };
    
    const clearPass = this.commandEncoder.beginRenderPass(renderPassDescriptor);
    clearPass.end();
    
    // 提交清除命令
    const commandBuffer = this.commandEncoder.finish();
    this.device.queue.submit([commandBuffer]);
    this.commandEncoder = undefined;
  }

  clearRect(x: number, y: number, width: number, height: number): void {
    this.beginRenderPass();
    
    if (this.renderPassEncoder) {
      // 对于clearRect，我们可以使用clear操作或绘制透明矩形
      // 这里使用绘制透明矩形的方式
      if (this.fillRectPipeline) {
        // 转换到NDC坐标系
        const x1 = (x / this.canvas.width) * 2 - 1;
        const y1 = -((y / this.canvas.height) * 2 - 1);
        const x2 = ((x + width) / this.canvas.width) * 2 - 1;
        const y2 = -(((y + height) / this.canvas.height) * 2 - 1);
        
        // 创建透明矩形的顶点数据
        const clearVertices = new Float32Array([
          x1, y1,  // 左上
          x2, y1,  // 右上
          x1, y2,  // 左下
          x1, y2,  // 左下
          x2, y1,  // 右上
          x2, y2   // 右下
        ]);
        
        // 创建临时顶点缓冲区
        const clearBuffer = this.device.createBuffer({
          size: clearVertices.byteLength,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        
        this.device.queue.writeBuffer(clearBuffer, 0, clearVertices);
        
        // 创建透明着色器模块（如果还没有的话）
        if (!this.clearRectPipeline) {
          const clearShaderModule = this.device.createShaderModule({
            code: `
              @vertex
              fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
                return vec4<f32>(position, 0.0, 1.0);
              }
              
              @fragment
              fn fs_main() -> @location(0) vec4<f32> {
                return vec4<f32>(0.0, 0.0, 0.0, 0.0); // 透明
              }
            `
          });
          
          this.clearRectPipeline = this.device.createRenderPipeline({
            layout: 'auto',
            vertex: {
              module: clearShaderModule,
              entryPoint: 'vs_main',
              buffers: [{
                arrayStride: 8,
                attributes: [{
                  format: 'float32x2',
                  offset: 0,
                  shaderLocation: 0
                }]
              }]
            },
            fragment: {
              module: clearShaderModule,
              entryPoint: 'fs_main',
              targets: [{
                format: this.context.getCurrentTexture().format,
                blend: {
                  color: {
                    srcFactor: 'zero',
                    dstFactor: 'zero',
                    operation: 'add'
                  },
                  alpha: {
                    srcFactor: 'zero',
                    dstFactor: 'zero',
                    operation: 'add'
                  }
                }
              }]
            },
            primitive: {
              topology: 'triangle-list'
            }
          });
        }
        
        // 设置渲染管道和顶点缓冲区
        this.renderPassEncoder.setPipeline(this.clearRectPipeline);
        this.renderPassEncoder.setVertexBuffer(0, clearBuffer);
        
        // 绘制6个顶点（2个三角形组成矩形）
        this.renderPassEncoder.draw(6);
        
        // 清理临时缓冲区
        clearBuffer.destroy();
      }
    }
  }

  // 路径操作
  private currentPath: { x: number; y: number }[] = [];
  private pathStartX: number = 0;
  private pathStartY: number = 0;
  
  beginPath(): void {
    this.currentPath = [];
  }

  closePath(): void {
    if (this.currentPath.length > 0) {
      // 连接最后一个点到起始点
      this.currentPath.push({ x: this.pathStartX, y: this.pathStartY });
    }
  }

  moveTo(x: number, y: number): void {
    this.currentPath = [{ x, y }];
    this.pathStartX = x;
    this.pathStartY = y;
  }

  lineTo(x: number, y: number): void {
    if (this.currentPath.length === 0) {
      this.moveTo(x, y);
    } else {
      this.currentPath.push({ x, y });
    }
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    // WebGPU 二次贝塞尔曲线实现
    console.log(`WebGPU quadraticCurveTo: ${cpx}, ${cpy}, ${x}, ${y}`);
  }

  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void {
    // WebGPU 三次贝塞尔曲线实现
    console.log(`WebGPU bezierCurveTo: ${cp1x}, ${cp1y}, ${cp2x}, ${cp2y}, ${x}, ${y}`);
  }

  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): void {
    const segments = 32; // 圆弧分段数
    let angleStep: number;
    let currentAngle: number;
    
    if (counterclockwise) {
      // 逆时针方向
      if (endAngle > startAngle) {
        endAngle -= 2 * Math.PI;
      }
      angleStep = (endAngle - startAngle) / segments;
      currentAngle = startAngle;
    } else {
      // 顺时针方向（默认）
      if (endAngle < startAngle) {
        endAngle += 2 * Math.PI;
      }
      angleStep = (endAngle - startAngle) / segments;
      currentAngle = startAngle;
    }
    
    // 如果当前路径为空，移动到起始点
    if (this.currentPath.length === 0) {
      const startX = x + radius * Math.cos(startAngle);
      const startY = y + radius * Math.sin(startAngle);
      this.moveTo(startX, startY);
    } else {
      // 否则连线到起始点
      const startX = x + radius * Math.cos(startAngle);
      const startY = y + radius * Math.sin(startAngle);
      this.lineTo(startX, startY);
    }
    
    // 生成圆弧上的点
    for (let i = 1; i <= segments; i++) {
      const angle = currentAngle + angleStep * i;
      const pointX = x + radius * Math.cos(angle);
      const pointY = y + radius * Math.sin(angle);
      this.lineTo(pointX, pointY);
    }
  }

  rect(x: number, y: number, width: number, height: number): void {
    // 创建矩形路径
    this.moveTo(x, y);
    this.lineTo(x + width, y);
    this.lineTo(x + width, y + height);
    this.lineTo(x, y + height);
    this.closePath();
  }

  // 绘制操作
  fill(): void {
    if (this.currentPath.length < 3) {
      return; // 需要至少3个点才能形成填充区域
    }
    
    if (!this.renderPassEncoder) {
      this.beginRenderPass();
    }
    
    if (this.renderPassEncoder && this.fillRectPipeline) {
      // 使用扇形三角化方法将多边形转换为三角形
      const triangleVertices: number[] = [];
      
      // 以第一个点为中心，将多边形分解为三角形
      const center = this.currentPath[0];
      const centerX = (center.x / this.canvas.width) * 2 - 1;
      const centerY = -((center.y / this.canvas.height) * 2 - 1);
      
      for (let i = 1; i < this.currentPath.length - 1; i++) {
        const current = this.currentPath[i];
        const next = this.currentPath[i + 1];
        
        // 转换到NDC坐标系
        const x1 = (current.x / this.canvas.width) * 2 - 1;
        const y1 = -((current.y / this.canvas.height) * 2 - 1);
        const x2 = (next.x / this.canvas.width) * 2 - 1;
        const y2 = -((next.y / this.canvas.height) * 2 - 1);
        
        // 添加三角形的三个顶点（中心点，当前点，下一个点）
        triangleVertices.push(
          centerX, centerY,
          x1, y1,
          x2, y2
        );
      }
      
      if (triangleVertices.length > 0) {
        const pathVertices = new Float32Array(triangleVertices);
        
        // 创建临时顶点缓冲区
        const pathBuffer = this.device.createBuffer({
          size: pathVertices.byteLength,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        
        this.device.queue.writeBuffer(pathBuffer, 0, pathVertices);
        
        // 设置渲染管道和顶点缓冲区
        this.renderPassEncoder.setPipeline(this.fillRectPipeline);
        this.renderPassEncoder.setVertexBuffer(0, pathBuffer);
        
        // 绘制三角形
        this.renderPassEncoder.draw(triangleVertices.length / 2);
        
        // 清理临时缓冲区
        pathBuffer.destroy();
      }
    }
  }

  stroke(): void {
    if (this.currentPath.length < 2) {
      return; // 需要至少2个点才能绘制线条
    }
    
    if (!this.renderPassEncoder) {
      this.beginRenderPass();
    }
    
    if (this.renderPassEncoder && this.strokeLinePipeline) {
      // 将路径转换为线段顶点数据
      const lineVertices: number[] = [];
      
      for (let i = 0; i < this.currentPath.length - 1; i++) {
        const current = this.currentPath[i];
        const next = this.currentPath[i + 1];
        
        // 转换到NDC坐标系
        const x1 = (current.x / this.canvas.width) * 2 - 1;
        const y1 = -((current.y / this.canvas.height) * 2 - 1);
        const x2 = (next.x / this.canvas.width) * 2 - 1;
        const y2 = -((next.y / this.canvas.height) * 2 - 1);
        
        // 添加线段的两个端点
        lineVertices.push(x1, y1, x2, y2);
      }
      
      if (lineVertices.length > 0) {
        const pathVertices = new Float32Array(lineVertices);
        
        // 创建临时顶点缓冲区
        const pathBuffer = this.device.createBuffer({
          size: pathVertices.byteLength,
          usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        
        this.device.queue.writeBuffer(pathBuffer, 0, pathVertices);
        
        // 设置渲染管道和顶点缓冲区
        this.renderPassEncoder.setPipeline(this.strokeLinePipeline);
        this.renderPassEncoder.setVertexBuffer(0, pathBuffer);
        
        // 绘制线段
        this.renderPassEncoder.draw(lineVertices.length / 2);
        
        // 清理临时缓冲区
        pathBuffer.destroy();
      }
    }
    
    this.endRenderPass();
  }

  // 颜色转换辅助函数
  private colorToString(color: IColor | string | undefined): string {
    if (!color) return 'rgba(0,0,0,1)';
    if (typeof color === 'string') return color;
    return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a})`;
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    // WebGPU 填充矩形实现
    this.beginRenderPass();
    
    if (this.renderPassEncoder && this.fillRectPipeline) {
      // 转换到NDC坐标系
      const x1 = (x / this.canvas.width) * 2 - 1;
      const y1 = -((y / this.canvas.height) * 2 - 1);
      const x2 = ((x + width) / this.canvas.width) * 2 - 1;
      const y2 = -(((y + height) / this.canvas.height) * 2 - 1);
      
      // 创建矩形顶点数据 (两个三角形组成矩形)
      const rectVertices = new Float32Array([
        x1, y1,  // 左上
        x2, y1,  // 右上
        x1, y2,  // 左下
        x1, y2,  // 左下
        x2, y1,  // 右上
        x2, y2   // 右下
      ]);
      
      // 创建临时矩形顶点缓冲区
      const rectBuffer = this.device.createBuffer({
        size: rectVertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
      
      this.device.queue.writeBuffer(rectBuffer, 0, rectVertices);
      
      // 设置渲染管道
      this.renderPassEncoder.setPipeline(this.fillRectPipeline);
      
      // 设置顶点缓冲区
      this.renderPassEncoder.setVertexBuffer(0, rectBuffer);
      
      // 绘制矩形 (6个顶点组成2个三角形)
      this.renderPassEncoder.draw(6);
      
      // 立即销毁临时缓冲区
      this.tempBuffers.push(rectBuffer);
    }
    
    // 提交渲染命令
    this.present();
    
    console.log(`WebGPU fillRect: ${x}, ${y}, ${width}, ${height}`);
  }

  strokeRect(x: number, y: number, width: number, height: number): void {
    // WebGPU 描边矩形实现
    if (!this.renderPassEncoder) {
      this.beginRenderPass();
    }
    
    if (this.renderPassEncoder && this.strokeLinePipeline) {
      // 创建线框矩形的顶点数据 (4条线段，每条线段2个顶点)
      const lineVertices = new Float32Array([
        // 转换到NDC坐标系
        (x / this.canvas.width) * 2 - 1, ((this.canvas.height - y) / this.canvas.height) * 2 - 1,
        ((x + width) / this.canvas.width) * 2 - 1, ((this.canvas.height - y) / this.canvas.height) * 2 - 1,
        
        ((x + width) / this.canvas.width) * 2 - 1, ((this.canvas.height - y) / this.canvas.height) * 2 - 1,
        ((x + width) / this.canvas.width) * 2 - 1, ((this.canvas.height - (y + height)) / this.canvas.height) * 2 - 1,
        
        ((x + width) / this.canvas.width) * 2 - 1, ((this.canvas.height - (y + height)) / this.canvas.height) * 2 - 1,
        (x / this.canvas.width) * 2 - 1, ((this.canvas.height - (y + height)) / this.canvas.height) * 2 - 1,
        
        (x / this.canvas.width) * 2 - 1, ((this.canvas.height - (y + height)) / this.canvas.height) * 2 - 1,
        (x / this.canvas.width) * 2 - 1, ((this.canvas.height - y) / this.canvas.height) * 2 - 1
      ]);
      
      // 创建临时线框顶点缓冲区
      const lineBuffer = this.device.createBuffer({
        size: lineVertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
      
      this.device.queue.writeBuffer(lineBuffer, 0, lineVertices);
      
      // 设置线框渲染管道和顶点缓冲区
      this.renderPassEncoder.setPipeline(this.strokeLinePipeline);
      this.renderPassEncoder.setVertexBuffer(0, lineBuffer);
      
      // 绘制8个顶点组成4条线段
      this.renderPassEncoder.draw(8, 1, 0, 0);
      
      // 将临时缓冲区添加到延迟销毁列表
      this.tempBuffers.push(lineBuffer);
    }
    
    console.log(`WebGPU strokeRect: ${x}, ${y}, ${width}, ${height}`);
  }

  fillCircle(x: number, y: number, radius: number): void {
    // WebGPU 填充圆形实现
    this.beginRenderPass();
    
    if (this.renderPassEncoder && this.fillCirclePipeline) {
      // 生成圆形的三角形顶点数据
      const segments = 32; // 圆形分段数
      const vertices: number[] = [];
      
      // 圆心坐标转换到NDC
      const centerX = (x / this.canvas.width) * 2 - 1;
      const centerY = -((y / this.canvas.height) * 2 - 1);
      const radiusX = (radius / this.canvas.width) * 2;
      const radiusY = (radius / this.canvas.height) * 2;
      
      // 生成扇形三角形
      for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;
        
        // 圆心
        vertices.push(centerX, centerY);
        
        // 第一个边界点
        vertices.push(
          centerX + Math.cos(angle1) * radiusX,
          centerY - Math.sin(angle1) * radiusY  // 注意Y轴翻转
        );
        
        // 第二个边界点
        vertices.push(
          centerX + Math.cos(angle2) * radiusX,
          centerY - Math.sin(angle2) * radiusY  // 注意Y轴翻转
        );
      }
      
      const circleVertices = new Float32Array(vertices);
      
      // 创建临时圆形顶点缓冲区
      const circleBuffer = this.device.createBuffer({
        size: circleVertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
      
      this.device.queue.writeBuffer(circleBuffer, 0, circleVertices);
      
      // 设置圆形渲染管道和顶点缓冲区
      this.renderPassEncoder.setPipeline(this.fillCirclePipeline);
      this.renderPassEncoder.setVertexBuffer(0, circleBuffer);
      
      // 绘制圆形 (segments个三角形，每个三角形3个顶点)
      this.renderPassEncoder.draw(segments * 3);
      
      // 将临时缓冲区添加到延迟销毁列表
      this.tempBuffers.push(circleBuffer);
    }
    
    // 提交渲染命令
    this.present();
    
    console.log(`WebGPU fillCircle: ${x}, ${y}, ${radius}`);
  }

  strokeCircle(x: number, y: number, radius: number): void {
    // WebGPU 描边圆形实现
    if (!this.renderPassEncoder) {
      this.beginRenderPass();
    }
    
    if (this.renderPassEncoder && this.strokeCirclePipeline) {
      // 生成圆形线框的顶点数据
      const segments = 64; // 圆形分段数，线框需要更多分段以保证平滑
      const vertices: number[] = [];
      
      // 圆心坐标转换到NDC
      const centerX = (x / this.canvas.width) * 2 - 1;
      const centerY = ((this.canvas.height - y) / this.canvas.height) * 2 - 1;
      const radiusX = (radius / this.canvas.width) * 2;
      const radiusY = (radius / this.canvas.height) * 2;
      
      // 生成圆形边界线段
      for (let i = 0; i < segments; i++) {
        const angle1 = (i / segments) * Math.PI * 2;
        const angle2 = ((i + 1) / segments) * Math.PI * 2;
        
        // 第一个点
        vertices.push(
          centerX + Math.cos(angle1) * radiusX,
          centerY + Math.sin(angle1) * radiusY
        );
        
        // 第二个点
        vertices.push(
          centerX + Math.cos(angle2) * radiusX,
          centerY + Math.sin(angle2) * radiusY
        );
      }
      
      const circleLineVertices = new Float32Array(vertices);
      
      // 创建临时圆形线框顶点缓冲区
      const circleLineBuffer = this.device.createBuffer({
        size: circleLineVertices.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
      });
      
      this.device.queue.writeBuffer(circleLineBuffer, 0, circleLineVertices);
      
      // 设置圆形线框渲染管道和顶点缓冲区
      this.renderPassEncoder.setPipeline(this.strokeCirclePipeline);
      this.renderPassEncoder.setVertexBuffer(0, circleLineBuffer);
      
      // 绘制圆形线框 (segments条线段，每条线段2个顶点)
      this.renderPassEncoder.draw(segments * 2, 1, 0, 0);
      
      // 将临时缓冲区添加到延迟销毁列表
      this.tempBuffers.push(circleLineBuffer);
    }
    
    console.log(`WebGPU strokeCircle: ${x}, ${y}, ${radius}`);
  }

  // 文本操作
  fillText(text: string, x: number, y: number, style?: ITextStyle): void {
    // WebGPU 填充文本实现
    console.log(`WebGPU fillText: ${text} at ${x}, ${y}`, style ? 'with style' : 'default style');
  }

  strokeText(text: string, x: number, y: number, style?: ITextStyle): void {
    // WebGPU 描边文本实现
    console.log(`WebGPU strokeText: ${text} at ${x}, ${y}`, style ? 'with style' : 'default style');
  }

  measureText(text: string, style?: ITextStyle): { width: number; height: number } {
    // WebGPU 文本测量实现
    console.log('Measuring text:', text, style ? 'with style' : 'default style');
    return { width: text.length * 10, height: 16 }; // 简单估算
  }

  // 图像操作 - 重载方法实现
  drawImage(imageData: IImageData, dx: number, dy: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw: number, dh: number): void;
  drawImage(imageData: IImageData, dx: number, dy: number, dw?: number, dh?: number): void {
    // WebGPU 图像绘制实现
    if (dw !== undefined && dh !== undefined) {
      console.log(`WebGPU drawImage at ${dx}, ${dy} with size ${dw}x${dh}`);
    } else {
      console.log(`WebGPU drawImage at ${dx}, ${dy}`);
    }
  }

  getImageData(x: number, y: number, width: number, height: number): IImageData {
    // WebGPU 获取图像数据实现
    const data = new Uint8ClampedArray(width * height * 4);
    return { width, height, data };
  }

  putImageData(imageData: IImageData, x: number, y: number): void {
    // WebGPU 放置图像数据实现
    console.log(`WebGPU putImageData at ${x}, ${y}`);
  }

  // 裁剪操作
  clip(): void {
    // WebGPU 裁剪实现
    console.log('WebGPU clip');
  }

  clipRect(x: number, y: number, width: number, height: number): void {
    // WebGPU 矩形裁剪实现
    console.log(`WebGPU clipRect: ${x}, ${y}, ${width}, ${height}`);
  }

  // 坐标转换
  screenToWorld(point: IPoint): IPoint {
    // 简单的坐标转换实现
    const t = this.currentState.transform;
    const det = t.a * t.d - t.b * t.c;
    return {
      x: (t.d * (point.x - t.e) - t.c * (point.y - t.f)) / det,
      y: (t.a * (point.y - t.f) - t.b * (point.x - t.e)) / det
    };
  }

  worldToScreen(point: IPoint): IPoint {
    const t = this.currentState.transform;
    return {
      x: t.a * point.x + t.c * point.y + t.e,
      y: t.b * point.x + t.d * point.y + t.f
    };
  }

  // 初始化渲染管道
  private initRenderPipeline(): void {
    // 创建填充矩形着色器模块
    const fillRectShaderModule = this.device.createShaderModule({
      code: `
        @vertex
        fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
          return vec4<f32>(position, 0.0, 1.0);
        }
        
        @fragment
        fn fs_main() -> @location(0) vec4<f32> {
          return vec4<f32>(0.8, 0.2, 0.2, 1.0); // 红色矩形
        }
      `
    });
    
    // 创建线框着色器模块
    const strokeLineShaderModule = this.device.createShaderModule({
      code: `
        @vertex
        fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
          return vec4<f32>(position, 0.0, 1.0);
        }
        
        @fragment
        fn fs_main() -> @location(0) vec4<f32> {
          return vec4<f32>(0.0, 0.0, 0.0, 1.0); // 黑色线条
        }
      `
    });
    
    // 创建填充圆形着色器模块
    const fillCircleShaderModule = this.device.createShaderModule({
      code: `
        @vertex
        fn vs_main(@location(0) position: vec2<f32>) -> @builtin(position) vec4<f32> {
          return vec4<f32>(position, 0.0, 1.0);
        }
        
        @fragment
        fn fs_main() -> @location(0) vec4<f32> {
          return vec4<f32>(0.2, 0.8, 0.2, 1.0); // 绿色圆形
        }
      `
    });
    
    const vertexBufferLayout = {
      arrayStride: 8, // 2 * 4 bytes (vec2<f32>)
      attributes: [{
        format: 'float32x2' as GPUVertexFormat,
        offset: 0,
        shaderLocation: 0
      }]
    };
    
    // 创建填充矩形渲染管道
    this.fillRectPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: fillRectShaderModule,
        entryPoint: 'vs_main',
        buffers: [vertexBufferLayout]
      },
      fragment: {
        module: fillRectShaderModule,
        entryPoint: 'fs_main',
        targets: [{
          format: this.context.getCurrentTexture().format
        }]
      },
      primitive: {
        topology: 'triangle-list'
      }
    });
    
    // 创建线框渲染管道
    this.strokeLinePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: strokeLineShaderModule,
        entryPoint: 'vs_main',
        buffers: [vertexBufferLayout]
      },
      fragment: {
        module: strokeLineShaderModule,
        entryPoint: 'fs_main',
        targets: [{
          format: this.context.getCurrentTexture().format
        }]
      },
      primitive: {
        topology: 'line-list'
      }
    });
    
    // 创建填充圆形渲染管道
    this.fillCirclePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: fillCircleShaderModule,
        entryPoint: 'vs_main',
        buffers: [vertexBufferLayout]
      },
      fragment: {
        module: fillCircleShaderModule,
        entryPoint: 'fs_main',
        targets: [{
          format: this.context.getCurrentTexture().format
        }]
      },
      primitive: {
        topology: 'triangle-list'
      }
    });
    
    // 创建圆形线框渲染管道
    this.strokeCirclePipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: strokeLineShaderModule,
        entryPoint: 'vs_main',
        buffers: [vertexBufferLayout]
      },
      fragment: {
        module: strokeLineShaderModule,
        entryPoint: 'fs_main',
        targets: [{
          format: this.context.getCurrentTexture().format
        }]
      },
      primitive: {
        topology: 'line-list'
      }
    });
  }
  
  // 资源清理
  dispose(): void {
    // 清理 WebGPU 资源
    this.vertexBuffer?.destroy();
    this.uniformBuffer?.destroy();
    
    // 清理渲染管道
    this.fillRectPipeline = undefined;
    this.strokeLinePipeline = undefined;
    this.fillCirclePipeline = undefined;
    this.strokeCirclePipeline = undefined;
    this.clearRectPipeline = undefined;
    this.renderPassEncoder = undefined;
    this.commandEncoder = undefined;
    
    console.log('WebGPU context disposed');
  }

  // WebGPU 特有的辅助方法
  private beginRenderPass(): void {
    // 如果已经有渲染通道在进行，先结束它
    if (this.renderPassEncoder) {
      this.endRenderPass();
    }
    
    // 创建新的命令编码器
    this.commandEncoder = this.device.createCommandEncoder();
    
    const renderPassDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
        loadOp: 'load' as const,  // 改为load以避免每次都清除
        storeOp: 'store' as const
      }]
    };
    this.renderPassEncoder = this.commandEncoder.beginRenderPass(renderPassDescriptor);
  }

  private endRenderPass(): void {
    if (this.renderPassEncoder) {
      this.renderPassEncoder.end();
      this.renderPassEncoder = undefined;
    }
    
    if (this.commandEncoder) {
      const commandBuffer = this.commandEncoder.finish();
      this.device.queue.submit([commandBuffer]);
      this.commandEncoder = undefined;
    }
    
    // 销毁所有临时缓冲区
    this.tempBuffers.forEach(buffer => {
      try {
        buffer.destroy();
      } catch (e) {
        console.warn('Failed to destroy buffer:', e);
      }
    });
    this.tempBuffers = [];
  }

  // 手动提交当前渲染通道
  present(): void {
    this.endRenderPass();
  }
}

/**
 * WebGPU 图形上下文工厂
 */
export class WebGPUGraphicsContextFactory implements IGraphicsContextFactory<HTMLCanvasElement> {
  async createContext(canvas: HTMLCanvasElement): Promise<IGraphicsContext> {
    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported in this browser');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('Failed to get WebGPU adapter');
    }

    const device = await adapter.requestDevice();
    const context = canvas.getContext('webgpu') as unknown as GPUCanvasContext;
    if (!context) {
      throw new Error('Failed to get WebGPU context');
    }

    // 配置 WebGPU 上下文
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({
      device,
      format,
      alphaMode: 'premultiplied'
    });

    return new WebGPUGraphicsContext(device, context, canvas);
  }

  isSupported(): boolean {
    return 'gpu' in navigator;
  }

  getCapabilities(): IGraphicsCapabilities {
    return {
      supportsHardwareAcceleration: true,
      supportsTransforms: true,
      supportsFilters: true,
      supportsBlending: true,
      maxTextureSize: 8192, // WebGPU 通常支持的最大纹理尺寸
      supportedFormats: ['rgba8unorm', 'bgra8unorm']
    };
  }
}