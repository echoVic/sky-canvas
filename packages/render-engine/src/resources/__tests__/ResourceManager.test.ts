import {
  WebGLResourceManager,
  WebGLBuffer,
  WebGLTexture,
  ResourcePoolConfig,
  ResourceStats,
  IResourceManager
} from '../ResourceManager';
import { BufferType } from '../../core/webgl/types';
import { TextureFormat } from '../../textures/types';

describe('WebGLBuffer', () => {
  let gl: WebGLRenderingContext;
  let mockBuffer: globalThis.WebGLBuffer;

  beforeEach(() => {
    mockBuffer = {} as globalThis.WebGLBuffer;
    
    gl = {
      createBuffer: () => mockBuffer,
      bindBuffer: () => {},
      bufferData: () => {},
      deleteBuffer: () => {},
      ARRAY_BUFFER: 0x8892,
      ELEMENT_ARRAY_BUFFER: 0x8893,
      STATIC_DRAW: 0x88E4,
      DYNAMIC_DRAW: 0x88E8
    } as any;
  });

  test('should create buffer with correct properties', () => {
    const data = new ArrayBuffer(1024);
    const buffer = new WebGLBuffer(gl, 'test-buffer', BufferType.VERTEX, data);
    
    expect(buffer.id).toBe('test-buffer');
    expect(buffer.type).toBe(BufferType.VERTEX);
    expect(buffer.size).toBe(1024);
    expect(buffer.data).toBe(data);
  });

  test('should bind buffer correctly', () => {
    const bindBufferSpy = vi.spyOn(gl, 'bindBuffer');
    const data = new ArrayBuffer(512);
    const buffer = new WebGLBuffer(gl, 'test-buffer', BufferType.VERTEX, data);
    
    buffer.bind();
    
    expect(bindBufferSpy).toHaveBeenCalledWith(gl.ARRAY_BUFFER, mockBuffer);
  });

  test('should update buffer data', () => {
    const bufferDataSpy = vi.spyOn(gl, 'bufferData');
    const initialData = new ArrayBuffer(1024);
    const newData = new ArrayBuffer(512);
    const buffer = new WebGLBuffer(gl, 'test-buffer', BufferType.VERTEX, initialData);
    
    buffer.update(newData);
    
    expect(buffer.data).toBe(newData);
    expect(buffer.size).toBe(512);
  });

  test('should dispose buffer correctly', () => {
    const deleteBufferSpy = vi.spyOn(gl, 'deleteBuffer');
    const data = new ArrayBuffer(1024);
    const buffer = new WebGLBuffer(gl, 'test-buffer', BufferType.VERTEX, data);
    
    buffer.dispose();
    
    expect(deleteBufferSpy).toHaveBeenCalledWith(mockBuffer);
  });
});

describe('WebGLTexture', () => {
  let gl: WebGLRenderingContext;
  let mockTexture: globalThis.WebGLTexture;

  beforeEach(() => {
    mockTexture = {} as globalThis.WebGLTexture;
    
    gl = {
      createTexture: () => mockTexture,
      bindTexture: () => {},
      texImage2D: () => {},
      texParameteri: () => {},
      activeTexture: () => {},
      deleteTexture: () => {},
      TEXTURE_2D: 0x0DE1,
      RGBA: 0x1908,
      UNSIGNED_BYTE: 0x1401,
      TEXTURE_MIN_FILTER: 0x2801,
      TEXTURE_MAG_FILTER: 0x2800,
      LINEAR: 0x2601,
      TEXTURE0: 0x84C0
    } as any;
  });

  test('should create texture with correct properties', () => {
    const texture = new WebGLTexture(gl, 'test-texture', 256, 256, TextureFormat.RGBA8);
    
    expect(texture.id).toBe('test-texture');
    expect(texture.width).toBe(256);
    expect(texture.height).toBe(256);
    expect(texture.format).toBe(TextureFormat.RGBA8);
    expect(texture.type).toBe('texture');
  });

  test('should create texture with data', () => {
    const data = new ArrayBuffer(256 * 256 * 4);
    const texture = new WebGLTexture(gl, 'test-texture', 256, 256, TextureFormat.RGBA8, data);
    
    expect(texture.size).toBe(256 * 256 * 4);
  });

  test('should bind texture to correct unit', () => {
    const activeTextureSpy = vi.spyOn(gl, 'activeTexture');
    const bindTextureSpy = vi.spyOn(gl, 'bindTexture');
    const texture = new WebGLTexture(gl, 'test-texture', 256, 256, TextureFormat.RGBA8);
    
    texture.bind(1);
    
    expect(activeTextureSpy).toHaveBeenCalledWith(gl.TEXTURE0 + 1);
    expect(bindTextureSpy).toHaveBeenCalledWith(gl.TEXTURE_2D, mockTexture);
  });

  test('should update texture data', () => {
    const texImage2DSpy = vi.spyOn(gl, 'texImage2D');
    const texture = new WebGLTexture(gl, 'test-texture', 256, 256, TextureFormat.RGBA8);
    const newData = new ArrayBuffer(256 * 256 * 4);
    
    texture.update(newData);
    
    expect(texImage2DSpy).toHaveBeenCalled();
  });

  test('should dispose texture correctly', () => {
    const deleteTextureSpy = vi.spyOn(gl, 'deleteTexture');
    const texture = new WebGLTexture(gl, 'test-texture', 256, 256, TextureFormat.RGBA8);
    
    texture.dispose();
    
    expect(deleteTextureSpy).toHaveBeenCalledWith(mockTexture);
  });
});

describe('WebGLResourceManager', () => {
  let gl: WebGLRenderingContext;
  let resourceManager: WebGLResourceManager;
  let mockBuffer: globalThis.WebGLBuffer;
  let mockTexture: globalThis.WebGLTexture;

  beforeEach(() => {
    mockBuffer = {} as globalThis.WebGLBuffer;
    mockTexture = {} as globalThis.WebGLTexture;
    
    gl = {
      createBuffer: () => mockBuffer,
      createTexture: () => mockTexture,
      bindBuffer: () => {},
      bindTexture: () => {},
      bufferData: () => {},
      texImage2D: () => {},
      texParameteri: () => {},
      activeTexture: () => {},
      deleteBuffer: () => {},
      deleteTexture: () => {},
      ARRAY_BUFFER: 0x8892,
      ELEMENT_ARRAY_BUFFER: 0x8893,
      STATIC_DRAW: 0x88E4,
      TEXTURE_2D: 0x0DE1,
      RGBA: 0x1908,
      UNSIGNED_BYTE: 0x1401,
      TEXTURE_MIN_FILTER: 0x2801,
      TEXTURE_MAG_FILTER: 0x2800,
      LINEAR: 0x2601,
      TEXTURE0: 0x84C0
    } as any;

    const config: ResourcePoolConfig = {
      maxBuffers: 100,
      maxTextures: 50,
      maxMemoryMB: 256,
      gcThresholdMB: 200
    };

    resourceManager = new WebGLResourceManager(gl, config);
  });

  afterEach(() => {
    resourceManager.dispose();
  });

  test('should create buffer through resource manager', () => {
    const data = new ArrayBuffer(1024);
    const buffer = resourceManager.createBuffer(BufferType.VERTEX, data);
    
    expect(buffer).toBeInstanceOf(WebGLBuffer);
    expect(buffer.type).toBe(BufferType.VERTEX);
    expect(buffer.size).toBe(1024);
  });

  test('should create texture through resource manager', () => {
    const texture = resourceManager.createTexture(256, 256, TextureFormat.RGBA8);
    
    expect(texture).toBeInstanceOf(WebGLTexture);
    expect(texture.width).toBe(256);
    expect(texture.height).toBe(256);
    expect(texture.format).toBe(TextureFormat.RGBA8);
  });

  test('should create texture with data', () => {
    const data = new ArrayBuffer(256 * 256 * 4);
    const texture = resourceManager.createTexture(256, 256, TextureFormat.RGBA8, data);
    
    expect(texture.size).toBe(256 * 256 * 4);
  });

  test('should release and pool resources', () => {
    const data = new ArrayBuffer(1024);
    const buffer = resourceManager.createBuffer(BufferType.VERTEX, data);
    
    const initialStats = resourceManager.getStats();
    resourceManager.releaseResource(buffer);
    const afterReleaseStats = resourceManager.getStats();
    
    expect(afterReleaseStats.pooledResources).toBeGreaterThan(initialStats.pooledResources);
  });

  test('should get resource statistics', () => {
    const data = new ArrayBuffer(1024);
    resourceManager.createBuffer(BufferType.VERTEX, data);
    resourceManager.createTexture(256, 256, TextureFormat.RGBA8);
    
    const stats = resourceManager.getStats();
    
    expect(stats).toHaveProperty('totalBuffers');
    expect(stats).toHaveProperty('totalTextures');
    expect(stats).toHaveProperty('totalMemoryMB');
    expect(stats).toHaveProperty('activeResources');
    expect(stats).toHaveProperty('pooledResources');
    expect(stats.totalBuffers).toBeGreaterThanOrEqual(1);
    expect(stats.totalTextures).toBeGreaterThanOrEqual(1);
  });

  test('should reuse pooled buffers', () => {
    const data1 = new ArrayBuffer(1024);
    const data2 = new ArrayBuffer(1024);
    
    const buffer1 = resourceManager.createBuffer(BufferType.VERTEX, data1);
    resourceManager.releaseResource(buffer1);
    
    const buffer2 = resourceManager.createBuffer(BufferType.VERTEX, data2);
    
    // Should reuse the pooled buffer
    expect(buffer2.id).toBe(buffer1.id);
  });

  test('should reuse pooled textures', () => {
    const texture1 = resourceManager.createTexture(256, 256, TextureFormat.RGBA8);
    resourceManager.releaseResource(texture1);
    
    const texture2 = resourceManager.createTexture(256, 256, TextureFormat.RGBA8);
    
    // Should reuse the pooled texture
    expect(texture2.id).toBe(texture1.id);
  });

  test('should perform cleanup', () => {
    const data = new ArrayBuffer(1024);
    const buffer = resourceManager.createBuffer(BufferType.VERTEX, data);
    const texture = resourceManager.createTexture(256, 256, TextureFormat.RGBA8);
    
    resourceManager.releaseResource(buffer);
    resourceManager.releaseResource(texture);
    
    const beforeCleanup = resourceManager.getStats();
    resourceManager.cleanup();
    const afterCleanup = resourceManager.getStats();
    
    expect(afterCleanup.pooledResources).toBeLessThanOrEqual(beforeCleanup.pooledResources);
  });

  test('should handle different buffer types', () => {
    const vertexData = new ArrayBuffer(1024);
    const indexData = new ArrayBuffer(512);
    
    const vertexBuffer = resourceManager.createBuffer(BufferType.VERTEX, vertexData);
    const indexBuffer = resourceManager.createBuffer(BufferType.INDEX, indexData);
    
    expect(vertexBuffer.type).toBe(BufferType.VERTEX);
    expect(indexBuffer.type).toBe(BufferType.INDEX);
  });

  test('should handle different texture formats', () => {
    const rgbaTexture = resourceManager.createTexture(256, 256, TextureFormat.RGBA8);
    const rgbTexture = resourceManager.createTexture(256, 256, TextureFormat.RGB8);
    
    expect(rgbaTexture.format).toBe(TextureFormat.RGBA8);
    expect(rgbTexture.format).toBe(TextureFormat.RGB8);
  });

  test('should dispose all resources', () => {
    const deleteBufferSpy = vi.spyOn(gl, 'deleteBuffer');
    const deleteTextureSpy = vi.spyOn(gl, 'deleteTexture');
    
    const data = new ArrayBuffer(1024);
    resourceManager.createBuffer(BufferType.VERTEX, data);
    resourceManager.createTexture(256, 256, TextureFormat.RGBA8);
    
    resourceManager.dispose();
    
    expect(deleteBufferSpy).toHaveBeenCalled();
    expect(deleteTextureSpy).toHaveBeenCalled();
  });

  test('should respect pool limits', () => {
    const config: ResourcePoolConfig = {
      maxBuffers: 2,
      maxTextures: 1,
      maxMemoryMB: 1,
      gcThresholdMB: 0.5
    };
    
    const limitedManager = new WebGLResourceManager(gl, config);
    
    // Create more buffers than the limit
    const data = new ArrayBuffer(1024);
    const buffer1 = limitedManager.createBuffer(BufferType.VERTEX, data);
    const buffer2 = limitedManager.createBuffer(BufferType.VERTEX, data);
    const buffer3 = limitedManager.createBuffer(BufferType.VERTEX, data);
    
    limitedManager.releaseResource(buffer1);
    limitedManager.releaseResource(buffer2);
    limitedManager.releaseResource(buffer3);
    
    const stats = limitedManager.getStats();
    expect(stats.pooledResources).toBeLessThanOrEqual(config.maxBuffers);
    
    limitedManager.dispose();
  });
});