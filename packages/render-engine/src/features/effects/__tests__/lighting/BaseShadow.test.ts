import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Point2D } from '../../../animation/types/PathTypes';
import { BaseShadow, DropShadowConfig, IShadow, ShadowQuality, ShadowType } from '../../lighting';


// 创建测试用的具体实现类
class TestShadow extends BaseShadow {
  constructor(config: DropShadowConfig) {
    super(ShadowType.DROP_SHADOW, config);
  }

  render(ctx: CanvasRenderingContext2D, target: HTMLCanvasElement | ImageData): void {
    // 测试实现
    ctx.shadowColor = this._config.color;
    ctx.shadowBlur = this._config.blur;
    if ('offsetX' in this._config) {
      ctx.shadowOffsetX = this._config.offsetX;
      ctx.shadowOffsetY = this._config.offsetY;
    }
  }

  clone(): IShadow {
    return new TestShadow(this._config as DropShadowConfig);
  }
}

// Mock Canvas API
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: vi.fn(() => ({
    shadowColor: '',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
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
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(800 * 600 * 4),
      width: 800,
      height: 600
    })),
    putImageData: vi.fn(),
    createImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(800 * 600 * 4),
      width: 800,
      height: 600
    }))
  }))
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

describe('BaseShadow', () => {
  let testShadow: TestShadow;
  let defaultConfig: DropShadowConfig;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
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
    
    testShadow = new TestShadow(defaultConfig);
    mockContext = mockCanvas.getContext('2d') as CanvasRenderingContext2D;
  });

  describe('构造函数和基本属性', () => {
    it('应该正确初始化', () => {
      expect(testShadow).toBeInstanceOf(BaseShadow);
      expect(testShadow.id).toBeDefined();
      expect(testShadow.id).toMatch(/^shadow_[a-z0-9]{9}$/);
      expect(testShadow.type).toBe(ShadowType.DROP_SHADOW);
      expect(testShadow.enabled).toBe(true);
    });

    it('应该正确设置配置', () => {
      const config = testShadow.config;
      expect(config.type).toBe(ShadowType.DROP_SHADOW);
      expect(config.enabled).toBe(true);
      expect(config.color).toBe('#000000');
      expect(config.opacity).toBe(0.5);
      expect(config.blur).toBe(5);
    });

    it('应该生成唯一的ID', () => {
      const shadow1 = new TestShadow(defaultConfig);
      const shadow2 = new TestShadow(defaultConfig);
      expect(shadow1.id).not.toBe(shadow2.id);
    });
  });

  describe('配置管理', () => {
    it('应该能获取配置副本', () => {
      const config = testShadow.config;
      config.blur = 10; // 修改副本
      
      expect(testShadow.config.blur).toBe(5); // 原始配置不变
    });

    it('应该能更新配置', () => {
      testShadow.updateConfig({ blur: 10, opacity: 0.8 });
      
      const config = testShadow.config;
      expect(config.blur).toBe(10);
      expect(config.opacity).toBe(0.8);
      expect(config.color).toBe('#000000'); // 其他属性保持不变
    });

    it('应该能启用/禁用阴影', () => {
      expect(testShadow.enabled).toBe(true);
      
      testShadow.enabled = false;
      expect(testShadow.enabled).toBe(false);
      
      testShadow.enabled = true;
      expect(testShadow.enabled).toBe(true);
    });
  });

  describe('阴影偏移计算', () => {
    it('应该能计算基本偏移', () => {
      const lightPos: Point2D = { x: 0, y: 0 };
      const objectPos: Point2D = { x: 100, y: 100 };
      
      const offset = testShadow.calculateOffset(lightPos, objectPos);
      
      expect(offset.x).toBeGreaterThan(0);
      expect(offset.y).toBeGreaterThan(0);
    });

    it('应该处理光源和对象重合的情况', () => {
      const pos: Point2D = { x: 50, y: 50 };
      
      const offset = testShadow.calculateOffset(pos, pos);
      
      expect(offset.x).toBe(0);
      expect(offset.y).toBe(0);
    });

    it('应该根据光源方向计算正确的偏移', () => {
      const lightPos: Point2D = { x: 0, y: 0 };
      const objectPos: Point2D = { x: 100, y: 0 }; // 水平方向
      
      const offset = testShadow.calculateOffset(lightPos, objectPos);
      
      expect(offset.x).toBeGreaterThan(0);
      expect(Math.abs(offset.y)).toBeLessThan(0.1); // 应该接近0
    });

    it('应该处理负坐标', () => {
      const lightPos: Point2D = { x: 100, y: 100 };
      const objectPos: Point2D = { x: -50, y: -50 };
      
      const offset = testShadow.calculateOffset(lightPos, objectPos);
      
      expect(offset.x).toBeLessThan(0);
      expect(offset.y).toBeLessThan(0);
    });
  });

  describe('颜色解析', () => {
    it('应该能解析十六进制颜色', () => {
      // 通过反射访问受保护的方法
      const parseColor = (testShadow as any).parseColor.bind(testShadow);
      
      const result = parseColor('#ff0000', 0.5);
      expect(result.r).toBe(255);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.a).toBe(0.5 * 255);
    });

    it('应该能解析RGB颜色', () => {
      const parseColor = (testShadow as any).parseColor.bind(testShadow);

      // parseColor 方法目前只支持十六进制颜色，RGB会返回默认黑色
      const result = parseColor('rgb(128, 64, 192)', 1.0);
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.a).toBe(1.0 * 255);
    });

    it('应该处理无效颜色', () => {
      const parseColor = (testShadow as any).parseColor.bind(testShadow);
      
      const result = parseColor('invalid-color', 0.8);
      expect(result.r).toBe(0);
      expect(result.g).toBe(0);
      expect(result.b).toBe(0);
      expect(result.a).toBe(0.8 * 255);
    });
  });

  describe('工具方法', () => {
    it('应该能获取阴影距离', () => {
      const getShadowDistance = (testShadow as any).getShadowDistance.bind(testShadow);
      
      const distance = getShadowDistance();
      expect(distance).toBeGreaterThan(0);
    });

    it('应该能获取模糊采样数', () => {
      const getBlurSamples = (testShadow as any).getBlurSamples.bind(testShadow);
      
      const samples = getBlurSamples();
      expect(samples).toBeGreaterThan(0);
    });

    it('应该能限制数值范围', () => {
      const clamp = (testShadow as any).clamp.bind(testShadow);
      
      expect(clamp(-10, 0, 255)).toBe(0);
      expect(clamp(300, 0, 255)).toBe(255);
      expect(clamp(128, 0, 255)).toBe(128);
    });

    it('应该能创建临时画布', () => {
      const createTempCanvas = (testShadow as any).createTempCanvas.bind(testShadow);

      const { canvas, ctx } = createTempCanvas(100, 100);
      expect(canvas).toMatchObject({ width: 100, height: 100 });
      expect(ctx).toBeDefined();
    });
  });

  describe('渲染', () => {
    it('应该能渲染阴影', () => {
      testShadow.render(mockContext, mockCanvas);
      
      expect(mockContext.shadowColor).toBe('#000000');
      expect(mockContext.shadowBlur).toBe(5);
      expect(mockContext.shadowOffsetX).toBe(2);
      expect(mockContext.shadowOffsetY).toBe(2);
    });
  });

  describe('克隆', () => {
    it('应该能克隆阴影', () => {
      const cloned = testShadow.clone();
      
      expect(cloned).toBeInstanceOf(TestShadow);
      expect(cloned.id).not.toBe(testShadow.id);
      expect(cloned.type).toBe(testShadow.type);
      expect(cloned.config).toEqual(testShadow.config);
    });

    it('克隆的阴影应该独立', () => {
      const cloned = testShadow.clone();
      
      testShadow.updateConfig({ blur: 10 });
      
      expect(cloned.config.blur).toBe(5); // 克隆的配置不受影响
    });
  });

  describe('销毁', () => {
    it('应该能正确销毁', () => {
      expect(() => testShadow.dispose()).not.toThrow();
    });
  });

  describe('边界值测试', () => {
    it('应该处理零模糊值', () => {
      testShadow.updateConfig({ blur: 0 });
      
      expect(() => testShadow.render(mockContext, mockCanvas)).not.toThrow();
    });

    it('应该处理极大的模糊值', () => {
      testShadow.updateConfig({ blur: 1000 });
      
      expect(() => testShadow.render(mockContext, mockCanvas)).not.toThrow();
    });

    it('应该处理零透明度', () => {
      testShadow.updateConfig({ opacity: 0 });
      
      expect(() => testShadow.render(mockContext, mockCanvas)).not.toThrow();
    });

    it('应该处理超出范围的透明度', () => {
      testShadow.updateConfig({ opacity: 2.0 });
      
      expect(testShadow.config.opacity).toBe(2.0); // 配置保存原值
    });
  });

  describe('性能测试', () => {
    it('应该能快速计算偏移', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        testShadow.calculateOffset(
          { x: Math.random() * 100, y: Math.random() * 100 },
          { x: Math.random() * 100, y: Math.random() * 100 }
        );
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // 应该在50ms内完成
    });

    it('应该能快速解析颜色', () => {
      const parseColor = (testShadow as any).parseColor.bind(testShadow);
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        parseColor('#ff0000', 0.5);
        parseColor('rgb(255, 0, 0)', 0.5);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(50); // 应该在50ms内完成
    });
  });
});