import { SnapManager } from '../SnapManager';
import { IPoint } from '@sky-canvas/render-engine';

// Mock shape for testing
const createMockShape = (x: number, y: number, width: number, height: number) => ({
  id: `shape_${x}_${y}`,
  visible: true,
  getBounds: () => ({ x, y, width, height })
});

describe('SnapManager', () => {
  let snapManager: SnapManager;
  let mockShapes: any[];

  beforeEach(() => {
    snapManager = new SnapManager();
    mockShapes = [
      createMockShape(100, 100, 50, 50), // Square at (100, 100) with size 50x50
      createMockShape(200, 150, 30, 80)  // Rectangle at (200, 150) with size 30x80
    ];
  });

  test('should create snap manager with default settings', () => {
    expect(snapManager).toBeDefined();
    expect(snapManager.getSnapDistance()).toBe(10);
    expect(snapManager.getGridSize()).toBe(20);
    expect(snapManager.isSnapEnabled()).toBe(true);
  });

  test('should set snap distance', () => {
    snapManager.setSnapDistance(15);
    expect(snapManager.getSnapDistance()).toBe(15);
  });

  test('should set grid size', () => {
    snapManager.setGridSize(25);
    expect(snapManager.getGridSize()).toBe(25);
  });

  test('should enable/disable grid snap', () => {
    // 默认应该启用网格捕捉
    expect(snapManager.getEnabledSnapTypes()).toContain('grid');
    
    // 禁用网格捕捉
    snapManager.enableGridSnap(false);
    expect(snapManager.getEnabledSnapTypes()).not.toContain('grid');
    
    // 重新启用网格捕捉
    snapManager.enableGridSnap(true);
    expect(snapManager.getEnabledSnapTypes()).toContain('grid');
  });

  test('should enable/disable object snap', () => {
    // 默认应该启用对象捕捉
    expect(snapManager.getEnabledSnapTypes()).toContain('objects');
    
    // 禁用对象捕捉
    snapManager.enableObjectSnap(false);
    expect(snapManager.getEnabledSnapTypes()).not.toContain('objects');
    
    // 重新启用对象捕捉
    snapManager.enableObjectSnap(true);
    expect(snapManager.getEnabledSnapTypes()).toContain('objects');
  });

  test('should enable/disable guide snap', () => {
    // 默认应该禁用参考线捕捉
    expect(snapManager.getEnabledSnapTypes()).not.toContain('guides');
    
    // 启用参考线捕捉
    snapManager.enableGuideSnap(true);
    expect(snapManager.getEnabledSnapTypes()).toContain('guides');
    
    // 禁用参考线捕捉
    snapManager.enableGuideSnap(false);
    expect(snapManager.getEnabledSnapTypes()).not.toContain('guides');
  });

  test('should perform grid snap', () => {
    snapManager.setGridSize(20);
    const position: IPoint = { x: 25, y: 35 }; // Should snap to (20, 40)
    
    const result = snapManager.getSnapPosition(position, []);
    
    expect(result.type).toBe('grid');
    expect(result.position.x).toBe(20);
    expect(result.position.y).toBe(40);
    expect(result.distance).toBeLessThan(snapManager.getSnapDistance());
  });

  test('should perform object snap to corner', () => {
    const position: IPoint = { x: 105, y: 105 }; // Near corner (100, 100)
    
    const result = snapManager.getSnapPosition(position, mockShapes);
    
    expect(result.type).toBe('object');
    expect(result.position.x).toBe(100);
    expect(result.position.y).toBe(100);
    expect(result.distance).toBeLessThan(snapManager.getSnapDistance());
  });

  test('should perform object snap to center', () => {
    const position: IPoint = { x: 120, y: 120 }; // Near center (125, 125)
    
    const result = snapManager.getSnapPosition(position, mockShapes);
    
    expect(result.type).toBe('object');
    expect(result.position.x).toBe(125);
    expect(result.position.y).toBe(125);
    expect(result.distance).toBeLessThan(snapManager.getSnapDistance());
  });

  test('should perform guide snap', () => {
    snapManager.enableGuideSnap(true);
    snapManager.setGuideLines([150, 250], [200, 300]);
    
    const position: IPoint = { x: 155, y: 100 }; // Near guide line x=150
    
    const result = snapManager.getSnapPosition(position, []);
    
    expect(result.type).toBe('guide');
    expect(result.position.x).toBe(150);
    expect(result.position.y).toBe(100);
    expect(result.distance).toBeLessThan(snapManager.getSnapDistance());
  });

  test('should return original position when no snap is close enough', () => {
    const position: IPoint = { x: 500, y: 500 }; // Far from any objects or grid
    
    const result = snapManager.getSnapPosition(position, mockShapes);
    
    expect(result.type).toBe('none');
    expect(result.position.x).toBe(500);
    expect(result.position.y).toBe(500);
  });

  test('should prioritize closer snaps', () => {
    snapManager.setGridSize(100);
    // Position near both grid point (100, 100) and object corner (100, 100)
    const position: IPoint = { x: 102, y: 102 };
    
    const result = snapManager.getSnapPosition(position, mockShapes);
    
    // Should snap to object since it's closer
    expect(result.type).toBe('object');
    expect(result.position.x).toBe(100);
    expect(result.position.y).toBe(100);
  });

  test('should respect disabled snap types', () => {
    // 禁用所有捕捉类型
    snapManager.enableGridSnap(false);
    snapManager.enableObjectSnap(false);
    snapManager.enableGuideSnap(false);
    
    const position: IPoint = { x: 105, y: 105 };
    
    const result = snapManager.getSnapPosition(position, mockShapes);
    
    // 应该返回原始位置，因为所有捕捉都已禁用
    expect(result.type).toBe('none');
    expect(result.position.x).toBe(105);
    expect(result.position.y).toBe(105);
  });
});