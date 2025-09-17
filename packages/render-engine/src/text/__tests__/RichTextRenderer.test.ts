import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RichTextRenderer } from '../RichTextRenderer';
import { 
  TextStyle, 
  RichTextDocument,
  TextFragment,
  TextRenderContext,
  TextLayoutOptions,
  Colors,
  FontWeight,
  FontStyle
} from '../types/RichTextTypes';

// Mock Canvas API
const mockContext = {
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn().mockReturnValue({ width: 100 }),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  fillStyle: '',
  strokeStyle: '',
  font: '',
  textAlign: 'left',
  textBaseline: 'alphabetic',
  globalAlpha: 1,
  shadowColor: '',
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0
};

const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn().mockReturnValue(mockContext)
};

describe('RichTextRenderer', () => {
  let renderer: RichTextRenderer;
  let defaultStyle: TextStyle;
  let renderContext: TextRenderContext;
  let document: RichTextDocument;

  beforeEach(() => {
    vi.clearAllMocks();
    renderer = new RichTextRenderer();
    
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

    document = {
      content: 'Hello world!',
      fragments: [
        {
          text: 'Hello ',
          style: defaultStyle,
          startIndex: 0,
          endIndex: 6
        },
        {
          text: 'world',
          style: { ...defaultStyle, fontWeight: FontWeight.BOLD },
          startIndex: 6,
          endIndex: 11
        },
        {
          text: '!',
          style: defaultStyle,
          startIndex: 11,
          endIndex: 12
        }
      ],
      defaultStyle
    };
  });

  describe('基础功能', () => {
    it('应该能够创建 RichTextRenderer 实例', () => {
      expect(renderer).toBeDefined();
      expect(renderer).toBeInstanceOf(RichTextRenderer);
    });
  });

  describe('文本测量', () => {
    it('应该能够测量文本尺寸', () => {
      const metrics = renderer.measureText(document);
      
      expect(metrics).toBeDefined();
      expect(metrics.width).toBeGreaterThan(0);
      expect(metrics.height).toBeGreaterThan(0);
      expect(metrics.lines).toBeDefined();
      expect(metrics.boundingBox).toBeDefined();
    });

    it('应该能够处理带布局选项的文本测量', () => {
      const options: TextLayoutOptions = {
        maxWidth: 200,
        wordWrap: true,
        maxLines: 3
      };
      
      const metrics = renderer.measureText(document, options);
      
      expect(metrics.width).toBeLessThanOrEqual(200);
      expect(metrics.lines.length).toBeLessThanOrEqual(3);
    });

    it('应该能够处理空文档的测量', () => {
      const emptyDocument: RichTextDocument = {
        content: '',
        fragments: [],
        defaultStyle
      };
      
      const metrics = renderer.measureText(emptyDocument);
      
      expect(metrics.width).toBe(0);
      expect(metrics.height).toBeGreaterThanOrEqual(0); // 至少有行高
      expect(metrics.lines).toHaveLength(0);
    });
  });

  describe('文本渲染', () => {
    it('应该能够渲染基本文本', () => {
      renderer.renderText(document, 10, 20, renderContext);
      
      expect(mockContext.fillText).toHaveBeenCalled();
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('应该能够渲染带样式的文本', () => {
      const styledDocument: RichTextDocument = {
        content: 'Styled text',
        fragments: [
          {
            text: 'Styled',
            style: {
              ...defaultStyle,
              fontWeight: FontWeight.BOLD,
              fontStyle: FontStyle.ITALIC,
              color: { r: 255, g: 0, b: 0, a: 1 }
            },
            startIndex: 0,
            endIndex: 6
          },
          {
            text: ' text',
            style: defaultStyle,
            startIndex: 6,
            endIndex: 11
          }
        ],
        defaultStyle
      };
      
      renderer.renderText(styledDocument, 0, 0, renderContext);
      
      expect(mockContext.fillText).toHaveBeenCalledTimes(2);
      expect(mockContext.font).toContain('bold');
      expect(mockContext.font).toContain('italic');
    });

    it('应该能够处理带布局选项的渲染', () => {
      const options: TextLayoutOptions = {
        maxWidth: 100,
        wordWrap: true,
        ellipsis: true
      };
      
      renderer.renderText(document, 0, 0, renderContext, options);
      
      expect(mockContext.fillText).toHaveBeenCalled();
    });

    it('应该能够处理高DPI渲染', () => {
      const highDPIContext = {
        ...renderContext,
        devicePixelRatio: 2
      };
      
      renderer.renderText(document, 0, 0, highDPIContext);
      
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
    });
  });

  describe('字符位置计算', () => {
    it('应该能够获取点击位置的字符索引', () => {
      const index = renderer.getCharacterIndexAtPoint(document, 50, 20);
      
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThanOrEqual(document.content.length);
    });

    it('应该能够获取字符的位置坐标', () => {
      const position = renderer.getCharacterPosition(document, 5);
      
      expect(position).toBeDefined();
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeGreaterThanOrEqual(0);
    });

    it('应该处理超出范围的字符索引', () => {
      const position = renderer.getCharacterPosition(document, 999);
      
      expect(position).toBeDefined();
      // 应该返回文档末尾的位置
    });
  });

  describe('样式处理', () => {
    it('应该能够处理字体样式', () => {
      const fontDocument: RichTextDocument = {
        content: 'Font test',
        fragments: [
          {
            text: 'Font test',
            style: {
              fontFamily: 'Times New Roman',
              fontSize: 24,
              fontWeight: FontWeight.BOLD,
              fontStyle: FontStyle.ITALIC
            },
            startIndex: 0,
            endIndex: 9
          }
        ],
        defaultStyle
      };
      
      renderer.renderText(fontDocument, 0, 0, renderContext);
      
      expect(mockContext.font).toContain('24px');
      expect(mockContext.font).toContain('Times New Roman');
      expect(mockContext.font).toContain('bold');
      expect(mockContext.font).toContain('italic');
    });

    it('应该能够处理颜色样式', () => {
      const colorDocument: RichTextDocument = {
        content: 'Color test',
        fragments: [
          {
            text: 'Color test',
            style: {
              ...defaultStyle,
              color: { r: 255, g: 128, b: 0, a: 0.8 }
            },
            startIndex: 0,
            endIndex: 10
          }
        ],
        defaultStyle
      };
      
      renderer.renderText(colorDocument, 0, 0, renderContext);
      
      expect(mockContext.fillStyle).toContain('rgba(255, 128, 0, 0.8)');
    });

    it('应该能够处理阴影样式', () => {
      const shadowDocument: RichTextDocument = {
        content: 'Shadow test',
        fragments: [
          {
            text: 'Shadow test',
            style: {
              ...defaultStyle,
              shadow: {
                color: { r: 0, g: 0, b: 0, a: 0.5 },
                offsetX: 2,
                offsetY: 2,
                blurRadius: 4
              }
            },
            startIndex: 0,
            endIndex: 11
          }
        ],
        defaultStyle
      };
      
      renderer.renderText(shadowDocument, 0, 0, renderContext);
      
      expect(mockContext.shadowOffsetX).toBe(2);
      expect(mockContext.shadowOffsetY).toBe(2);
      expect(mockContext.shadowBlur).toBe(4);
    });
  });

  describe('布局处理', () => {
    it('应该能够处理文本换行', () => {
      const longDocument: RichTextDocument = {
        content: 'This is a very long text that should wrap to multiple lines when the maximum width is exceeded',
        fragments: [
          {
            text: 'This is a very long text that should wrap to multiple lines when the maximum width is exceeded',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 95
          }
        ],
        defaultStyle
      };
      
      const options: TextLayoutOptions = {
        maxWidth: 200,
        wordWrap: true
      };
      
      const metrics = renderer.measureText(longDocument, options);
      
      expect(metrics.lines.length).toBeGreaterThan(1);
    });

    it('应该能够处理文本省略', () => {
      const longDocument: RichTextDocument = {
        content: 'This text is too long and should be truncated with ellipsis',
        fragments: [
          {
            text: 'This text is too long and should be truncated with ellipsis',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 60
          }
        ],
        defaultStyle
      };
      
      const options: TextLayoutOptions = {
        maxWidth: 100,
        ellipsis: true
      };
      
      const metrics = renderer.measureText(longDocument, options);
      
      expect(metrics.width).toBeLessThanOrEqual(100);
    });

    it('应该能够处理最大行数限制', () => {
      const multiLineDocument: RichTextDocument = {
        content: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
        fragments: [
          {
            text: 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5',
            style: defaultStyle,
            startIndex: 0,
            endIndex: 35
          }
        ],
        defaultStyle
      };
      
      const options: TextLayoutOptions = {
        maxLines: 3
      };
      
      const metrics = renderer.measureText(multiLineDocument, options);
      
      expect(metrics.lines.length).toBeLessThanOrEqual(3);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的渲染上下文', () => {
      const invalidContext = {
        ...renderContext,
        context: null as any
      };
      
      expect(() => {
        renderer.renderText(document, 0, 0, invalidContext);
      }).not.toThrow();
    });

    it('应该处理空的文档片段', () => {
      const emptyFragmentDocument: RichTextDocument = {
        content: 'Test',
        fragments: [],
        defaultStyle
      };
      
      expect(() => {
        renderer.renderText(emptyFragmentDocument, 0, 0, renderContext);
      }).not.toThrow();
    });

    it('应该处理无效的字体样式', () => {
      const invalidFontDocument: RichTextDocument = {
        content: 'Invalid font',
        fragments: [
          {
            text: 'Invalid font',
            style: {
              fontFamily: '',
              fontSize: -1,
              fontWeight: 'invalid' as any
            },
            startIndex: 0,
            endIndex: 12
          }
        ],
        defaultStyle
      };
      
      expect(() => {
        renderer.renderText(invalidFontDocument, 0, 0, renderContext);
      }).not.toThrow();
    });
  });

  describe('性能优化', () => {
    it('应该能够处理大量文本片段', () => {
      const manyFragments: TextFragment[] = [];
      let content = '';
      
      for (let i = 0; i < 1000; i++) {
        const text = `Fragment ${i} `;
        manyFragments.push({
          text,
          style: defaultStyle,
          startIndex: content.length,
          endIndex: content.length + text.length
        });
        content += text;
      }
      
      const largeDocument: RichTextDocument = {
        content,
        fragments: manyFragments,
        defaultStyle
      };
      
      const startTime = performance.now();
      renderer.measureText(largeDocument);
      const endTime = performance.now();
      
      // 性能测试：应该在合理时间内完成
      expect(endTime - startTime).toBeLessThan(1000); // 1秒内
    });

    it('应该能够缓存测量结果', () => {
      // 第一次测量
      const metrics1 = renderer.measureText(document);
      
      // 第二次测量相同文档
      const metrics2 = renderer.measureText(document);
      
      // 结果应该一致
      expect(metrics1.width).toBe(metrics2.width);
      expect(metrics1.height).toBe(metrics2.height);
    });
  });
});