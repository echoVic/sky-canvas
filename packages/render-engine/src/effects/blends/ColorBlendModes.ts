import {
  type BlendColor,
  BlendMode,
  type BlendModeConfig,
  type IBlendOperation,
} from '../types/BlendTypes'
import { BaseBlendOperation } from './BaseBlendOperation'

export class HueBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.HUE, config)
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const baseHsl = this.rgbToHsl(baseColor)
    const overlayHsl = this.rgbToHsl(overlayColor)

    const result = this.hslToRgb(overlayHsl.h, baseHsl.s, baseHsl.l)
    result.a = overlayColor.a

    return result
  }

  clone(): IBlendOperation {
    return new HueBlend({ ...this._config })
  }
}

export class SaturationBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.SATURATION, config)
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const baseHsl = this.rgbToHsl(baseColor)
    const overlayHsl = this.rgbToHsl(overlayColor)

    const result = this.hslToRgb(baseHsl.h, overlayHsl.s, baseHsl.l)
    result.a = overlayColor.a

    return result
  }

  clone(): IBlendOperation {
    return new SaturationBlend({ ...this._config })
  }
}

export class ColorBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.COLOR, config)
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const baseHsl = this.rgbToHsl(baseColor)
    const overlayHsl = this.rgbToHsl(overlayColor)

    const result = this.hslToRgb(overlayHsl.h, overlayHsl.s, baseHsl.l)
    result.a = overlayColor.a

    return result
  }

  clone(): IBlendOperation {
    return new ColorBlend({ ...this._config })
  }
}

export class LuminosityBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.LUMINOSITY, config)
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const baseHsl = this.rgbToHsl(baseColor)
    const overlayHsl = this.rgbToHsl(overlayColor)

    const result = this.hslToRgb(baseHsl.h, baseHsl.s, overlayHsl.l)
    result.a = overlayColor.a

    return result
  }

  clone(): IBlendOperation {
    return new LuminosityBlend({ ...this._config })
  }
}

export class DarkerColorBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.DARKER_COLOR, config)
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const baseLuminance = this.getLuminance(baseColor)
    const overlayLuminance = this.getLuminance(overlayColor)

    if (overlayLuminance < baseLuminance) {
      return {
        r: overlayColor.r,
        g: overlayColor.g,
        b: overlayColor.b,
        a: overlayColor.a,
      }
    }
    return {
      r: baseColor.r,
      g: baseColor.g,
      b: baseColor.b,
      a: overlayColor.a,
    }
  }

  clone(): IBlendOperation {
    return new DarkerColorBlend({ ...this._config })
  }
}

export class LighterColorBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.LIGHTER_COLOR, config)
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const baseLuminance = this.getLuminance(baseColor)
    const overlayLuminance = this.getLuminance(overlayColor)

    if (overlayLuminance > baseLuminance) {
      return {
        r: overlayColor.r,
        g: overlayColor.g,
        b: overlayColor.b,
        a: overlayColor.a,
      }
    }
    return {
      r: baseColor.r,
      g: baseColor.g,
      b: baseColor.b,
      a: overlayColor.a,
    }
  }

  clone(): IBlendOperation {
    return new LighterColorBlend({ ...this._config })
  }
}

export class SubtractBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.SUBTRACT, config)
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    return {
      r: this.clamp(baseColor.r - overlayColor.r),
      g: this.clamp(baseColor.g - overlayColor.g),
      b: this.clamp(baseColor.b - overlayColor.b),
      a: overlayColor.a,
    }
  }

  clone(): IBlendOperation {
    return new SubtractBlend({ ...this._config })
  }
}

export class DivideBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.DIVIDE, config)
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor)
    const overlay = this.normalize(overlayColor)

    const r = overlay.r === 0 ? 1 : Math.min(1, base.r / overlay.r)
    const g = overlay.g === 0 ? 1 : Math.min(1, base.g / overlay.g)
    const b = overlay.b === 0 ? 1 : Math.min(1, base.b / overlay.b)

    return this.denormalize({ r, g, b, a: overlay.a })
  }

  clone(): IBlendOperation {
    return new DivideBlend({ ...this._config })
  }
}

export class HardMixBlend extends BaseBlendOperation {
  constructor(config: BlendModeConfig) {
    super(BlendMode.HARD_MIX, config)
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    const base = this.normalize(baseColor)
    const overlay = this.normalize(overlayColor)

    const r = base.r + overlay.r >= 1 ? 1 : 0
    const g = base.g + overlay.g >= 1 ? 1 : 0
    const b = base.b + overlay.b >= 1 ? 1 : 0

    return this.denormalize({ r, g, b, a: overlay.a })
  }

  clone(): IBlendOperation {
    return new HardMixBlend({ ...this._config })
  }
}
