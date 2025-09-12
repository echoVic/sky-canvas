/**
 * 通用混合操作实现
 * 通过函数式编程消除混合模式的重复代码
 */

import { BaseBlendOperation } from './BaseBlendOperation';
import {
  BlendMode,
  BlendModeConfig,
  BlendColor,
  IBlendOperation
} from '../types/BlendTypes';

export type BlendFunction = (base: number, overlay: number) => number;
export type RGBBlendFunction = (baseColor: BlendColor, overlayColor: BlendColor) => BlendColor;

/**
 * 通用混合操作类
 * 使用函数式方法实现各种混合模式
 */
export class GenericBlendOperation extends BaseBlendOperation {
  private blendFunction: RGBBlendFunction;

  constructor(mode: BlendMode, blendFunction: RGBBlendFunction, config?: BlendModeConfig) {
    super(mode, config || { mode, opacity: 1, enabled: true });
    this.blendFunction = blendFunction;
  }

  apply(baseColor: BlendColor, overlayColor: BlendColor): BlendColor {
    return this.blendFunction(baseColor, overlayColor);
  }

  clone(): IBlendOperation {
    return new GenericBlendOperation(this.mode, this.blendFunction, { ...this._config });
  }
}

/**
 * 混合模式工厂类
 * 提供创建各种混合模式的静态方法
 */
export class BlendModeFactory {
  /**
   * 创建简单的分量级混合模式
   */
  static createComponentBlend(
    mode: BlendMode, 
    blendFn: BlendFunction,
    config?: BlendModeConfig
  ): GenericBlendOperation {
    return new GenericBlendOperation(
      mode,
      (base, overlay) => ({
        r: blendFn(base.r, overlay.r),
        g: blendFn(base.g, overlay.g),  
        b: blendFn(base.b, overlay.b),
        a: overlay.a
      }),
      config
    );
  }

  /**
   * 创建需要归一化的混合模式
   */
  static createNormalizedBlend(
    mode: BlendMode,
    blendFn: BlendFunction,
    config?: BlendModeConfig
  ): GenericBlendOperation {
    return new GenericBlendOperation(
      mode,
      (base, overlay) => {
        const normalizeColor = (color: BlendColor) => ({
          r: color.r / 255,
          g: color.g / 255,
          b: color.b / 255,
          a: color.a / 255
        });
        
        const denormalizeColor = (color: { r: number; g: number; b: number; a: number }) => ({
          r: Math.round(color.r * 255),
          g: Math.round(color.g * 255),
          b: Math.round(color.b * 255),
          a: Math.round(color.a * 255)
        });

        const normalizedBase = normalizeColor(base);
        const normalizedOverlay = normalizeColor(overlay);

        return denormalizeColor({
          r: blendFn(normalizedBase.r, normalizedOverlay.r),
          g: blendFn(normalizedBase.g, normalizedOverlay.g),
          b: blendFn(normalizedBase.b, normalizedOverlay.b),
          a: normalizedOverlay.a
        });
      },
      config
    );
  }

  /**
   * 创建条件混合模式（如 VividLight, PinLight）
   */
  static createConditionalBlend(
    mode: BlendMode,
    condition: (overlay: number) => boolean,
    trueFn: BlendFunction,
    falseFn: BlendFunction,
    config?: BlendModeConfig
  ): GenericBlendOperation {
    return BlendModeFactory.createNormalizedBlend(
      mode,
      (base, overlay) => condition(overlay) ? trueFn(base, overlay) : falseFn(base, overlay),
      config
    );
  }

  // 预定义的常用混合函数
  static readonly blendFunctions = {
    multiply: (base: number, overlay: number) => base * overlay,
    screen: (base: number, overlay: number) => 1 - (1 - base) * (1 - overlay),
    overlay: (base: number, overlay: number) => 
      base < 0.5 ? 2 * base * overlay : 1 - 2 * (1 - base) * (1 - overlay),
    softLight: (base: number, overlay: number) =>
      overlay < 0.5 ? 2 * base * overlay + base * base * (1 - 2 * overlay)
                    : 2 * base * (1 - overlay) + Math.sqrt(base) * (2 * overlay - 1),
    hardLight: (base: number, overlay: number) =>
      overlay < 0.5 ? 2 * base * overlay : 1 - 2 * (1 - base) * (1 - overlay),
    colorBurn: (base: number, overlay: number) =>
      overlay === 0 ? 0 : Math.max(0, 1 - (1 - base) / overlay),
    colorDodge: (base: number, overlay: number) =>
      overlay === 1 ? 1 : Math.min(1, base / (1 - overlay)),
    darken: (base: number, overlay: number) => Math.min(base, overlay),
    lighten: (base: number, overlay: number) => Math.max(base, overlay),
    difference: (base: number, overlay: number) => Math.abs(base - overlay),
    exclusion: (base: number, overlay: number) => base + overlay - 2 * base * overlay,
    linearBurn: (base: number, overlay: number) => Math.max(0, base + overlay - 1),
    linearDodge: (base: number, overlay: number) => Math.min(1, base + overlay)
  };

  // 工厂方法：创建标准混合模式
  static multiply(config?: BlendModeConfig) {
    return BlendModeFactory.createNormalizedBlend(
      BlendMode.MULTIPLY, 
      BlendModeFactory.blendFunctions.multiply, 
      config
    );
  }

  static screen(config?: BlendModeConfig) {
    return BlendModeFactory.createNormalizedBlend(
      BlendMode.SCREEN, 
      BlendModeFactory.blendFunctions.screen, 
      config
    );
  }

  static overlay(config?: BlendModeConfig) {
    return BlendModeFactory.createNormalizedBlend(
      BlendMode.OVERLAY, 
      BlendModeFactory.blendFunctions.overlay, 
      config
    );
  }

  static softLight(config?: BlendModeConfig) {
    return BlendModeFactory.createNormalizedBlend(
      BlendMode.SOFT_LIGHT, 
      BlendModeFactory.blendFunctions.softLight, 
      config
    );
  }

  static hardLight(config?: BlendModeConfig) {
    return BlendModeFactory.createNormalizedBlend(
      BlendMode.HARD_LIGHT, 
      BlendModeFactory.blendFunctions.hardLight, 
      config
    );
  }

  static colorBurn(config?: BlendModeConfig) {
    return BlendModeFactory.createNormalizedBlend(
      BlendMode.COLOR_BURN, 
      BlendModeFactory.blendFunctions.colorBurn, 
      config
    );
  }

  static colorDodge(config?: BlendModeConfig) {
    return BlendModeFactory.createNormalizedBlend(
      BlendMode.COLOR_DODGE, 
      BlendModeFactory.blendFunctions.colorDodge, 
      config
    );
  }

  static darken(config?: BlendModeConfig) {
    return BlendModeFactory.createComponentBlend(
      BlendMode.DARKEN, 
      BlendModeFactory.blendFunctions.darken, 
      config
    );
  }

  static lighten(config?: BlendModeConfig) {
    return BlendModeFactory.createComponentBlend(
      BlendMode.LIGHTEN, 
      BlendModeFactory.blendFunctions.lighten, 
      config
    );
  }

  static difference(config?: BlendModeConfig) {
    return BlendModeFactory.createComponentBlend(
      BlendMode.DIFFERENCE, 
      BlendModeFactory.blendFunctions.difference, 
      config
    );
  }

  static exclusion(config?: BlendModeConfig) {
    return BlendModeFactory.createNormalizedBlend(
      BlendMode.EXCLUSION, 
      BlendModeFactory.blendFunctions.exclusion, 
      config
    );
  }

  static linearBurn(config?: BlendModeConfig) {
    return BlendModeFactory.createNormalizedBlend(
      BlendMode.LINEAR_BURN, 
      BlendModeFactory.blendFunctions.linearBurn, 
      config
    );
  }

  static linearDodge(config?: BlendModeConfig) {
    return BlendModeFactory.createNormalizedBlend(
      BlendMode.LINEAR_DODGE, 
      BlendModeFactory.blendFunctions.linearDodge, 
      config
    );
  }

  static vividLight(config?: BlendModeConfig) {
    return BlendModeFactory.createConditionalBlend(
      BlendMode.VIVID_LIGHT,
      (overlay) => overlay < 0.5,
      (base, overlay) => BlendModeFactory.blendFunctions.colorBurn(base, 2 * overlay),
      (base, overlay) => BlendModeFactory.blendFunctions.colorDodge(base, 2 * (overlay - 0.5)),
      config
    );
  }

  static pinLight(config?: BlendModeConfig) {
    return BlendModeFactory.createConditionalBlend(
      BlendMode.PIN_LIGHT,
      (overlay) => overlay < 0.5,
      (base, overlay) => Math.min(base, 2 * overlay),
      (base, overlay) => Math.max(base, 2 * (overlay - 0.5)),
      config
    );
  }

  static normal(config?: BlendModeConfig) {
    return new GenericBlendOperation(
      BlendMode.NORMAL,
      (base, overlay) => overlay,
      config
    );
  }
}