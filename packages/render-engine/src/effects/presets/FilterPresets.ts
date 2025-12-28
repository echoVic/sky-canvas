/**
 * 滤镜预设
 * 提供常用的滤镜效果预设
 */

import { FilterParameters, FilterType } from '../types/FilterTypes';

export class FilterPresets {
  /**
   * 获取亮度调整预设
   */
  static getBrightnessPresets(): Record<string, FilterParameters> {
    return {
      subtle: {
        type: FilterType.BRIGHTNESS,
        brightness: 10,
        enabled: true,
        opacity: 1
      },
      moderate: {
        type: FilterType.BRIGHTNESS,
        brightness: 25,
        enabled: true,
        opacity: 1
      },
      strong: {
        type: FilterType.BRIGHTNESS,
        brightness: 50,
        enabled: true,
        opacity: 1
      },
      dark: {
        type: FilterType.BRIGHTNESS,
        brightness: -30,
        enabled: true,
        opacity: 1
      }
    };
  }

  /**
   * 获取对比度调整预设
   */
  static getContrastPresets(): Record<string, FilterParameters> {
    return {
      subtle: {
        type: FilterType.CONTRAST,
        contrast: 10,
        enabled: true,
        opacity: 1
      },
      moderate: {
        type: FilterType.CONTRAST,
        contrast: 25,
        enabled: true,
        opacity: 1
      },
      strong: {
        type: FilterType.CONTRAST,
        contrast: 50,
        enabled: true,
        opacity: 1
      },
      low: {
        type: FilterType.CONTRAST,
        contrast: -20,
        enabled: true,
        opacity: 1
      }
    };
  }

  /**
   * 获取饱和度调整预设
   */
  static getSaturationPresets(): Record<string, FilterParameters> {
    return {
      subtle: {
        type: FilterType.SATURATION,
        saturation: 15,
        enabled: true,
        opacity: 1
      },
      moderate: {
        type: FilterType.SATURATION,
        saturation: 30,
        enabled: true,
        opacity: 1
      },
      strong: {
        type: FilterType.SATURATION,
        saturation: 60,
        enabled: true,
        opacity: 1
      },
      desaturated: {
        type: FilterType.SATURATION,
        saturation: -40,
        enabled: true,
        opacity: 1
      }
    };
  }

  /**
   * 获取模糊效果预设
   */
  static getBlurPresets(): Record<string, FilterParameters> {
    return {
      subtle: {
        type: FilterType.GAUSSIAN_BLUR,
        radius: 2,
        quality: 'low',
        enabled: true,
        opacity: 1
      },
      moderate: {
        type: FilterType.GAUSSIAN_BLUR,
        radius: 5,
        quality: 'medium',
        enabled: true,
        opacity: 1
      },
      strong: {
        type: FilterType.GAUSSIAN_BLUR,
        radius: 10,
        quality: 'high',
        enabled: true,
        opacity: 1
      },
      heavy: {
        type: FilterType.GAUSSIAN_BLUR,
        radius: 20,
        quality: 'high',
        enabled: true,
        opacity: 1
      }
    };
  }

  /**
   * 获取发光效果预设
   */
  static getGlowPresets(): Record<string, FilterParameters> {
    return {
      subtle: {
        type: FilterType.GLOW,
        color: '#ffffff',
        blur: 5,
        strength: 0.5,
        quality: 'low',
        enabled: true,
        opacity: 1
      },
      moderate: {
        type: FilterType.GLOW,
        color: '#ffffff',
        blur: 10,
        strength: 1.0,
        quality: 'medium',
        enabled: true,
        opacity: 1
      },
      strong: {
        type: FilterType.GLOW,
        color: '#ffffff',
        blur: 15,
        strength: 2.0,
        quality: 'high',
        enabled: true,
        opacity: 1
      },
      colored: {
        type: FilterType.GLOW,
        color: '#ff6b6b',
        blur: 12,
        strength: 1.5,
        quality: 'medium',
        enabled: true,
        opacity: 1
      }
    };
  }

  /**
   * 获取投影效果预设
   */
  static getDropShadowPresets(): Record<string, FilterParameters> {
    return {
      subtle: {
        type: FilterType.DROP_SHADOW,
        offsetX: 2,
        offsetY: 2,
        blur: 4,
        color: '#000000',
        opacity: 0.3,
        enabled: true
      },
      moderate: {
        type: FilterType.DROP_SHADOW,
        offsetX: 4,
        offsetY: 4,
        blur: 8,
        color: '#000000',
        opacity: 0.5,
        enabled: true
      },
      strong: {
        type: FilterType.DROP_SHADOW,
        offsetX: 6,
        offsetY: 6,
        blur: 12,
        color: '#000000',
        opacity: 0.7,
        enabled: true
      },
      colored: {
        type: FilterType.DROP_SHADOW,
        offsetX: 3,
        offsetY: 3,
        blur: 6,
        color: '#ff6b6b',
        opacity: 0.6,
        enabled: true
      }
    };
  }

  /**
   * 获取艺术效果预设
   */
  static getArtisticPresets(): Record<string, FilterParameters> {
    return {
      sepia: {
        type: FilterType.SEPIA,
        amount: 0.8,
        enabled: true,
        opacity: 1
      },
      grayscale: {
        type: FilterType.GRAYSCALE,
        amount: 1.0,
        enabled: true,
        opacity: 1
      },
      invert: {
        type: FilterType.INVERT,
        amount: 1.0,
        enabled: true,
        opacity: 1
      },
      vintage: {
        type: FilterType.SEPIA,
        amount: 0.6,
        enabled: true,
        opacity: 0.8
      }
    };
  }

  /**
   * 获取所有预设
   */
  static getAllPresets(): Record<string, Record<string, FilterParameters>> {
    return {
      brightness: this.getBrightnessPresets(),
      contrast: this.getContrastPresets(),
      saturation: this.getSaturationPresets(),
      blur: this.getBlurPresets(),
      glow: this.getGlowPresets(),
      dropShadow: this.getDropShadowPresets(),
      artistic: this.getArtisticPresets()
    };
  }

  /**
   * 获取特定类型的预设
   */
  static getPresetsByType(type: string): Record<string, FilterParameters> | undefined {
    const allPresets = this.getAllPresets();
    return allPresets[type];
  }

  /**
   * 获取特定预设
   */
  static getPreset(type: string, name: string): FilterParameters | undefined {
    const typePresets = this.getPresetsByType(type);
    return typePresets?.[name];
  }
}
