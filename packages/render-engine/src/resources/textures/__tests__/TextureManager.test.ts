/**
 * TextureManager 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WebGLTextureManager,
  WebGLTexture,
  TextureAtlas,
  TextureFilter,
  TextureWrap,
  TextureFormat,
  TextureOptions,
  TextureInfo,
  AtlasEntry
} from '../TextureManager';

// Mock WebGL context
const createMockWebGLContext = () => {
  const mockTexture = {} as globalThis.WebGLTexture;
  
  return {
    createTexture: vi.fn().mockReturnValue(mockTexture),
    deleteTexture: vi.fn(),
    bindTexture: vi.fn(),
    texImage2D: vi.fn(),
    texSubImage2D: vi.fn(),
    texParameteri: vi.fn(),
    generateMipmap: vi.fn(),
    pixelStorei: vi.fn(),
    getError: vi.fn().mockReturnValue(0), // GL_NO_ERROR
    TEXTURE_2D: 0x0DE1,
    TEXTURE_MIN_FILTER: 0x2801,
    TEXTURE_MAG_FILTER: 0x2800,
    TEXTURE_WRAP_S: 0x2802,
    TEXTURE_WRAP_T: 0x2803,
    NEAREST: 0x2600,
    LINEAR: 0x2601,
    NEAREST_MIPMAP_NEAREST: 0x2700,
    LINEAR_MIPMAP_LINEAR: 0x2703,
    CLAMP_TO_EDGE: 0x812F,
    REPEAT: 0x2901,
    MIRRORED_REPEAT: 0x8370,
    RGB: 0x1907,
    RGBA: 0x1908,
    ALPHA: 0x1906,
    LUMINANCE: 0x1909,
    LUMINANCE_ALPHA: 0x190A,
    UNSIGNED_BYTE: 0x1401,
    UNPACK_FLIP_Y_WEBGL: 0x9240,
    UNPACK_PREMULTIPLY_ALPHA_WEBGL: 0x9241
  } as unknown as WebGLRenderingContext;
};

// Mock Image
class MockImage {
  src = '';
  width = 100;
  height = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor() {
    // Simulate async loading
    setTimeout(() => {
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }
}

// Mock Canvas
const createMockCanvas = (width = 100, height = 100) => {
  return {
    width,
    height,
    getContext: vi.fn().mockReturnValue(createMockWebGLContext())
  } as unknown as HTMLCanvasElement;
};

// Mock ImageData
const createMockImageData = (width = 100, height = 100) => {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4)
  } as ImageData;
};

describe('WebGLTexture', () => {
  let gl: WebGLRenderingContext;
  let mockTexture: globalThis.WebGLTexture;

  beforeEach(() => {
    gl = createMockWebGLContext();
    mockTexture = {} as globalThis.WebGLTexture;
  });

  describe('Given a WebGLTexture instance', () => {
    describe('When creating with valid parameters', () => {
      it('Then it should initialize with correct properties', () => {
        // Arrange
        const id = 'test-texture';
        const width = 256;
        const height = 256;
        const format = TextureFormat.RGBA;

        // Act
        const texture = new WebGLTexture(gl, id, mockTexture, width, height, format);

        // Assert
        expect(texture.id).toBe(id);
        expect(texture.texture).toBe(mockTexture);
        expect(texture.info.width).toBe(width);
        expect(texture.info.height).toBe(height);
        expect(texture.info.format).toBe(format);
        expect(texture.info.refCount).toBe(1);
        expect(texture.info.size).toBe(width * height * 4); // RGBA = 4 bytes per pixel
      });
    });

    describe('When managing reference count', () => {
      it('Then it should increment reference count on addRef', () => {
        // Arrange
        const texture = new WebGLTexture(gl, 'test', mockTexture, 100, 100);
        const initialRefCount = texture.info.refCount;

        // Act
        texture.addRef();

        // Assert
        expect(texture.info.refCount).toBe(initialRefCount + 1);
      });

      it('Then it should decrement reference count on release', () => {
        // Arrange
        const texture = new WebGLTexture(gl, 'test', mockTexture, 100, 100);
        texture.addRef(); // Increase to 2
        const currentRefCount = texture.info.refCount;

        // Act
        texture.release();

        // Assert
        expect(texture.info.refCount).toBe(currentRefCount - 1);
      });

      it('Then it should not go below zero reference count', () => {
        // Arrange
        const texture = new WebGLTexture(gl, 'test', mockTexture, 100, 100);
        
        // Act
        texture.release(); // Should go to 0
        texture.release(); // Should stay at 0

        // Assert
        expect(texture.info.refCount).toBe(0);
      });

      it('Then it should report unused when reference count is zero', () => {
        // Arrange
        const texture = new WebGLTexture(gl, 'test', mockTexture, 100, 100);

        // Act
        texture.release();

        // Assert
        expect(texture.isUnused()).toBe(true);
      });
    });
  });
});

describe('TextureAtlas', () => {
  let gl: WebGLRenderingContext;
  let atlas: TextureAtlas;

  beforeEach(() => {
    gl = createMockWebGLContext();
    atlas = new TextureAtlas(gl, 512);
  });

  afterEach(() => {
    atlas.dispose();
  });

  describe('Given a TextureAtlas instance', () => {
    describe('When creating with default size', () => {
      it('Then it should initialize with correct size', () => {
        // Arrange & Act
        const defaultAtlas = new TextureAtlas(gl);

        // Assert
        expect(defaultAtlas.getTexture()).toBeDefined();
        
        // Cleanup
        defaultAtlas.dispose();
      });
    });

    describe('When adding textures', () => {
      it('Then it should add texture and return atlas entry', () => {
        // Arrange
        const textureId = 'test-texture';
        const imageData = createMockImageData(64, 64);

        // Act
        const entry = atlas.addTexture(textureId, imageData);

        // Assert
        expect(entry).toBeDefined();
        expect(entry!.textureId).toBe(textureId);
        expect(entry!.width).toBe(64);
        expect(entry!.height).toBe(64);
        expect(entry!.x).toBe(0);
        expect(entry!.y).toBe(0);
      });

      it('Then it should position textures correctly in atlas', () => {
        // Arrange
        const imageData1 = createMockImageData(64, 64);
        const imageData2 = createMockImageData(32, 32);

        // Act
        const entry1 = atlas.addTexture('texture1', imageData1);
        const entry2 = atlas.addTexture('texture2', imageData2);

        // Assert
        expect(entry1!.x).toBe(0);
        expect(entry1!.y).toBe(0);
        expect(entry2!.x).toBe(64); // Should be placed next to first texture
        expect(entry2!.y).toBe(0);
      });

      it('Then it should handle textures that do not fit', () => {
        // Arrange
        const largeImageData = createMockImageData(600, 600); // Larger than atlas size

        // Act
        const entry = atlas.addTexture('large-texture', largeImageData);

        // Assert
        expect(entry).toBeNull();
      });

      it('Then it should handle duplicate texture IDs', () => {
        // Arrange
        const textureId = 'duplicate-texture';
        const imageData = createMockImageData(32, 32);
        const firstEntry = atlas.addTexture(textureId, imageData);

        // Act
        const duplicateEntry = atlas.addTexture(textureId, imageData);

        // Assert - Current implementation overwrites existing entries
        expect(firstEntry).not.toBeNull();
        expect(duplicateEntry).not.toBeNull();
        expect(atlas.getEntry(textureId)).toBe(duplicateEntry);
      });
    });

    describe('When retrieving entries', () => {
      it('Then it should return existing entry', () => {
        // Arrange
        const textureId = 'test-texture';
        const imageData = createMockImageData(32, 32);
        atlas.addTexture(textureId, imageData);

        // Act
        const entry = atlas.getEntry(textureId);

        // Assert
        expect(entry).toBeDefined();
        expect(entry!.textureId).toBe(textureId);
      });

      it('Then it should return undefined for non-existing entry', () => {
        // Arrange
        const nonExistingId = 'non-existing';

        // Act
        const entry = atlas.getEntry(nonExistingId);

        // Assert
        expect(entry).toBeUndefined();
      });
    });

    describe('When clearing atlas', () => {
      it('Then it should remove all entries', () => {
        // Arrange
        const imageData = createMockImageData(32, 32);
        atlas.addTexture('texture1', imageData);
        atlas.addTexture('texture2', imageData);

        // Act
        atlas.clear();

        // Assert
        expect(atlas.getEntry('texture1')).toBeUndefined();
        expect(atlas.getEntry('texture2')).toBeUndefined();
      });
    });
  });
});

describe('WebGLTextureManager', () => {
  let gl: WebGLRenderingContext;
  let textureManager: WebGLTextureManager;

  beforeEach(() => {
    gl = createMockWebGLContext();
    textureManager = new WebGLTextureManager(gl);
    
    // Mock global Image constructor
    global.Image = MockImage as any;
  });

  afterEach(() => {
    textureManager.dispose();
    vi.clearAllMocks();
  });

  describe('Given a WebGLTextureManager instance', () => {
    describe('When loading textures from URL', () => {
      it('Then it should load texture successfully', async () => {
        // Arrange
        const textureId = 'test-texture';
        const textureUrl = 'https://example.com/texture.png';
        const options: TextureOptions = {
          filter: TextureFilter.LINEAR,
          wrap: TextureWrap.REPEAT
        };

        // Act
        const texture = await textureManager.loadTexture(textureId, textureUrl, options);

        // Assert
        expect(texture).toBeDefined();
        expect(texture.id).toBe(textureId);
        expect(gl.createTexture).toHaveBeenCalled();
        expect(gl.bindTexture).toHaveBeenCalled();
        expect(gl.texImage2D).toHaveBeenCalled();
      });

      it('Then it should return cached texture for duplicate requests', async () => {
        // Arrange
        const textureId = 'cached-texture';
        const textureUrl = 'https://example.com/texture.png';

        // Act
        const texture1 = await textureManager.loadTexture(textureId, textureUrl);
        const texture2 = await textureManager.loadTexture(textureId, textureUrl);

        // Assert
        expect(texture1).toBe(texture2);
        expect(texture1.info.refCount).toBe(2);
      });

      it('Then it should handle concurrent loading requests', async () => {
        // Arrange
        const textureId = 'concurrent-texture';
        const textureUrl = 'https://example.com/texture.png';

        // Act
        const [texture1, texture2] = await Promise.all([
          textureManager.loadTexture(textureId, textureUrl),
          textureManager.loadTexture(textureId, textureUrl)
        ]);

        // Assert
        expect(texture1).toBe(texture2);
        expect(texture1.info.refCount).toBe(2);
      });
    });

    describe('When loading textures from ImageData', () => {
      it('Then it should create texture from ImageData', async () => {
        // Arrange
        const textureId = 'imagedata-texture';
        const imageData = createMockImageData(128, 128);
        const options: TextureOptions = {
          format: TextureFormat.RGBA,
          generateMipmaps: true
        };

        // Act
        const texture = await textureManager.loadTexture(textureId, imageData, options);

        // Assert
        expect(texture).toBeDefined();
        expect(texture.id).toBe(textureId);
        expect(texture.info.width).toBe(128);
        expect(texture.info.height).toBe(128);
        expect(gl.generateMipmap).toHaveBeenCalled();
      });
    });

    describe('When loading textures from Canvas', () => {
      it('Then it should create texture from Canvas', async () => {
        // Arrange
        const textureId = 'canvas-texture';
        const canvas = createMockCanvas(256, 256);
        const options: TextureOptions = {
          flipY: true,
          premultiplyAlpha: false
        };

        // Act
        const texture = await textureManager.loadTexture(textureId, canvas, options);

        // Assert
        expect(texture).toBeDefined();
        expect(texture.id).toBe(textureId);
        expect(texture.info.width).toBe(256);
        expect(texture.info.height).toBe(256);
      });
    });

    describe('When retrieving textures', () => {
      it('Then it should return existing texture', async () => {
        // Arrange
        const textureId = 'existing-texture';
        const imageData = createMockImageData(64, 64);
        await textureManager.loadTexture(textureId, imageData);

        // Act
        const texture = textureManager.getTexture(textureId);

        // Assert
        expect(texture).toBeDefined();
        expect(texture!.id).toBe(textureId);
      });

      it('Then it should return undefined for non-existing texture', () => {
        // Arrange
        const nonExistingId = 'non-existing-texture';

        // Act
        const texture = textureManager.getTexture(nonExistingId);

        // Assert
        expect(texture).toBeUndefined();
      });
    });

    describe('When releasing textures', () => {
      it('Then it should decrease reference count', async () => {
        // Arrange
        const textureId = 'release-texture';
        const imageData = createMockImageData(64, 64);
        const texture = await textureManager.loadTexture(textureId, imageData);
        const initialRefCount = texture.info.refCount;

        // Act
        textureManager.releaseTexture(textureId);

        // Assert
        expect(texture.info.refCount).toBe(initialRefCount - 1);
      });

      it('Then it should remove texture when reference count reaches zero', async () => {
        // Arrange
        const textureId = 'remove-texture';
        const imageData = createMockImageData(64, 64);
        await textureManager.loadTexture(textureId, imageData);

        // Act
        textureManager.releaseTexture(textureId);

        // Assert
        expect(textureManager.getTexture(textureId)).toBeUndefined();
        expect(gl.deleteTexture).toHaveBeenCalled();
      });

      it('Then it should handle releasing non-existing texture gracefully', () => {
        // Arrange
        const nonExistingId = 'non-existing';

        // Act & Assert
        expect(() => {
          textureManager.releaseTexture(nonExistingId);
        }).not.toThrow();
      });
    });

    describe('When managing texture atlases', () => {
      it('Then it should create texture atlas', () => {
        // Arrange
        const atlasId = 'test-atlas';
        const atlasSize = 1024;

        // Act
        const atlas = textureManager.createAtlas(atlasId, atlasSize);

        // Assert
        expect(atlas).toBeDefined();
        expect(atlas.getTexture()).toBeDefined();
      });

      it('Then it should return existing atlas', () => {
        // Arrange
        const atlasId = 'existing-atlas';
        const createdAtlas = textureManager.createAtlas(atlasId);

        // Act
        const retrievedAtlas = textureManager.getAtlas(atlasId);

        // Assert
        expect(retrievedAtlas).toBe(createdAtlas);
      });

      it('Then it should return undefined for non-existing atlas', () => {
        // Arrange
        const nonExistingId = 'non-existing-atlas';

        // Act
        const atlas = textureManager.getAtlas(nonExistingId);

        // Assert
        expect(atlas).toBeUndefined();
      });
    });

    describe('When managing memory usage', () => {
      it('Then it should track memory usage correctly', async () => {
        // Arrange
        const imageData = createMockImageData(256, 256); // 256KB
        
        // Act
        await textureManager.loadTexture('memory-test', imageData);
        const stats = textureManager.getStats();

        // Assert
        expect(stats.memoryUsage).toBeGreaterThan(0);
        expect(stats.textureCount).toBe(1);
      });

      it('Then it should cleanup unused textures when memory limit exceeded', async () => {
        // Arrange
        const largeImageData = createMockImageData(1024, 1024); // 4MB
        
        // Load multiple large textures to exceed memory limit
        for (let i = 0; i < 100; i++) {
          await textureManager.loadTexture(`large-texture-${i}`, largeImageData);
          textureManager.releaseTexture(`large-texture-${i}`);
        }

        // Act
        textureManager.cleanup();
        const stats = textureManager.getStats();

        // Assert
        expect(stats.textureCount).toBeLessThan(100);
      });
    });

    describe('When getting statistics', () => {
      it('Then it should return correct statistics', async () => {
        // Arrange
        const imageData = createMockImageData(128, 128);
        await textureManager.loadTexture('stats-texture', imageData);
        textureManager.createAtlas('stats-atlas');

        // Act
        const stats = textureManager.getStats();

        // Assert
        expect(stats.textureCount).toBe(1);
        expect(stats.atlasCount).toBe(1);
        expect(stats.memoryUsage).toBeGreaterThan(0);
      });
    });

    describe('When disposing manager', () => {
      it('Then it should cleanup all resources', async () => {
        // Arrange
        const imageData = createMockImageData(64, 64);
        await textureManager.loadTexture('dispose-texture', imageData);
        textureManager.createAtlas('dispose-atlas');

        // Act
        textureManager.dispose();
        const stats = textureManager.getStats();

        // Assert
        expect(stats.textureCount).toBe(0);
        expect(stats.atlasCount).toBe(0);
        expect(stats.memoryUsage).toBe(0);
      });
    });
  });

  describe('Given error handling scenarios', () => {
    describe('When WebGL operations fail', () => {
      it('Then it should handle texture creation failure gracefully', async () => {
        // Arrange
        vi.mocked(gl.createTexture).mockReturnValue(null as any);
        const imageData = createMockImageData(64, 64);

        // Act & Assert
        await expect(
          textureManager.loadTexture('fail-texture', imageData)
        ).rejects.toThrow();
      });
    });

    describe('When loading invalid images', () => {
      it('Then it should handle image loading errors', async () => {
        // Arrange
        global.Image = class {
          src = '';
          width = 100;
          height = 100;
          onload: (() => void) | null = null;
          onerror: ((error?: any) => void) | null = null;
          
          constructor() {
            // Simulate async loading with error for invalid URLs
            setTimeout(() => {
              if (this.src.includes('invalid')) {
                if (this.onerror) {
                  this.onerror(new Error('Image load failed'));
                }
              } else {
                if (this.onload) {
                  this.onload();
                }
              }
            }, 10);
          }
        } as any;

        // Act & Assert
        await expect(
          textureManager.loadTexture('invalid-texture', 'invalid-url')
        ).rejects.toThrow();
      });
    });
  });
});