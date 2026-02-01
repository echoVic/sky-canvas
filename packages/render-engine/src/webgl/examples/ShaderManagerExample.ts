/**
 * 着色器管理器使用示例
 * 展示如何使用AdvancedShaderManager进行高效的着色器管理
 */

import { AdvancedShaderManager } from '../AdvancedShaderManager'

// 定义常用的着色器模板
const shaderTemplates = {
  // 基础着色器
  basic: {
    id: 'basic',
    vertexTemplate: `
      #version 300 es
      
      in vec4 a_position;
      in vec2 a_texCoord;
      
      #ifdef USE_INSTANCING
      in mat4 a_instanceMatrix;
      in vec4 a_instanceColor;
      #endif
      
      uniform mat4 u_viewProjectionMatrix;
      uniform mat4 u_modelMatrix;
      
      out vec2 v_texCoord;
      #ifdef USE_VERTEX_COLORS
      in vec4 a_color;
      out vec4 v_color;
      #endif
      
      void main() {
        #ifdef USE_INSTANCING
        gl_Position = u_viewProjectionMatrix * a_instanceMatrix * a_position;
        #ifdef USE_VERTEX_COLORS
        v_color = a_instanceColor;
        #endif
        #else
        gl_Position = u_viewProjectionMatrix * u_modelMatrix * a_position;
        #ifdef USE_VERTEX_COLORS
        v_color = a_color;
        #endif
        #endif
        
        v_texCoord = a_texCoord;
      }
    `,
    fragmentTemplate: `
      #version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      #ifdef USE_VERTEX_COLORS
      in vec4 v_color;
      #endif
      
      #ifdef USE_TEXTURE
      uniform sampler2D u_texture;
      #endif
      
      uniform vec4 u_color;
      uniform float u_alpha;
      
      #ifdef USE_LIGHTING
      uniform vec3 u_lightDirection;
      uniform vec3 u_lightColor;
      uniform float u_ambientStrength;
      #endif
      
      out vec4 fragColor;
      
      void main() {
        vec4 baseColor = u_color;
        
        #ifdef USE_TEXTURE
        baseColor *= texture(u_texture, v_texCoord);
        #endif
        
        #ifdef USE_VERTEX_COLORS
        baseColor *= v_color;
        #endif
        
        #ifdef USE_LIGHTING
        vec3 ambient = u_ambientStrength * u_lightColor;
        // 简化的光照计算
        float diff = max(dot(vec3(0.0, 0.0, 1.0), normalize(u_lightDirection)), 0.0);
        vec3 diffuse = diff * u_lightColor;
        baseColor.rgb *= (ambient + diffuse);
        #endif
        
        fragColor = vec4(baseColor.rgb, baseColor.a * u_alpha);
      }
    `,
    variants: [
      {
        name: 'simple',
        defines: {} as Record<string, string | number | boolean>,
        features: [],
      },
      {
        name: 'textured',
        defines: { USE_TEXTURE: 1 } as Record<string, string | number | boolean>,
        features: ['texture'],
      },
      {
        name: 'colored',
        defines: { USE_VERTEX_COLORS: 1 } as Record<string, string | number | boolean>,
        features: ['vertex-colors'],
      },
      {
        name: 'textured_colored',
        defines: { USE_TEXTURE: 1, USE_VERTEX_COLORS: 1 } as Record<
          string,
          string | number | boolean
        >,
        features: ['texture', 'vertex-colors'],
      },
      {
        name: 'instanced',
        defines: { USE_INSTANCING: 1 } as Record<string, string | number | boolean>,
        features: ['instancing'],
      },
      {
        name: 'instanced_textured',
        defines: { USE_INSTANCING: 1, USE_TEXTURE: 1 } as Record<string, string | number | boolean>,
        features: ['instancing', 'texture'],
      },
      {
        name: 'lit_textured',
        defines: { USE_TEXTURE: 1, USE_LIGHTING: 1 } as Record<string, string | number | boolean>,
        features: ['texture', 'lighting'],
      },
    ],
    defaultUniforms: {
      u_color: [1, 1, 1, 1],
      u_alpha: 1.0,
      u_viewProjectionMatrix: new Float32Array(16),
      u_modelMatrix: new Float32Array(16),
    },
  },

  // 后处理着色器
  postProcess: {
    id: 'postProcess',
    vertexTemplate: `
      #version 300 es
      
      in vec4 a_position;
      in vec2 a_texCoord;
      
      out vec2 v_texCoord;
      
      void main() {
        gl_Position = a_position;
        v_texCoord = a_texCoord;
      }
    `,
    fragmentTemplate: `
      #version 300 es
      precision highp float;
      
      in vec2 v_texCoord;
      uniform sampler2D u_texture;
      
      #ifdef BLUR
      uniform vec2 u_resolution;
      uniform int u_blurRadius;
      #endif
      
      #ifdef BLOOM
      uniform float u_bloomThreshold;
      uniform float u_bloomIntensity;
      #endif
      
      #ifdef COLOR_GRADING
      uniform float u_contrast;
      uniform float u_brightness;
      uniform float u_saturation;
      #endif
      
      out vec4 fragColor;
      
      vec4 blur(sampler2D tex, vec2 uv, vec2 resolution, int radius) {
        vec4 color = vec4(0.0);
        float weight = 0.0;
        
        for (int x = -radius; x <= radius; x++) {
          for (int y = -radius; y <= radius; y++) {
            vec2 offset = vec2(float(x), float(y)) / resolution;
            color += texture(tex, uv + offset);
            weight += 1.0;
          }
        }
        
        return color / weight;
      }
      
      vec4 adjustContrast(vec4 color, float contrast) {
        return vec4((color.rgb - 0.5) * contrast + 0.5, color.a);
      }
      
      vec4 adjustBrightness(vec4 color, float brightness) {
        return vec4(color.rgb + brightness, color.a);
      }
      
      vec4 adjustSaturation(vec4 color, float saturation) {
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        return vec4(mix(vec3(gray), color.rgb, saturation), color.a);
      }
      
      void main() {
        vec4 color = texture(u_texture, v_texCoord);
        
        #ifdef BLUR
        color = blur(u_texture, v_texCoord, u_resolution, u_blurRadius);
        #endif
        
        #ifdef BLOOM
        float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
        if (brightness > u_bloomThreshold) {
          color.rgb *= u_bloomIntensity;
        }
        #endif
        
        #ifdef COLOR_GRADING
        color = adjustBrightness(color, u_brightness);
        color = adjustContrast(color, u_contrast);
        color = adjustSaturation(color, u_saturation);
        #endif
        
        fragColor = color;
      }
    `,
    variants: [
      {
        name: 'copy',
        defines: {} as Record<string, string | number | boolean>,
        features: [],
      },
      {
        name: 'blur',
        defines: { BLUR: 1 } as Record<string, string | number | boolean>,
        features: ['blur'],
      },
      {
        name: 'bloom',
        defines: { BLOOM: 1 } as Record<string, string | number | boolean>,
        features: ['bloom'],
      },
      {
        name: 'color_grading',
        defines: { COLOR_GRADING: 1 } as Record<string, string | number | boolean>,
        features: ['color-grading'],
      },
      {
        name: 'full_postprocess',
        defines: { BLUR: 1, BLOOM: 1, COLOR_GRADING: 1 } as Record<
          string,
          string | number | boolean
        >,
        features: ['blur', 'bloom', 'color-grading'],
      },
    ],
    defaultUniforms: {
      u_resolution: [1920, 1080],
      u_blurRadius: 3,
      u_bloomThreshold: 0.8,
      u_bloomIntensity: 1.2,
      u_contrast: 1.0,
      u_brightness: 0.0,
      u_saturation: 1.0,
    },
  },
}

/**
 * 着色器管理器使用示例类
 */
export class ShaderManagerExample {
  private manager: AdvancedShaderManager
  private canvas: HTMLCanvasElement
  private gl: WebGL2RenderingContext

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.gl = canvas.getContext('webgl2')!

    if (!this.gl) {
      throw new Error('WebGL2 context not supported')
    }

    // 创建着色器管理器
    this.manager = new AdvancedShaderManager(this.gl, {
      cacheMemoryLimit: 100 * 1024 * 1024, // 100MB
      enableHotReload: true,
      precompileCommonVariants: true,
      enableAsyncCompilation: true,
      cacheCleanupInterval: 60000,
      shaderExpirationTime: 300000,
    })

    this.setupEventListeners()
    this.registerShaders()
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    this.manager.on('shader-compiled', (event) => {
      console.log(`✅ 着色器编译完成: ${event.id} (耗时: ${event.time}ms)`)
    })

    this.manager.on('shader-cache-hit', (event) => {
      console.log(`🎯 着色器缓存命中: ${event.id}`)
    })

    this.manager.on('shader-cache-miss', (event) => {
      console.log(`❌ 着色器缓存未命中: ${event.id}`)
    })

    this.manager.on('shader-error', (event) => {
      console.error(`💥 着色器错误: ${event.id}`, event.error)
    })

    this.manager.on('cache-cleaned', (event) => {
      console.log(`🧹 缓存清理完成，释放内存: ${event.freedMemory} bytes`)
    })

    this.manager.on('hot-reload', (event) => {
      console.log(`🔄 着色器热重载: ${event.id}, 成功: ${event.success}`)
    })
  }

  /**
   * 注册着色器模板
   */
  private registerShaders(): void {
    console.log('📝 注册着色器模板...')

    for (const template of Object.values(shaderTemplates)) {
      this.manager.registerTemplate(template)
      console.log(`📄 已注册模板: ${template.id} (${template.variants.length} 个变体)`)
    }
  }

  /**
   * 示例1: 基础着色器使用
   */
  async demonstrateBasicUsage(): Promise<void> {
    console.log('\n=== 示例1: 基础着色器使用 ===')

    // 获取简单着色器
    const simpleShader = await this.manager.getProgram('basic', 'simple')
    console.log(`简单着色器ID: ${simpleShader.id}`)

    // 获取纹理着色器
    const texturedShader = await this.manager.getProgram('basic', 'textured')
    console.log(`纹理着色器ID: ${texturedShader.id}`)

    // 使用着色器
    simpleShader.use(this.gl)
    simpleShader.setUniform('u_color', [1.0, 0.5, 0.0, 1.0])

    // 演示uniform设置
    const viewMatrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1])
    simpleShader.setUniform('u_viewProjectionMatrix', viewMatrix)

    console.log('✅ 基础着色器使用完成')
  }

  /**
   * 示例2: 变体系统演示
   */
  async demonstrateVariantSystem(): Promise<void> {
    console.log('\n=== 示例2: 变体系统演示 ===')

    const variants = ['simple', 'textured', 'colored', 'instanced']
    const programs: any[] = []

    for (const variant of variants) {
      console.log(`🔄 编译变体: ${variant}`)
      const program = await this.manager.getProgram('basic', variant)
      programs.push(program)

      console.log(`  - 程序ID: ${program.id}`)
      console.log(`  - 属性数量: ${program.attributes.size}`)
      console.log(`  - Uniform数量: ${program.uniforms.size}`)
    }

    // 测试缓存效果 - 重新请求相同的着色器
    console.log('\n🎯 测试缓存效果:')
    const cachedProgram = await this.manager.getProgram('basic', 'simple')
    console.log(`缓存程序与原程序相同: ${cachedProgram === programs[0]}`)

    console.log('✅ 变体系统演示完成')
  }

  /**
   * 示例3: 批量预编译
   */
  async demonstrateBatchPrecompilation(): Promise<void> {
    console.log('\n=== 示例3: 批量预编译 ===')

    const startTime = Date.now()

    // 预编译所有基础着色器变体
    await this.manager.precompileShaders(['basic'])

    const endTime = Date.now()
    console.log(`批量预编译完成，耗时: ${endTime - startTime}ms`)

    // 显示缓存统计
    const stats = this.manager.getCacheStats()
    console.log('📊 缓存统计:')
    console.log(`  - 总程序数: ${stats.totalPrograms}`)
    console.log(`  - 内存使用: ${stats.memoryUsage} / ${stats.memoryLimit} bytes`)
    console.log(`  - 缓存命中率: ${(stats.hitRate * 100).toFixed(2)}%`)

    console.log('✅ 批量预编译演示完成')
  }

  /**
   * 示例4: 性能监控
   */
  async demonstratePerformanceMonitoring(): Promise<void> {
    console.log('\n=== 示例4: 性能监控 ===')

    // 编译几个着色器并监控性能
    const shaderIds = ['basic_simple', 'basic_textured', 'basic_instanced']

    await this.manager.getProgram('basic', 'simple')
    await this.manager.getProgram('basic', 'textured')
    await this.manager.getProgram('basic', 'instanced')

    console.log('🔍 性能指标:')
    for (const id of shaderIds) {
      const metrics = this.manager.getMetrics(id)
      if (typeof metrics === 'object' && 'compileTime' in metrics) {
        console.log(`  ${id}:`)
        console.log(`    编译时间: ${metrics.compileTime}ms`)
        console.log(`    最后使用: ${new Date(metrics.lastUsed).toLocaleTimeString()}`)
        console.log(`    绘制调用次数: ${metrics.drawCallCount}`)
      }
    }

    console.log('✅ 性能监控演示完成')
  }

  /**
   * 示例5: 后处理着色器
   */
  async demonstratePostProcessing(): Promise<void> {
    console.log('\n=== 示例5: 后处理着色器 ===')

    // 创建后处理管线
    const postProcessSteps = [
      { name: 'blur', shader: await this.manager.getProgram('postProcess', 'blur') },
      { name: 'bloom', shader: await this.manager.getProgram('postProcess', 'bloom') },
      {
        name: 'color_grading',
        shader: await this.manager.getProgram('postProcess', 'color_grading'),
      },
    ]

    console.log('🎨 后处理管线:')
    for (const step of postProcessSteps) {
      console.log(`  - ${step.name}: ${step.shader.id}`)

      // 演示设置后处理参数
      step.shader.use(this.gl)

      if (step.name === 'blur') {
        step.shader.setUniform('u_resolution', [this.canvas.width, this.canvas.height])
        step.shader.setUniform('u_blurRadius', 5)
      } else if (step.name === 'bloom') {
        step.shader.setUniform('u_bloomThreshold', 0.8)
        step.shader.setUniform('u_bloomIntensity', 1.5)
      } else if (step.name === 'color_grading') {
        step.shader.setUniform('u_contrast', 1.2)
        step.shader.setUniform('u_brightness', 0.1)
        step.shader.setUniform('u_saturation', 1.1)
      }
    }

    console.log('✅ 后处理着色器演示完成')
  }

  /**
   * 示例6: 热重载演示
   */
  async demonstrateHotReload(): Promise<void> {
    console.log('\n=== 示例6: 热重载演示 ===')

    // 先编译一个着色器
    const shader = await this.manager.getProgram('basic', 'simple')
    console.log(`原始着色器ID: ${shader.id}`)

    // 模拟热重载
    console.log('🔄 执行热重载...')
    const success = await this.manager.hotReloadShader('basic')

    if (success) {
      console.log('✅ 热重载成功')

      // 获取重新编译的着色器
      const reloadedShader = await this.manager.getProgram('basic', 'simple')
      console.log(`重载后着色器ID: ${reloadedShader.id}`)
    } else {
      console.log('❌ 热重载失败')
    }

    console.log('✅ 热重载演示完成')
  }

  /**
   * 示例7: 缓存管理
   */
  async demonstrateCacheManagement(): Promise<void> {
    console.log('\n=== 示例7: 缓存管理 ===')

    // 创建多个着色器程序
    await this.manager.getProgram('basic', 'simple')
    await this.manager.getProgram('basic', 'textured')
    await this.manager.getProgram('basic', 'colored')
    await this.manager.getProgram('postProcess', 'blur')

    console.log('📊 清理前的缓存统计:')
    let stats = this.manager.getCacheStats()
    console.log(`  - 总程序数: ${stats.totalPrograms}`)
    console.log(`  - 内存使用: ${stats.memoryUsage} bytes`)

    // 手动清理缓存
    console.log('🧹 执行缓存清理...')
    const freedMemory = this.manager.cleanupCache(true)
    console.log(`释放内存: ${freedMemory} bytes`)

    console.log('📊 清理后的缓存统计:')
    stats = this.manager.getCacheStats()
    console.log(`  - 总程序数: ${stats.totalPrograms}`)
    console.log(`  - 内存使用: ${stats.memoryUsage} bytes`)

    console.log('✅ 缓存管理演示完成')
  }

  /**
   * 运行所有示例
   */
  async runAllExamples(): Promise<void> {
    console.log('🚀 开始着色器管理器演示')
    console.log(`Canvas尺寸: ${this.canvas.width} x ${this.canvas.height}`)
    console.log(`WebGL版本: ${this.gl.getParameter(this.gl.VERSION)}`)

    try {
      await this.demonstrateBasicUsage()
      await this.demonstrateVariantSystem()
      await this.demonstrateBatchPrecompilation()
      await this.demonstratePerformanceMonitoring()
      await this.demonstratePostProcessing()
      await this.demonstrateHotReload()
      await this.demonstrateCacheManagement()

      console.log('\n🎉 所有示例演示完成！')

      // 最终统计信息
      const finalStats = this.manager.getCacheStats()
      console.log('\n📊 最终统计:')
      console.log(`总缓存程序: ${finalStats.totalPrograms}`)
      console.log(`内存使用: ${(finalStats.memoryUsage / 1024 / 1024).toFixed(2)} MB`)
      console.log(`缓存命中率: ${(finalStats.hitRate * 100).toFixed(2)}%`)
    } catch (error) {
      console.error('💥 演示过程中发生错误:', error)
    }
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.manager.dispose()
    console.log('🗑️ 资源清理完成')
  }
}

/**
 * 运行着色器管理器示例
 */
export function runShaderManagerExample(canvas: HTMLCanvasElement): void {
  const example = new ShaderManagerExample(canvas)

  example.runAllExamples().finally(() => {
    // 延迟清理，让用户能看到最终结果
    setTimeout(() => {
      example.dispose()
    }, 5000)
  })
}
