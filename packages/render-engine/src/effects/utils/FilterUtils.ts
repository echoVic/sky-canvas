/**
 * 滤镜工具函数
 * 提供滤镜相关的实用工具和辅助函数
 */

import {
  FilterType,
  FilterParameters,
  GaussianBlurParameters,
  BrightnessParameters,
  ContrastParameters,
  SaturationParameters,
  HueRotateParameters,
  GrayscaleParameters,
  DropShadowParameters,
  InnerShadowParameters,
  GlowParameters,
  CustomShaderParameters
} from '../types/FilterTypes';
import { ShaderPresets } from '../presets/ShaderPresets';
import { WebGLShaderManager } from '../webgl/WebGLShaderManager';

export class FilterUtils {
  /**
   * 创建高斯模糊滤镜参数
   */
  static createGaussianBlur(
    radius: number = 5,
    quality: 'low' | 'medium' | 'high' = 'medium',
    opacity: number = 1
  ): GaussianBlurParameters {
    return {
      type: FilterType.GAUSSIAN_BLUR,
      radius: Math.max(0, Math.min(100, radius)),
      quality,
      opacity: Math.max(0, Math.min(1, opacity)),
      enabled: true
    };
  }

  /**
   * 创建亮度调整滤镜参数
   */
  static createBrightness(
    brightness: number = 0,
    opacity: number = 1
  ): BrightnessParameters {
    return {
      type: FilterType.BRIGHTNESS,
      brightness: Math.max(-100, Math.min(100, brightness)),
      opacity: Math.max(0, Math.min(1, opacity)),
      enabled: true
    };
  }

  /**
   * 创建对比度调整滤镜参数
   */
  static createContrast(
    contrast: number = 0,
    opacity: number = 1
  ): ContrastParameters {
    return {
      type: FilterType.CONTRAST,
      contrast: Math.max(-100, Math.min(100, contrast)),
      opacity: Math.max(0, Math.min(1, opacity)),
      enabled: true
    };
  }

  /**
   * 创建饱和度调整滤镜参数
   */
  static createSaturation(
    saturation: number = 0,
    opacity: number = 1
  ): SaturationParameters {
    return {
      type: FilterType.SATURATION,
      saturation: Math.max(-100, Math.min(100, saturation)),
      opacity: Math.max(0, Math.min(1, opacity)),
      enabled: true
    };
  }

  /**
   * 创建色相旋转滤镜参数
   */
  static createHueRotate(
    angle: number = 0,
    opacity: number = 1
  ): HueRotateParameters {
    return {
      type: FilterType.HUE_ROTATE,
      angle: angle % 360,
      opacity: Math.max(0, Math.min(1, opacity)),
      enabled: true
    };
  }

  /**
   * 创建灰度滤镜参数
   */
  static createGrayscale(
    amount: number = 1,
    opacity: number = 1
  ): GrayscaleParameters {
    return {
      type: FilterType.GRAYSCALE,
      amount: Math.max(0, Math.min(1, amount)),
      opacity: Math.max(0, Math.min(1, opacity)),
      enabled: true
    };
  }

  /**
   * 创建投影参数
   */
  static createDropShadow(
    offsetX: number = 4,
    offsetY: number = 4,
    blur: number = 4,
    color: string = '#000000',
    opacity: number = 0.5
  ): DropShadowParameters {
    return {
      type: FilterType.DROP_SHADOW,
      offsetX,
      offsetY,
      blur: Math.max(0, blur),
      color,
      opacity: Math.max(0, Math.min(1, opacity)),
      enabled: true
    };
  }

  /**
   * 创建内阴影参数
   */
  static createInnerShadow(
    offsetX: number = 2,
    offsetY: number = 2,
    blur: number = 4,
    color: string = '#000000',
    opacity: number = 0.5
  ): InnerShadowParameters {
    return {
      type: FilterType.INNER_SHADOW,
      offsetX,
      offsetY,
      blur: Math.max(0, blur),
      color,
      opacity: Math.max(0, Math.min(1, opacity)),
      enabled: true
    };
  }

  /**
   * 创建发光参数
   */
  static createGlow(
    color: string = '#ffffff',
    blur: number = 8,
    strength: number = 1.5,
    quality: 'low' | 'medium' | 'high' = 'medium'
  ): GlowParameters {
    return {
      type: FilterType.GLOW,
      color,
      blur: Math.max(0, blur),
      strength: Math.max(0, strength),
      quality,
      enabled: true,
      opacity: 1
    };
  }

  /**
   * 创建复古效果滤镜链
   */
  static createVintageEffect(): FilterParameters[] {
    return [
      this.createSaturation(-20), // 降低饱和度
      this.createContrast(15),     // 增加对比度
      this.createBrightness(10),   // 稍微提亮
      this.createHueRotate(5)      // 轻微色相偏移
    ];
  }

  /**
   * 创建黑白电影效果
   */
  static createFilmNoirEffect(): FilterParameters[] {
    return [
      this.createGrayscale(1),     // 完全灰度化
      this.createContrast(25),     // 高对比度
      this.createBrightness(-5)    // 略微变暗
    ];
  }

  /**
   * 创建梦幻效果
   */
  static createDreamEffect(): FilterParameters[] {
    return [
      this.createGaussianBlur(2, 'medium'), // 轻微模糊
      this.createBrightness(15),             // 提亮
      this.createSaturation(20),             // 增加饱和度
      this.createContrast(-10)               // 降低对比度
    ];
  }

  /**
   * 创建冷色调效果
   */
  static createCoolToneEffect(): FilterParameters[] {
    return [
      this.createHueRotate(180),   // 色相偏向蓝色
      this.createSaturation(10),   // 略微增加饱和度
      this.createBrightness(5)     // 稍微提亮
    ];
  }

  /**
   * 创建暖色调效果
   */
  static createWarmToneEffect(): FilterParameters[] {
    return [
      this.createHueRotate(30),    // 色相偏向橙色
      this.createSaturation(15),   // 增加饱和度
      this.createBrightness(8),    // 稍微提亮
      this.createContrast(5)       // 轻微增加对比度
    ];
  }

  /**
   * 创建自定义着色器参数
   */
  static createCustomShader(
    vertexShader?: string,
    fragmentShader?: string,
    uniforms?: Record<string, any>
  ): CustomShaderParameters {
    return {
      type: FilterType.CUSTOM_SHADER,
      vertexShader: vertexShader || WebGLShaderManager.DEFAULT_VERTEX_SHADER,
      fragmentShader: fragmentShader || this.getDefaultFragmentShader(),
      uniforms: uniforms || {},
      enabled: true,
      opacity: 1
    };
  }

  /**
   * 从预设创建自定义着色器
   */
  static createShaderFromPreset(presetId: string): CustomShaderParameters | null {
    const preset = ShaderPresets.getPreset(presetId);
    if (!preset) {
      console.warn(`Shader preset '${presetId}' not found`);
      return null;
    }
    return { ...preset.parameters };
  }

  /**
   * 获取默认片段着色器
   */
  private static getDefaultFragmentShader(): string {
    return `
      precision mediump float;
      uniform sampler2D u_image;
      varying vec2 v_texCoord;
      
      void main() {
        gl_FragColor = texture2D(u_image, v_texCoord);
      }
    `;
  }

  /**
   * 创建用户友好的着色器函数
   */
  static createUserShader(userFunction: string, uniforms?: Record<string, any>): CustomShaderParameters {
    const fragmentShader = WebGLShaderManager.createUserFragmentShader(userFunction);
    return this.createCustomShader(undefined, fragmentShader, uniforms);
  }

  /**
   * 创建发光文字效果
   */
  static createGlowTextEffect(): FilterParameters[] {
    return [
      this.createGlow('#00ff88', 12, 2, 'high'),  // 绿色发光
      this.createBrightness(10),                  // 稍微提亮
      this.createContrast(15)                     // 增加对比度
    ];
  }

  /**
   * 创建霓虹效果
   */
  static createNeonEffect(): FilterParameters[] {
    return [
      this.createGlow('#ff0080', 15, 2.5, 'high'), // 粉色强烈发光
      this.createSaturation(30),                    // 高饱和度
      this.createContrast(25),                      // 高对比度
      this.createBrightness(20)                     // 提亮
    ];
  }

  /**
   * 创建深度阴影效果
   */
  static createDeepShadowEffect(): FilterParameters[] {
    return [
      this.createDropShadow(6, 8, 12, '#000000', 0.8), // 深黑阴影
      this.createContrast(10),                          // 稍微增加对比度
      this.createBrightness(5)                          // 轻微提亮主体
    ];
  }

  /**
   * 创建软阴影效果
   */
  static createSoftShadowEffect(): FilterParameters[] {
    return [
      this.createDropShadow(2, 4, 8, '#666666', 0.4),  // 软灰阴影
      this.createInnerShadow(-1, -1, 3, '#ffffff', 0.3), // 轻微高光
      this.createBrightness(5)                          // 稍微提亮
    ];
  }

  /**
   * 创建浮雕效果
   */
  static createEmbossEffect(): FilterParameters[] {
    return [
      this.createInnerShadow(2, 2, 4, '#000000', 0.6),   // 暗部内阴影
      this.createDropShadow(-1, -1, 2, '#ffffff', 0.8),  // 亮部外阴影
      this.createContrast(20),                            // 增加对比度
      this.createSaturation(-20)                          // 降低饱和度
    ];
  }

  /**
   * 从Canvas获取ImageData
   */
  static getImageDataFromCanvas(canvas: HTMLCanvasElement): ImageData {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get 2D context from canvas');
    }
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  /**
   * 将ImageData绘制到Canvas
   */
  static putImageDataToCanvas(canvas: HTMLCanvasElement, imageData: ImageData): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Cannot get 2D context from canvas');
    }
    
    // 调整canvas尺寸
    if (canvas.width !== imageData.width || canvas.height !== imageData.height) {
      canvas.width = imageData.width;
      canvas.height = imageData.height;
    }
    
    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * 从Image对象创建ImageData
   */
  static async createImageDataFromImage(image: HTMLImageElement): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Cannot create 2D context'));
        return;
      }
      
      canvas.width = image.width || image.naturalWidth;
      canvas.height = image.height || image.naturalHeight;
      
      image.onload = () => {
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      };
      
      image.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      // 如果图像已经加载
      if (image.complete) {
        ctx.drawImage(image, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      }
    });
  }

  /**
   * 将ImageData转换为Blob
   */
  static imageDataToBlob(imageData: ImageData, quality: number = 0.9): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Cannot create 2D context'));
        return;
      }
      
      canvas.width = imageData.width;
      canvas.height = imageData.height;
      ctx.putImageData(imageData, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png', quality);
    });
  }

  /**
   * 将ImageData转换为DataURL
   */
  static imageDataToDataURL(imageData: ImageData, format: string = 'image/png', quality: number = 0.9): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Cannot create 2D context');
    }
    
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    
    return canvas.toDataURL(format, quality);
  }

  /**
   * 比较两个ImageData是否相同
   */
  static compareImageData(imageData1: ImageData, imageData2: ImageData): boolean {
    if (imageData1.width !== imageData2.width || imageData1.height !== imageData2.height) {
      return false;
    }
    
    const data1 = imageData1.data;
    const data2 = imageData2.data;
    
    if (data1.length !== data2.length) {
      return false;
    }
    
    for (let i = 0; i < data1.length; i++) {
      if (data1[i] !== data2[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 计算ImageData的哈希值（用于缓存）
   */
  static hashImageData(imageData: ImageData): string {
    let hash = 0;
    const data = imageData.data;
    
    // 采样策略：每隔一定步长采样像素
    const step = Math.max(1, Math.floor(data.length / 1000));
    
    for (let i = 0; i < data.length; i += step) {
      hash = ((hash << 5) - hash + data[i]) & 0xffffffff;
    }
    
    return `${imageData.width}x${imageData.height}_${hash.toString(36)}`;
  }

  /**
   * 创建测试图像数据
   */
  static createTestImageData(width: number = 100, height: number = 100): ImageData {
    const imageData = new ImageData(width, height);
    const data = imageData.data;
    
    // 创建彩虹渐变测试图案
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4;
        
        // 彩虹色相基于位置
        const hue = (x / width) * 360;
        const saturation = y / height;
        const lightness = 0.5;
        
        const rgb = this.hslToRgb(hue, saturation, lightness);
        
        data[index] = rgb.r;     // Red
        data[index + 1] = rgb.g; // Green
        data[index + 2] = rgb.b; // Blue
        data[index + 3] = 255;   // Alpha
      }
    }
    
    return imageData;
  }

  /**
   * HSL到RGB转换辅助函数
   */
  private static hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    h = h / 360; // 转换为0-1范围
    
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;

    if (s === 0) {
      r = g = b = l; // 无饱和度时为灰度
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return {
      r: Math.round(r * 255),
      g: Math.round(g * 255),
      b: Math.round(b * 255)
    };
  }

  /**
   * 创建边缘检测效果
   */
  static createEdgeDetectionEffect(): FilterParameters[] {
    const edgeShader = this.createShaderFromPreset('edgeDetection');
    if (!edgeShader) return [];
    
    return [
      edgeShader,
      this.createContrast(20),  // 增强对比度
      this.createBrightness(10) // 稍微提亮
    ];
  }

  /**
   * 创建油画艺术效果
   */
  static createOilPaintingEffect(): FilterParameters[] {
    const oilPaintingShader = this.createShaderFromPreset('oilPainting');
    if (!oilPaintingShader) return [];
    
    return [
      oilPaintingShader,
      this.createSaturation(15),    // 增加饱和度
      this.createContrast(10)       // 轻微增加对比度
    ];
  }

  /**
   * 创建科幻效果
   */
  static createSciFiEffect(): FilterParameters[] {
    const swirlShader = this.createShaderFromPreset('swirl');
    if (!swirlShader) return [];
    
    return [
      swirlShader,
      this.createHueRotate(120),       // 色相偏移
      this.createSaturation(30),       // 高饱和度
      this.createGlow('#00ffff', 8, 1.5, 'high'), // 蓝色发光
      this.createContrast(25)          // 高对比度
    ];
  }

  /**
   * 创建像素艺术效果
   */
  static createPixelArtEffect(): FilterParameters[] {
    const pixelateShader = this.createShaderFromPreset('pixelate');
    if (!pixelateShader) return [];
    
    // 调整像素化参数
    pixelateShader.uniforms = { u_pixelSize: 12.0 };
    
    return [
      pixelateShader,
      this.createContrast(20),      // 增强对比度
      this.createSaturation(25)     // 增强饱和度
    ];
  }

  /**
   * 创建报纸印刷效果
   */
  static createNewspaperEffect(): FilterParameters[] {
    const halftoneShader = this.createShaderFromPreset('halftone');
    if (!halftoneShader) return [];
    
    return [
      this.createGrayscale(1),      // 先转为灰度
      halftoneShader,
      this.createContrast(30)       // 高对比度
    ];
  }

  /**
   * 创建怀旧相片效果
   */
  static createVintagePhotoEffect(): FilterParameters[] {
    const sepiaShader = this.createShaderFromPreset('sepia');
    if (!sepiaShader) return [];
    
    return [
      sepiaShader,
      this.createSaturation(-10),       // 降低饱和度
      this.createContrast(15),          // 增加对比度
      this.createBrightness(8),         // 稍微提亮
      this.createDropShadow(0, 0, 20, '#000000', 0.3) // 轻微暗角
    ];
  }

  /**
   * 创建魔幻效果
   */
  static createMagicalEffect(): FilterParameters[] {
    const colorizeShader = this.createShaderFromPreset('colorize');
    if (!colorizeShader) return [];
    
    // 设置紫色调
    colorizeShader.uniforms = {
      u_color: [0.8, 0.3, 1.0],
      u_amount: 0.6
    };
    
    return [
      colorizeShader,
      this.createGlow('#9f4fff', 15, 2, 'high'), // 紫色发光
      this.createSaturation(20),                 // 增加饱和度
      this.createContrast(15),                   // 增加对比度
      this.createBrightness(10)                  // 提亮
    ];
  }

  /**
   * 获取所有可用的着色器预设ID
   */
  static getAvailableShaderPresets(): string[] {
    return ShaderPresets.getAllPresets().map(preset => preset.id);
  }

  /**
   * 获取着色器预设信息
   */
  static getShaderPresetInfo(presetId: string): { name: string; description: string; category: string } | null {
    const preset = ShaderPresets.getPreset(presetId);
    if (!preset) return null;
    
    return {
      name: preset.name,
      description: preset.description,
      category: preset.category
    };
  }
}