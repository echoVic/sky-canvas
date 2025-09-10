/**
 * RichTextRenderer 单元测试
 * 测试富文本渲染、布局和测量功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RichTextRenderer, createRichTextRenderer } from '../RichTextRenderer';
import { createFontManager } from '../FontManager';
import {
  RichTextDocument,
  TextFragment,
  TextStyle,
  TextLayoutOptions,
  TextRenderContext,
  Colors,
  ColorUtils,
  FontWeight,
  FontStyle,
  TextDecoration,
  TextAlign
} from '../types/RichTextTypes';

// Mock Canvas API
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn()
};

const mockContext = {
  font: '',
  fillStyle: '',
  strokeStyle: '',
  textAlign: 'left' as CanvasTextAlign,
  textBaseline: 'baseline' as CanvasTextBaseline,
  globalAlpha: 1,
  shadowColor: 'transparent',
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowBlur: 0,
  lineWidth: 1,
  lineCap: 'butt' as CanvasLineCap,
  lineJoin: 'miter' as CanvasLineJoin,
  miterLimit: 10,
  lineDashOffset: 0,
  
  measureText: vi.fn().mockReturnValue({
    width: 100,
    actualBoundingBoxLeft: 5,
    actualBoundingBoxRight: 95,
    actualBoundingBoxAscent: 12,
    actualBoundingBoxDescent: 4,
    fontBoundingBoxAscent: 14,
    fontBoundingBoxDescent: 4,
    emHeightAscent: 12,
    emHeightDescent: 4,
    hangingBaseline: 10,
    ideographicBaseline: 2
  }),
  
  fillText: vi.fn(),
  strokeText: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  setLineDash: vi.fn(),
  createLinearGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn()
  }),
  createRadialGradient: vi.fn().mockReturnValue({
    addColorStop: vi.fn()
  }),
  save: vi.fn(),
  restore: vi.fn()
};

mockCanvas.getContext.mockReturnValue(mockContext);

Object.defineProperty(document, 'createElement', {
  writable: true,
  value: vi.fn().mockReturnValue(mockCanvas)
});

describe('RichTextRenderer', () => {
  let renderer: RichTextRenderer;
  let fontManager: any;
  let defaultStyle: TextStyle;
  let renderContext: TextRenderContext;

  beforeEach(() => {
    fontManager = createFontManager();
    fontManager.on = vi.fn(); // Suppress error events
    
    renderer = createRichTextRenderer(fontManager);
    
    defaultStyle = {
      fontFamily: 'Arial',
      fontSize: 16,
      color: Colors.BLACK
    };

    renderContext = {
      canvas: mockCanvas as any,
      context: mockContext as any,
      devicePixelRatio: 1,
      antialiasing: true
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    renderer.dispose();
  });

  describe('文本测量', () => {
    it('应该能够测量简单文本', () => {
      const document: RichTextDocument = {
        content: '测试文本',
        fragments: [
          {
            text: '测试文本',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      const metrics = renderer.measureText(document);

      expect(metrics.width).toBeGreaterThan(0);
      expect(metrics.height).toBeGreaterThan(0);
      expect(metrics.lines).toHaveLength(1);
    });

    it('应该能够测量多样式文本', () => {
      const document: RichTextDocument = {
        content: '普通粗体斜体',
        fragments: [
          {
            text: '普通',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 2
          },
          {
            text: '粗体',
            style: { ...defaultStyle, fontWeight: FontWeight.BOLD },
            startIndex: 2,
            endIndex: 4
          },
          {
            text: '斜体',
            style: { ...defaultStyle, fontStyle: FontStyle.ITALIC },
            startIndex: 4,
            endIndex: 6
          }
        ],
        defaultStyle
      };

      const metrics = renderer.measureText(document);

      expect(metrics.lines).toHaveLength(1);
      expect(metrics.lines[0].fragments).toHaveLength(3);
    });

    it('应该处理换行', () => {
      const document: RichTextDocument = {
        content: '第一行很长的文本内容第二行',
        fragments: [
          {
            text: '第一行很长的文本内容第二行',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 13
          }
        ],
        defaultStyle
      };

      const options: TextLayoutOptions = {
        maxWidth: 200,
        wordWrap: true
      };

      const metrics = renderer.measureText(document, options);

      expect(metrics.lines.length).toBeGreaterThan(1);
    });

    it('应该处理最大行数限制', () => {
      const document: RichTextDocument = {
        content: '很长很长很长很长很长很长很长很长的文本',
        fragments: [
          {
            text: '很长很长很长很长很长很长很长很长的文本',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 18
          }
        ],
        defaultStyle
      };

      const options: TextLayoutOptions = {
        maxWidth: 50,
        maxLines: 2,
        wordWrap: true
      };

      const metrics = renderer.measureText(document, options);

      expect(metrics.lines.length).toBeLessThanOrEqual(2);
    });

    it('应该计算正确的边界框', () => {
      const document: RichTextDocument = {
        content: '测试',
        fragments: [
          {
            text: '测试',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 2
          }
        ],
        defaultStyle
      };

      const metrics = renderer.measureText(document);

      expect(metrics.boundingBox.width).toBeGreaterThan(0);
      expect(metrics.boundingBox.height).toBeGreaterThan(0);
      expect(typeof metrics.boundingBox.x).toBe('number');
      expect(typeof metrics.boundingBox.y).toBe('number');
    });
  });

  describe('文本渲染', () => {
    it('应该能够渲染简单文本', () => {
      const document: RichTextDocument = {
        content: '测试文本',
        fragments: [
          {
            text: '测试文本',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      renderer.renderText(document, 10, 10, renderContext);

      expect(mockContext.fillText).toHaveBeenCalled();
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('应该应用字体样式', () => {
      const document: RichTextDocument = {
        content: '粗体',
        fragments: [
          {
            text: '粗体',
            style: {
              ...defaultStyle,
              fontWeight: FontWeight.BOLD,
              fontSize: 20
            },
            startIndex: 0,
            endIndex: 2
          }
        ],
        defaultStyle
      };

      renderer.renderText(document, 0, 0, renderContext);

      expect(mockContext.font).toContain('bold');
      expect(mockContext.font).toContain('20px');
    });

    it('应该渲染颜色样式', () => {
      const redColor = ColorUtils.fromRGB(255, 0, 0);
      const document: RichTextDocument = {
        content: '红色文本',
        fragments: [
          {
            text: '红色文本',
            style: {
              ...defaultStyle,
              color: redColor
            },
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      renderer.renderText(document, 0, 0, renderContext);

      expect(mockContext.fillStyle).toBe('rgb(255, 0, 0)');
    });

    it('应该渲染文本装饰', () => {
      const document: RichTextDocument = {
        content: '下划线',
        fragments: [
          {
            text: '下划线',
            style: {
              ...defaultStyle,
              textDecoration: TextDecoration.UNDERLINE
            },
            startIndex: 0,
            endIndex: 3
          }
        ],
        defaultStyle
      };

      renderer.renderText(document, 0, 0, renderContext);

      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalled();
      expect(mockContext.lineTo).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
    });

    it('应该渲染阴影效果', () => {
      const document: RichTextDocument = {
        content: '阴影文本',
        fragments: [
          {
            text: '阴影文本',
            style: {
              ...defaultStyle,
              shadow: {
                color: Colors.GRAY_500,
                offsetX: 2,
                offsetY: 2,
                blurRadius: 4
              }
            },
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      renderer.renderText(document, 0, 0, renderContext);

      expect(mockContext.shadowOffsetX).toBe(2);
      expect(mockContext.shadowOffsetY).toBe(2);
      expect(mockContext.shadowBlur).toBe(4);
    });

    it('应该渲染背景颜色', () => {
      const document: RichTextDocument = {
        content: '背景文本',
        fragments: [
          {
            text: '背景文本',
            style: {
              ...defaultStyle,
              backgroundColor: Colors.YELLOW
            },
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      renderer.renderText(document, 0, 0, renderContext);

      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    it('应该渲染描边文本', () => {
      const document: RichTextDocument = {
        content: '描边文本',
        fragments: [
          {
            text: '描边文本',
            style: {
              ...defaultStyle,
              strokeStyle: {
                color: Colors.RED,
                width: 2
              }
            },
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      renderer.renderText(document, 0, 0, renderContext);

      expect(mockContext.strokeText).toHaveBeenCalled();
      expect(mockContext.lineWidth).toBe(2);
    });

    it('应该处理透明度', () => {
      const document: RichTextDocument = {
        content: '透明文本',
        fragments: [
          {
            text: '透明文本',
            style: {
              ...defaultStyle,
              opacity: 0.5
            },
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      renderer.renderText(document, 0, 0, renderContext);

      expect(mockContext.globalAlpha).toBe(0.5);
    });

    it('应该渲染渐变填充', () => {
      const gradient = {
        type: 'linear' as const,
        x0: 0,
        y0: 0,
        x1: 100,
        y1: 0,
        stops: [
          { offset: 0, color: Colors.RED },
          { offset: 1, color: Colors.BLUE }
        ]
      };

      const document: RichTextDocument = {
        content: '渐变文本',
        fragments: [
          {
            text: '渐变文本',
            style: {
              ...defaultStyle,
              fillStyle: gradient
            },
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      renderer.renderText(document, 0, 0, renderContext);

      expect(mockContext.createLinearGradient).toHaveBeenCalled();
    });
  });

  describe('字符位置查询', () => {
    let testDocument: RichTextDocument;

    beforeEach(() => {
      testDocument = {
        content: '测试文本内容',
        fragments: [
          {
            text: '测试文本内容',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 6
          }
        ],
        defaultStyle
      };

      // Mock measureText 返回更真实的值
      mockContext.measureText.mockImplementation((text: string) => ({
        width: text.length * 10, // 每个字符10px宽
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: text.length * 10,
        actualBoundingBoxAscent: 12,
        actualBoundingBoxDescent: 4,
        fontBoundingBoxAscent: 14,
        fontBoundingBoxDescent: 4,
        emHeightAscent: 12,
        emHeightDescent: 4,
        hangingBaseline: 10,
        ideographicBaseline: 2
      }));
    });

    it('应该能够根据坐标获取字符索引', () => {
      const index = renderer.getCharacterIndexAtPoint(testDocument, 25, 10);
      
      // 25px 位置应该在第3个字符附近
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThanOrEqual(testDocument.content.length);
    });

    it('应该能够获取字符的位置', () => {
      const position = renderer.getCharacterPosition(testDocument, 2);
      
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
    });

    it('应该处理边界情况', () => {
      // 测试起始位置
      const startPos = renderer.getCharacterPosition(testDocument, 0);
      expect(startPos.x).toBe(0);

      // 测试结束位置
      const endPos = renderer.getCharacterPosition(testDocument, testDocument.content.length);
      expect(endPos.x).toBeGreaterThan(0);
    });

    it('应该处理超出范围的索引', () => {
      const position = renderer.getCharacterPosition(testDocument, 999);
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
    });

    it('应该处理超出范围的坐标', () => {
      const index = renderer.getCharacterIndexAtPoint(testDocument, 9999, 9999);
      expect(index).toBe(testDocument.content.length);
    });
  });

  describe('布局选项', () => {
    it('应该处理文本对齐', () => {
      const document: RichTextDocument = {
        content: '居中对齐',
        fragments: [
          {
            text: '居中对齐',
            style: {
              ...defaultStyle,
              textAlign: TextAlign.CENTER
            },
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      renderer.renderText(document, 0, 0, renderContext);

      expect(mockContext.textAlign).toBe('center');
    });

    it('应该处理单词换行', () => {
      const longText = '这是一个非常非常非常长的文本，应该会被换行处理';
      const document: RichTextDocument = {
        content: longText,
        fragments: [
          {
            text: longText,
            style: defaultStyle,
            startIndex: 0,
            endIndex: longText.length
          }
        ],
        defaultStyle
      };

      const options: TextLayoutOptions = {
        maxWidth: 100,
        wordWrap: true
      };

      const metrics = renderer.measureText(document, options);
      expect(metrics.lines.length).toBeGreaterThan(1);
    });

    it('应该处理字符断行', () => {
      const document: RichTextDocument = {
        content: 'verylongwordwithoutspaces',
        fragments: [
          {
            text: 'verylongwordwithoutspaces',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 25
          }
        ],
        defaultStyle
      };

      const options: TextLayoutOptions = {
        maxWidth: 100,
        wordWrap: true,
        breakWord: true
      };

      const metrics = renderer.measureText(document, options);
      expect(metrics.width).toBeLessThanOrEqual(100);
    });

    it('应该处理省略号', () => {
      const document: RichTextDocument = {
        content: '这是一个很长的文本，应该被截断',
        fragments: [
          {
            text: '这是一个很长的文本，应该被截断',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 16
          }
        ],
        defaultStyle
      };

      const options: TextLayoutOptions = {
        maxWidth: 100,
        maxLines: 1,
        ellipsis: true
      };

      const metrics = renderer.measureText(document, options);
      expect(metrics.lines).toHaveLength(1);
    });
  });

  describe('性能优化', () => {
    it('应该使用测量缓存', () => {
      const document: RichTextDocument = {
        content: '缓存测试',
        fragments: [
          {
            text: '缓存测试',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      // 第一次测量
      renderer.measureText(document);
      const firstCallCount = mockContext.measureText.mock.calls.length;

      // 第二次测量相同内容
      renderer.measureText(document);
      const secondCallCount = mockContext.measureText.mock.calls.length;

      // 第二次调用应该使用缓存，减少 measureText 调用
      expect(secondCallCount).toBe(firstCallCount);
    });

    it('应该能够清理缓存', () => {
      const document: RichTextDocument = {
        content: '清理测试',
        fragments: [
          {
            text: '清理测试',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      renderer.measureText(document);
      renderer.clearCache();
      renderer.measureText(document);

      // 清理缓存后应该重新计算
      expect(mockContext.measureText).toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该处理空文档', () => {
      const emptyDocument: RichTextDocument = {
        content: '',
        fragments: [],
        defaultStyle
      };

      const metrics = renderer.measureText(emptyDocument);
      
      expect(metrics.width).toBe(0);
      expect(metrics.height).toBe(0);
      expect(metrics.lines).toHaveLength(0);
    });

    it('应该处理无效的样式值', () => {
      const document: RichTextDocument = {
        content: '无效样式',
        fragments: [
          {
            text: '无效样式',
            style: {
              ...defaultStyle,
              fontSize: -1, // 无效的字号
              opacity: 2    // 无效的透明度
            },
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      expect(() => {
        renderer.measureText(document);
        renderer.renderText(document, 0, 0, renderContext);
      }).not.toThrow();
    });

    it('应该处理缺失的字体', () => {
      const document: RichTextDocument = {
        content: '缺失字体',
        fragments: [
          {
            text: '缺失字体',
            style: {
              ...defaultStyle,
              fontFamily: 'NonExistentFont'
            },
            startIndex: 0,
            endIndex: 4
          }
        ],
        defaultStyle
      };

      expect(() => {
        renderer.renderText(document, 0, 0, renderContext);
      }).not.toThrow();
    });
  });
});