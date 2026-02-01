/**
 * 着色器预设库
 * 提供常用的着色器效果预设
 */

import { type CustomShaderParameters, FilterType } from '../types/FilterTypes'
import { WebGLShaderManager } from '../webgl/WebGLShaderManager'

export interface ShaderPreset {
  id: string
  name: string
  description: string
  category: string
  parameters: CustomShaderParameters
  preview?: string // Base64编码的预览图
}

export class ShaderPresets {
  private static presets: Map<string, ShaderPreset> = new Map()

  /**
   * 初始化预设着色器
   */
  static initialize(): void {
    // 基础效果类别
    ShaderPresets.registerPreset({
      id: 'identity',
      name: '原图',
      description: '不做任何处理，原样输出',
      category: '基础',
      parameters: {
        type: FilterType.CUSTOM_SHADER,
        vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_image;
          varying vec2 v_texCoord;
          
          void main() {
            gl_FragColor = texture2D(u_image, v_texCoord);
          }
        `,
        uniforms: {},
        enabled: true,
        opacity: 1,
      },
    })

    ShaderPresets.registerPreset({
      id: 'invert',
      name: '颜色反转',
      description: '反转图像的所有颜色',
      category: '基础',
      parameters: {
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
        opacity: 1,
      },
    })

    // 艺术效果类别
    ShaderPresets.registerPreset({
      id: 'edgeDetection',
      name: '边缘检测',
      description: '使用Sobel算子检测边缘',
      category: '艺术效果',
      parameters: {
        type: FilterType.CUSTOM_SHADER,
        vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_image;
          uniform vec2 u_resolution;
          uniform float u_strength;
          varying vec2 v_texCoord;
          
          void main() {
            vec2 texel = 1.0 / u_resolution;
            float strength = u_strength > 0.0 ? u_strength : 1.0;
            
            // Sobel算子
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
            
            float edge = length(sqrt(gx*gx + gy*gy)) * strength;
            gl_FragColor = vec4(vec3(edge), 1.0);
          }
        `,
        uniforms: {
          u_strength: 1.0,
        },
        enabled: true,
        opacity: 1,
      },
    })

    ShaderPresets.registerPreset({
      id: 'oilPainting',
      name: '油画效果',
      description: '模拟油画笔触效果',
      category: '艺术效果',
      parameters: {
        type: FilterType.CUSTOM_SHADER,
        vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_image;
          uniform vec2 u_resolution;
          uniform float u_radius;
          uniform float u_intensity;
          varying vec2 v_texCoord;
          
          void main() {
            vec2 texel = 1.0 / u_resolution;
            float radius = u_radius > 0.0 ? u_radius : 4.0;
            float intensity = u_intensity > 0.0 ? u_intensity : 8.0;
            
            vec3 meanColor = vec3(0.0);
            float samples = 0.0;
            
            // 采样周围像素
            for (float x = -radius; x <= radius; x += 1.0) {
              for (float y = -radius; y <= radius; y += 1.0) {
                vec2 offset = vec2(x, y) * texel;
                vec3 color = texture2D(u_image, v_texCoord + offset).rgb;
                meanColor += color;
                samples += 1.0;
              }
            }
            
            meanColor /= samples;
            
            // 量化颜色以创建油画效果
            meanColor = floor(meanColor * intensity) / intensity;
            
            gl_FragColor = vec4(meanColor, 1.0);
          }
        `,
        uniforms: {
          u_radius: 4.0,
          u_intensity: 8.0,
        },
        enabled: true,
        opacity: 1,
      },
    })

    // 变形效果类别
    ShaderPresets.registerPreset({
      id: 'swirl',
      name: '旋涡效果',
      description: '创建旋转变形效果',
      category: '变形',
      parameters: {
        type: FilterType.CUSTOM_SHADER,
        vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_image;
          uniform vec2 u_resolution;
          uniform float u_time;
          uniform float u_strength;
          uniform vec2 u_center;
          varying vec2 v_texCoord;
          
          void main() {
            vec2 center = u_center.x > 0.0 ? u_center : vec2(0.5, 0.5);
            float strength = u_strength > 0.0 ? u_strength : 3.0;
            
            vec2 coord = v_texCoord - center;
            float distance = length(coord);
            float angle = atan(coord.y, coord.x);
            
            // 时间驱动的旋涡效果
            float swirl = sin(u_time * 0.001) * strength * (1.0 - distance);
            angle += swirl;
            
            vec2 swirlCoord = vec2(
              cos(angle) * distance,
              sin(angle) * distance
            ) + center;
            
            gl_FragColor = texture2D(u_image, swirlCoord);
          }
        `,
        uniforms: {
          u_strength: 3.0,
          u_center: [0.5, 0.5],
        },
        enabled: true,
        opacity: 1,
      },
    })

    ShaderPresets.registerPreset({
      id: 'fisheye',
      name: '鱼眼效果',
      description: '创建鱼眼镜头变形效果',
      category: '变形',
      parameters: {
        type: FilterType.CUSTOM_SHADER,
        vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_image;
          uniform float u_strength;
          varying vec2 v_texCoord;
          
          void main() {
            float strength = u_strength > 0.0 ? u_strength : 0.5;
            
            vec2 coord = v_texCoord - 0.5;
            float distance = length(coord);
            
            // 鱼眼变形
            if (distance < 0.5) {
              float fisheyeDistance = distance * (1.0 - strength * distance);
              coord = normalize(coord) * fisheyeDistance;
            }
            
            vec2 fisheyeCoord = coord + 0.5;
            
            if (fisheyeCoord.x >= 0.0 && fisheyeCoord.x <= 1.0 && 
                fisheyeCoord.y >= 0.0 && fisheyeCoord.y <= 1.0) {
              gl_FragColor = texture2D(u_image, fisheyeCoord);
            } else {
              gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
          }
        `,
        uniforms: {
          u_strength: 0.5,
        },
        enabled: true,
        opacity: 1,
      },
    })

    // 像素化效果类别
    ShaderPresets.registerPreset({
      id: 'pixelate',
      name: '像素化',
      description: '创建马赛克/像素化效果',
      category: '像素化',
      parameters: {
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
          u_pixelSize: 8.0,
        },
        enabled: true,
        opacity: 1,
      },
    })

    ShaderPresets.registerPreset({
      id: 'halftone',
      name: '半调效果',
      description: '创建报纸印刷半调效果',
      category: '像素化',
      parameters: {
        type: FilterType.CUSTOM_SHADER,
        vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_image;
          uniform vec2 u_resolution;
          uniform float u_dotSize;
          uniform float u_angle;
          varying vec2 v_texCoord;
          
          void main() {
            float dotSize = u_dotSize > 0.0 ? u_dotSize : 6.0;
            float angle = u_angle * 3.14159 / 180.0;
            
            // 旋转纹理坐标
            vec2 center = vec2(0.5, 0.5);
            vec2 coord = v_texCoord - center;
            // 手动应用旋转变换
            float cosA = cos(angle);
            float sinA = sin(angle);
            vec2 rotated = vec2(coord.x * cosA - coord.y * sinA, coord.x * sinA + coord.y * cosA);
            coord = rotated + center;
            
            // 计算网格位置
            vec2 gridCoord = coord * u_resolution / dotSize;
            vec2 gridCenter = floor(gridCoord) + 0.5;
            vec2 gridPos = fract(gridCoord);
            
            // 采样原图颜色
            vec2 sampleCoord = gridCenter * dotSize / u_resolution;
            vec4 color = texture2D(u_image, sampleCoord);
            float brightness = dot(color.rgb, vec3(0.299, 0.587, 0.114));
            
            // 创建半调点
            float distance = length(gridPos - 0.5);
            float dotRadius = brightness * 0.5;
            float alpha = smoothstep(dotRadius, dotRadius + 0.1, distance);
            
            gl_FragColor = vec4(vec3(1.0 - alpha), 1.0);
          }
        `,
        uniforms: {
          u_dotSize: 6.0,
          u_angle: 45.0,
        },
        enabled: true,
        opacity: 1,
      },
    })

    // 色彩效果类别
    ShaderPresets.registerPreset({
      id: 'sepia',
      name: '怀旧效果',
      description: '创建复古怀旧色调',
      category: '色彩',
      parameters: {
        type: FilterType.CUSTOM_SHADER,
        vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_image;
          uniform float u_amount;
          varying vec2 v_texCoord;
          
          void main() {
            vec4 color = texture2D(u_image, v_texCoord);
            float amount = u_amount > 0.0 ? u_amount : 1.0;
            
            // 棕褐色滤镜
            float r = color.r * 0.393 + color.g * 0.769 + color.b * 0.189;
            float g = color.r * 0.349 + color.g * 0.686 + color.b * 0.168;
            float b = color.r * 0.272 + color.g * 0.534 + color.b * 0.131;
            
            vec3 sepia = vec3(r, g, b);
            vec3 final = mix(color.rgb, sepia, amount);
            
            gl_FragColor = vec4(final, color.a);
          }
        `,
        uniforms: {
          u_amount: 1.0,
        },
        enabled: true,
        opacity: 1,
      },
    })

    ShaderPresets.registerPreset({
      id: 'colorize',
      name: '单色化',
      description: '将图像转换为单一色调',
      category: '色彩',
      parameters: {
        type: FilterType.CUSTOM_SHADER,
        vertexShader: WebGLShaderManager.DEFAULT_VERTEX_SHADER,
        fragmentShader: `
          precision mediump float;
          uniform sampler2D u_image;
          uniform vec3 u_color;
          uniform float u_amount;
          varying vec2 v_texCoord;
          
          void main() {
            vec4 originalColor = texture2D(u_image, v_texCoord);
            vec3 tintColor = u_color.r > 0.0 ? u_color : vec3(1.0, 0.7, 0.3);
            float amount = u_amount > 0.0 ? u_amount : 0.5;
            
            // 计算亮度
            float brightness = dot(originalColor.rgb, vec3(0.299, 0.587, 0.114));
            
            // 应用色调
            vec3 colorized = tintColor * brightness;
            vec3 final = mix(originalColor.rgb, colorized, amount);
            
            gl_FragColor = vec4(final, originalColor.a);
          }
        `,
        uniforms: {
          u_color: [1.0, 0.7, 0.3],
          u_amount: 0.5,
        },
        enabled: true,
        opacity: 1,
      },
    })
  }

  /**
   * 注册预设
   */
  static registerPreset(preset: ShaderPreset): void {
    ShaderPresets.presets.set(preset.id, preset)
  }

  /**
   * 获取预设
   */
  static getPreset(id: string): ShaderPreset | undefined {
    return ShaderPresets.presets.get(id)
  }

  /**
   * 获取所有预设
   */
  static getAllPresets(): ShaderPreset[] {
    return Array.from(ShaderPresets.presets.values())
  }

  /**
   * 按类别获取预设
   */
  static getPresetsByCategory(category: string): ShaderPreset[] {
    return Array.from(ShaderPresets.presets.values()).filter(
      (preset) => preset.category === category
    )
  }

  /**
   * 获取所有类别
   */
  static getCategories(): string[] {
    const categories = new Set<string>()
    for (const preset of ShaderPresets.presets.values()) {
      categories.add(preset.category)
    }
    return Array.from(categories)
  }

  /**
   * 搜索预设
   */
  static searchPresets(query: string): ShaderPreset[] {
    const lowerQuery = query.toLowerCase()
    return Array.from(ShaderPresets.presets.values()).filter(
      (preset) =>
        preset.name.toLowerCase().includes(lowerQuery) ||
        preset.description.toLowerCase().includes(lowerQuery) ||
        preset.category.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * 移除预设
   */
  static removePreset(id: string): boolean {
    return ShaderPresets.presets.delete(id)
  }

  /**
   * 清除所有预设
   */
  static clear(): void {
    ShaderPresets.presets.clear()
  }
}

// 初始化预设
ShaderPresets.initialize()
