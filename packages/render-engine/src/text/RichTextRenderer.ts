/**
 * 富文本渲染器
 * 支持富文本的测量、布局和渲染
 */

import type {
  IRichTextRenderer,
  RichTextDocument,
  RichTextMetrics,
  TextLayoutOptions,
  TextRenderContext,
  TextLine
} from './types/RichTextTypes';
import type { IFontManager } from './types/FontTypes';
import { TextMeasurement } from './TextMeasurement';
import { TextLayoutEngine } from './TextLayoutEngine';
import { TextFragmentRenderer } from './TextFragmentRenderer';

// 重新导出子模块
export { TextMeasurement } from './TextMeasurement';
export { TextLayoutEngine } from './TextLayoutEngine';
export { TextFragmentRenderer } from './TextFragmentRenderer';

/**
 * 富文本渲染器实现
 */
export class RichTextRenderer implements IRichTextRenderer {
  private fontManager: IFontManager;
  private tempCanvas: HTMLCanvasElement;
  private tempContext: CanvasRenderingContext2D;
  private measurement: TextMeasurement;
  private layoutEngine: TextLayoutEngine;
  private fragmentRenderer: TextFragmentRenderer;

  constructor(fontManager: IFontManager) {
    this.fontManager = fontManager;

    try {
      this.tempCanvas = document.createElement('canvas');
      this.tempCanvas.width = 1;
      this.tempCanvas.height = 1;
      this.tempContext = this.tempCanvas.getContext('2d')!;
    } catch {
      this.tempCanvas = {} as HTMLCanvasElement;
      this.tempContext = {
        measureText: () => ({ width: 100 }),
        font: '',
        textAlign: 'left',
        textBaseline: 'baseline'
      } as unknown as CanvasRenderingContext2D;
    }

    this.measurement = new TextMeasurement(this.tempContext);
    this.layoutEngine = new TextLayoutEngine(this.measurement);
    this.fragmentRenderer = new TextFragmentRenderer(this.measurement);
  }

  /**
   * 测量富文本尺寸
   */
  measureText(document: RichTextDocument, options: TextLayoutOptions = {}): RichTextMetrics {
    const lines = this.layoutEngine.layoutText(document, options);

    if (!lines || lines.length === 0) {
      return {
        width: 0,
        height: 0,
        lines: [],
        boundingBox: { x: 0, y: 0, width: 0, height: 0 }
      };
    }

    let totalWidth = 0;
    let totalHeight = 0;
    let minX = 0;
    let maxX = 0;

    for (const line of lines) {
      totalWidth = Math.max(totalWidth, line.width);
      totalHeight += line.height;

      for (const fragment of line.fragments) {
        const metrics = this.measurement.measureFragment(fragment);
        minX = Math.min(minX, metrics.actualBoundingBoxLeft || 0);
        maxX = Math.max(maxX, fragment.text.length * (fragment.style.fontSize || 16));
      }
    }

    return {
      width: totalWidth,
      height: totalHeight,
      lines,
      boundingBox: {
        x: minX,
        y: 0,
        width: maxX - minX,
        height: totalHeight
      }
    };
  }

  /**
   * 渲染富文本
   */
  renderText(
    document: RichTextDocument,
    x: number,
    y: number,
    context: TextRenderContext,
    options: TextLayoutOptions = {}
  ): void {
    const lines = this.layoutEngine.layoutText(document, options);
    const ctx = context.context;

    ctx.save();

    let currentY = y;

    for (const line of lines) {
      this.renderLine(line, x, currentY, ctx);
      currentY += line.height;
    }

    ctx.restore();
  }

  /**
   * 获取文本在指定位置的字符索引
   */
  getCharacterIndexAtPoint(
    document: RichTextDocument,
    x: number,
    y: number,
    options: TextLayoutOptions = {}
  ): number {
    const lines = this.layoutEngine.layoutText(document, options);

    let currentY = 0;
    let characterIndex = 0;

    for (const line of lines) {
      if (y >= currentY && y < currentY + line.height) {
        let currentX = 0;

        for (const fragment of line.fragments) {
          const fragmentWidth = this.measurement.measureFragmentWidth(fragment);

          if (x >= currentX && x < currentX + fragmentWidth) {
            return this.measurement.getCharacterInFragment(fragment, x - currentX, characterIndex);
          }

          currentX += fragmentWidth;
          characterIndex += fragment.text.length;
        }

        return characterIndex;
      }

      currentY += line.height;
      characterIndex = line.endIndex;
    }

    return document.content.length;
  }

  /**
   * 获取字符在文本中的位置
   */
  getCharacterPosition(
    document: RichTextDocument,
    index: number,
    options: TextLayoutOptions = {}
  ): { x: number; y: number } {
    const lines = this.layoutEngine.layoutText(document, options);

    let currentY = 0;

    for (const line of lines) {
      if (index >= line.startIndex && index <= line.endIndex) {
        let currentX = 0;
        let currentIndex = line.startIndex;

        for (const fragment of line.fragments) {
          if (index >= currentIndex && index <= currentIndex + fragment.text.length) {
            const relativeIndex = index - currentIndex;
            const partialText = fragment.text.substring(0, relativeIndex);
            const partialWidth = this.measurement.measureTextWidth(partialText, fragment.style);

            return {
              x: currentX + partialWidth,
              y: currentY + line.baselineY
            };
          }

          currentX += this.measurement.measureFragmentWidth(fragment);
          currentIndex += fragment.text.length;
        }

        return { x: currentX, y: currentY + line.baselineY };
      }

      currentY += line.height;
    }

    return { x: 0, y: 0 };
  }

  /**
   * 渲染单个文本行
   */
  private renderLine(
    line: TextLine,
    x: number,
    y: number,
    ctx: CanvasRenderingContext2D
  ): void {
    let currentX = x;

    for (const fragment of line.fragments) {
      this.fragmentRenderer.renderFragment(fragment, currentX, y + line.baselineY, ctx);
      currentX += this.measurement.measureFragmentWidth(fragment);
    }
  }

  /**
   * 清理缓存
   */
  clearCache(): void {
    this.measurement.clearCache();
  }

  /**
   * 销毁渲染器
   */
  dispose(): void {
    this.clearCache();
  }
}

/**
 * 创建默认富文本渲染器
 */
export function createRichTextRenderer(fontManager: IFontManager): RichTextRenderer {
  return new RichTextRenderer(fontManager);
}
