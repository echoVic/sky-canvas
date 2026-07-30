/**
 * WebGPU 渲染管线管理器
 * 管理着色器模块、管线布局和渲染管线
 */

import { VERTEX_LAYOUTS, type VertexLayout } from './WebGPUBufferManager'
import { SHADER_SOURCES, ShaderType } from './WebGPUShaders'

/**
 * 管线配置
 */
export interface PipelineConfig {
  shaderType: ShaderType
  vertexLayout: VertexLayout
  blendMode?: 'normal' | 'additive' | 'multiply'
  depthTest?: boolean
  cullMode?: GPUCullMode
  topology?: GPUPrimitiveTopology
}

/**
 * 着色器模块缓存
 */
interface ShaderModuleCache {
  vertex: GPUShaderModule
  fragment: GPUShaderModule
}

/**
 * 管线缓存项
 */
interface PipelineCacheEntry {
  pipeline: GPURenderPipeline
  bindGroupLayout: GPUBindGroupLayout
}

/**
 * WebGPU 渲染管线管理器
 */
export class WebGPUPipelineManager {
  private device: GPUDevice
  private format: GPUTextureFormat
  private shaderModules: Map<ShaderType, ShaderModuleCache> = new Map()
  private pipelines: Map<string, PipelineCacheEntry> = new Map()

  constructor(device: GPUDevice, format: GPUTextureFormat) {
    this.device = device
    this.format = format
  }

  /**
   * 获取或创建着色器模块
   */
  private getShaderModules(type: ShaderType): ShaderModuleCache {
    let cache = this.shaderModules.get(type)
    if (cache) {
      return cache
    }

    const sources = SHADER_SOURCES[type]
    cache = {
      vertex: this.device.createShaderModule({
        label: `${type} Vertex Shader`,
        code: sources.vertex,
      }),
      fragment: this.device.createShaderModule({
        label: `${type} Fragment Shader`,
        code: sources.fragment,
      }),
    }

    this.shaderModules.set(type, cache)
    return cache
  }

  /**
   * 创建混合状态
   */
  private createBlendState(mode: 'normal' | 'additive' | 'multiply'): GPUBlendState {
    switch (mode) {
      case 'additive':
        return {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one',
            operation: 'add',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one',
            operation: 'add',
          },
        }
      case 'multiply':
        return {
          color: {
            srcFactor: 'dst',
            dstFactor: 'zero',
            operation: 'add',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add',
          },
        }
      case 'normal':
      default:
        return {
          color: {
            srcFactor: 'src-alpha',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add',
          },
          alpha: {
            srcFactor: 'one',
            dstFactor: 'one-minus-src-alpha',
            operation: 'add',
          },
        }
    }
  }

  /**
   * 创建顶点缓冲区布局
   */
  private createVertexBufferLayout(layout: VertexLayout): GPUVertexBufferLayout {
    const attributes: GPUVertexAttribute[] = []
    let shaderLocation = 0

    if (layout.position) {
      attributes.push({
        shaderLocation: shaderLocation++,
        offset: layout.position.offset,
        format: layout.position.format,
      })
    }

    if (layout.texCoord) {
      attributes.push({
        shaderLocation: shaderLocation++,
        offset: layout.texCoord.offset,
        format: layout.texCoord.format,
      })
    }

    if (layout.color) {
      attributes.push({
        shaderLocation: shaderLocation++,
        offset: layout.color.offset,
        format: layout.color.format,
      })
    }

    if (layout.normal) {
      attributes.push({
        shaderLocation: shaderLocation++,
        offset: layout.normal.offset,
        format: layout.normal.format,
      })
    }

    return {
      arrayStride: layout.stride,
      stepMode: 'vertex',
      attributes,
    }
  }

  /**
   * 创建绑定组布局
   */
  private createBindGroupLayout(shaderType: ShaderType): GPUBindGroupLayout {
    const entries: GPUBindGroupLayoutEntry[] = [
      // Uniform 缓冲区（变换矩阵）
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: 'uniform' },
      },
    ]

    // 根据着色器类型添加额外绑定
    if (shaderType === ShaderType.TEXTURED) {
      entries.push(
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: {},
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          texture: {},
        }
      )
    } else if (shaderType === ShaderType.CIRCLE || shaderType === ShaderType.LINE) {
      entries.push({
        binding: 1,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      })
    }

    return this.device.createBindGroupLayout({
      label: `${shaderType} Bind Group Layout`,
      entries,
    })
  }

  /**
   * 生成管线缓存键
   */
  private getPipelineKey(config: PipelineConfig): string {
    return `${config.shaderType}_${config.blendMode ?? 'normal'}_${config.topology ?? 'triangle-list'}`
  }

  /**
   * 获取或创建渲染管线
   */
  getPipeline(config: PipelineConfig): PipelineCacheEntry {
    const key = this.getPipelineKey(config)
    let entry = this.pipelines.get(key)
    if (entry) {
      return entry
    }

    const shaderModules = this.getShaderModules(config.shaderType)
    const bindGroupLayout = this.createBindGroupLayout(config.shaderType)
    const pipelineLayout = this.device.createPipelineLayout({
      label: `${config.shaderType} Pipeline Layout`,
      bindGroupLayouts: [bindGroupLayout],
    })

    const pipeline = this.device.createRenderPipeline({
      label: `${config.shaderType} Render Pipeline`,
      layout: pipelineLayout,
      vertex: {
        module: shaderModules.vertex,
        entryPoint: 'main',
        buffers: [this.createVertexBufferLayout(config.vertexLayout)],
      },
      fragment: {
        module: shaderModules.fragment,
        entryPoint: 'main',
        targets: [
          {
            format: this.format,
            blend: this.createBlendState(config.blendMode ?? 'normal'),
          },
        ],
      },
      primitive: {
        topology: config.topology ?? 'triangle-list',
        cullMode: config.cullMode ?? 'none',
      },
    })

    entry = { pipeline, bindGroupLayout }
    this.pipelines.set(key, entry)
    return entry
  }

  /**
   * 获取基础 2D 管线
   */
  getBasic2DPipeline(): PipelineCacheEntry {
    return this.getPipeline({
      shaderType: ShaderType.BASIC_2D,
      vertexLayout: VERTEX_LAYOUTS.POSITION_COLOR,
    })
  }

  /**
   * 获取纹理管线
   */
  getTexturedPipeline(): PipelineCacheEntry {
    return this.getPipeline({
      shaderType: ShaderType.TEXTURED,
      vertexLayout: VERTEX_LAYOUTS.POSITION_TEXCOORD_COLOR,
    })
  }

  /**
   * 获取圆形管线
   */
  getCirclePipeline(): PipelineCacheEntry {
    return this.getPipeline({
      shaderType: ShaderType.CIRCLE,
      vertexLayout: {
        position: { offset: 0, format: 'float32x2' },
        stride: 8,
      },
    })
  }

  /**
   * 获取线段管线
   */
  getLinePipeline(): PipelineCacheEntry {
    return this.getPipeline({
      shaderType: ShaderType.LINE,
      vertexLayout: VERTEX_LAYOUTS.POSITION_NORMAL,
    })
  }

  /**
   * 获取实例化矩形管线
   *
   * 使用两个 vertex buffer:
   * - buffer 0(stepMode vertex):单位 quad 顶点 position(vec2)
   * - buffer 1(stepMode instance):per-instance 的 offset(vec2)/size(vec2)/color(vec4)
   *
   * 由于本管线需要 instance step-mode 与双 buffer,不走通用 getPipeline,单独构建并缓存。
   */
  getInstancedRectPipeline(): PipelineCacheEntry {
    const key = 'instancedRect'
    const cached = this.pipelines.get(key)
    if (cached) {
      return cached
    }

    const shaderModules = this.getShaderModules(ShaderType.INSTANCED_RECT)
    const bindGroupLayout = this.createBindGroupLayout(ShaderType.INSTANCED_RECT)
    const pipelineLayout = this.device.createPipelineLayout({
      label: 'InstancedRect Pipeline Layout',
      bindGroupLayouts: [bindGroupLayout],
    })

    // buffer 0: 单位 quad 顶点(每顶点 2 float)
    const quadLayout: GPUVertexBufferLayout = {
      arrayStride: 2 * 4,
      stepMode: 'vertex',
      attributes: [{ shaderLocation: 0, offset: 0, format: 'float32x2' }],
    }
    // buffer 1: per-instance 数据,布局 offset(2) + size(2) + color(4) = 8 float
    const instanceLayout: GPUVertexBufferLayout = {
      arrayStride: 8 * 4,
      stepMode: 'instance',
      attributes: [
        { shaderLocation: 1, offset: 0, format: 'float32x2' }, // i_offset
        { shaderLocation: 2, offset: 2 * 4, format: 'float32x2' }, // i_size
        { shaderLocation: 3, offset: 4 * 4, format: 'float32x4' }, // i_color
      ],
    }

    const pipeline = this.device.createRenderPipeline({
      label: 'InstancedRect Render Pipeline',
      layout: pipelineLayout,
      vertex: {
        module: shaderModules.vertex,
        entryPoint: 'main',
        buffers: [quadLayout, instanceLayout],
      },
      fragment: {
        module: shaderModules.fragment,
        entryPoint: 'main',
        targets: [
          {
            format: this.format,
            blend: this.createBlendState('normal'),
          },
        ],
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'none',
      },
    })

    const entry: PipelineCacheEntry = { pipeline, bindGroupLayout }
    this.pipelines.set(key, entry)
    return entry
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.shaderModules.clear()
    this.pipelines.clear()
  }
}
