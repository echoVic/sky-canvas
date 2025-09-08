import { IPoint, IRect } from '@sky-canvas/render-engine';

/**
 * 文本范围接口
 */
export interface TextRange {
  start: number;
  end: number;
}

/**
 * 文本格式接口
 */
export interface TextFormat {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | number;
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  color?: string;
  backgroundColor?: string;
}

/**
 * 文本运行接口
 */
export interface TextRun {
  text: string;
  format: TextFormat;
  range: TextRange;
}

/**
 * 字体加载状态
 */
export type FontLoadStatus = 'loading' | 'loaded' | 'failed';

/**
 * 字体信息接口
 */
export interface FontInfo {
  family: string;
  weight: string;
  style: string;
  url?: string;
}