import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DropShadow, DropShadowConfig, ShadowQuality, ShadowType } from '../../lighting';


// Mock ImageData class
class MockImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;

  constructor(widthOrData: number | Uint8ClampedArray, height?: number, dataHeight?: number) {
    if (typeof widthOrData === 'number') {
      // new ImageData(width, height)
      this.width = widthOrData;
      this.height = height!;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
      // 初始化为透明像素 (RGBA: 0, 0, 0, 0)
      this.data.fill(0);
    } else {
      // new ImageData(data, width, height)
      this.data = widthOrData;
      this.width = height!;
      this.height = dataHeight!;
    }
  }

  // 添加标准 ImageData 的方法和属性
  get colorSpace() {
    return 'srgb';
  }
}

// Mock Canvas API
// 创建一个共享的 mock context 实例
const sharedMockContext = {
  shadowColor: '',
  shadowBlur: 0,
  filter: '',
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  getImageData: vi.fn(() => new MockImageData(800, 600)),
  putImageData: vi.fn(),
  createImageData: vi.fn((width, height) => new MockImageData(width, height))
};

// 使用 Object.defineProperty 确保 shadowOffset 属性可写
Object.defineProperty(sharedMockContext, 'shadowOffsetX', {
  value: 0,
  writable: true,
  enumerable: true,
  configurable: true
});

Object.defineProperty(sharedMockContext, 'shadowOffsetY', {
  value: 0,
  writable: true,
  enumerable: true,
  configurable: true
});

const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(() => sharedMockContext)
} as unknown as HTMLCanvasElement;

Object.defineProperty(global, 'HTMLCanvasElement', {
  value: vi.fn(() => mockCanvas),
  writable: true
});

Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn(() => mockCanvas)
  },
  writable: true
});

describe('DropShadow', () => {
  let dropShadow: DropShadow;
  let defaultConfig: DropShadowConfig;
  let mockContext: CanvasRenderingContext2D;
  let mockImageData: ImageData;

  beforeEach(() => {
    // Set global ImageData
    global.ImageData = MockImageData as any;

    defaultConfig = {
      type: ShadowType.DROP_SHADOW,
      enabled: true,
      color: '#000000',
      opacity: 0.5,
      blur: 5,
      spread: 0,
      quality: ShadowQuality.MEDIUM,
      offsetX: 2,
      offsetY: 2
    };
    
    dropShadow = new DropShadow(defaultConfig);
    mockContext = sharedMockContext as unknown as CanvasRenderingContext2D;
    
    // 清除所有 mock 函数的调用历史
    vi.clearAllMocks();
    Object.values(sharedMockContext).forEach(value => {
      if (typeof value === 'function' && 'mockClear' in value) {
        value.mockClear();
      }
    });
    (mockCanvas.getContext as any).mockClear();
    
    // 重置 mock context 的属性（在清除 mock 后）
    mockContext.shadowOffsetX = 0;
    mockContext.shadowOffsetY = 0;
    mockContext.shadowColor = '';
    mockContext.shadowBlur = 0;
    mockImageData = {
      data: new Uint8ClampedArray(400 * 300 * 4),
      width: 400,
      height: 300
    } as ImageData;
  });

  describe('构造函数和基本属性', () => {
    it('应该正确初始化', () => {
      expect(dropShadow).toBeInstanceOf(DropShadow);
      expect(dropShadow.type).toBe(ShadowType.DROP_SHADOW);
      expect(dropShadow.enabled).toBe(true);
    });

    it('应该正确设置投影配置', () => {
      const config = dropShadow.config as DropShadowConfig;
      expect(config.offsetX).toBe(2);
      expect(config.offsetY).toBe(2);
      expect(config.blur).toBe(5);
      expect(config.opacity).toBe(0.5);
    });
  });

  describe('偏移管理', () => {
    it('应该能获取偏移值', () => {
      const offset = dropShadow.getOffset();
      expect(offset.x).toBe(2);
      expect(offset.y).toBe(2);
    });

    it('应该能设置偏移值', () => {
      dropShadow.setOffset(5, 10);
      
      const offset = dropShadow.getOffset();
      expect(offset.x).toBe(5);
      expect(offset.y).toBe(10);
      
      const config = dropShadow.config as DropShadowConfig;
      expect(config.offsetX).toBe(5);
      expect(config.offsetY).toBe(10);
    });

    it('应该处理负偏移值', () => {
      dropShadow.setOffset(-3, -7);
      
      const offset = dropShadow.getOffset();
      expect(offset.x).toBe(-3);
      expect(offset.y).toBe(-7);
    });
  });

  describe('渲染功能', () => {
    it('应该能渲染Canvas阴影', () => {
      // 监听 drawImage 调用时的 shadow 属性
      let shadowOffsetXDuringRender = 0;
      let shadowOffsetYDuringRender = 0;
      
      const originalDrawImage = mockContext.drawImage;
       mockContext.drawImage = vi.fn((...args: any[]) => {
         shadowOffsetXDuringRender = mockContext.shadowOffsetX;
         shadowOffsetYDuringRender = mockContext.shadowOffsetY;
         return (originalDrawImage as any).apply(mockContext, args);
       });
      
      dropShadow.render(mockContext, mockCanvas);
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(shadowOffsetXDuringRender).toBe(2);
      expect(shadowOffsetYDuringRender).toBe(2);
      expect(mockContext.drawImage).toHaveBeenCalledWith(mockCanvas, 0, 0);
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('应该能渲染ImageData阴影', () => {
      // 监听 putImageData 调用时的 shadow 属性
      let shadowOffsetXDuringRender = 0;
      let shadowOffsetYDuringRender = 0;
      
      const originalPutImageData = mockContext.putImageData;
       mockContext.putImageData = vi.fn((...args: any[]) => {
         shadowOffsetXDuringRender = mockContext.shadowOffsetX;
         shadowOffsetYDuringRender = mockContext.shadowOffsetY;
         return (originalPutImageData as any).apply(mockContext, args);
       });
      
      dropShadow.render(mockContext, mockImageData);
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(shadowOffsetXDuringRender).toBe(2);
      expect(shadowOffsetYDuringRender).toBe(2);
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('禁用时不应该渲染', () => {
      dropShadow.enabled = false;
      
      dropShadow.render(mockContext, mockCanvas);
      
      expect(mockContext.drawImage).not.toHaveBeenCalled();
    });

    it('应该能高质量渲染', () => {
      dropShadow.renderHighQuality(mockContext, mockCanvas);
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });
  });

  describe('阴影边界计算', () => {
    it('应该能计算阴影边界', () => {
      const originalBounds = {
        x: 10,
        y: 10,
        width: 100,
        height: 50
      };
      
      const shadowBounds = dropShadow.getShadowBounds(originalBounds);
      
      expect(shadowBounds.x).toBeLessThanOrEqual(originalBounds.x);
      expect(shadowBounds.y).toBeLessThanOrEqual(originalBounds.y);
      expect(shadowBounds.width).toBeGreaterThanOrEqual(originalBounds.width);
      expect(shadowBounds.height).toBeGreaterThanOrEqual(originalBounds.height);
    });

    it('应该考虑偏移和模糊', () => {
      dropShadow.setOffset(10, 15);
      dropShadow.updateConfig({ blur: 8 });
      
      const originalBounds = {
        x: 0,
        y: 0,
        width: 100,
        height: 100
      };
      
      const shadowBounds = dropShadow.getShadowBounds(originalBounds);
      
      // 阴影边界应该扩展以包含偏移和模糊
      expect(shadowBounds.width).toBeGreaterThan(originalBounds.width);
      expect(shadowBounds.height).toBeGreaterThan(originalBounds.height);
    });

    it('应该处理负偏移', () => {
      dropShadow.setOffset(-5, -8);
      
      const originalBounds = {
        x: 20,
        y: 20,
        width: 100,
        height: 100
      };
      
      const shadowBounds = dropShadow.getShadowBounds(originalBounds);
      
      expect(shadowBounds.x).toBeLessThan(originalBounds.x);
      expect(shadowBounds.y).toBeLessThan(originalBounds.y);
    });
  });

  describe('性能估算', () => {
    it('应该能估算渲染时间', () => {
      const time = dropShadow.estimateRenderTime(800, 600);
      
      expect(time).toBeGreaterThan(0);
      expect(typeof time).toBe('number');
    });

    it('更大的尺寸应该需要更长时间', () => {
      const smallTime = dropShadow.estimateRenderTime(100, 100);
      const largeTime = dropShadow.estimateRenderTime(1000, 1000);
      
      expect(largeTime).toBeGreaterThan(smallTime);
    });

    it('更高的质量应该需要更长时间', () => {
      const lowQualityConfig = { ...defaultConfig, quality: ShadowQuality.LOW };
      const highQualityConfig = { ...defaultConfig, quality: ShadowQuality.HIGH };
      
      const lowQualityShadow = new DropShadow(lowQualityConfig);
      const highQualityShadow = new DropShadow(highQualityConfig);
      
      const lowTime = lowQualityShadow.estimateRenderTime(500, 500);
      const highTime = highQualityShadow.estimateRenderTime(500, 500);
      
      expect(highTime).toBeGreaterThan(lowTime);
    });
  });

  describe('克隆', () => {
    it('应该能克隆投影阴影', () => {
      const cloned = dropShadow.clone() as DropShadow;
      
      expect(cloned).toBeInstanceOf(DropShadow);
      expect(cloned.id).not.toBe(dropShadow.id);
      expect(cloned.type).toBe(dropShadow.type);
      
      const originalConfig = dropShadow.config as DropShadowConfig;
      const clonedConfig = cloned.config as DropShadowConfig;
      
      expect(clonedConfig.offsetX).toBe(originalConfig.offsetX);
      expect(clonedConfig.offsetY).toBe(originalConfig.offsetY);
      expect(clonedConfig.blur).toBe(originalConfig.blur);
    });

    it('克隆的阴影应该独立', () => {
      const cloned = dropShadow.clone() as DropShadow;
      
      dropShadow.setOffset(20, 25);
      
      const originalOffset = dropShadow.getOffset();
      const clonedOffset = cloned.getOffset();
      
      expect(originalOffset.x).toBe(20);
      expect(originalOffset.y).toBe(25);
      expect(clonedOffset.x).toBe(2); // 保持原始值
      expect(clonedOffset.y).toBe(2);
    });
  });

  describe('配置更新', () => {
    it('应该能更新偏移配置', () => {
      dropShadow.updateConfig({ offsetX: 15, offsetY: 20 });
      
      const config = dropShadow.config as DropShadowConfig;
      expect(config.offsetX).toBe(15);
      expect(config.offsetY).toBe(20);
    });

    it('应该能更新质量配置', () => {
      dropShadow.updateConfig({ quality: ShadowQuality.HIGH });
      
      const config = dropShadow.config as DropShadowConfig;
      expect(config.quality).toBe(ShadowQuality.HIGH);
    });

    it('应该能部分更新配置', () => {
      dropShadow.updateConfig({ blur: 10 });
      
      const config = dropShadow.config as DropShadowConfig;
      expect(config.blur).toBe(10);
      expect(config.offsetX).toBe(2); // 其他属性保持不变
      expect(config.offsetY).toBe(2);
    });
  });

  describe('边界值测试', () => {
    it('应该处理零偏移', () => {
      dropShadow.setOffset(0, 0);
      
      expect(() => dropShadow.render(mockContext, mockCanvas)).not.toThrow();
      
      const offset = dropShadow.getOffset();
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });

    it('应该处理极大偏移', () => {
      dropShadow.setOffset(1000, 1000);
      
      expect(() => dropShadow.render(mockContext, mockCanvas)).not.toThrow();
      
      const offset = dropShadow.getOffset();
      expect(offset.x).toBe(1000);
      expect(offset.y).toBe(1000);
    });

    it('应该处理零模糊', () => {
      dropShadow.updateConfig({ blur: 0 });
      
      expect(() => dropShadow.render(mockContext, mockCanvas)).not.toThrow();
    });

    it('应该处理极大模糊', () => {
      dropShadow.updateConfig({ blur: 100 });
      
      expect(() => dropShadow.render(mockContext, mockCanvas)).not.toThrow();
    });

    it('应该处理零透明度', () => {
      dropShadow.updateConfig({ opacity: 0 });
      
      expect(() => dropShadow.render(mockContext, mockCanvas)).not.toThrow();
    });
  });

  describe('不同质量设置', () => {
    it('应该支持低质量渲染', () => {
      const lowQualityConfig = { ...defaultConfig, quality: ShadowQuality.LOW };
      const lowQualityShadow = new DropShadow(lowQualityConfig);
      
      expect(() => lowQualityShadow.render(mockContext, mockCanvas)).not.toThrow();
    });

    it('应该支持高质量渲染', () => {
      const highQualityConfig = { ...defaultConfig, quality: ShadowQuality.HIGH };
      const highQualityShadow = new DropShadow(highQualityConfig);
      
      expect(() => highQualityShadow.renderHighQuality(mockContext, mockCanvas)).not.toThrow();
    });

    it('应该支持超高质量渲染', () => {
      const ultraQualityConfig = { ...defaultConfig, quality: ShadowQuality.ULTRA };
      const ultraQualityShadow = new DropShadow(ultraQualityConfig);
      
      expect(() => ultraQualityShadow.renderHighQuality(mockContext, mockCanvas)).not.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该能快速渲染小尺寸阴影', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        dropShadow.render(mockContext, mockCanvas);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该能快速计算阴影边界', () => {
      const bounds = { x: 0, y: 0, width: 100, height: 100 };
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        dropShadow.getShadowBounds(bounds);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // 应该在50ms内完成
    });
  });

  describe('实际使用场景', () => {
    it('应该能创建典型的按钮阴影', () => {
      const buttonShadowConfig: DropShadowConfig = {
        type: ShadowType.DROP_SHADOW,
        enabled: true,
        color: '#000000',
        opacity: 0.25,
        blur: 4,
        spread: 0,
        quality: ShadowQuality.MEDIUM,
        offsetX: 0,
        offsetY: 2
      };
      
      const buttonShadow = new DropShadow(buttonShadowConfig);
      
      expect(() => buttonShadow.render(mockContext, mockCanvas)).not.toThrow();
      
      const offset = buttonShadow.getOffset();
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(2);
    });

    it('应该能创建卡片阴影', () => {
      const cardShadowConfig: DropShadowConfig = {
        type: ShadowType.DROP_SHADOW,
        enabled: true,
        color: '#000000',
        opacity: 0.15,
        blur: 8,
        spread: 0,
        quality: ShadowQuality.HIGH,
        offsetX: 0,
        offsetY: 4
      };
      
      const cardShadow = new DropShadow(cardShadowConfig);
      
      expect(() => cardShadow.render(mockContext, mockCanvas)).not.toThrow();
      
      const bounds = cardShadow.getShadowBounds({ x: 0, y: 0, width: 200, height: 100 });
      expect(bounds.width).toBeGreaterThan(200);
      expect(bounds.height).toBeGreaterThan(100);
    });
  });
});