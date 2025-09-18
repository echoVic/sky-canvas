/**
 * PathMask 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Point2D } from '../../../animation/types/PathTypes';
import { MaskType, PathMask, PathMaskConfig } from '../../masks';


// Mock Canvas API和Path2D
const mockPath2D = {
  addPath: vi.fn(),
  arc: vi.fn(),
  rect: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  arcTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  ellipse: vi.fn(),
  quadraticCurveTo: vi.fn(),
  roundRect: vi.fn()
} as Path2D;

global.Path2D = vi.fn(() => mockPath2D) as any;

const mockCanvas = document.createElement('canvas');
mockCanvas.width = 200;
mockCanvas.height = 200;

const mockCtx = mockCanvas.getContext('2d') as CanvasRenderingContext2D;

// 保存原始方法
const originalIsPointInPath = CanvasRenderingContext2D.prototype.isPointInPath;
const originalCreateElement = document.createElement;
const originalGetContext = HTMLCanvasElement.prototype.getContext;

// 重置所有mock调用
beforeEach(() => {
  vi.clearAllMocks();
  // Mock全局的isPointInPath方法
  CanvasRenderingContext2D.prototype.isPointInPath = vi.fn().mockReturnValue(true);
  // Mock document.createElement来返回我们的mockCanvas
  vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
  // Mock HTMLCanvasElement.prototype.getContext来返回我们的mockCtx
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((contextType: string) => {
      if (contextType === '2d') return mockCtx;
      return null;
    }) as any);
});

// 恢复原始方法
afterEach(() => {
  CanvasRenderingContext2D.prototype.isPointInPath = originalIsPointInPath;
  document.createElement = originalCreateElement;
  HTMLCanvasElement.prototype.getContext = originalGetContext;
});

const mockShape = {
  id: 'test-shape',
  visible: true,
  zIndex: 1,
  bounds: {
    x: 0, y: 0, width: 100, height: 100,
    left: 0, right: 100, top: 0, bottom: 100,
    center: { x: 50, y: 50 }
  }
};

describe('PathMask', () => {
  let mask: PathMask;
  let config: PathMaskConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      type: MaskType.CLIP,
      shape: 'path' as any,
      position: { x: 100, y: 100 },
      path: 'M 50 50 L 150 50 L 100 150 Z',
      enabled: true,
      opacity: 1.0,
      blendMode: 'normal' as any,
      edgeType: 'hard' as any
    } as PathMaskConfig;

    mask = new PathMask(config);
    
    // 设置isPointInPath的mock
    vi.mocked(mockCtx.isPointInPath).mockReturnValue(true);
  });

  describe('构造和初始化', () => {
    it('应该正确初始化字符串路径', () => {
      expect(mask).toBeInstanceOf(PathMask);
      expect((mask.config as PathMaskConfig).path).toBe('M 50 50 L 150 50 L 100 150 Z');
      expect(global.Path2D).toHaveBeenCalledWith('M 50 50 L 150 50 L 100 150 Z');
    });

    it('应该接受Path2D对象', () => {
      const path2DConfig: PathMaskConfig = { ...config, path: mockPath2D };
      const path2DMask = new PathMask(path2DConfig);

      expect((path2DMask.config as PathMaskConfig).path).toBe(mockPath2D);
    });
  });

  describe('apply方法', () => {
    it('应该应用剪切遮罩', () => {
      mask.apply(mockCtx, mockShape);

      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
      expect(mockCtx.clip).toHaveBeenCalled();
    });

    it('应该在没有路径时不执行操作', () => {
      const noPathConfig: PathMaskConfig = { ...config, path: '' };
      const noPathMask = new PathMask(noPathConfig);

      noPathMask.apply(mockCtx, mockShape);

      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    it('应该处理反转剪切遮罩', () => {
      const invertedConfig: PathMaskConfig = { ...config, inverted: true };
      const invertedMask = new PathMask(invertedConfig);

      invertedMask.apply(mockCtx, mockShape);

      expect(mockCtx.rect).toHaveBeenCalled();
      expect(mockCtx.clip).toHaveBeenCalledWith('evenodd');
    });

    it('应该应用Alpha遮罩', () => {
      const alphaConfig: PathMaskConfig = { ...config, type: MaskType.ALPHA };
      const alphaMask = new PathMask(alphaConfig);

      alphaMask.apply(mockCtx, mockShape);

      expect(mockCtx.fill).toHaveBeenCalled();
      expect(mockCtx.globalCompositeOperation).toBe('destination-in');
    });

    it('应该应用带羽化的Alpha遮罩', () => {
      const featheredConfig: PathMaskConfig = {
        ...config,
        type: MaskType.ALPHA,
        featherRadius: 5
      };
      const featheredMask = new PathMask(featheredConfig);

      featheredMask.apply(mockCtx, mockShape);

      expect(mockCtx.shadowBlur).toBe(5);
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('应该应用Stencil遮罩', () => {
      const stencilConfig: PathMaskConfig = { ...config, type: MaskType.STENCIL };
      const stencilMask = new PathMask(stencilConfig);

      stencilMask.apply(mockCtx, mockShape);

      expect(mockCtx.fill).toHaveBeenCalled();
      expect(mockCtx.globalCompositeOperation).toBe('source-in');
    });
  });

  describe('contains方法', () => {
    it('应该使用isPointInPath检查点包含', () => {
      const testPoint: Point2D = { x: 100, y: 100 };

      const result = mask.contains(testPoint);

      expect(result).toBe(true);
      expect(mockCtx.isPointInPath).toHaveBeenCalled();
    });

    it('应该为反转遮罩反转结果', () => {
      const invertedConfig: PathMaskConfig = { ...config, inverted: true };
      const invertedMask = new PathMask(invertedConfig);
      const testPoint: Point2D = { x: 100, y: 100 };
      
      // 对于反转遮罩，当isPointInPath返回true时，contains应该返回false
      const result = invertedMask.contains(testPoint);

      expect(result).toBe(false); // 反转结果
    });

    it('应该在没有路径时返回false', () => {
      const noPathConfig: PathMaskConfig = { ...config, path: '' };
      const noPathMask = new PathMask(noPathConfig);
      const testPoint: Point2D = { x: 100, y: 100 };

      const result = noPathMask.contains(testPoint);

      expect(result).toBe(false);
    });
  });

  describe('getBounds方法', () => {
    it('应该返回估算的边界', () => {
      const bounds = mask.getBounds();

      expect(bounds.min.x).toBe(0);   // position.x - estimate
      expect(bounds.min.y).toBe(0);   // position.y - estimate
      expect(bounds.max.x).toBe(200); // position.x + estimate
      expect(bounds.max.y).toBe(200); // position.y + estimate
    });

    it('应该在没有路径时返回位置点', () => {
      const noPathConfig: PathMaskConfig = { ...config, path: '' };
      const noPathMask = new PathMask(noPathConfig);

      const bounds = noPathMask.getBounds();

      expect(bounds.min).toEqual(config.position);
      expect(bounds.max).toEqual(config.position);
    });
  });

  describe('路径操作方法', () => {
    it('应该能更新路径', () => {
      const newPath = 'M 0 0 L 100 0 L 100 100 L 0 100 Z';

      mask.updatePath(newPath);

      expect((mask.config as PathMaskConfig).path).toBe(newPath);
      expect(global.Path2D).toHaveBeenCalledWith(newPath);
    });

    it('应该能更新Path2D对象', () => {
      const newPath2D = new Path2D();

      mask.updatePath(newPath2D);

      expect((mask.config as PathMaskConfig).path).toBe(newPath2D);
    });

    it('应该返回路径字符串', () => {
      const pathString = mask.getPathString();

      expect(pathString).toBe('M 50 50 L 150 50 L 100 150 Z');
    });

    it('应该为Path2D对象返回null路径字符串', () => {
      const path2DConfig: PathMaskConfig = { ...config, path: mockPath2D };
      const path2DMask = new PathMask(path2DConfig);

      const pathString = path2DMask.getPathString();

      expect(pathString).toBeNull();
    });

    it('应该返回Path2D对象', () => {
      const path2D = mask.getPath2D();

      expect(path2D).toBeDefined();
    });
  });

  describe('静态工厂方法', () => {
    it('应该从SVG路径创建遮罩', () => {
      const svgPath = 'M 10 10 L 90 10 L 90 90 L 10 90 Z';
      const position: Point2D = { x: 50, y: 50 };

      const svgMask = PathMask.fromSVGPath(svgPath, position);

      expect(svgMask).toBeInstanceOf(PathMask);
      expect((svgMask.config as PathMaskConfig).path).toBe(svgPath);
      expect(svgMask.config.position).toEqual(position);
      expect(svgMask.config.type).toBe(MaskType.CLIP);
    });

    it('应该从Path2D创建遮罩', () => {
      const path2D = new Path2D();
      const position: Point2D = { x: 75, y: 75 };

      const path2DMask = PathMask.fromPath2D(path2D, position);

      expect(path2DMask).toBeInstanceOf(PathMask);
      expect((path2DMask.config as PathMaskConfig).path).toBe(path2D);
      expect(path2DMask.config.position).toEqual(position);
      expect(path2DMask.config.type).toBe(MaskType.CLIP);
    });
  });

  describe('clone方法', () => {
    it('应该创建相同的副本', () => {
      const cloned = mask.clone();

      expect(cloned).not.toBe(mask);
      expect(cloned).toBeInstanceOf(PathMask);
      expect(cloned.config).toEqual(mask.config);
    });

    it('克隆应该是独立的', () => {
      const cloned = mask.clone() as PathMask;

      mask.updateConfig({ opacity: 0.5 });

      expect(cloned.config.opacity).toBe(1.0);
      expect(mask.config.opacity).toBe(0.5);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的上下文', () => {
      expect(() => {
        mask.apply(null as any, mockShape);
      }).not.toThrow();
    });

    it('应该处理WebGL上下文', () => {
      const webglCtx = {} as WebGLRenderingContext;

      expect(() => {
        mask.apply(webglCtx, mockShape);
      }).not.toThrow();
    });

    it('应该处理禁用的遮罩', () => {
      const disabledConfig: PathMaskConfig = { ...config, enabled: false };
      const disabledMask = new PathMask(disabledConfig);

      disabledMask.apply(mockCtx, mockShape);

      expect(mockCtx.save).not.toHaveBeenCalled();
    });
  });

  describe('性能测试', () => {
    it('应该快速执行点包含测试', () => {
      const iterations = 1000;
      const testPoint: Point2D = { x: 100, y: 100 };

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        mask.contains(testPoint);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(400); // 考虑到DOM操作可能较慢
    });

    it('应该快速更新路径', () => {
      const iterations = 100;
      const newPath = 'M 0 0 L 50 0 L 50 50 L 0 50 Z';

      const startTime = performance.now();

      for (let i = 0; i < iterations; i++) {
        mask.updatePath(newPath);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('边界情况', () => {
    it('应该处理空路径字符串', () => {
      const emptyPathConfig: PathMaskConfig = { ...config, path: '' };
      const emptyPathMask = new PathMask(emptyPathConfig);

      expect(() => {
        emptyPathMask.apply(mockCtx, mockShape);
      }).not.toThrow();
    });

    it('应该处理复杂的SVG路径', () => {
      const complexPath = 'M 150 0 L 75 200 L 225 200 Z M 150 50 L 125 150 L 175 150 Z';
      const complexConfig: PathMaskConfig = { ...config, path: complexPath };
      const complexMask = new PathMask(complexConfig);

      expect(() => {
        complexMask.apply(mockCtx, mockShape);
      }).not.toThrow();
    });

    it('应该处理路径更新为相同值', () => {
      const originalPath = (mask.config as PathMaskConfig).path;

      mask.updatePath(originalPath as string);

      expect((mask.config as PathMaskConfig).path).toBe(originalPath);
    });
  });
});