import { BatchManager, BatchManagerConfig, createBatchManager } from '../core/BatchManager';
import { IBatchStrategy, BatchContext, BatchData } from '../core/IBatchStrategy';
import { IRenderable, BatchStats } from '../core/IBatchRenderer';
import { Matrix3 } from '../../../math/Matrix3';

// Mock strategy for testing
class MockBatchStrategy implements IBatchStrategy {
  name: string;
  private renderables: IRenderable[] = [];
  private stats: BatchStats = {
    drawCalls: 0,
    triangles: 0,
    vertices: 0,
    batches: 0,
    textureBinds: 0,
    shaderSwitches: 0,
    frameTime: 0
  };

  constructor(name: string) {
    this.name = name;
  }

  process(renderable: IRenderable): void {
    this.renderables.push(renderable);
  }

  flush(projectionMatrix: Matrix3, context: BatchContext): void {
    // Mock flush implementation
    this.stats.batches = Math.ceil(this.renderables.length / 100);
    this.stats.drawCalls = this.stats.batches;
    this.stats.vertices = this.renderables.length * 4;
    this.stats.triangles = this.renderables.length * 2;
    this.renderables = [];
  }

  getBatches(): BatchData[] {
    return [];
  }

  clear(): void {
    this.renderables = [];
    this.resetStats();
  }

  getStats(): BatchStats {
    return { ...this.stats };
  }

  dispose(): void {
    this.clear();
  }

  private resetStats(): void {
    this.stats = {
      drawCalls: 0,
      triangles: 0,
      vertices: 0,
      batches: 0,
      textureBinds: 0,
      shaderSwitches: 0,
      frameTime: 0
    };
  }
}

// Mock renderable for testing
class MockRenderable implements IRenderable {
  id: string;
  textureId: string;
  shaderId: string;
  vertices: Float32Array;
  indices: Uint16Array;
  transform: Matrix3;
  zIndex: number;

  constructor(id: string, textureId = 'texture1', shaderId = 'shader1') {
    this.id = id;
    this.textureId = textureId;
    this.shaderId = shaderId;
    this.vertices = new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]);
    this.indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    this.transform = Matrix3.identity();
    this.zIndex = 0;
  }

  getVertices(): Float32Array {
    return this.vertices;
  }

  getIndices(): Uint16Array {
    return this.indices;
  }

  getTexture?(): WebGLTexture | null {
    return null;
  }

  getShader(): string {
    return this.shaderId;
  }

  getBlendMode?(): number {
    return 0;
  }

  getZIndex?(): number {
    return this.zIndex;
  }
}

describe('BatchManager', () => {
  let gl: WebGLRenderingContext;
  let batchManager: BatchManager;
  let mockStrategy1: MockBatchStrategy;
  let mockStrategy2: MockBatchStrategy;

  beforeEach(() => {
    // Mock WebGL context
    gl = {
      canvas: { width: 800, height: 600 },
      getParameter: () => 65536,
      getExtension: () => null
    } as any;

    const config: Partial<BatchManagerConfig> = {
      maxBatchSize: 1000,
      enableProfiling: true,
      defaultStrategy: 'basic'
    };

    batchManager = new BatchManager(gl, config);
    mockStrategy1 = new MockBatchStrategy('basic');
    mockStrategy2 = new MockBatchStrategy('enhanced');
  });

  afterEach(() => {
    batchManager.dispose();
  });

  test('should create batch manager with default config', () => {
    const defaultManager = new BatchManager(gl);
    expect(defaultManager).toBeInstanceOf(BatchManager);
    expect(defaultManager.getAvailableStrategies()).toEqual([]);
    defaultManager.dispose();
  });

  test('should register strategies', () => {
    batchManager.registerStrategy(mockStrategy1);
    batchManager.registerStrategy(mockStrategy2);

    const strategies = batchManager.getAvailableStrategies();
    expect(strategies).toContain('basic');
    expect(strategies).toContain('enhanced');
    expect(strategies).toHaveLength(2);
  });

  test('should set and get current strategy', () => {
    batchManager.registerStrategy(mockStrategy1);
    batchManager.registerStrategy(mockStrategy2);

    expect(batchManager.setStrategy('basic')).toBe(true);
    expect(batchManager.getCurrentStrategy()).toBe('basic');

    expect(batchManager.setStrategy('enhanced')).toBe(true);
    expect(batchManager.getCurrentStrategy()).toBe('enhanced');

    expect(batchManager.setStrategy('nonexistent')).toBe(false);
    expect(batchManager.getCurrentStrategy()).toBe('enhanced');
  });

  test('should handle strategy registration with same name', () => {
    batchManager.registerStrategy(mockStrategy1);
    
    const newStrategy = new MockBatchStrategy('basic');
    batchManager.registerStrategy(newStrategy);
    
    // Strategy should be replaced without warning
    expect(batchManager.getAvailableStrategies()).toContain('basic');
    expect(batchManager.getAvailableStrategies()).toHaveLength(1);
  });

  test('should add renderables to current strategy', () => {
    batchManager.registerStrategy(mockStrategy1);
    batchManager.setStrategy('basic');

    const renderable = new MockRenderable('test1');
    batchManager.addRenderable(renderable);

    // Verify the renderable was added to the strategy
    expect(mockStrategy1['renderables']).toContain(renderable);
  });

  test('should handle adding renderables without strategy', () => {
    const renderable = new MockRenderable('test1');
    
    // Should not throw error when no strategy is set
    expect(() => {
      batchManager.addRenderable(renderable);
    }).not.toThrow();
  });

  test('should flush current strategy', () => {
    batchManager.registerStrategy(mockStrategy1);
    batchManager.setStrategy('basic');

    const renderable1 = new MockRenderable('test1');
    const renderable2 = new MockRenderable('test2');
    
    batchManager.addRenderable(renderable1);
    batchManager.addRenderable(renderable2);

    const projectionMatrix = Matrix3.identity();
    batchManager.flush(projectionMatrix);

    const stats = batchManager.getStats();
    expect(stats.batches).toBeGreaterThan(0);
    expect(stats.vertices).toBeGreaterThan(0);
  });

  test('should handle flush without strategy', () => {
    const projectionMatrix = Matrix3.identity();
    
    // Should not throw error when no strategy is set
    expect(() => {
      batchManager.flush(projectionMatrix);
    }).not.toThrow();
  });

  test('should clear current strategy', () => {
    batchManager.registerStrategy(mockStrategy1);
    batchManager.setStrategy('basic');

    const renderable = new MockRenderable('test1');
    batchManager.addRenderable(renderable);
    
    batchManager.clear();
    
    expect(mockStrategy1['renderables']).toHaveLength(0);
  });

  test('should get stats from current strategy', () => {
    batchManager.registerStrategy(mockStrategy1);
    batchManager.setStrategy('basic');

    const renderable = new MockRenderable('test1');
    batchManager.addRenderable(renderable);
    
    const projectionMatrix = Matrix3.identity();
    batchManager.flush(projectionMatrix);

    const stats = batchManager.getStats();
    expect(stats).toHaveProperty('drawCalls');
    expect(stats).toHaveProperty('triangles');
    expect(stats).toHaveProperty('vertices');
    expect(stats).toHaveProperty('batches');
    expect(stats).toHaveProperty('textureBinds');
    expect(stats).toHaveProperty('shaderSwitches');
    expect(stats).toHaveProperty('frameTime');
  });

  test('should get detailed stats', () => {
    batchManager.registerStrategy(mockStrategy1);
    batchManager.setStrategy('basic');

    const renderable = new MockRenderable('test1');
    batchManager.addRenderable(renderable);
    
    const projectionMatrix = Matrix3.identity();
    batchManager.flush(projectionMatrix);

    const detailedStats = batchManager.getDetailedStats();
    expect(detailedStats).toHaveProperty('manager');
    expect(detailedStats).toHaveProperty('strategy');
    expect(detailedStats).toHaveProperty('strategyName');
    expect(detailedStats.strategyName).toBe('basic');
  });

  test('should handle detailed stats without strategy', () => {
    const detailedStats = batchManager.getDetailedStats();
    expect(detailedStats.strategyName).toBe('none');
    expect(detailedStats.strategy.drawCalls).toBe(0);
  });

  test('should dispose all strategies', () => {
    batchManager.registerStrategy(mockStrategy1);
    batchManager.registerStrategy(mockStrategy2);
    
    const disposeSpy1 = vi.spyOn(mockStrategy1, 'dispose');
    const disposeSpy2 = vi.spyOn(mockStrategy2, 'dispose');
    
    batchManager.dispose();
    
    expect(disposeSpy1).toHaveBeenCalled();
    expect(disposeSpy2).toHaveBeenCalled();
    expect(batchManager.getAvailableStrategies()).toHaveLength(0);
  });

  test('should perform auto optimization', () => {
    batchManager.registerStrategy(mockStrategy1);
    batchManager.registerStrategy(mockStrategy2);
    batchManager.setStrategy('basic');

    // Add many renderables to trigger optimization
    for (let i = 0; i < 150; i++) {
      batchManager.addRenderable(new MockRenderable(`test${i}`));
    }

    const projectionMatrix = Matrix3.identity();
    batchManager.flush(projectionMatrix);
    
    // Auto optimization should potentially switch strategy
    batchManager.autoOptimize();
    
    // The strategy might change based on performance
    const currentStrategy = batchManager.getCurrentStrategy();
    expect(['basic', 'enhanced']).toContain(currentStrategy);
  });

  test('should track frame statistics', () => {
    batchManager.registerStrategy(mockStrategy1);
    batchManager.setStrategy('basic');

    const renderable = new MockRenderable('test1');
    batchManager.addRenderable(renderable);
    
    const projectionMatrix = Matrix3.identity();
    
    // Flush multiple times to accumulate stats
    batchManager.flush(projectionMatrix);
    batchManager.flush(projectionMatrix);
    
    const stats = batchManager.getStats();
    expect(stats.frameTime).toBeGreaterThanOrEqual(0);
  });

  test('should handle multiple renderables with different properties', () => {
    batchManager.registerStrategy(mockStrategy1);
    batchManager.setStrategy('basic');

    const renderable1 = new MockRenderable('test1', 'texture1', 'shader1');
    const renderable2 = new MockRenderable('test2', 'texture2', 'shader1');
    const renderable3 = new MockRenderable('test3', 'texture1', 'shader2');
    
    batchManager.addRenderable(renderable1);
    batchManager.addRenderable(renderable2);
    batchManager.addRenderable(renderable3);

    const projectionMatrix = Matrix3.identity();
    batchManager.flush(projectionMatrix);

    const stats = batchManager.getStats();
    expect(stats.vertices).toBe(12); // 3 renderables * 4 vertices each
    expect(stats.triangles).toBe(6); // 3 renderables * 2 triangles each
  });
});

describe('createBatchManager', () => {
  let gl: WebGLRenderingContext;

  beforeEach(() => {
    gl = {
      canvas: { width: 800, height: 600 },
      getParameter: () => 65536,
      getExtension: () => null
    } as any;
  });

  test('should create batch manager with factory function', () => {
    const config: Partial<BatchManagerConfig> = {
      maxBatchSize: 2000,
      enableProfiling: false,
      defaultStrategy: 'enhanced'
    };

    const manager = createBatchManager(gl, config);
    expect(manager).toBeInstanceOf(BatchManager);
    manager.dispose();
  });

  test('should create batch manager with default config', () => {
    const manager = createBatchManager(gl);
    expect(manager).toBeInstanceOf(BatchManager);
    manager.dispose();
  });
});