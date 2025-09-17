/**
 * PathPrimitive 的单元测试
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IGraphicsContext } from '../../graphics/IGraphicsContext';
import { PathPrimitive } from '../PathPrimitive';

// Mock IGraphicsContext
const createMockContext = (): IGraphicsContext => ({
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  setFillStyle: vi.fn(),
  setStrokeStyle: vi.fn(),
  setLineWidth: vi.fn(),
  setOpacity: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  drawLine: vi.fn(),
  // Path2D 相关方法
  createPath2D: vi.fn().mockReturnValue({})
} as any);

// Mock Path2D
const mockPath2D = {
  addPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  bezierCurveTo: vi.fn(),
  quadraticCurveTo: vi.fn(),
  arc: vi.fn(),
  arcTo: vi.fn(),
  ellipse: vi.fn(),
  rect: vi.fn()
};

// Mock global Path2D
Object.defineProperty(global, 'Path2D', {
  value: vi.fn().mockImplementation(() => mockPath2D),
  writable: true
});

describe('PathPrimitive', () => {
  let path: PathPrimitive;
  let mockContext: IGraphicsContext;

  beforeEach(() => {
    path = new PathPrimitive();
    mockContext = createMockContext();
    vi.clearAllMocks();
  });

  describe('构造函数和基本属性', () => {
    it('应该使用默认参数创建路径', () => {
      expect(path.type).toBe('path');
      expect(path.pathData).toBe('');
      expect(path.id).toMatch(/^path_\d+_[a-z0-9]+$/);
    });

    it('应该使用自定义参数创建路径', () => {
      const pathData = 'M 10 10 L 20 20 Z';
      const customPath = new PathPrimitive(pathData, 'custom-path');
      expect(customPath.pathData).toBe(pathData);
      expect(customPath.id).toBe('custom-path');
    });

    it('应该正确设置类型为只读', () => {
      expect(path.type).toBe('path');
      // 类型是只读的，不能修改
    });
  });

  describe('路径数据管理', () => {
    it('应该正确设置和获取路径数据', () => {
      const pathData = 'M 0 0 L 100 100';
      path.pathData = pathData;
      expect(path.pathData).toBe(pathData);
    });

    it('应该通过 setPathData 方法设置路径数据', () => {
      const pathData = 'M 50 50 Q 100 0 150 50';
      path.setPathData(pathData);
      expect(path.pathData).toBe(pathData);
    });

    it('应该处理空路径数据', () => {
      path.setPathData('');
      expect(path.pathData).toBe('');
    });

    it('应该处理复杂的SVG路径数据', () => {
      const complexPath = 'M 10 10 C 20 20, 40 20, 50 10 S 80 0, 90 10 Z';
      path.setPathData(complexPath);
      expect(path.pathData).toBe(complexPath);
    });

    it('应该处理包含多个子路径的数据', () => {
      const multiPath = 'M 10 10 L 20 20 Z M 30 30 L 40 40 Z';
      path.setPathData(multiPath);
      expect(path.pathData).toBe(multiPath);
    });
  });

  describe('边界计算', () => {
    it('应该正确计算简单路径的边界', () => {
      path.setPathData('M 10 20 L 50 60');
      path.setPosition({ x: 0, y: 0 });
      
      const bounds = path.getBounds();
      
      // PathPrimitive 使用固定的 100x100 边界框，中心在位置点
      expect(bounds).toEqual({
        x: -50, // 基于默认位置 (0,0)
        y: -50,
        width: 100,
        height: 100
      });
    });

    it('应该正确计算包含曲线的路径边界', () => {
      path.setPathData('M 0 0 Q 50 -50 100 0');
      path.setPosition({ x: 10, y: 20 });
      
      const bounds = path.getBounds();
      
      // PathPrimitive 的边界框是固定的，不解析路径数据
      expect(bounds).toEqual({
        x: -40, // 10 - 50 (位置 - 半径)
        y: -30, // 20 - 50
        width: 100,
        height: 100
      });
    });

    it('应该正确处理空路径的边界', () => {
      path.setPathData('');
      path.setPosition({ x: 50, y: 75 });
      
      const bounds = path.getBounds();
      
      // PathPrimitive 即使是空路径也有固定的边界框
      expect(bounds).toEqual({
        x: 0, // 50 - 50
        y: 25, // 75 - 50
        width: 100,
        height: 100
      });
    });

    it('应该正确处理单点路径的边界', () => {
      path.setPathData('M 25 35');
      path.setPosition({ x: 10, y: 20 });
      
      const bounds = path.getBounds();
      
      // PathPrimitive 的边界框不基于路径数据，而是固定大小
      expect(bounds).toEqual({
        x: -40, // 10 - 50 (位置 - 半径)
        y: -30, // 20 - 50
        width: 100,
        height: 100
      });
    });

    it('应该考虑位置偏移的边界计算', () => {
      path.setPosition({ x: 25, y: 35 });
      path.setPathData('M 10 20 L 30 40');
      
      const bounds = path.getBounds();
      
      // PathPrimitive 的边界框不基于路径数据，而是固定大小
      expect(bounds).toEqual({
        x: -25, // 25 - 50 (位置 - 半径)
        y: -15, // 35 - 50
        width: 100,
        height: 100
      });
    });
  });

  describe('碰撞检测', () => {
    beforeEach(() => {
      path.setPosition({ x: 0, y: 0 });
      path.setPathData('M 0 0 L 100 0 L 100 100 L 0 100 Z'); // 正方形
    });

    it('应该检测到路径内部点的碰撞', () => {
      // PathPrimitive 默认位置 (0,0)，边界框: x: -50 到 50, y: -50 到 50
      expect(path.hitTest({ x: 0, y: 0 })).toBe(true);   // 中心点
      expect(path.hitTest({ x: -25, y: 25 })).toBe(true); // 内部点
      expect(path.hitTest({ x: 49, y: 49 })).toBe(true);   // 右下角内部
    });

    it('应该检测到路径边界上点的碰撞', () => {
      expect(path.hitTest({ x: -50, y: -50 })).toBe(true); // 左上角
      expect(path.hitTest({ x: 50, y: 50 })).toBe(true);   // 右下角
      expect(path.hitTest({ x: 0, y: -50 })).toBe(true);   // 上边界
      expect(path.hitTest({ x: 50, y: 0 })).toBe(true);    // 右边界
    });

    it('应该检测到路径外部点没有碰撞', () => {
      // 边界框外的点应该返回 false
      expect(path.hitTest({ x: -51, y: 0 })).toBe(false);  // 左侧外部
      expect(path.hitTest({ x: 51, y: 0 })).toBe(false);   // 右侧外部
      expect(path.hitTest({ x: 0, y: -51 })).toBe(false);  // 上方外部
      expect(path.hitTest({ x: 0, y: 51 })).toBe(false);   // 下方外部
    });

    it('应该正确处理空路径的碰撞检测', () => {
      path.setPathData('');
      path.setPosition({ x: 50, y: 50 });
      
      // 即使是空路径，也有默认的边界框，中心在位置点
      expect(path.hitTest({ x: 50, y: 50 })).toBe(true); // 中心点
      expect(path.hitTest({ x: 101, y: 50 })).toBe(false); // 边界外
    });

    it('应该考虑路径位置偏移的碰撞检测', () => {
      path.setPosition({ x: 100, y: 100 });
      
      // PathPrimitive 使用固定的 100x100 边界框，中心在位置点
      // 边界框: x: 50-150, y: 50-150
      expect(path.hitTest({ x: 100, y: 100 })).toBe(true); // 中心点
      expect(path.hitTest({ x: 50, y: 50 })).toBe(true);   // 左上角
      expect(path.hitTest({ x: 150, y: 150 })).toBe(true); // 右下角
      expect(path.hitTest({ x: 49, y: 100 })).toBe(false); // 左侧外部
    });
  });

  describe('渲染功能', () => {
    it('应该正确渲染简单路径', () => {
      path.setPosition({ x: 50, y: 75 });
      path.setPathData('M 0 0 L 100 100');
      path.setStyle({ fillColor: '#red', strokeColor: '#blue', strokeWidth: 2 });
      
      path.render(mockContext);
      
      // 验证变换应用
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalledWith(50, 75);
      expect(mockContext.restore).toHaveBeenCalled();
      
      // 验证样式应用
      expect(mockContext.setFillStyle).toHaveBeenCalledWith('#red');
      expect(mockContext.setStrokeStyle).toHaveBeenCalledWith('#blue');
      expect(mockContext.setLineWidth).toHaveBeenCalledWith(2);
      
      // 验证路径绘制
      expect(mockContext.drawLine).toHaveBeenCalledWith(0, 0, 100, 100);
    });

    it('应该在不可见时跳过渲染', () => {
      path.visible = false;
      path.render(mockContext);
      
      expect(mockContext.drawLine).not.toHaveBeenCalled();
    });

    it('应该正确处理只有填充色的渲染', () => {
      path.setPathData('M 0 0 L 100 100 Z');
      path.setStyle({ fillColor: '#green', strokeColor: undefined });
      path.render(mockContext);
      
      expect(mockContext.drawLine).toHaveBeenCalled();
    });

    it('应该正确处理只有描边的渲染', () => {
      path.setPathData('M 0 0 L 100 100');
      path.setStyle({ fillColor: undefined, strokeColor: '#blue' });
      path.render(mockContext);
      
      expect(mockContext.drawLine).toHaveBeenCalled();
    });

    it('应该正确处理空路径的渲染', () => {
      path.setPathData('');
      path.render(mockContext);
      
      // 空路径不会调用绘制方法
      expect(mockContext.drawLine).not.toHaveBeenCalled();
    });

    it('应该正确处理无效坐标的路径', () => {
      // 测试包含 NaN 和无效坐标的路径，需要至少两个有效点才能绘制
      path.setPathData('M NaN 10 L 20 undefined M abc def L 30 40 L 50 60');
      path.render(mockContext);
      
      // 只有有效的坐标会被绘制，需要两个点才能画线
      expect(mockContext.drawLine).toHaveBeenCalledWith(30, 40, 50, 60);
    });

    it('应该正确处理坐标不足的命令', () => {
      // 测试坐标数量不足的情况
      path.setPathData('M 10 L 20 30 M L 40 50 L 60 70');
      path.render(mockContext);
      
      // 只有坐标完整的命令会被处理，需要两个点才能画线
      expect(mockContext.drawLine).toHaveBeenCalledWith(40, 50, 60, 70);
    });

    it('应该跳过只有一个有效点的路径', () => {
      // 测试只有一个有效点的情况
      path.setPathData('M NaN 10 L 20 undefined M abc def L 30 40');
      path.render(mockContext);
      
      // 只有一个有效点，不会绘制任何线段
      expect(mockContext.drawLine).not.toHaveBeenCalled();
    });

    it('应该正确处理复杂路径的渲染', () => {
      // PathPrimitive 只支持 M 和 L 命令，其他命令会被忽略
      const complexPath = 'M 10 10 L 20 20 C 30 30, 40 40, 50 50';
      path.setPathData(complexPath);
      path.render(mockContext);
      
      // 只有 M 和 L 命令会被处理，所以会有一条线段
      expect(mockContext.drawLine).toHaveBeenCalledWith(10, 10, 20, 20);
    });
  });

  describe('克隆功能', () => {
    it('应该正确克隆路径', () => {
      const pathData = 'M 0 0 Q 50 50 100 0 Z';
      path.setPosition({ x: 100, y: 200 });
      path.setPathData(pathData);
      path.setTransform({ rotation: Math.PI / 4, scaleX: 2, scaleY: 1.5 });
      path.setStyle({ fillColor: '#red', opacity: 0.8 });
      path.visible = false;
      path.zIndex = 10;
      
      const cloned = path.clone();
      
      // 验证基本属性
      expect(cloned).toBeInstanceOf(PathPrimitive);
      expect(cloned.id).not.toBe(path.id);
      expect(cloned.type).toBe('path');
      
      // 验证路径数据
      expect(cloned.pathData).toBe(pathData);
      
      // 验证继承的属性
      expect(cloned.position).toEqual(path.position);
      expect(cloned.transform).toEqual(path.transform);
      expect(cloned.style).toEqual(path.style);
      expect(cloned.visible).toBe(path.visible);
      expect(cloned.zIndex).toBe(path.zIndex);
    });

    it('克隆应该是深拷贝', () => {
      const originalPath = 'M 0 0 L 50 50';
      path.setPosition({ x: 50, y: 100 });
      path.setPathData(originalPath);
      const cloned = path.clone();
      
      // 修改原始对象
      path.setPosition({ x: 200, y: 300 });
      path.setPathData('M 100 100 L 200 200');
      
      // 克隆对象不应受影响
      expect(cloned.position).toEqual({ x: 50, y: 100 });
      expect(cloned.pathData).toBe(originalPath);
    });
  });

  describe('SVG路径数据解析', () => {
    it('应该正确处理基本移动和直线命令', () => {
      const pathData = 'M 10 20 L 30 40 L 50 60';
      path.setPathData(pathData);
      expect(path.pathData).toBe(pathData);
    });

    it('应该正确处理曲线命令', () => {
      const pathData = 'M 10 10 C 20 20, 40 20, 50 10';
      path.setPathData(pathData);
      expect(path.pathData).toBe(pathData);
    });

    it('应该正确处理二次贝塞尔曲线', () => {
      const pathData = 'M 10 10 Q 50 50 90 10';
      path.setPathData(pathData);
      expect(path.pathData).toBe(pathData);
    });

    it('应该正确处理弧线命令', () => {
      const pathData = 'M 10 10 A 20 20 0 0 1 50 50';
      path.setPathData(pathData);
      expect(path.pathData).toBe(pathData);
    });

    it('应该正确处理闭合路径命令', () => {
      const pathData = 'M 0 0 L 100 0 L 100 100 L 0 100 Z';
      path.setPathData(pathData);
      expect(path.pathData).toBe(pathData);
    });

    it('应该正确处理相对坐标命令', () => {
      const pathData = 'M 10 10 l 20 20 l 30 -10 z';
      path.setPathData(pathData);
      expect(path.pathData).toBe(pathData);
    });

    it('应该正确处理混合大小写命令', () => {
      const pathData = 'M 10 10 L 30 30 l 20 20 C 70 70, 90 50, 100 60 z';
      path.setPathData(pathData);
      expect(path.pathData).toBe(pathData);
    });
  });

  describe('边界情况', () => {
    it('应该处理包含特殊字符的路径数据', () => {
      const pathData = 'M\t10\n20\rL\t30\n40';
      path.setPathData(pathData);
      expect(path.pathData).toBe(pathData);
    });

    it('应该处理非常长的路径数据', () => {
      let longPath = 'M 0 0';
      for (let i = 1; i <= 1000; i++) {
        longPath += ` L ${i} ${i % 100}`;
      }
      longPath += ' Z';
      
      path.setPathData(longPath);
      expect(path.pathData).toBe(longPath);
    });

    it('应该处理包含浮点数的路径数据', () => {
      const pathData = 'M 10.5 20.7 L 30.123 40.456 C 50.789, 60.012, 70.345, 80.678, 90.999 100.001';
      path.setPathData(pathData);
      expect(path.pathData).toBe(pathData);
    });

    it('应该处理包含负数的路径数据', () => {
      const pathData = 'M -10 -20 L -30 40 L 50 -60';
      path.setPathData(pathData);
      expect(path.pathData).toBe(pathData);
    });

    it('应该处理科学计数法的路径数据', () => {
      const pathData = 'M 1e2 2e-1 L 3E+2 4E-2';
      path.setPathData(pathData);
      expect(path.pathData).toBe(pathData);
    });
  });

  describe('路径构建方法', () => {
    it('应该正确添加移动点', () => {
      path.setPathData('');
      path.addPoint({ x: 10, y: 20 }, true);
      expect(path.pathData).toBe(' M10,20');
    });

    it('应该正确添加线段点', () => {
      path.setPathData('M 0 0');
      path.addPoint({ x: 30, y: 40 }, false);
      expect(path.pathData).toBe('M 0 0 L30,40');
    });

    it('应该默认添加线段点', () => {
      path.setPathData('M 0 0');
      path.addPoint({ x: 50, y: 60 });
      expect(path.pathData).toBe('M 0 0 L50,60');
    });

    it('应该正确闭合路径', () => {
      path.setPathData('M 0 0 L 100 0 L 100 100');
      path.closePath();
      expect(path.pathData).toBe('M 0 0 L 100 0 L 100 100 Z');
    });

    it('应该避免重复闭合路径', () => {
      path.setPathData('M 0 0 L 100 0 L 100 100 Z');
      path.closePath();
      expect(path.pathData).toBe('M 0 0 L 100 0 L 100 100 Z');
    });

    it('应该支持连续添加多个点', () => {
      path.setPathData('');
      path.addPoint({ x: 0, y: 0 }, true);
      path.addPoint({ x: 10, y: 10 });
      path.addPoint({ x: 20, y: 0 });
      path.closePath();
      expect(path.pathData).toBe(' M0,0 L10,10 L20,0 Z');
    });
  });

  describe('性能测试', () => {
    it('应该快速创建大量路径', () => {
      const startTime = performance.now();
      const paths: PathPrimitive[] = [];
      
      for (let i = 0; i < 1000; i++) {
        paths.push(new PathPrimitive(`M ${i} ${i} L ${i + 10} ${i + 10}`));
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(paths.length).toBe(1000);
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该快速执行碰撞检测', () => {
      path.setPathData('M 0 0 L 100 0 L 100 100 L 0 100 Z');
      
      const startTime = performance.now();
      
      for (let i = 0; i < 10000; i++) {
        path.hitTest({ x: Math.random() * 200, y: Math.random() * 200 });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });

    it('应该快速更新路径数据', () => {
      const startTime = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        path.setPathData(`M ${i} ${i} L ${i + 50} ${i + 50} Z`);
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(50); // 应该在50ms内完成
    });
  });
});