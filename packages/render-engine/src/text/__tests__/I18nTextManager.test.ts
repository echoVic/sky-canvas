import { describe, it, expect, beforeEach, vi } from 'vitest';
import { I18nTextManager } from '../I18nTextManager';
import { BidiProcessor } from '../i18n/BidiProcessor';
import { LanguageDetector } from '../i18n/LanguageDetector';
import { TextDirection, WritingMode } from '../types/I18nTextTypes';
import { TextStyle } from '../types/RichTextTypes';

// Mock dependencies
vi.mock('../i18n/BidiProcessor');
vi.mock('../i18n/LanguageDetector');

const mockBidiProcessor = {
  detectBaseDirection: vi.fn(),
  processBidiText: vi.fn()
};

const mockLanguageDetector = {
  detectLanguage: vi.fn(),
  analyzeTextComplexity: vi.fn()
};

const mockCanvas = {
  getContext: vi.fn(() => ({
    measureText: vi.fn(() => ({ width: 100 })),
    font: '',
    textAlign: 'left',
    textBaseline: 'top'
  }))
};

describe('I18nTextManager', () => {
  let i18nManager: I18nTextManager;
  let mockOptions: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    (BidiProcessor as any).mockImplementation(() => mockBidiProcessor);
    (LanguageDetector as any).mockImplementation(() => mockLanguageDetector);
    
    mockOptions = {
      enableShaping: true,
      cacheSize: 100,
      fallbackFonts: new Map([['Latn', ['Arial', 'sans-serif']]])
    };
    
    i18nManager = new I18nTextManager(mockOptions);
  });

  describe('基础功能', () => {
    it('应该能够创建 I18nTextManager 实例', () => {
      expect(i18nManager).toBeDefined();
      expect(i18nManager).toBeInstanceOf(I18nTextManager);
    });

    it('应该使用默认选项创建实例', () => {
      const defaultManager = new I18nTextManager();
      expect(defaultManager).toBeDefined();
    });

    it('应该正确初始化依赖组件', () => {
      expect(BidiProcessor).toHaveBeenCalledWith(mockOptions);
      expect(LanguageDetector).toHaveBeenCalledWith(mockOptions);
    });
  });

  describe('语言检测', () => {
    it('应该能够检测文本语言', () => {
      const text = 'Hello World';
      const expectedResult = { language: 'en', confidence: 0.9 };
      
      mockLanguageDetector.detectLanguage.mockReturnValue(expectedResult);
      
      const result = i18nManager.detectLanguage(text);
      
      expect(mockLanguageDetector.detectLanguage).toHaveBeenCalledWith(text);
      expect(result).toBe(expectedResult);
    });

    it('应该能够检测文本方向', () => {
      const text = 'مرحبا بالعالم';
      const expectedResult = { direction: TextDirection.RTL, confidence: 0.9 };
      
      mockBidiProcessor.detectBaseDirection.mockReturnValue(expectedResult);
      
      const result = i18nManager.detectDirection(text);
      
      expect(mockBidiProcessor.detectBaseDirection).toHaveBeenCalledWith(text);
      expect(result).toBe(expectedResult);
    });

    it('应该能够分析文本复杂性', () => {
      const text = 'Hello World';
      const expectedAnalysis = {
        complexity: 'simple',
        baseDirection: TextDirection.LTR,
        detectedLanguages: ['en']
      };
      
      mockLanguageDetector.analyzeTextComplexity.mockReturnValue(expectedAnalysis);
      
      const result = i18nManager.analyzeText(text);
      
      expect(mockLanguageDetector.analyzeTextComplexity).toHaveBeenCalledWith(text);
      expect(result).toBe(expectedAnalysis);
    });
  });

  describe('文本渲染', () => {
    it('应该能够渲染国际化文本', () => {
      const text = 'Hello World';
      const style: TextStyle = {
        fontSize: 16,
        fontFamily: 'Arial'
      };
      const renderOptions = { x: 0, y: 0 };
      
      const mockLayout = {
        width: 100,
        height: 16,
        lines: []
      };
      
      mockLanguageDetector.analyzeTextComplexity.mockReturnValue({
        complexity: 'simple',
        baseDirection: TextDirection.LTR,
        detectedLanguages: ['en']
      });
      
      // Mock the renderer
      const mockRenderer = {
        renderText: vi.fn().mockReturnValue(mockLayout)
      };
      (i18nManager as any).renderer = mockRenderer;
      
      const result = i18nManager.renderText(
        mockCanvas.getContext() as any,
        text,
        style,
        renderOptions
      );
      
      expect(result).toBe(mockLayout);
    });

    it('应该能够获取视觉文本', () => {
      const text = 'Hello مرحبا World';
      const expectedVisualText = 'Hello ابحرم World';
      
      mockLanguageDetector.analyzeTextComplexity.mockReturnValue({
        complexity: 'complex',
        baseDirection: TextDirection.RTL,
        detectedLanguages: ['ar', 'en']
      });
      
      mockBidiProcessor.processBidiText.mockReturnValue({
        visualText: expectedVisualText
      });
      
      const result = i18nManager.getVisualText(text);
      
      expect(result).toBe(expectedVisualText);
    });
  });

  describe('复杂文本检测', () => {
    it('应该能够检测简单文本', () => {
      const text = 'Hello World';
      
      mockLanguageDetector.analyzeTextComplexity.mockReturnValue({
        complexity: 'simple',
        baseDirection: TextDirection.LTR,
        detectedLanguages: ['en']
      });
      
      const result = i18nManager.isComplexText(text);
      
      expect(result).toBe(false);
    });

    it('应该能够检测复杂文本', () => {
      const complexText = 'مرحبا بالعالم';
      
      mockLanguageDetector.analyzeTextComplexity.mockReturnValue({
        complexity: 'complex',
        baseDirection: TextDirection.RTL,
        detectedLanguages: ['ar']
      });
      
      const result = i18nManager.isComplexText(complexText);
      
      expect(result).toBe(true);
    });
  });

  describe('文本测量', () => {
    it('应该能够测量文本尺寸', () => {
      const text = 'Hello World';
      const style: TextStyle = {
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'normal'
      };
      
      const result = i18nManager.measureText(text, style);
      
      expect(result).toEqual({
        width: 100,
        height: 16,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 100,
        actualBoundingBoxAscent: 12,
        actualBoundingBoxDescent: 4
      });
    });

    it('应该处理复杂脚本的文本测量', () => {
      const complexText = 'مرحبا';
      const style: TextStyle = {
        fontSize: 16,
        fontFamily: 'Arial',
        fontWeight: 'normal'
      };
      
      mockBidiProcessor.processBidiText.mockReturnValue({ visualText: complexText });
      
      const result = i18nManager.measureText(complexText, style);
      
      expect(mockBidiProcessor.processBidiText).toHaveBeenCalled();
      expect(result.width).toBe(100);
    });
  });

  describe('缓存机制', () => {
    it('应该缓存语言检测结果', () => {
      const text = 'Hello World';
      
      mockLanguageDetector.detectLanguage.mockReturnValue({ language: 'en', confidence: 0.9 });
      
      // 第一次调用
      i18nManager.detectLanguage(text);
      // 第二次调用
      i18nManager.detectLanguage(text);
      
      // 应该只调用一次检测器
      expect(mockLanguageDetector.detectLanguage).toHaveBeenCalledTimes(1);
    });

    it('应该缓存文本分析结果', () => {
      const text = 'Hello World';
      
      mockLanguageDetector.analyzeTextComplexity.mockReturnValue({
        complexity: 'simple',
        baseDirection: TextDirection.LTR,
        detectedLanguages: ['en']
      });
      
      // 第一次分析
      i18nManager.analyzeText(text);
      // 第二次分析
      i18nManager.analyzeText(text);
      
      // 检测器应该只被调用一次
      expect(mockLanguageDetector.analyzeTextComplexity).toHaveBeenCalledTimes(1);
    });

    it('应该能够清除缓存', () => {
      const text = 'Hello World';
      
      mockLanguageDetector.detectLanguage.mockReturnValue({ language: 'en', confidence: 0.9 });
      
      // 第一次调用
      i18nManager.detectLanguage(text);
      
      // 清除缓存
      i18nManager.clearCache();
      
      // 第二次调用
      i18nManager.detectLanguage(text);
      
      // 应该调用两次检测器
      expect(mockLanguageDetector.detectLanguage).toHaveBeenCalledTimes(2);
    });
  });

  describe('缓存统计', () => {
    it('应该能够获取缓存统计信息', () => {
      const stats = i18nManager.getCacheStats();
      
      expect(stats).toHaveProperty('analysisCache');
      expect(stats).toHaveProperty('layoutCache');
      expect(stats.analysisCache).toHaveProperty('size');
      expect(stats.analysisCache).toHaveProperty('maxSize');
    });

    it('应该能够获取支持的语言列表', () => {
      const languages = i18nManager.getSupportedLanguages();
      
      expect(Array.isArray(languages)).toBe(true);
    });
  });
});