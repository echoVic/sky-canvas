/**
 * 批量渲染系统类型定义
 */

/**
 * 批次状态
 */
export interface BatchState {
  texture: WebGLTexture | null
  blendMode: number
  shader: WebGLProgram | null
  vertexCount: number
  indexCount: number
  textureAtlas?: unknown
}

/**
 * 批次数据
 */
export interface BatchData {
  vertices: Float32Array
  indices: Uint16Array
  uvs: Float32Array
  colors: Uint32Array
  count: number
  capacity: number
}

/**
 * 纹理图集节点
 */
export interface AtlasNode {
  x: number
  y: number
  width: number
  height: number
  used: boolean
  texture?: WebGLTexture
  right?: AtlasNode
  down?: AtlasNode
}

/**
 * 纹理区域
 */
export interface AtlasRegion {
  x: number
  y: number
  width: number
  height: number
}

/**
 * 可批量渲染对象接口
 */
export interface IBatchable {
  readonly texture: WebGLTexture | null
  readonly blendMode: number
  readonly vertexCount: number
  readonly indexCount: number
  readonly priority: number
  readonly bounds: { x: number; y: number; width: number; height: number }

  fillBatchData(
    vertices: Float32Array,
    indices: Uint16Array,
    uvs: Float32Array,
    colors: Uint32Array,
    offset: number
  ): number
  canBatch(other: IBatchable): boolean
  getTextureSize(): { width: number; height: number }
}

/**
 * 批次渲染统计
 */
export interface BatchRenderStats {
  batchCount: number
  drawCalls: number
  objectsBatched: number
  textureSwaps: number
  atlasHits: number
  atlasMisses: number
  sortTime: number
  batchTime: number
}
