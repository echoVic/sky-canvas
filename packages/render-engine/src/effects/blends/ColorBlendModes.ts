/**
 * œr÷!ž°
 */

import { BaseBlendOperation } from './BaseBlendOperation';
import {
  BlendMode,
  BlendModeConfig,
  BlendColor,
  IBlendOperation
} from '../types/BlendTypes';

/**
 * Hue ÷!
 */
export class HueBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.HUE, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const baseHsl = this.rgbToHsl(baseColor);
    const overlayHsl = this.rgbToHsl(overlayColor);

    // (†ÖB„røú@B„qŒ¦Œ®¦
    const result = this.hslToRgb(overlayHsl.h, baseHsl.s, baseHsl.l);
    result.a = overlayColor.a;
    
    return result;
  }

  clone(): IBlendOperation {
    return new HueBlend({ ...this._config });
  }
}

/**
 * Saturation ÷!
 */
export class SaturationBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.SATURATION, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const baseHsl = this.rgbToHsl(baseColor);
    const overlayHsl = this.rgbToHsl(overlayColor);

    // (†ÖB„qŒ¦ú@B„røŒ®¦
    const result = this.hslToRgb(baseHsl.h, overlayHsl.s, baseHsl.l);
    result.a = overlayColor.a;
    
    return result;
  }

  clone(): IBlendOperation {
    return new SaturationBlend({ ...this._config });
  }
}

/**
 * Color ÷!
 */
export class ColorBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.COLOR, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const baseHsl = this.rgbToHsl(baseColor);
    const overlayHsl = this.rgbToHsl(overlayColor);

    // (†ÖB„røŒqŒ¦ú@B„®¦
    const result = this.hslToRgb(overlayHsl.h, overlayHsl.s, baseHsl.l);
    result.a = overlayColor.a;
    
    return result;
  }

  clone(): IBlendOperation {
    return new ColorBlend({ ...this._config });
  }
}

/**
 * Luminosity ÷!
 */
export class LuminosityBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.LUMINOSITY, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const baseHsl = this.rgbToHsl(baseColor);
    const overlayHsl = this.rgbToHsl(overlayColor);

    // (†ÖB„®¦ú@B„røŒqŒ¦
    const result = this.hslToRgb(baseHsl.h, baseHsl.s, overlayHsl.l);
    result.a = overlayColor.a;
    
    return result;
  }

  clone(): IBlendOperation {
    return new LuminosityBlend({ ...this._config });
  }
}

/**
 * Darker Color ÷!
 */
export class DarkerColorBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.DARKER_COLOR, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const baseLuminance = this.getLuminance(baseColor);
    const overlayLuminance = this.getLuminance(overlayColor);

    // ÔÞ®¦ôN„œr
    if (overlayLuminance < baseLuminance) {
      return {
        r: overlayColor.r,
        g: overlayColor.g,
        b: overlayColor.b,
        a: overlayColor.a
      };
    } else {
      return {
        r: baseColor.r,
        g: baseColor.g,
        b: baseColor.b,
        a: overlayColor.a
      };
    }
  }

  clone(): IBlendOperation {
    return new DarkerColorBlend({ ...this._config });
  }
}

/**
 * Lighter Color ÷!
 */
export class LighterColorBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.LIGHTER_COLOR, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const baseLuminance = this.getLuminance(baseColor);
    const overlayLuminance = this.getLuminance(overlayColor);

    // ÔÞ®¦ôØ„œr
    if (overlayLuminance > baseLuminance) {
      return {
        r: overlayColor.r,
        g: overlayColor.g,
        b: overlayColor.b,
        a: overlayColor.a
      };
    } else {
      return {
        r: baseColor.r,
        g: baseColor.g,
        b: baseColor.b,
        a: overlayColor.a
      };
    }
  }

  clone(): IBlendOperation {
    return new LighterColorBlend({ ...this._config });
  }
}

/**
 * Subtract ÷!
 */
export class SubtractBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.SUBTRACT, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    return {
      r: this.clamp(baseColor.r - overlayColor.r),
      g: this.clamp(baseColor.g - overlayColor.g),
      b: this.clamp(baseColor.b - overlayColor.b),
      a: overlayColor.a
    };
  }

  clone(): IBlendOperation {
    return new SubtractBlend({ ...this._config });
  }
}

/**
 * Divide ÷!
 */
export class DivideBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.DIVIDE, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    // Mdö
    const r = overlay.r === 0 ? 1 : Math.min(1, base.r / overlay.r);
    const g = overlay.g === 0 ? 1 : Math.min(1, base.g / overlay.g);
    const b = overlay.b === 0 ? 1 : Math.min(1, base.b / overlay.b);

    return this.denormalize({ r, g, b, a: overlay.a });
  }

  clone(): IBlendOperation {
    return new DivideBlend({ ...this._config });
  }
}

/**
 * Hard Mix ÷!
 */
export class HardMixBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.HARD_MIX, config);
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor);
    const overlay = this.normalize(overlayColor);

    // l÷Ï*SH/0H/1
    const r = (base.r + overlay.r) >= 1 ? 1 : 0;
    const g = (base.g + overlay.g) >= 1 ? 1 : 0;
    const b = (base.b + overlay.b) >= 1 ? 1 : 0;

    return this.denormalize({ r, g, b, a: overlay.a });
  }

  clone(): IBlendOperation {
    return new HardMixBlend({ ...this._config });
  }
}