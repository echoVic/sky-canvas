/**
 * 颜色工具函数
 * 提供颜色解析、转换和操作的通用方法
 */

export interface RGBAColor {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
  a: number; // 0-255
}

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface HSVColor {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

export interface NormalizedRGBAColor {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1
}

/**
 * 解析颜色字符串为RGBA格式
 * 支持格式：#RGB, #RRGGBB, #RRGGBBAA, rgb(), rgba(), hsl(), hsla(), 命名颜色
 * @param colorString 颜色字符串
 * @returns RGBA颜色对象
 */
export function parseColor(colorString: string): RGBAColor {
  const color = colorString.trim().toLowerCase();
  
  // 处理十六进制颜色
  if (color.startsWith('#')) {
    return parseHexColor(color);
  }
  
  // 处理RGB/RGBA颜色
  if (color.startsWith('rgb')) {
    return parseRgbColor(color);
  }
  
  // 处理HSL/HSLA颜色
  if (color.startsWith('hsl')) {
    return parseHslColor(color);
  }
  
  // 处理命名颜色
  const namedColor = parseNamedColor(color);
  if (namedColor) {
    return namedColor;
  }
  
  // 默认返回黑色
  console.warn(`Unable to parse color: ${colorString}`);
  return { r: 0, g: 0, b: 0, a: 255 };
}

/**
 * 解析十六进制颜色
 */
function parseHexColor(hex: string): RGBAColor {
  const cleanHex = hex.slice(1); // 移除 #
  
  switch (cleanHex.length) {
    case 3: // #RGB
      return {
        r: parseInt(cleanHex[0] + cleanHex[0], 16),
        g: parseInt(cleanHex[1] + cleanHex[1], 16),
        b: parseInt(cleanHex[2] + cleanHex[2], 16),
        a: 255
      };
    case 6: // #RRGGBB
      return {
        r: parseInt(cleanHex.slice(0, 2), 16),
        g: parseInt(cleanHex.slice(2, 4), 16),
        b: parseInt(cleanHex.slice(4, 6), 16),
        a: 255
      };
    case 8: // #RRGGBBAA
      return {
        r: parseInt(cleanHex.slice(0, 2), 16),
        g: parseInt(cleanHex.slice(2, 4), 16),
        b: parseInt(cleanHex.slice(4, 6), 16),
        a: parseInt(cleanHex.slice(6, 8), 16)
      };
    default:
      return { r: 0, g: 0, b: 0, a: 255 };
  }
}

/**
 * 解析RGB/RGBA颜色
 */
function parseRgbColor(rgb: string): RGBAColor {
  const match = rgb.match(/rgba?\(\s*([^)]+)\s*\)/);
  if (!match) return { r: 0, g: 0, b: 0, a: 255 };
  
  const values = match[1].split(',').map(v => parseFloat(v.trim()));
  
  return {
    r: Math.round(clamp(values[0] || 0, 0, 255)),
    g: Math.round(clamp(values[1] || 0, 0, 255)),
    b: Math.round(clamp(values[2] || 0, 0, 255)),
    a: values.length > 3 ? Math.round(clamp(values[3] || 1, 0, 1) * 255) : 255
  };
}

/**
 * 解析HSL/HSLA颜色
 */
function parseHslColor(hsl: string): RGBAColor {
  const match = hsl.match(/hsla?\(\s*([^)]+)\s*\)/);
  if (!match) return { r: 0, g: 0, b: 0, a: 255 };
  
  const values = match[1].split(',').map(v => v.trim());
  const h = parseFloat(values[0]) || 0;
  const s = parseFloat(values[1]?.replace('%', '')) || 0;
  const l = parseFloat(values[2]?.replace('%', '')) || 0;
  const a = values.length > 3 ? parseFloat(values[3]) || 1 : 1;
  
  const rgb = hslToRgb(h, s, l);
  return { ...rgb, a: Math.round(clamp(a, 0, 1) * 255) };
}

/**
 * 命名颜色映射
 */
const NAMED_COLORS: Record<string, RGBAColor> = {
  transparent: { r: 0, g: 0, b: 0, a: 0 },
  black: { r: 0, g: 0, b: 0, a: 255 },
  white: { r: 255, g: 255, b: 255, a: 255 },
  red: { r: 255, g: 0, b: 0, a: 255 },
  green: { r: 0, g: 128, b: 0, a: 255 },
  blue: { r: 0, g: 0, b: 255, a: 255 },
  yellow: { r: 255, g: 255, b: 0, a: 255 },
  cyan: { r: 0, g: 255, b: 255, a: 255 },
  magenta: { r: 255, g: 0, b: 255, a: 255 },
  gray: { r: 128, g: 128, b: 128, a: 255 },
  orange: { r: 255, g: 165, b: 0, a: 255 },
  purple: { r: 128, g: 0, b: 128, a: 255 }
};

/**
 * 解析命名颜色
 */
function parseNamedColor(name: string): RGBAColor | null {
  return NAMED_COLORS[name] || null;
}

/**
 * RGB转HSL
 * @param r 红色分量 (0-255) 或 RGBAColor 对象
 * @param g 绿色分量 (0-255)
 * @param b 蓝色分量 (0-255)
 * @returns HSL颜色对象
 */
export function rgbToHsl(r: number | RGBAColor, g?: number, b?: number): HSLColor {
  let red: number, green: number, blue: number;
  
  if (typeof r === 'object') {
    ({ r: red, g: green, b: blue } = r);
  } else {
    red = r;
    green = g!;
    blue = b!;
  }
  
  // 归一化到 0-1
  const rNorm = red / 255;
  const gNorm = green / 255;
  const bNorm = blue / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const diff = max - min;
  
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
    
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / diff + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / diff + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / diff + 4;
        break;
    }
    h /= 6;
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * HSL转RGB
 * @param h 色相 (0-360) 或 HSLColor 对象
 * @param s 饱和度 (0-100)
 * @param l 亮度 (0-100)
 * @returns RGB颜色对象
 */
export function hslToRgb(h: number | HSLColor, s?: number, l?: number): RGBAColor {
  let hue: number, saturation: number, lightness: number;
  
  if (typeof h === 'object') {
    ({ h: hue, s: saturation, l: lightness } = h);
  } else {
    hue = h;
    saturation = s!;
    lightness = l!;
  }
  
  // 归一化
  const hNorm = hue / 360;
  const sNorm = saturation / 100;
  const lNorm = lightness / 100;
  
  let r, g, b;
  
  if (sNorm === 0) {
    r = g = b = lNorm; // 灰度
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = lNorm < 0.5 ? lNorm * (1 + sNorm) : lNorm + sNorm - lNorm * sNorm;
    const p = 2 * lNorm - q;
    
    r = hue2rgb(p, q, hNorm + 1/3);
    g = hue2rgb(p, q, hNorm);
    b = hue2rgb(p, q, hNorm - 1/3);
  }
  
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
    a: 255
  };
}

/**
 * RGB转HSV
 * @param r 红色分量 (0-255) 或 RGBAColor 对象
 * @param g 绿色分量 (0-255)
 * @param b 蓝色分量 (0-255)
 * @returns HSV颜色对象
 */
export function rgbToHsv(r: number | RGBAColor, g?: number, b?: number): HSVColor {
  let red: number, green: number, blue: number;
  
  if (typeof r === 'object') {
    ({ r: red, g: green, b: blue } = r);
  } else {
    red = r;
    green = g!;
    blue = b!;
  }
  
  const rNorm = red / 255;
  const gNorm = green / 255;
  const bNorm = blue / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const diff = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : diff / max;
  const v = max;
  
  if (diff !== 0) {
    switch (max) {
      case rNorm:
        h = (gNorm - bNorm) / diff + (gNorm < bNorm ? 6 : 0);
        break;
      case gNorm:
        h = (bNorm - rNorm) / diff + 2;
        break;
      case bNorm:
        h = (rNorm - gNorm) / diff + 4;
        break;
    }
    h /= 6;
  }
  
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
}

/**
 * HSV转RGB
 * @param h 色相 (0-360) 或 HSVColor 对象
 * @param s 饱和度 (0-100)
 * @param v 明度 (0-100)
 * @returns RGB颜色对象
 */
export function hsvToRgb(h: number | HSVColor, s?: number, v?: number): RGBAColor {
  let hue: number, saturation: number, value: number;
  
  if (typeof h === 'object') {
    ({ h: hue, s: saturation, v: value } = h);
  } else {
    hue = h;
    saturation = s!;
    value = v!;
  }
  
  const hNorm = hue / 360;
  const sNorm = saturation / 100;
  const vNorm = value / 100;
  
  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs((hNorm * 6) % 2 - 1));
  const m = vNorm - c;
  
  let r = 0, g = 0, b = 0;
  
  const sector = Math.floor(hNorm * 6);
  switch (sector) {
    case 0: [r, g, b] = [c, x, 0]; break;
    case 1: [r, g, b] = [x, c, 0]; break;
    case 2: [r, g, b] = [0, c, x]; break;
    case 3: [r, g, b] = [0, x, c]; break;
    case 4: [r, g, b] = [x, 0, c]; break;
    case 5: [r, g, b] = [c, 0, x]; break;
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
    a: 255
  };
}

/**
 * 获取颜色亮度（相对亮度）
 * @param color RGBA颜色对象
 * @returns 亮度值 (0-1)
 */
export function getLuminance(color: RGBAColor): number {
  const { r, g, b } = normalizeColor(color);
  
  // 使用相对亮度公式
  const rLum = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLum = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLum = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
}

/**
 * 计算对比度
 * @param color1 颜色1
 * @param color2 颜色2
 * @returns 对比度 (1-21)
 */
export function getContrast(color1: RGBAColor, color2: RGBAColor): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * 颜色插值
 * @param color1 起始颜色
 * @param color2 结束颜色
 * @param t 插值因子 (0-1)
 * @returns 插值后的颜色
 */
export function lerpColor(color1: RGBAColor, color2: RGBAColor, t: number): RGBAColor {
  const factor = clamp(t, 0, 1);
  
  return {
    r: Math.round(lerp(color1.r, color2.r, factor)),
    g: Math.round(lerp(color1.g, color2.g, factor)),
    b: Math.round(lerp(color1.b, color2.b, factor)),
    a: Math.round(lerp(color1.a, color2.a, factor))
  };
}

/**
 * 颜色混合
 * @param baseColor 基础颜色
 * @param overlayColor 覆盖颜色
 * @param mode 混合模式
 * @returns 混合后的颜色
 */
export function blendColors(
  baseColor: RGBAColor, 
  overlayColor: RGBAColor, 
  mode: 'normal' | 'multiply' | 'screen' | 'overlay' = 'normal'
): RGBAColor {
  const base = normalizeColor(baseColor);
  const overlay = normalizeColor(overlayColor);
  const alpha = overlay.a;
  
  let r: number, g: number, b: number;
  
  switch (mode) {
    case 'multiply':
      r = base.r * overlay.r;
      g = base.g * overlay.g;
      b = base.b * overlay.b;
      break;
    case 'screen':
      r = 1 - (1 - base.r) * (1 - overlay.r);
      g = 1 - (1 - base.g) * (1 - overlay.g);
      b = 1 - (1 - base.b) * (1 - overlay.b);
      break;
    case 'overlay':
      r = base.r < 0.5 ? 2 * base.r * overlay.r : 1 - 2 * (1 - base.r) * (1 - overlay.r);
      g = base.g < 0.5 ? 2 * base.g * overlay.g : 1 - 2 * (1 - base.g) * (1 - overlay.g);
      b = base.b < 0.5 ? 2 * base.b * overlay.b : 1 - 2 * (1 - base.b) * (1 - overlay.b);
      break;
    default: // normal
      r = overlay.r;
      g = overlay.g;
      b = overlay.b;
  }
  
  return {
    r: Math.round(lerp(base.r, r, alpha) * 255),
    g: Math.round(lerp(base.g, g, alpha) * 255),
    b: Math.round(lerp(base.b, b, alpha) * 255),
    a: Math.round(clamp(base.a + overlay.a * (1 - base.a), 0, 1) * 255)
  };
}

/**
 * 转换为归一化颜色 (0-1)
 * @param color RGBA颜色对象
 * @returns 归一化的颜色对象
 */
export function normalizeColor(color: RGBAColor): NormalizedRGBAColor {
  return {
    r: color.r / 255,
    g: color.g / 255,
    b: color.b / 255,
    a: color.a / 255
  };
}

/**
 * 转换为标准颜色 (0-255)
 * @param color 归一化的颜色对象
 * @returns 标准的RGBA颜色对象
 */
export function denormalizeColor(color: NormalizedRGBAColor): RGBAColor {
  return {
    r: Math.round(clamp(color.r, 0, 1) * 255),
    g: Math.round(clamp(color.g, 0, 1) * 255),
    b: Math.round(clamp(color.b, 0, 1) * 255),
    a: Math.round(clamp(color.a, 0, 1) * 255)
  };
}

/**
 * 转换为数组格式 (0-1)
 * @param color RGBA颜色对象
 * @returns 颜色数组 [r, g, b, a]
 */
export function colorToArray(color: RGBAColor): [number, number, number, number] {
  const normalized = normalizeColor(color);
  return [normalized.r, normalized.g, normalized.b, normalized.a];
}

/**
 * 转换为十六进制字符串
 * @param color RGBA颜色对象
 * @param includeAlpha 是否包含透明度
 * @returns 十六进制颜色字符串
 */
export function colorToHex(color: RGBAColor, includeAlpha: boolean = false): string {
  const toHex = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  
  const hex = `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  
  if (includeAlpha && color.a !== 255) {
    return hex + toHex(color.a);
  }
  
  return hex;
}

/**
 * 转换为CSS颜色字符串
 * @param color RGBA颜色对象
 * @param format 输出格式
 * @returns CSS颜色字符串
 */
export function colorToCss(
  color: RGBAColor, 
  format: 'rgb' | 'rgba' | 'hex' | 'hsl' = 'rgba'
): string {
  switch (format) {
    case 'rgb':
      return `rgb(${color.r}, ${color.g}, ${color.b})`;
    case 'rgba':
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
    case 'hex':
      return colorToHex(color);
    case 'hsl': {
      const hsl = rgbToHsl(color);
      return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    }
    default:
      return colorToHex(color);
  }
}

// 辅助函数
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}