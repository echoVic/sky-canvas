/**
 * 标准混合模式（重构版本）
 * 使用工厂模式消除重复代码
 */

import type { BlendModeConfig, IBlendOperation } from '../types/BlendTypes'
import { BlendModeFactory } from './GenericBlendOperation'

/**
 * 标准混合模式工厂类
 * 提供预配置的混合模式实例
 */
export class StandardBlendModes {
  /**
   * Normal 混合
   */
  static createNormalBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.normal(config)
  }

  /**
   * Multiply 混合
   */
  static createMultiplyBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.multiply(config)
  }

  /**
   * Screen 混合
   */
  static createScreenBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.screen(config)
  }

  /**
   * Overlay 混合
   */
  static createOverlayBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.overlay(config)
  }

  /**
   * Soft Light 混合
   */
  static createSoftLightBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.softLight(config)
  }

  /**
   * Hard Light 混合
   */
  static createHardLightBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.hardLight(config)
  }

  /**
   * Darken 混合
   */
  static createDarkenBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.darken(config)
  }

  /**
   * Lighten 混合
   */
  static createLightenBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.lighten(config)
  }

  /**
   * Color Burn 混合
   */
  static createColorBurnBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.colorBurn(config)
  }

  /**
   * Color Dodge 混合
   */
  static createColorDodgeBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.colorDodge(config)
  }

  /**
   * Difference 混合
   */
  static createDifferenceBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.difference(config)
  }

  /**
   * Exclusion 混合
   */
  static createExclusionBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.exclusion(config)
  }

  /**
   * Linear Burn 混合
   */
  static createLinearBurnBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.linearBurn(config)
  }

  /**
   * Linear Dodge 混合
   */
  static createLinearDodgeBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.linearDodge(config)
  }

  /**
   * Vivid Light 混合
   */
  static createVividLightBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.vividLight(config)
  }

  /**
   * Pin Light 混合
   */
  static createPinLightBlend(config?: BlendModeConfig): IBlendOperation {
    return BlendModeFactory.pinLight(config)
  }
}

// 向后兼容的类导出（使用工厂模式）
export const NormalBlend = StandardBlendModes.createNormalBlend
export const MultiplyBlend = StandardBlendModes.createMultiplyBlend
export const ScreenBlend = StandardBlendModes.createScreenBlend
export const OverlayBlend = StandardBlendModes.createOverlayBlend
export const SoftLightBlend = StandardBlendModes.createSoftLightBlend
export const HardLightBlend = StandardBlendModes.createHardLightBlend
export const DarkenBlend = StandardBlendModes.createDarkenBlend
export const LightenBlend = StandardBlendModes.createLightenBlend
export const ColorBurnBlend = StandardBlendModes.createColorBurnBlend
export const ColorDodgeBlend = StandardBlendModes.createColorDodgeBlend
export const DifferenceBlend = StandardBlendModes.createDifferenceBlend
export const ExclusionBlend = StandardBlendModes.createExclusionBlend
export const LinearBurnBlend = StandardBlendModes.createLinearBurnBlend
export const LinearDodgeBlend = StandardBlendModes.createLinearDodgeBlend
export const VividLightBlend = StandardBlendModes.createVividLightBlend
export const PinLightBlend = StandardBlendModes.createPinLightBlend
