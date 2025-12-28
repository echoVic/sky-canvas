/**
 * 文本布局引擎
 */

import type {
  RichTextDocument,
  TextFragment,
  TextLine,
  TextLayoutOptions
} from './types/RichTextTypes';
import { TextMeasurement } from './TextMeasurement';

/**
 * 文本布局引擎
 */
export class TextLayoutEngine {
  private measurement: TextMeasurement;

  constructor(measurement: TextMeasurement) {
    this.measurement = measurement;
  }

  /**
   * 布局文本，返回文本行
   */
  layoutText(document: RichTextDocument, options: TextLayoutOptions): TextLine[] {
    const lines: TextLine[] = [];
    const maxWidth = options.maxWidth || Infinity;
    const wordWrap = options.wordWrap !== false;

    let currentLine: TextLine = {
      fragments: [],
      width: 0,
      height: 0,
      baselineY: 0,
      startIndex: 0,
      endIndex: 0
    };

    let currentX = 0;
    let currentIndex = 0;

    for (const fragment of document.fragments) {
      const words = wordWrap ? this.splitIntoWords(fragment) : [fragment];

      for (const word of words) {
        const wordWidth = this.measurement.measureFragmentWidth(word);
        const wordHeight = this.measurement.getFragmentHeight(word);

        if (wordWrap && currentX + wordWidth > maxWidth && currentLine.fragments.length > 0) {
          this.finalizeLine(currentLine, currentIndex);
          lines.push(currentLine);

          currentLine = {
            fragments: [],
            width: 0,
            height: 0,
            baselineY: 0,
            startIndex: currentIndex,
            endIndex: currentIndex
          };
          currentX = 0;
        }

        currentLine.fragments.push(word);
        currentLine.width = Math.max(currentLine.width, currentX + wordWidth);
        currentLine.height = Math.max(currentLine.height, wordHeight);

        currentX += wordWidth;
        currentIndex += word.text.length;

        if (options.maxLines && lines.length >= options.maxLines - 1) {
          break;
        }
      }

      if (options.maxLines && lines.length >= options.maxLines) {
        break;
      }
    }

    if (currentLine.fragments.length > 0) {
      this.finalizeLine(currentLine, currentIndex);
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * 将文本片段分割为单词
   */
  private splitIntoWords(fragment: TextFragment): TextFragment[] {
    const words = fragment.text.split(/(\s+)/);
    const result: TextFragment[] = [];
    let currentIndex = fragment.startIndex;

    for (const word of words) {
      if (word) {
        result.push({
          text: word,
          style: fragment.style,
          startIndex: currentIndex,
          endIndex: currentIndex + word.length
        });
      }
      currentIndex += word.length;
    }

    return result;
  }

  /**
   * 完成文本行的布局
   */
  private finalizeLine(line: TextLine, endIndex: number): void {
    line.endIndex = endIndex;

    let maxAscent = 0;
    let maxDescent = 0;

    for (const fragment of line.fragments) {
      const metrics = this.measurement.getFragmentMetrics(fragment);
      maxAscent = Math.max(maxAscent, metrics.ascent);
      maxDescent = Math.max(maxDescent, metrics.descent);
    }

    line.height = maxAscent + maxDescent;
    line.baselineY = maxAscent;
  }
}
