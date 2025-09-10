/**
 * WebGL渲染器
 * 提供2D图像处理的WebGL渲染功能
 */

import { WebGLShaderManager, ShaderUniforms } from './WebGLShaderManager';

export interface WebGLRenderOptions {
  width: number;
  height: number;
  flipY?: boolean;
  preserveDrawingBuffer?: boolean;
}

export class WebGLRenderer {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext;
  private shaderManager: WebGLShaderManager;
  private frameBuffer: WebGLFramebuffer | null = null;
  private texture: WebGLTexture | null = null;
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;

  // 标准四边形顶点（用于渲染纹理）
  private readonly quadVertices = new Float32Array([
    // 位置     纹理坐标
    -1, -1,     0, 0,
     1, -1,     1, 0,
     1,  1,     1, 1,
    -1,  1,     0, 1
  ]);

  private readonly quadIndices = new Uint16Array([
    0, 1, 2,
    0, 2, 3
  ]);

  constructor(options: Partial<WebGLRenderOptions> = {}) {
    this.canvas = this.createCanvas(options);
    
    const gl = this.canvas.getContext('webgl', {
      preserveDrawingBuffer: options.preserveDrawingBuffer ?? false,
      premultipliedAlpha: false,
      alpha: true
    });

    if (!gl) {
      throw new Error('WebGL not supported');
    }

    this.gl = gl;
    this.shaderManager = new WebGLShaderManager(gl);
    this.setupBuffers();
  }

  /**
   * 创建画布
   */
  private createCanvas(options: Partial<WebGLRenderOptions>): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = options.width || 512;
    canvas.height = options.height || 512;
    return canvas;
  }

  /**
   * 设置顶点缓冲区
   */
  private setupBuffers(): void {
    const gl = this.gl;

    // 创建顶点缓冲区
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.quadVertices, gl.STATIC_DRAW);

    // 创建索引缓冲区
    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.quadIndices, gl.STATIC_DRAW);
  }

  /**
   * 从ImageData创建纹理
   */
  createTexture(imageData: ImageData): WebGLTexture | null {
    const gl = this.gl;
    const texture = gl.createTexture();
    
    if (!texture) {
      console.error('Failed to create texture');
      return null;
    }

    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // 设置纹理参数
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // 上传图像数据
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      imageData.width,
      imageData.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      imageData.data
    );

    return texture;
  }

  /**
   * 渲染纹理使用自定义着色器
   */
  renderWithShader(
    programId: string,
    inputTexture: WebGLTexture,
    uniforms: ShaderUniforms = {},
    outputWidth: number,
    outputHeight: number
  ): ImageData | null {
    const gl = this.gl;
    
    // 调整画布尺寸
    if (this.canvas.width !== outputWidth || this.canvas.height !== outputHeight) {
      this.canvas.width = outputWidth;
      this.canvas.height = outputHeight;
      gl.viewport(0, 0, outputWidth, outputHeight);
    }

    // 使用着色器程序
    const program = this.shaderManager.useProgram(programId);
    if (!program) {
      console.error(`Failed to use shader program: ${programId}`);
      return null;
    }

    // 绑定顶点缓冲区
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);

    // 设置属性
    const positionLocation = program.attributes['a_position'];
    const texCoordLocation = program.attributes['a_texCoord'];

    if (positionLocation !== undefined) {
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
    }

    if (texCoordLocation !== undefined) {
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);
    }

    // 绑定输入纹理
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);

    // 设置标准uniforms
    const standardUniforms: ShaderUniforms = {
      u_image: inputTexture,
      u_resolution: [outputWidth, outputHeight],
      u_time: performance.now() / 1000,
      ...uniforms
    };

    this.shaderManager.setUniforms(standardUniforms);

    // 清除画布
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 渲染
    gl.drawElements(gl.TRIANGLES, this.quadIndices.length, gl.UNSIGNED_SHORT, 0);

    // 读取像素数据
    const pixels = new Uint8ClampedArray(outputWidth * outputHeight * 4);
    gl.readPixels(0, 0, outputWidth, outputHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

    // 创建ImageData（注意Y轴翻转）
    const imageData = new ImageData(outputWidth, outputHeight);
    for (let y = 0; y < outputHeight; y++) {
      for (let x = 0; x < outputWidth; x++) {
        const srcIndex = (y * outputWidth + x) * 4;
        const dstIndex = ((outputHeight - 1 - y) * outputWidth + x) * 4;
        
        imageData.data[dstIndex] = pixels[srcIndex];
        imageData.data[dstIndex + 1] = pixels[srcIndex + 1];
        imageData.data[dstIndex + 2] = pixels[srcIndex + 2];
        imageData.data[dstIndex + 3] = pixels[srcIndex + 3];
      }
    }

    return imageData;
  }

  /**
   * 创建着色器程序
   */
  createShaderProgram(
    id: string,
    vertexShader: string,
    fragmentShader: string
  ): boolean {
    const program = this.shaderManager.createProgram(id, vertexShader, fragmentShader);
    return program !== null;
  }

  /**
   * 删除纹理
   */
  deleteTexture(texture: WebGLTexture): void {
    this.gl.deleteTexture(texture);
  }

  /**
   * 获取WebGL上下文
   */
  getContext(): WebGLRenderingContext {
    return this.gl;
  }

  /**
   * 获取着色器管理器
   */
  getShaderManager(): WebGLShaderManager {
    return this.shaderManager;
  }

  /**
   * 获取画布
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * 检查WebGL扩展支持
   */
  checkExtensionSupport(extensionName: string): boolean {
    return this.gl.getExtension(extensionName) !== null;
  }

  /**
   * 获取WebGL信息
   */
  getWebGLInfo(): {
    vendor: string;
    renderer: string;
    version: string;
    shadingLanguageVersion: string;
    maxTextureSize: number;
    maxVertexTextureImageUnits: number;
    maxFragmentTextureImageUnits: number;
  } {
    const gl = this.gl;
    return {
      vendor: gl.getParameter(gl.VENDOR),
      renderer: gl.getParameter(gl.RENDERER),
      version: gl.getParameter(gl.VERSION),
      shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      maxVertexTextureImageUnits: gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS),
      maxFragmentTextureImageUnits: gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS)
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    const gl = this.gl;
    
    if (this.frameBuffer) {
      gl.deleteFramebuffer(this.frameBuffer);
      this.frameBuffer = null;
    }

    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }

    if (this.vertexBuffer) {
      gl.deleteBuffer(this.vertexBuffer);
      this.vertexBuffer = null;
    }

    if (this.indexBuffer) {
      gl.deleteBuffer(this.indexBuffer);
      this.indexBuffer = null;
    }

    this.shaderManager.dispose();
  }

  /**
   * 检查WebGL错误
   */
  checkError(operation: string): boolean {
    const gl = this.gl;
    const error = gl.getError();
    
    if (error !== gl.NO_ERROR) {
      let errorString = 'Unknown error';
      switch (error) {
        case gl.INVALID_ENUM:
          errorString = 'INVALID_ENUM';
          break;
        case gl.INVALID_VALUE:
          errorString = 'INVALID_VALUE';
          break;
        case gl.INVALID_OPERATION:
          errorString = 'INVALID_OPERATION';
          break;
        case gl.OUT_OF_MEMORY:
          errorString = 'OUT_OF_MEMORY';
          break;
        case gl.CONTEXT_LOST_WEBGL:
          errorString = 'CONTEXT_LOST_WEBGL';
          break;
      }
      
      console.error(`WebGL error during ${operation}: ${errorString} (${error})`);
      return false;
    }
    
    return true;
  }
}