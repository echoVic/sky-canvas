/**
 * WebGPU 类型定义
 */

import type { Rectangle } from '../../math/Rectangle'

/**
 * WebGPU 设备信息
 */
export interface WebGPUDeviceInfo {
  name: string
  vendor: string
  architecture: string
  maxTextureSize: number
  maxBufferSize: number
}

/**
 * WebGPU 上下文配置
 */
export interface WebGPUContextConfig {
  powerPreference?: 'low-power' | 'high-performance'
  forceFallbackAdapter?: boolean
  antialias?: boolean
  alpha?: boolean
  premultipliedAlpha?: boolean
  preserveDrawingBuffer?: boolean
  desynchronized?: boolean
}

/**
 * WebGPU 渲染状态
 */
export interface WebGPURenderState {
  viewport: Rectangle
  scissorTest: boolean
  scissorRect?: Rectangle
  blendMode: string
  depthTest: boolean
  cullFace: boolean
}

/**
 * 默认配置
 */
export const DEFAULT_WEBGPU_CONFIG: Required<WebGPUContextConfig> = {
  powerPreference: 'high-performance',
  forceFallbackAdapter: false,
  antialias: true,
  alpha: true,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  desynchronized: false,
}

/**
 * 低功耗配置
 */
export const LOW_POWER_CONFIG: Required<WebGPUContextConfig> = {
  powerPreference: 'low-power',
  forceFallbackAdapter: false,
  antialias: false,
  alpha: true,
  premultipliedAlpha: true,
  preserveDrawingBuffer: false,
  desynchronized: false,
}

/**
 * 检查 WebGPU 支持
 */
export function isWebGPUSupported(): boolean {
  return (
    'gpu' in navigator &&
    typeof (navigator as unknown as { gpu: GPU }).gpu?.requestAdapter === 'function'
  )
}

/**
 * 获取 GPU 对象
 */
export function getGPU(): GPU | null {
  if (!isWebGPUSupported()) return null
  return (navigator as unknown as { gpu: GPU }).gpu
}
