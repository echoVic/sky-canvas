/**
 * 自定义着色器滤镜实现
 * 支持用户编写GLSL着色器进行自定义图像处理
 */

import { BaseFilter } from './BaseFilter';
import {
  FilterType,
  FilterParameters,
  FilterContext,
  CustomShaderParameters
} from '../types/FilterTypes';
import { WebGLRenderer } from '../webgl/WebGLRenderer';
import { WebGLShaderManager } from '../webgl/WebGLShaderManager';

export class CustomShaderFilter extends BaseFilter {
  readonly type = FilterType.CUSTOM_SHADER;
  readonly name = 'Custom Shader';
  readonly description = 'Apply custom GLSL shaders for advanced image effects';
  readonly supportedInputFormats = ['image/png', 'image/jpeg', 'image/webp'];
  readonly requiresWebGL = true;

  private static renderer: WebGLRenderer | null = null;
  private static rendererRefCount = 0;

  /**
   * 获取WebGL渲染器实例（单例）
   */
  private static getRenderer(): WebGLRenderer {
    if (!CustomShaderFilter.renderer) {
      try {
        CustomShaderFilter.renderer = new WebGLRenderer({
          width: 1024,
          height: 1024,
          preserveDrawingBuffer: false
        });
      } catch (error) {
        throw new Error(`Failed to initialize WebGL renderer: ${error}`);
      }
    }
    CustomShaderFilter.rendererRefCount++;
    return CustomShaderFilter.renderer;
  }

  /**
   * 释放WebGL渲染器
   */
  private static releaseRenderer(): void {
    CustomShaderFilter.rendererRefCount--;
    if (CustomShaderFilter.rendererRefCount <= 0 && CustomShaderFilter.renderer) {
      CustomShaderFilter.renderer.dispose();
      CustomShaderFilter.renderer = null;
      CustomShaderFilter.rendererRefCount = 0;
    }
  }

  /**
   * 处理自定义着色器滤镜
   */
  protected async processFilter(
    context: FilterContext,
    parameters: FilterParameters
  ): Promise<ImageData> {
    const params = parameters as CustomShaderParameters;
    const { sourceImageData } = context;

    // 检查WebGL支持
    if (!this.checkWebGLSupport()) {
      throw new Error('WebGL is not supported or available');
    }

    const renderer = CustomShaderFilter.getRenderer();
    
    try {
      // 创建唯一的程序ID
      const programId = this.generateProgramId(params);
      
      // 编译着色器程序
      const success = this.compileShaderProgram(renderer, programId, params);
      if (!success) {
        throw new Error('Failed to compile shader program');
      }

      // 创建输入纹理
      const inputTexture = renderer.createTexture(sourceImageData);
      if (!inputTexture) {
        throw new Error('Failed to create input texture');
      }

      try {
        // 渲染
        const result = renderer.renderWithShader(
          programId,
          inputTexture,
          params.uniforms || {},
          sourceImageData.width,
          sourceImageData.height
        );

        if (!result) {
          throw new Error('Shader rendering failed');
        }

        return result;
      } finally {
        // 清理纹理
        renderer.deleteTexture(inputTexture);
      }
    } finally {
      CustomShaderFilter.releaseRenderer();
    }
  }

  /**
   * 编译着色器程序
   */
  private compileShaderProgram(
    renderer: WebGLRenderer,
    programId: string,
    params: CustomShaderParameters
  ): boolean {
    // 验证着色器代码
    const vertexErrors = WebGLShaderManager.validateShaderCode('vertex', params.vertexShader);
    const fragmentErrors = WebGLShaderManager.validateShaderCode('fragment', params.fragmentShader);

    if (vertexErrors.length > 0) {
      console.error('Vertex shader validation errors:', vertexErrors);
      return false;
    }

    if (fragmentErrors.length > 0) {
      console.error('Fragment shader validation errors:', fragmentErrors);
      return false;
    }

    // 创建着色器程序
    return renderer.createShaderProgram(
      programId,
      params.vertexShader,
      params.fragmentShader
    );
  }

  /**
   * 生成程序ID
   */
  private generateProgramId(params: CustomShaderParameters): string {
    // 使用着色器代码的哈希作为ID
    const content = params.vertexShader + params.fragmentShader;
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `custom_shader_${Math.abs(hash).toString(36)}`;
  }

  /**
   * 检查WebGL支持
   */
  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return gl !== null;
    } catch {
      return false;
    }
  }

  /**
   * 验证自定义着色器参数
   */
  protected validateSpecificParameters(parameters: FilterParameters): boolean {
    const params = parameters as CustomShaderParameters;

    if (typeof params.vertexShader !== 'string' || !params.vertexShader.trim()) {
      return false;
    }

    if (typeof params.fragmentShader !== 'string' || !params.fragmentShader.trim()) {
      return false;
    }

    // 验证着色器代码基本语法
    const vertexErrors = WebGLShaderManager.validateShaderCode('vertex', params.vertexShader);
    const fragmentErrors = WebGLShaderManager.validateShaderCode('fragment', params.fragmentShader);

    return vertexErrors.length === 0 && fragmentErrors.length === 0;
  }

  /**
   * 获取默认参数
   */
  getDefaultParameters(): CustomShaderParameters {
    return {
      type: FilterType.CUSTOM_SHADER,
      vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
      fragmentShader: this.getDefaultFragmentShader(),
      uniforms: {},
      enabled: true,
      opacity: 1
    };
  }

  /**
   * 获取默认片段着色器
   */
  private getDefaultFragmentShader(): string {
    return `
      precision mediump float;
      
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform float u_time;
      
      varying vec2 v_texCoord;
      
      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        gl_FragColor = color;
      }
    `;
  }

  /**
   * 获取复杂度因子
   */
  protected getComplexityFactor(parameters: FilterParameters): number {
    // 自定义着色器复杂度难以预测，使用中等值
    return 2.0;
  }

  /**
   * 获取基础处理时间（每像素）
   */
  protected getBaseProcessingTimePerPixel(): number {
    return 0.003; // GPU处理相对较快，但有初始化开销
  }

  /**
   * 创建预设效果着色器
   */
  static createPresetShaders(): Record<string, CustomShaderParameters> {
    return {
      // 边缘检测
      edgeDetection: {
        type: FilterType.CUSTOM_SHADER,
        vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_image;
          uniform vec2 u_resolution;
          varying vec2 v_texCoord;
          
          void main() {
            vec2 texel = 1.0 / u_resolution;
            
            // Sobel边缘检测
            vec3 tl = texture2D(u_image, v_texCoord + vec2(-texel.x, -texel.y)).rgb;
            vec3 tm = texture2D(u_image, v_texCoord + vec2(0.0, -texel.y)).rgb;
            vec3 tr = texture2D(u_image, v_texCoord + vec2(texel.x, -texel.y)).rgb;
            vec3 ml = texture2D(u_image, v_texCoord + vec2(-texel.x, 0.0)).rgb;
            vec3 mr = texture2D(u_image, v_texCoord + vec2(texel.x, 0.0)).rgb;
            vec3 bl = texture2D(u_image, v_texCoord + vec2(-texel.x, texel.y)).rgb;
            vec3 bm = texture2D(u_image, v_texCoord + vec2(0.0, texel.y)).rgb;
            vec3 br = texture2D(u_image, v_texCoord + vec2(texel.x, texel.y)).rgb;
            
            vec3 gx = -tl - 2.0*ml - bl + tr + 2.0*mr + br;
            vec3 gy = -tl - 2.0*tm - tr + bl + 2.0*bm + br;
            
            float edge = length(sqrt(gx*gx + gy*gy));
            gl_FragColor = vec4(vec3(edge), 1.0);
          }
        `,
        uniforms: {},
        enabled: true,
        opacity: 1
      },

      // 色彩反转
      invert: {
        type: FilterType.CUSTOM_SHADER,
        vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_image;
          varying vec2 v_texCoord;
          
          void main() {
            vec4 color = texture2D(u_image, v_texCoord);
            gl_FragColor = vec4(1.0 - color.rgb, color.a);
          }
        `,
        uniforms: {},
        enabled: true,
        opacity: 1
      },

      // 旋涡效果
      swirl: {
        type: FilterType.CUSTOM_SHADER,
        vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_image;
          uniform vec2 u_resolution;
          uniform float u_time;
          varying vec2 v_texCoord;
          
          void main() {
            vec2 center = vec2(0.5, 0.5);
            vec2 coord = v_texCoord - center;
            
            float distance = length(coord);
            float angle = atan(coord.y, coord.x);
            
            // 旋涡强度随距离衰减
            float swirl = sin(u_time) * 3.0 * (1.0 - distance);
            angle += swirl;
            
            vec2 swirlCoord = vec2(
              cos(angle) * distance,
              sin(angle) * distance
            ) + center;
            
            gl_FragColor = texture2D(u_image, swirlCoord);
          }
        `,
        uniforms: {},
        enabled: true,
        opacity: 1
      },

      // 马赛克效果
      pixelate: {
        type: FilterType.CUSTOM_SHADER,
        vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_image;
          uniform vec2 u_resolution;
          uniform float u_pixelSize;
          varying vec2 v_texCoord;
          
          void main() {
            float pixelSize = u_pixelSize > 0.0 ? u_pixelSize : 8.0;
            vec2 coord = floor(v_texCoord * u_resolution / pixelSize) * pixelSize / u_resolution;
            gl_FragColor = texture2D(u_image, coord);
          }
        `,
        uniforms: {
          u_pixelSize: 8.0
        },
        enabled: true,
        opacity: 1
      }
    };
  }

  /**
   * 销毁滤镜时的清理
   */
  dispose(): void {
    super.dispose();
    CustomShaderFilter.releaseRenderer();
  }
}