import { AdvancedBatcher } from '../AdvancedBatcher';

describe('AdvancedBatcher', () => {
  let advancedBatcher: AdvancedBatcher;

  beforeEach(() => {
    advancedBatcher = new AdvancedBatcher();
  });

  test('should create advanced batcher', () => {
    expect(advancedBatcher).toBeInstanceOf(AdvancedBatcher);
  });

  test('should set context', () => {
    const mockContext = {};
    advancedBatcher.setContext(mockContext);
    
    // We can't easily test the internal state, but at least verify no errors
    expect(true).toBe(true);
  });

  test('should add instanced renderable', () => {
    const mockRenderable: any = {
      id: 'test-renderable',
      getBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
      render: jest.fn()
    };
    
    advancedBatcher.addInstancedRenderable(mockRenderable, 5);
    
    const count = advancedBatcher.getInstancedRenderableCount();
    expect(count).toBe(1);
  });

  test('should clear instanced renderables', () => {
    const mockRenderable: any = {
      id: 'test-renderable',
      getBounds: () => ({ x: 0, y: 0, width: 100, height: 100 }),
      render: jest.fn()
    };
    
    advancedBatcher.addInstancedRenderable(mockRenderable);
    expect(advancedBatcher.getInstancedRenderableCount()).toBe(1);
    
    advancedBatcher.clearInstancedRenderables();
    expect(advancedBatcher.getInstancedRenderableCount()).toBe(0);
  });

  test('should clear merged geometries', () => {
    advancedBatcher.clearMergedGeometries();
    const count = advancedBatcher.getMergedGeometryCount();
    expect(count).toBe(0);
  });

  test('should get instanced renderable count', () => {
    const count = advancedBatcher.getInstancedRenderableCount();
    expect(typeof count).toBe('number');
    expect(count).toBe(0);
  });

  test('should get merged geometry count', () => {
    const count = advancedBatcher.getMergedGeometryCount();
    expect(typeof count).toBe('number');
    expect(count).toBe(0);
  });

  test('should merge geometry', () => {
    const mockRenderables: any[] = [
      {
        id: 'shape-1',
        getBounds: () => ({ x: 0, y: 0, width: 50, height: 50 }),
        render: jest.fn()
      },
      {
        id: 'shape-2',
        getBounds: () => ({ x: 50, y: 50, width: 50, height: 50 }),
        render: jest.fn()
      }
    ];
    
    const geometry = advancedBatcher.mergeGeometry(mockRenderables);
    expect(geometry).toBeDefined();
    expect(geometry.vertices).toBeInstanceOf(Float32Array);
    expect(geometry.indices).toBeInstanceOf(Uint16Array);
    expect(geometry.textureCoords).toBeInstanceOf(Float32Array);
  });
});