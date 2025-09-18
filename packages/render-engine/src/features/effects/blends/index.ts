/**
 * 混合系统导出
 */

// 类型定义
export * from '../types/BlendTypes';

// 基础类
export { BaseBlendOperation } from './BaseBlendOperation';

// 标准混合模式
export {
  NormalBlend,
  MultiplyBlend,
  ScreenBlend,
  OverlayBlend,
  SoftLightBlend,
  HardLightBlend,
  DarkenBlend,
  LightenBlend,
  ColorBurnBlend,
  ColorDodgeBlend,
  DifferenceBlend,
  ExclusionBlend,
  LinearBurnBlend,
  LinearDodgeBlend,
  VividLightBlend,
  PinLightBlend
} from './StandardBlendModes';

// 颜色混合模式
export {
  HueBlend,
  SaturationBlend,
  ColorBlend,
  LuminosityBlend,
  DarkerColorBlend,
  LighterColorBlend,
  SubtractBlend,
  DivideBlend,
  HardMixBlend
} from './ColorBlendModes';

// 管理器
export { BlendManager } from './BlendManager';

// 导入具体实现
import { BlendMode, BlendModeConfig, IBlendOperation } from '../types/BlendTypes';
import {
  NormalBlend,
  MultiplyBlend,
  ScreenBlend,
  OverlayBlend,
  SoftLightBlend,
  HardLightBlend,
  DarkenBlend,
  LightenBlend,
  ColorBurnBlend,
  ColorDodgeBlend,
  DifferenceBlend,
  ExclusionBlend,
  LinearBurnBlend,
  LinearDodgeBlend,
  VividLightBlend,
  PinLightBlend
} from './StandardBlendModes';
import {
  HueBlend,
  SaturationBlend,
  ColorBlend,
  LuminosityBlend,
  DarkerColorBlend,
  LighterColorBlend,
  SubtractBlend,
  DivideBlend,
  HardMixBlend
} from './ColorBlendModes';

/**
 * 混合操作工厂函数
 */
export function createBlendOperation(mode: BlendMode, config: BlendModeConfig): IBlendOperation {
  switch (mode) {
    case BlendMode.NORMAL:
      return new NormalBlend(config);
    case BlendMode.MULTIPLY:
      return new MultiplyBlend(config);
    case BlendMode.SCREEN:
      return new ScreenBlend(config);
    case BlendMode.OVERLAY:
      return new OverlayBlend(config);
    case BlendMode.SOFT_LIGHT:
      return new SoftLightBlend(config);
    case BlendMode.HARD_LIGHT:
      return new HardLightBlend(config);
    case BlendMode.DARKEN:
      return new DarkenBlend(config);
    case BlendMode.COLOR_BURN:
      return new ColorBurnBlend(config);
    case BlendMode.LINEAR_BURN:
      return new LinearBurnBlend(config);
    case BlendMode.DARKER_COLOR:
      return new DarkerColorBlend(config);
    case BlendMode.LIGHTEN:
      return new LightenBlend(config);
    case BlendMode.COLOR_DODGE:
      return new ColorDodgeBlend(config);
    case BlendMode.LINEAR_DODGE:
      return new LinearDodgeBlend(config);
    case BlendMode.LIGHTER_COLOR:
      return new LighterColorBlend(config);
    case BlendMode.DIFFERENCE:
      return new DifferenceBlend(config);
    case BlendMode.EXCLUSION:
      return new ExclusionBlend(config);
    case BlendMode.SUBTRACT:
      return new SubtractBlend(config);
    case BlendMode.DIVIDE:
      return new DivideBlend(config);
    case BlendMode.HUE:
      return new HueBlend(config);
    case BlendMode.SATURATION:
      return new SaturationBlend(config);
    case BlendMode.COLOR:
      return new ColorBlend(config);
    case BlendMode.LUMINOSITY:
      return new LuminosityBlend(config);
    case BlendMode.VIVID_LIGHT:
      return new VividLightBlend(config);
    case BlendMode.PIN_LIGHT:
      return new PinLightBlend(config);
    case BlendMode.HARD_MIX:
      return new HardMixBlend(config);
    default:
      throw new Error(`Unsupported blend mode: ${mode}`);
  }
}

/**
 * 获取所有支持的混合模式
 */
export function getSupportedBlendModes(): BlendMode[] {
  return Object.values(BlendMode);
}

/**
 * 检查混合模式是否支持
 */
export function isBlendModeSupported(mode: BlendMode): boolean {
  return Object.values(BlendMode).includes(mode);
}

/**
 * 获取混合模式的描述信息
 */
export function getBlendModeDescription(mode: BlendMode): string {
  const descriptions: Record<BlendMode, string> = {
    [BlendMode.NORMAL]: '正常混合',
    [BlendMode.MULTIPLY]: '正片叠底',
    [BlendMode.SCREEN]: '滤色',
    [BlendMode.OVERLAY]: '叠加',
    [BlendMode.SOFT_LIGHT]: '柔光',
    [BlendMode.HARD_LIGHT]: '强光',
    [BlendMode.DARKEN]: '变暗',
    [BlendMode.COLOR_BURN]: '颜色加深',
    [BlendMode.LINEAR_BURN]: '线性加深',
    [BlendMode.DARKER_COLOR]: '深色',
    [BlendMode.LIGHTEN]: '变亮',
    [BlendMode.COLOR_DODGE]: '颜色减淡',
    [BlendMode.LINEAR_DODGE]: '线性减淡',
    [BlendMode.LIGHTER_COLOR]: '浅色',
    [BlendMode.DIFFERENCE]: '差值',
    [BlendMode.EXCLUSION]: '排除',
    [BlendMode.SUBTRACT]: '减去',
    [BlendMode.DIVIDE]: '除法',
    [BlendMode.HUE]: '色相',
    [BlendMode.SATURATION]: '饱和度',
    [BlendMode.COLOR]: '颜色',
    [BlendMode.LUMINOSITY]: '明度',
    [BlendMode.VIVID_LIGHT]: '亮光',
    [BlendMode.PIN_LIGHT]: '点光',
    [BlendMode.HARD_MIX]: '实色混合'
  };

  return descriptions[mode] || '未知混合模式';
}

/**
 * 获取混合模式分类
 */
export function getBlendModeCategory(mode: BlendMode): string {
  const categories: Record<BlendMode, string> = {
    [BlendMode.NORMAL]: '标准',
    [BlendMode.MULTIPLY]: '标准',
    [BlendMode.SCREEN]: '标准',
    [BlendMode.OVERLAY]: '标准',
    [BlendMode.SOFT_LIGHT]: '标准',
    [BlendMode.HARD_LIGHT]: '标准',
    [BlendMode.DARKEN]: '暗色',
    [BlendMode.COLOR_BURN]: '暗色',
    [BlendMode.LINEAR_BURN]: '暗色',
    [BlendMode.DARKER_COLOR]: '暗色',
    [BlendMode.LIGHTEN]: '亮色',
    [BlendMode.COLOR_DODGE]: '亮色',
    [BlendMode.LINEAR_DODGE]: '亮色',
    [BlendMode.LIGHTER_COLOR]: '亮色',
    [BlendMode.DIFFERENCE]: '差值',
    [BlendMode.EXCLUSION]: '差值',
    [BlendMode.SUBTRACT]: '差值',
    [BlendMode.DIVIDE]: '差值',
    [BlendMode.HUE]: '颜色',
    [BlendMode.SATURATION]: '颜色',
    [BlendMode.COLOR]: '颜色',
    [BlendMode.LUMINOSITY]: '颜色',
    [BlendMode.VIVID_LIGHT]: '特殊',
    [BlendMode.PIN_LIGHT]: '特殊',
    [BlendMode.HARD_MIX]: '特殊'
  };

  return categories[mode] || '未知';
}