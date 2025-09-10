/**
 * 混合复合操作
 */

import { BaseCompositeOperation } from './BaseCompositeOperation';
import {
  CompositeOperation,
  CompositeConfig,
  ICompositeOperation
} from '../types/CompositeTypes';

/**
 * Multiply 复合操作
 */
export class MultiplyComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.MULTIPLY, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    return {
      r: alpha === 0 ? 0 : (src.r * dest.r * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (src.g * dest.g * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (src.b * dest.b * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  clone(): ICompositeOperation {
    return new MultiplyComposite({ ...this._config });
  }
}

/**
 * Screen 复合操作
 */
export class ScreenComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.SCREEN, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    const screenR = 1 - (1 - src.r) * (1 - dest.r);
    const screenG = 1 - (1 - src.g) * (1 - dest.g);
    const screenB = 1 - (1 - src.b) * (1 - dest.b);

    return {
      r: alpha === 0 ? 0 : (screenR * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (screenG * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (screenB * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  clone(): ICompositeOperation {
    return new ScreenComposite({ ...this._config });
  }
}

/**
 * Overlay 复合操作
 */
export class OverlayComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.OVERLAY, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    const overlayR = dest.r < 0.5 
      ? 2 * dest.r * src.r 
      : 1 - 2 * (1 - dest.r) * (1 - src.r);
    const overlayG = dest.g < 0.5 
      ? 2 * dest.g * src.g 
      : 1 - 2 * (1 - dest.g) * (1 - src.g);
    const overlayB = dest.b < 0.5 
      ? 2 * dest.b * src.b 
      : 1 - 2 * (1 - dest.b) * (1 - src.b);

    return {
      r: alpha === 0 ? 0 : (overlayR * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (overlayG * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (overlayB * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  clone(): ICompositeOperation {
    return new OverlayComposite({ ...this._config });
  }
}

/**
 * Darken 复合操作
 */
export class DarkenComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.DARKEN, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    const darkenR = Math.min(src.r, dest.r);
    const darkenG = Math.min(src.g, dest.g);
    const darkenB = Math.min(src.b, dest.b);

    return {
      r: alpha === 0 ? 0 : (darkenR * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (darkenG * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (darkenB * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  clone(): ICompositeOperation {
    return new DarkenComposite({ ...this._config });
  }
}

/**
 * Lighten 复合操作
 */
export class LightenComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.LIGHTEN, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    const lightenR = Math.max(src.r, dest.r);
    const lightenG = Math.max(src.g, dest.g);
    const lightenB = Math.max(src.b, dest.b);

    return {
      r: alpha === 0 ? 0 : (lightenR * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (lightenG * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (lightenB * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  clone(): ICompositeOperation {
    return new LightenComposite({ ...this._config });
  }
}

/**
 * Color Dodge 复合操作
 */
export class ColorDodgeComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.COLOR_DODGE, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    const dodgeR = src.r >= 1 ? 1 : Math.min(1, dest.r / (1 - src.r));
    const dodgeG = src.g >= 1 ? 1 : Math.min(1, dest.g / (1 - src.g));
    const dodgeB = src.b >= 1 ? 1 : Math.min(1, dest.b / (1 - src.b));

    return {
      r: alpha === 0 ? 0 : (dodgeR * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (dodgeG * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (dodgeB * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  clone(): ICompositeOperation {
    return new ColorDodgeComposite({ ...this._config });
  }
}

/**
 * Color Burn 复合操作
 */
export class ColorBurnComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.COLOR_BURN, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    const burnR = src.r <= 0 ? 0 : Math.max(0, 1 - (1 - dest.r) / src.r);
    const burnG = src.g <= 0 ? 0 : Math.max(0, 1 - (1 - dest.g) / src.g);
    const burnB = src.b <= 0 ? 0 : Math.max(0, 1 - (1 - dest.b) / src.b);

    return {
      r: alpha === 0 ? 0 : (burnR * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (burnG * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (burnB * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  clone(): ICompositeOperation {
    return new ColorBurnComposite({ ...this._config });
  }
}

/**
 * Hard Light 复合操作
 */
export class HardLightComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.HARD_LIGHT, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    const hardLightR = src.r < 0.5 
      ? 2 * src.r * dest.r 
      : 1 - 2 * (1 - src.r) * (1 - dest.r);
    const hardLightG = src.g < 0.5 
      ? 2 * src.g * dest.g 
      : 1 - 2 * (1 - src.g) * (1 - dest.g);
    const hardLightB = src.b < 0.5 
      ? 2 * src.b * dest.b 
      : 1 - 2 * (1 - src.b) * (1 - dest.b);

    return {
      r: alpha === 0 ? 0 : (hardLightR * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (hardLightG * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (hardLightB * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  clone(): ICompositeOperation {
    return new HardLightComposite({ ...this._config });
  }
}

/**
 * Soft Light 复合操作
 */
export class SoftLightComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.SOFT_LIGHT, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    const softLightR = src.r < 0.5 
      ? dest.r - (1 - 2 * src.r) * dest.r * (1 - dest.r)
      : dest.r + (2 * src.r - 1) * (Math.sqrt(dest.r) - dest.r);
    const softLightG = src.g < 0.5 
      ? dest.g - (1 - 2 * src.g) * dest.g * (1 - dest.g)
      : dest.g + (2 * src.g - 1) * (Math.sqrt(dest.g) - dest.g);
    const softLightB = src.b < 0.5 
      ? dest.b - (1 - 2 * src.b) * dest.b * (1 - dest.b)
      : dest.b + (2 * src.b - 1) * (Math.sqrt(dest.b) - dest.b);

    return {
      r: alpha === 0 ? 0 : (softLightR * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (softLightG * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (softLightB * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  clone(): ICompositeOperation {
    return new SoftLightComposite({ ...this._config });
  }
}

/**
 * Difference 复合操作
 */
export class DifferenceComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.DIFFERENCE, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    const diffR = Math.abs(dest.r - src.r);
    const diffG = Math.abs(dest.g - src.g);
    const diffB = Math.abs(dest.b - src.b);

    return {
      r: alpha === 0 ? 0 : (diffR * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (diffG * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (diffB * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  clone(): ICompositeOperation {
    return new DifferenceComposite({ ...this._config });
  }
}

/**
 * Exclusion 复合操作
 */
export class ExclusionComposite extends BaseCompositeOperation {
  constructor(config: CompositeConfig) {
    super(CompositeOperation.EXCLUSION, config);
  }

  protected compositePixel(
    dest: { r: number; g: number; b: number; a: number },
    src: { r: number; g: number; b: number; a: number }
  ): { r: number; g: number; b: number; a: number } {
    const alpha = src.a + dest.a * (1 - src.a);
    const invSrcA = 1 - src.a;
    const invDestA = 1 - dest.a;

    const exclusionR = dest.r + src.r - 2 * dest.r * src.r;
    const exclusionG = dest.g + src.g - 2 * dest.g * src.g;
    const exclusionB = dest.b + src.b - 2 * dest.b * src.b;

    return {
      r: alpha === 0 ? 0 : (exclusionR * src.a + src.r * dest.a * invDestA + dest.r * src.a * invSrcA) / alpha,
      g: alpha === 0 ? 0 : (exclusionG * src.a + src.g * dest.a * invDestA + dest.g * src.a * invSrcA) / alpha,
      b: alpha === 0 ? 0 : (exclusionB * src.a + src.b * dest.a * invDestA + dest.b * src.a * invSrcA) / alpha,
      a: alpha
    };
  }

  clone(): ICompositeOperation {
    return new ExclusionComposite({ ...this._config });
  }
}