import {
  WebGLResourceManager,
  TextureManager,
  FramebufferManager,
  ResourceRefCounter,
  ResourceType,
  ResourceState,
  TextureConfig,
  FramebufferConfig,
  MemoryBudget,
  GCConfig
} from '../WebGLResourceManager';

describe('ResourceRefCounter', () => {
  let refCounter: ResourceRefCounter;

  beforeEach(() => {
    refCounter = new ResourceRefCounter();
  });

  test('should add and track references', () => {
    expect(refCounter.addRef('test')).toBe(1);
    expect(refCounter.addRef('test')).toBe(2);
    expect(refCounter.getRefCount('test')).toBe(2);
  });

  test('should release references', () => {
    refCounter.addRef('test');
    refCounter.addRef('test');
    
    expect(refCounter.releaseRef('test')).toBe(1);
    expect(refCounter.releaseRef('test')).toBe(0);
    expect(refCounter.getRefCount('test')).toBe(0);
  });

  test('should call zero ref callback', () => {
    const callback = () => {};
    refCounter.setZeroRefCallback('test', callback);
    
    refCounter.addRef('test');
    refCounter.releaseRef('test');
    
    expect(refCounter.hasNoReferences('test')).toBe(true);
  });

  test('should handle non-existent references', () => {
    expect(refCounter.getRefCount('nonexistent')).toBe(0);
    expect(refCounter.releaseRef('nonexistent')).toBe(0);
    expect(refCounter.hasNoReferences('nonexistent')).toBe(true);
  });
});

describe('TextureManager', () => {
  let gl: WebGLRenderingContext;
  let textureManager: TextureManager;
  let mockTexture: WebGLTexture;

  beforeEach(() => {
    mockTexture = {} as WebGLTexture;
    
    gl = {
      createTexture: () => mockTexture,
      bindTexture: () => {},
      texImage2D: () => {},
      texSubImage2D: () => {},
      texParameteri: () => {},
      generateMipmap: () => {},
      deleteTexture: () => {},
      TEXTURE_2D: 0x0DE1,
      RGBA: 0x1908,
      UNSIGNED_BYTE: 0x1401,
      TEXTURE_MIN_FILTER: 0x2801,
      TEXTURE_MAG_FILTER: 0x2800,
      TEXTURE_WRAP_S: 0x2802,
      TEXTURE_WRAP_T: 0x2803,
      LINEAR: 0x2601,
      CLAMP_TO_EDGE: 0x812F
    } as any;

    textureManager = new TextureManager(gl);
  });

  test('should create texture with basic config', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };

    const textureRef = textureManager.createTexture('test', config);
    
    expect(textureRef.id).toBe('test');
    expect(textureRef.resource).toBe(mockTexture);
    expect(textureRef.metadata.type).toBe(ResourceType.TEXTURE);
    expect(textureRef.metadata.state).toBe(ResourceState.READY);
  });

  test('should create texture with image data', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };
    const imageData = new ImageData(256, 256);

    const textureRef = textureManager.createTexture('test', config, imageData);
    
    expect(textureRef.id).toBe('test');
    expect(textureRef.resource).toBe(mockTexture);
  });

  test('should get existing texture', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };

    textureManager.createTexture('test', config);
    const retrieved = textureManager.getTexture('test');
    
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe('test');
  });

  test('should return null for non-existent texture', () => {
    const retrieved = textureManager.getTexture('nonexistent');
    expect(retrieved).toBeNull();
  });

  test('should update texture data', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };
    const imageData = new ImageData(256, 256);

    textureManager.createTexture('test', config);
    
    expect(() => {
      textureManager.updateTexture('test', imageData);
    }).not.toThrow();
  });

  test('should delete texture', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };

    textureManager.createTexture('test', config);
    expect(textureManager.deleteTexture('test')).toBe(true);
    expect(textureManager.getTexture('test')).toBeNull();
  });

  test('should get all textures', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };

    textureManager.createTexture('test1', config);
    textureManager.createTexture('test2', config);
    
    const allTextures = textureManager.getAllTextures();
    expect(allTextures).toHaveLength(2);
  });

  test('should throw error for duplicate texture ID', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };

    textureManager.createTexture('test', config);
    
    expect(() => {
      textureManager.createTexture('test', config);
    }).toThrow('Texture with id "test" already exists');
  });
});

describe('FramebufferManager', () => {
  let gl: WebGLRenderingContext;
  let textureManager: TextureManager;
  let framebufferManager: FramebufferManager;
  let mockFramebuffer: WebGLFramebuffer;
  let mockTexture: WebGLTexture;

  beforeEach(() => {
    mockFramebuffer = {} as WebGLFramebuffer;
    mockTexture = {} as WebGLTexture;
    
    gl = {
      createFramebuffer: () => mockFramebuffer,
      createTexture: () => mockTexture,
      bindFramebuffer: () => {},
      bindTexture: () => {},
      framebufferTexture2D: () => {},
      checkFramebufferStatus: () => 0x8CD5, // FRAMEBUFFER_COMPLETE
      texImage2D: () => {},
      texParameteri: () => {},
      deleteFramebuffer: () => {},
      deleteTexture: () => {},
      FRAMEBUFFER: 0x8D40,
      TEXTURE_2D: 0x0DE1,
      COLOR_ATTACHMENT0: 0x8CE0,
      DEPTH_ATTACHMENT: 0x8D00,
      RGBA: 0x1908,
      DEPTH_COMPONENT: 0x1902,
      UNSIGNED_BYTE: 0x1401,
      TEXTURE_MIN_FILTER: 0x2801,
      TEXTURE_MAG_FILTER: 0x2800,
      LINEAR: 0x2601
    } as any;

    textureManager = new TextureManager(gl);
    framebufferManager = new FramebufferManager(gl, textureManager);
  });

  test('should create framebuffer with basic config', () => {
    const config: FramebufferConfig = {
      width: 512,
      height: 512,
      colorTextures: 1
    };

    const framebufferRef = framebufferManager.createFramebuffer('test', config);
    
    expect(framebufferRef.id).toBe('test');
    expect(framebufferRef.resource).toBe(mockFramebuffer);
    expect(framebufferRef.metadata.type).toBe(ResourceType.FRAMEBUFFER);
  });

  test('should create framebuffer with depth texture', () => {
    const config: FramebufferConfig = {
      width: 512,
      height: 512,
      colorTextures: 1,
      depthTexture: true
    };

    const framebufferRef = framebufferManager.createFramebuffer('test', config);
    
    expect(framebufferRef.id).toBe('test');
    expect(framebufferRef.resource).toBe(mockFramebuffer);
  });

  test('should get existing framebuffer', () => {
    const config: FramebufferConfig = {
      width: 512,
      height: 512,
      colorTextures: 1
    };

    framebufferManager.createFramebuffer('test', config);
    const retrieved = framebufferManager.getFramebuffer('test');
    
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe('test');
  });

  test('should delete framebuffer', () => {
    const config: FramebufferConfig = {
      width: 512,
      height: 512,
      colorTextures: 1
    };

    framebufferManager.createFramebuffer('test', config);
    expect(framebufferManager.deleteFramebuffer('test')).toBe(true);
    expect(framebufferManager.getFramebuffer('test')).toBeNull();
  });

  test('should resize framebuffer', () => {
    const config: FramebufferConfig = {
      width: 512,
      height: 512,
      colorTextures: 1
    };

    framebufferManager.createFramebuffer('test', config);
    
    expect(() => {
      framebufferManager.resizeFramebuffer('test', 1024, 1024);
    }).not.toThrow();
  });
});

describe('WebGLResourceManager', () => {
  let gl: WebGLRenderingContext;
  let resourceManager: WebGLResourceManager;
  let mockTexture: WebGLTexture;
  let mockFramebuffer: WebGLFramebuffer;

  beforeEach(() => {
    mockTexture = {} as WebGLTexture;
    mockFramebuffer = {} as WebGLFramebuffer;
    
    gl = {
      createTexture: () => mockTexture,
      createFramebuffer: () => mockFramebuffer,
      bindTexture: () => {},
      bindFramebuffer: () => {},
      texImage2D: () => {},
      texParameteri: () => {},
      framebufferTexture2D: () => {},
      checkFramebufferStatus: () => 0x8CD5,
      deleteTexture: () => {},
      deleteFramebuffer: () => {},
      generateMipmap: () => {},
      TEXTURE_2D: 0x0DE1,
      FRAMEBUFFER: 0x8D40,
      COLOR_ATTACHMENT0: 0x8CE0,
      RGBA: 0x1908,
      UNSIGNED_BYTE: 0x1401,
      TEXTURE_MIN_FILTER: 0x2801,
      TEXTURE_MAG_FILTER: 0x2800,
      LINEAR: 0x2601,
      CLAMP_TO_EDGE: 0x812F
    } as any;

    const budget: MemoryBudget = {
      total: 100 * 1024 * 1024, // 100MB
      textures: 80 * 1024 * 1024,
      buffers: 15 * 1024 * 1024,
      other: 5 * 1024 * 1024
    };

    const gcConfig: GCConfig = {
      enabled: true,
      interval: 5000,
      maxAge: 30000,
      maxUnusedTime: 10000,
      memoryThreshold: 0.8
    };

    resourceManager = new WebGLResourceManager(gl, budget, gcConfig);
  });

  afterEach(() => {
    resourceManager.dispose();
  });

  test('should create texture through resource manager', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };

    const textureRef = resourceManager.createTexture('test', config);
    
    expect(textureRef.id).toBe('test');
    expect(textureRef.resource).toBe(mockTexture);
  });

  test('should create framebuffer through resource manager', () => {
    const config: FramebufferConfig = {
      width: 512,
      height: 512,
      colorTextures: 1
    };

    const framebufferRef = resourceManager.createFramebuffer('test', config);
    
    expect(framebufferRef.id).toBe('test');
    expect(framebufferRef.resource).toBe(mockFramebuffer);
  });

  test('should manage resource references', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };

    resourceManager.createTexture('test', config);
    
    expect(resourceManager.addResourceRef('test')).toBe(1);
    expect(resourceManager.addResourceRef('test')).toBe(2);
    expect(resourceManager.releaseResourceRef('test')).toBe(1);
    expect(resourceManager.releaseResourceRef('test')).toBe(0);
  });

  test('should delete resources', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };

    resourceManager.createTexture('test', config);
    expect(resourceManager.deleteResource('test')).toBe(true);
    expect(resourceManager.getTexture('test')).toBeNull();
  });

  test('should get memory usage stats', () => {
    const usage = resourceManager.getMemoryUsage();
    
    expect(usage).toHaveProperty('textures');
    expect(usage).toHaveProperty('buffers');
    expect(usage).toHaveProperty('other');
    expect(usage).toHaveProperty('total');
  });

  test('should get memory budget', () => {
    const budget = resourceManager.getMemoryBudget();
    
    expect(budget.total).toBe(100 * 1024 * 1024);
    expect(budget.textures).toBe(80 * 1024 * 1024);
  });

  test('should get resource statistics', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };

    resourceManager.createTexture('test1', config);
    resourceManager.createTexture('test2', config);
    
    const stats = resourceManager.getResourceStats();
    
    expect(stats.textures).toBeGreaterThanOrEqual(2);
    expect(stats.totalMemory).toBeGreaterThanOrEqual(0);
  });

  test('should force garbage collection', () => {
    expect(() => {
      resourceManager.forceGC();
    }).not.toThrow();
  });

  test('should emit events on resource creation', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };

    let eventFired = false;
    resourceManager.on('resourceCreated', (metadata) => {
      expect(metadata.id).toBe('test');
      expect(metadata.type).toBe(ResourceType.TEXTURE);
      eventFired = true;
    });

    resourceManager.createTexture('test', config);
    expect(eventFired).toBe(true);
  });

  test('should handle resource disposal', () => {
    const config: TextureConfig = {
      width: 256,
      height: 256
    };

    resourceManager.createTexture('test', config);
    
    expect(() => {
      resourceManager.dispose();
    }).not.toThrow();
  });
});