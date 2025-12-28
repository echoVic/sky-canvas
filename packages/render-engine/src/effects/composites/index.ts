/**
 * 复合操作系统导出
 */

// 类型定义
export * from '../types/CompositeTypes';

// 基础类
export { BaseCompositeOperation } from './BaseCompositeOperation';

// 标准复合操作
export {
  SourceOverComposite,
  SourceAtopComposite,
  SourceInComposite,
  SourceOutComposite,
  DestinationOverComposite,
  DestinationAtopComposite,
  DestinationInComposite,
  DestinationOutComposite,
  LighterComposite,
  CopyComposite,
  XORComposite
} from './StandardCompositeOperations';

// 混合复合操作
export {
  MultiplyComposite,
  ScreenComposite,
  OverlayComposite,
  DarkenComposite,
  LightenComposite,
  ColorDodgeComposite,
  ColorBurnComposite,
  HardLightComposite,
  SoftLightComposite,
  DifferenceComposite,
  ExclusionComposite
} from './BlendCompositeOperations';

// 颜色复合操作
export {
  HueComposite,
  SaturationComposite,
  ColorComposite,
  LuminosityComposite
} from './ColorCompositeOperations';

// 管理器
export { CompositeManager } from './CompositeManager';

// 导入具体实现
import { 
  CompositeOperation, 
  CompositeConfig, 
  ICompositeOperation,
  CompositeCategory,
  CompositeModeInfo
} from '../types/CompositeTypes';
import {
  SourceOverComposite,
  SourceAtopComposite,
  SourceInComposite,
  SourceOutComposite,
  DestinationOverComposite,
  DestinationAtopComposite,
  DestinationInComposite,
  DestinationOutComposite,
  LighterComposite,
  CopyComposite,
  XORComposite
} from './StandardCompositeOperations';
import {
  MultiplyComposite,
  ScreenComposite,
  OverlayComposite,
  DarkenComposite,
  LightenComposite,
  ColorDodgeComposite,
  ColorBurnComposite,
  HardLightComposite,
  SoftLightComposite,
  DifferenceComposite,
  ExclusionComposite
} from './BlendCompositeOperations';
import {
  HueComposite,
  SaturationComposite,
  ColorComposite,
  LuminosityComposite
} from './ColorCompositeOperations';

/**
 * 复合操作工厂函数
 */
export function createCompositeOperation(
  operation: CompositeOperation, 
  config: CompositeConfig
): ICompositeOperation {
  switch (operation) {
    case CompositeOperation.SOURCE_OVER:
      return new SourceOverComposite(config);
    case CompositeOperation.SOURCE_ATOP:
      return new SourceAtopComposite(config);
    case CompositeOperation.SOURCE_IN:
      return new SourceInComposite(config);
    case CompositeOperation.SOURCE_OUT:
      return new SourceOutComposite(config);
    case CompositeOperation.DESTINATION_OVER:
      return new DestinationOverComposite(config);
    case CompositeOperation.DESTINATION_ATOP:
      return new DestinationAtopComposite(config);
    case CompositeOperation.DESTINATION_IN:
      return new DestinationInComposite(config);
    case CompositeOperation.DESTINATION_OUT:
      return new DestinationOutComposite(config);
    case CompositeOperation.LIGHTER:
      return new LighterComposite(config);
    case CompositeOperation.COPY:
      return new CopyComposite(config);
    case CompositeOperation.XOR:
      return new XORComposite(config);
    case CompositeOperation.MULTIPLY:
      return new MultiplyComposite(config);
    case CompositeOperation.SCREEN:
      return new ScreenComposite(config);
    case CompositeOperation.OVERLAY:
      return new OverlayComposite(config);
    case CompositeOperation.DARKEN:
      return new DarkenComposite(config);
    case CompositeOperation.LIGHTEN:
      return new LightenComposite(config);
    case CompositeOperation.COLOR_DODGE:
      return new ColorDodgeComposite(config);
    case CompositeOperation.COLOR_BURN:
      return new ColorBurnComposite(config);
    case CompositeOperation.HARD_LIGHT:
      return new HardLightComposite(config);
    case CompositeOperation.SOFT_LIGHT:
      return new SoftLightComposite(config);
    case CompositeOperation.DIFFERENCE:
      return new DifferenceComposite(config);
    case CompositeOperation.EXCLUSION:
      return new ExclusionComposite(config);
    case CompositeOperation.HUE:
      return new HueComposite(config);
    case CompositeOperation.SATURATION:
      return new SaturationComposite(config);
    case CompositeOperation.COLOR:
      return new ColorComposite(config);
    case CompositeOperation.LUMINOSITY:
      return new LuminosityComposite(config);
    default:
      throw new Error(`Unsupported composite operation: ${operation}`);
  }
}

/**
 * 获取所有支持的复合操作
 */
export function getSupportedCompositeOperations(): CompositeOperation[] {
  return Object.values(CompositeOperation);
}

/**
 * 检查复合操作是否支持
 */
export function isCompositeOperationSupported(operation: CompositeOperation): boolean {
  return Object.values(CompositeOperation).includes(operation);
}

/**
 * 获取复合操作的描述信息
 */
export function getCompositeOperationDescription(operation: CompositeOperation): string {
  const descriptions: Record<CompositeOperation, string> = {
    [CompositeOperation.SOURCE_OVER]: '源在上 - 默认绘制模式',
    [CompositeOperation.SOURCE_ATOP]: '源在目标上方 - 仅在目标存在的地方绘制源',
    [CompositeOperation.SOURCE_IN]: '源在内 - 仅在目标内部绘制源',
    [CompositeOperation.SOURCE_OUT]: '源在外 - 仅在目标外部绘制源',
    [CompositeOperation.DESTINATION_OVER]: '目标在上 - 在源后面绘制目标',
    [CompositeOperation.DESTINATION_ATOP]: '目标在源上方 - 仅在源存在的地方绘制目标',
    [CompositeOperation.DESTINATION_IN]: '目标在内 - 仅在源内部保留目标',
    [CompositeOperation.DESTINATION_OUT]: '目标在外 - 仅在源外部保留目标',
    [CompositeOperation.LIGHTER]: '变亮 - 颜色值相加',
    [CompositeOperation.COPY]: '复制 - 仅显示源',
    [CompositeOperation.XOR]: '异或 - 仅显示不重叠的部分',
    [CompositeOperation.MULTIPLY]: '正片叠底 - 颜色相乘变暗',
    [CompositeOperation.SCREEN]: '滤色 - 颜色反相乘变亮',
    [CompositeOperation.OVERLAY]: '叠加 - 亮部分滤色，暗部分正片叠底',
    [CompositeOperation.DARKEN]: '变暗 - 保留较暗的颜色',
    [CompositeOperation.LIGHTEN]: '变亮 - 保留较亮的颜色',
    [CompositeOperation.COLOR_DODGE]: '颜色减淡 - 亮化下层颜色',
    [CompositeOperation.COLOR_BURN]: '颜色加深 - 加深下层颜色',
    [CompositeOperation.HARD_LIGHT]: '强光 - 类似叠加但更强烈',
    [CompositeOperation.SOFT_LIGHT]: '柔光 - 类似强光但更柔和',
    [CompositeOperation.DIFFERENCE]: '差值 - 颜色值相减',
    [CompositeOperation.EXCLUSION]: '排除 - 类似差值但对比度更低',
    [CompositeOperation.HUE]: '色相 - 保留源的色相',
    [CompositeOperation.SATURATION]: '饱和度 - 保留源的饱和度',
    [CompositeOperation.COLOR]: '颜色 - 保留源的色相和饱和度',
    [CompositeOperation.LUMINOSITY]: '亮度 - 保留源的亮度'
  };

  return descriptions[operation] || '未知复合操作';
}

/**
 * 获取复合操作分类
 */
export function getCompositeOperationCategory(operation: CompositeOperation): CompositeCategory {
  const categories: Record<CompositeOperation, CompositeCategory> = {
    [CompositeOperation.SOURCE_OVER]: CompositeCategory.SOURCE,
    [CompositeOperation.SOURCE_ATOP]: CompositeCategory.SOURCE,
    [CompositeOperation.SOURCE_IN]: CompositeCategory.SOURCE,
    [CompositeOperation.SOURCE_OUT]: CompositeCategory.SOURCE,
    [CompositeOperation.DESTINATION_OVER]: CompositeCategory.DESTINATION,
    [CompositeOperation.DESTINATION_ATOP]: CompositeCategory.DESTINATION,
    [CompositeOperation.DESTINATION_IN]: CompositeCategory.DESTINATION,
    [CompositeOperation.DESTINATION_OUT]: CompositeCategory.DESTINATION,
    [CompositeOperation.LIGHTER]: CompositeCategory.SPECIAL,
    [CompositeOperation.COPY]: CompositeCategory.SPECIAL,
    [CompositeOperation.XOR]: CompositeCategory.SPECIAL,
    [CompositeOperation.MULTIPLY]: CompositeCategory.BLEND,
    [CompositeOperation.SCREEN]: CompositeCategory.BLEND,
    [CompositeOperation.OVERLAY]: CompositeCategory.BLEND,
    [CompositeOperation.DARKEN]: CompositeCategory.BLEND,
    [CompositeOperation.LIGHTEN]: CompositeCategory.BLEND,
    [CompositeOperation.COLOR_DODGE]: CompositeCategory.BLEND,
    [CompositeOperation.COLOR_BURN]: CompositeCategory.BLEND,
    [CompositeOperation.HARD_LIGHT]: CompositeCategory.BLEND,
    [CompositeOperation.SOFT_LIGHT]: CompositeCategory.BLEND,
    [CompositeOperation.DIFFERENCE]: CompositeCategory.BLEND,
    [CompositeOperation.EXCLUSION]: CompositeCategory.BLEND,
    [CompositeOperation.HUE]: CompositeCategory.BLEND,
    [CompositeOperation.SATURATION]: CompositeCategory.BLEND,
    [CompositeOperation.COLOR]: CompositeCategory.BLEND,
    [CompositeOperation.LUMINOSITY]: CompositeCategory.BLEND
  };

  return categories[operation] || CompositeCategory.SPECIAL;
}

/**
 * 获取复合操作模式信息
 */
export function getCompositeOperationInfo(operation: CompositeOperation): CompositeModeInfo {
  return {
    name: operation,
    description: getCompositeOperationDescription(operation),
    category: getCompositeOperationCategory(operation),
    supported: isCompositeOperationSupported(operation)
  };
}

/**
 * 按分类获取复合操作
 */
export function getCompositeOperationsByCategory(category: CompositeCategory): CompositeOperation[] {
  return getSupportedCompositeOperations().filter(
    operation => getCompositeOperationCategory(operation) === category
  );
}