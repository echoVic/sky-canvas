/**
 * 字体管理器基础功能测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FontManager } from '../FontManager'
import { type FontConfig, FontFormat, FontStyle, FontWeight } from '../types/FontTypes'

// Mock DOM APIs
const mockCanvas = {
  getContext: vi.fn().mockReturnValue({
    font: '',
    measureText: vi.fn().mockReturnValue({
      width: 100,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: 100,
      actualBoundingBoxAscent: 80,
      actualBoundingBoxDescent: 20,
      fontBoundingBoxAscent: 80,
      fontBoundingBoxDescent: 20,
      emHeightAscent: 80,
      emHeightDescent: 20,
      hangingBaseline: 80,
      ideographicBaseline: 20,
    }),
  }),
  width: 1,
  height: 1,
}

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn().mockReturnValue(mockCanvas),
    fonts: {
      add: vi.fn(),
      delete: vi.fn(),
      has: vi.fn().mockReturnValue(false),
    },
  },
})

// Mock FontFace
global.FontFace = vi.fn().mockImplementation(() => ({
  load: vi.fn().mockResolvedValue(undefined),
  status: 'loaded',
}))

// Mock performance.now
Object.defineProperty(global, 'performance', {
  value: { now: vi.fn().mockReturnValue(1000) },
})

describe('FontManager 基础功能', () => {
  let fontManager: FontManager

  const mockFontConfig: FontConfig = {
    family: 'TestFont',
    weight: FontWeight.NORMAL,
    style: FontStyle.NORMAL,
    sources: [
      {
        url: 'https://example.com/font.woff2',
        format: FontFormat.WOFF2,
      },
    ],
    fallbacks: ['Arial', 'sans-serif'],
  }

  beforeEach(() => {
    fontManager = new FontManager()
    vi.clearAllMocks()
  })

  it('应该能够创建字体管理器实例', () => {
    expect(fontManager).toBeDefined()
  })

  it('应该能够检查字体是否存在', () => {
    expect(fontManager.hasFont('NonExistentFont')).toBe(false)
  })

  it('应该能够获取回退字体', () => {
    const fallbackFont = fontManager.getFallbackFont('NonExistentFont')
    expect(fallbackFont).toBeDefined()
  })

  it('应该能够清理缓存', () => {
    expect(() => fontManager.clearCache()).not.toThrow()
  })

  it('应该能够获取加载进度', () => {
    const progress = fontManager.getLoadingProgress('TestFont')
    expect(progress).toBeNull() // 默认返回null
  })

  it('应该能够获取已加载字体列表', () => {
    const loadedFonts = fontManager.getLoadedFonts()
    expect(Array.isArray(loadedFonts)).toBe(true)
    expect(loadedFonts).toHaveLength(0) // 初始状态下没有加载的字体
  })

  it('应该能够dispose资源', () => {
    expect(() => fontManager.dispose()).not.toThrow()
  })

  it('应该能够卸载不存在的字体', () => {
    expect(() => fontManager.unloadFont('NonExistentFont')).not.toThrow()
  })
})
