/**
 * Æ÷!ž°
 */

import { BaseBlendOperation } from './BaseBlendOperation';
import {
  BlendMode,
  BlendModeConfig,
  BlendColor,
  IBlendOperation
} from '../types/BlendTypes';

/**
 * Normal ÷!
 */
export class NormalBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.NORMAL, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    return {
      r: overlayColor.r,
      g: overlayColor.g,
      b: overlayColor.b,
      a: overlayColor.a
    };
  }

  clone(): IBlendOperation {
    return new NormalBlend({ ...this._config });
  }
}

/**
 * Multiply ÷!
 */
export class MultiplyBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.MULTIPLY, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    return this.denormalize({
      r: this.multiply(base.r, overlay.r),
      g: this.multiply(base.g, overlay.g),
      b: this.multiply(base.b, overlay.b),
      a: overlay.a
    });
  }

  clone(): IBlendOperation {
    return new MultiplyBlend({ ...this._config });
  }
}

/**
 * Screen ÷!
 */
export class ScreenBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.SCREEN, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    return this.denormalize({
      r: this.screen(base.r, overlay.r),
      g: this.screen(base.g, overlay.g),
      b: this.screen(base.b, overlay.b),
      a: overlay.a
    });
  }

  clone(): IBlendOperation {
    return new ScreenBlend({ ...this._config });
  }
}

/**
 * Overlay ÷!
 */
export class OverlayBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.OVERLAY, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    return this.denormalize({
      r: this.overlay(base.r, overlay.r),
      g: this.overlay(base.g, overlay.g),
      b: this.overlay(base.b, overlay.b),
      a: overlay.a
    });
  }

  clone(): IBlendOperation {
    return new OverlayBlend({ ...this._config });
  }
}

/**
 * Soft Light ÷!
 */
export class SoftLightBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.SOFT_LIGHT, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    return this.denormalize({
      r: this.softLight(base.r, overlay.r),
      g: this.softLight(base.g, overlay.g),
      b: this.softLight(base.b, overlay.b),
      a: overlay.a
    });
  }

  clone(): IBlendOperation {
    return new SoftLightBlend({ ...this._config });
  }
}

/**
 * Hard Light ÷!
 */
export class HardLightBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.HARD_LIGHT, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    return this.denormalize({
      r: this.hardLight(base.r, overlay.r),
      g: this.hardLight(base.g, overlay.g),
      b: this.hardLight(base.b, overlay.b),
      a: overlay.a
    });
  }

  clone(): IBlendOperation {
    return new HardLightBlend({ ...this._config });
  }
}

/**
 * Darken ÷!
 */
export class DarkenBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.DARKEN, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    return {
      r: Math.min(baseColor.r, overlayColor.r),
      g: Math.min(baseColor.g, overlayColor.g),
      b: Math.min(baseColor.b, overlayColor.b),
      a: overlayColor.a
    };
  }

  clone(): IBlendOperation {
    return new DarkenBlend({ ...this._config });
  }
}

/**
 * Lighten ÷!
 */
export class LightenBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.LIGHTEN, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    return {
      r: Math.max(baseColor.r, overlayColor.r),
      g: Math.max(baseColor.g, overlayColor.g),
      b: Math.max(baseColor.b, overlayColor.b),
      a: overlayColor.a
    };
  }

  clone(): IBlendOperation {
    return new LightenBlend({ ...this._config });
  }
}

/**
 * Color Burn ÷!
 */
export class ColorBurnBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.COLOR_BURN, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    return this.denormalize({
      r: this.colorBurn(base.r, overlay.r),
      g: this.colorBurn(base.g, overlay.g),
      b: this.colorBurn(base.b, overlay.b),
      a: overlay.a
    });
  }

  clone(): IBlendOperation {
    return new ColorBurnBlend({ ...this._config });
  }
}

/**
 * Color Dodge ÷!
 */
export class ColorDodgeBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.COLOR_DODGE, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    return this.denormalize({
      r: this.colorDodge(base.r, overlay.r),
      g: this.colorDodge(base.g, overlay.g),
      b: this.colorDodge(base.b, overlay.b),
      a: overlay.a
    });
  }

  clone(): IBlendOperation {
    return new ColorDodgeBlend({ ...this._config });
  }
}

/**
 * Difference ÷!
 */
export class DifferenceBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.DIFFERENCE, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    return {
      r: Math.abs(baseColor.r - overlayColor.r),
      g: Math.abs(baseColor.g - overlayColor.g),
      b: Math.abs(baseColor.b - overlayColor.b),
      a: overlayColor.a
    };
  }

  clone(): IBlendOperation {
    return new DifferenceBlend({ ...this._config });
  }
}

/**
 * Exclusion ÷!
 */
export class ExclusionBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.EXCLUSION, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    return this.denormalize({
      r: base.r + overlay.r - 2 * base.r * overlay.r,
      g: base.g + overlay.g - 2 * base.g * overlay.g,
      b: base.b + overlay.b - 2 * base.b * overlay.b,
      a: overlay.a
    });
  }

  clone(): IBlendOperation {
    return new ExclusionBlend({ ...this._config });
  }
}

/**
 * Linear Burn ÷!
 */
export class LinearBurnBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.LINEAR_BURN, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    return this.denormalize({
      r: Math.max(0, base.r + overlay.r - 1),
      g: Math.max(0, base.g + overlay.g - 1),
      b: Math.max(0, base.b + overlay.b - 1),
      a: overlay.a
    });
  }

  clone(): IBlendOperation {
    return new LinearBurnBlend({ ...this._config });
  }
}

/**
 * Linear Dodge ÷!
 */
export class LinearDodgeBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.LINEAR_DODGE, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    return this.denormalize({
      r: Math.min(1, base.r + overlay.r),
      g: Math.min(1, base.g + overlay.g),
      b: Math.min(1, base.b + overlay.b),
      a: overlay.a
    });
  }

  clone(): IBlendOperation {
    return new LinearDodgeBlend({ ...this._config });
  }
}

/**
 * Vivid Light ÷!
 */
export class VividLightBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.VIVID_LIGHT, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    const r = overlay.r < 0.5 
      ? this.colorBurn(base.r, 2 * overlay.r)
      : this.colorDodge(base.r, 2 * (overlay.r - 0.5));
    
    const g = overlay.g < 0.5 
      ? this.colorBurn(base.g, 2 * overlay.g)
      : this.colorDodge(base.g, 2 * (overlay.g - 0.5));
    
    const b = overlay.b < 0.5 
      ? this.colorBurn(base.b, 2 * overlay.b)
      : this.colorDodge(base.b, 2 * (overlay.b - 0.5));

    return this.denormalize({ r, g, b, a: overlay.a });
  }

  clone(): IBlendOperation {
    return new VividLightBlend({ ...this._config });
  }
}

/**
 * Pin Light ÷!
 */
export class PinLightBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.PIN_LIGHT, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    const r = overlay.r < 0.5 
      ? Math.min(base.r, 2 * overlay.r)
      : Math.max(base.r, 2 * (overlay.r - 0.5));
    
    const g = overlay.g < 0.5 
      ? Math.min(base.g, 2 * overlay.g)
      : Math.max(base.g, 2 * (overlay.g - 0.5));
    
    const b = overlay.b < 0.5 
      ? Math.min(base.b, 2 * overlay.b)
      : Math.max(base.b, 2 * (overlay.b - 0.5));

    return this.denormalize({ r, g, b, a: overlay.a });
  }

  clone(): IBlendOperation {
    return new PinLightBlend({ ...this._config });
  }
}