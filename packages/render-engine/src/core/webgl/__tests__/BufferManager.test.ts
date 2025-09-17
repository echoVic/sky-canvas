import {
  BufferManager,
  Buffer,
  VertexArray,
  BufferType,
  BufferUsage,
  WebGLConstants,
  IVertexLayout,
  IVertexAttribute
} from '../BufferManager';

// Mock WebGL context
const createMockWebGLContext = (): WebGLRenderingContext => {
  const mockBuffer = {};
  const mockVAO = {};
  
  return {
    createBuffer: () => mockBuffer,
    deleteBuffer: () => {},
    bindBuffer: () => {},
    bufferData: () => {},
    bufferSubData: () => {},
    getExtension: (name: string) => {
      if (name === 'OES_vertex_array_object') {
        return {
          createVertexArrayOES: () => mockVAO,
          deleteVertexArrayOES: () => {},
          bindVertexArrayOES: () => {},
          isVertexArrayOES: () => true
        };
      }
      return null;
    },
    enableVertexAttribArray: () => {},
    disableVertexAttribArray: () => {},
    vertexAttribPointer: () => {},
    getAttribLocation: () => 0,
    drawElements: () => {},
    drawArrays: () => {},
    ARRAY_BUFFER: WebGLConstants.ARRAY_BUFFER,
    ELEMENT_ARRAY_BUFFER: WebGLConstants.ELEMENT_ARRAY_BUFFER,
    STATIC_DRAW: WebGLConstants.STATIC_DRAW,
    DYNAMIC_DRAW: WebGLConstants.DYNAMIC_DRAW,
    STREAM_DRAW: WebGLConstants.STREAM_DRAW,
    UNSIGNED_SHORT: WebGLConstants.UNSIGNED_SHORT,
    FLOAT: 0x1406
  } as any;
};

describe('Buffer', () => {
  let mockGL: WebGLRenderingContext;
  let buffer: Buffer;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    buffer = new Buffer(mockGL, BufferType.VERTEX, BufferUsage.STATIC);
  });

  afterEach(() => {
    buffer.dispose(mockGL);
  });

  describe('基本功能', () => {
    it('应该正确创建缓冲区', () => {
      expect(buffer).toBeDefined();
      expect(buffer.id).toBeDefined();
      expect(buffer.type).toBe(BufferType.VERTEX);
      expect(buffer.usage).toBe(BufferUsage.STATIC);
      expect(buffer.isValid).toBe(true);
    });

    it('应该有正确的初始大小', () => {
      expect(buffer.size).toBe(0);
    });

    it('应该能够绑定和解绑', () => {
      expect(() => {
        buffer.bind(mockGL);
        buffer.unbind(mockGL);
      }).not.toThrow();
    });
  });

  describe('数据操作', () => {
    it('应该能够上传数据', () => {
      const data = new Float32Array([1, 2, 3, 4]);
      
      expect(() => {
        buffer.uploadData(mockGL, data);
      }).not.toThrow();
    });

    it('应该能够更新数据', () => {
      const initialData = new Float32Array([1, 2, 3, 4]);
      const updateData = new Float32Array([5, 6]);
      
      expect(() => {
        buffer.uploadData(mockGL, initialData);
        buffer.updateData(mockGL, updateData, 0);
      }).not.toThrow();
    });
  });

  describe('生命周期管理', () => {
    it('应该能够正确释放资源', () => {
      expect(() => {
        buffer.dispose(mockGL);
      }).not.toThrow();
      
      expect(buffer.isValid).toBe(false);
    });
  });
});

describe('VertexArray', () => {
  let mockGL: WebGLRenderingContext;
  let vertexBuffer: Buffer;
  let indexBuffer: Buffer;
  let vertexArray: VertexArray;
  let layout: IVertexLayout;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    vertexBuffer = new Buffer(mockGL, BufferType.VERTEX, BufferUsage.STATIC);
    indexBuffer = new Buffer(mockGL, BufferType.INDEX, BufferUsage.STATIC);
    
    layout = {
      stride: 12,
      attributes: [
        {
          name: 'position',
          size: 3,
          type: 0x1406, // FLOAT
          normalized: false,
          offset: 0
        }
      ]
    };
    
    const vaoExt = mockGL.getExtension('OES_vertex_array_object') as OES_vertex_array_object;
    vertexArray = new VertexArray(mockGL, vaoExt, vertexBuffer, layout, indexBuffer);
  });

  afterEach(() => {
    const vaoExt = mockGL.getExtension('OES_vertex_array_object') as OES_vertex_array_object;
    vertexArray.dispose(mockGL, vaoExt);
    vertexBuffer.dispose(mockGL);
    indexBuffer.dispose(mockGL);
  });

  describe('基本功能', () => {
    it('应该正确创建顶点数组', () => {
      expect(vertexArray).toBeDefined();
      expect(vertexArray.id).toBeDefined();
      expect(vertexArray.vertexBuffer).toBe(vertexBuffer);
      expect(vertexArray.indexBuffer).toBe(indexBuffer);
      expect(vertexArray.layout).toBe(layout);
      expect(vertexArray.isValid).toBe(true);
    });

    it('应该能够绑定和解绑', () => {
      const vaoExt = mockGL.getExtension('OES_vertex_array_object') as OES_vertex_array_object;
      
      expect(() => {
        vertexArray.bind(mockGL, vaoExt);
        vertexArray.unbind(mockGL, vaoExt);
      }).not.toThrow();
    });
  });

  describe('属性设置', () => {
    it('应该能够设置顶点属性', () => {
      const mockProgram = {} as WebGLProgram;
      
      expect(() => {
        vertexArray.setupAttributes(mockGL, mockProgram);
      }).not.toThrow();
    });
  });

  describe('绘制操作', () => {
    it('应该能够执行绘制', () => {
      expect(() => {
        vertexArray.draw(mockGL, 4, 6); // TRIANGLES, 6 vertices
      }).not.toThrow();
    });

    it('应该能够带偏移绘制', () => {
      expect(() => {
        vertexArray.draw(mockGL, 4, 6, 2);
      }).not.toThrow();
    });
  });

  describe('生命周期管理', () => {
    it('应该能够正确释放资源', () => {
      const vaoExt = mockGL.getExtension('OES_vertex_array_object') as OES_vertex_array_object;
      
      expect(() => {
        vertexArray.dispose(mockGL, vaoExt);
      }).not.toThrow();
      
      expect(vertexArray.isValid).toBe(false);
    });
  });
});

describe('BufferManager', () => {
  let mockGL: WebGLRenderingContext;
  let bufferManager: BufferManager;

  beforeEach(() => {
    mockGL = createMockWebGLContext();
    bufferManager = new BufferManager(mockGL);
  });

  afterEach(() => {
    bufferManager.dispose();
  });

  describe('基本功能', () => {
    it('应该正确创建缓冲区管理器', () => {
      expect(bufferManager).toBeDefined();
    });

    it('应该能够创建缓冲区', () => {
      const buffer = bufferManager.createBuffer(BufferType.VERTEX);
      expect(buffer).toBeDefined();
      expect(buffer.type).toBe(BufferType.VERTEX);
    });

    it('应该能够创建不同类型的缓冲区', () => {
      const vertexBuffer = bufferManager.createBuffer(BufferType.VERTEX, BufferUsage.STATIC);
      const indexBuffer = bufferManager.createBuffer(BufferType.INDEX, BufferUsage.DYNAMIC);
      
      expect(vertexBuffer.type).toBe(BufferType.VERTEX);
      expect(vertexBuffer.usage).toBe(BufferUsage.STATIC);
      expect(indexBuffer.type).toBe(BufferType.INDEX);
      expect(indexBuffer.usage).toBe(BufferUsage.DYNAMIC);
    });
  });

  describe('顶点数组管理', () => {
    it('应该能够创建顶点数组', () => {
      const vertexBuffer = bufferManager.createBuffer(BufferType.VERTEX);
      const layout: IVertexLayout = {
        stride: 12,
        attributes: [
          {
            name: 'position',
            size: 3,
            type: 0x1406, // FLOAT
            normalized: false,
            offset: 0
          }
        ]
      };
      
      const vertexArray = bufferManager.createVertexArray(vertexBuffer, layout);
      expect(vertexArray).toBeDefined();
      expect(vertexArray.vertexBuffer).toBe(vertexBuffer);
      expect(vertexArray.layout).toBe(layout);
    });

    it('应该能够创建带索引缓冲区的顶点数组', () => {
      const vertexBuffer = bufferManager.createBuffer(BufferType.VERTEX);
      const indexBuffer = bufferManager.createBuffer(BufferType.INDEX);
      const layout: IVertexLayout = {
        stride: 12,
        attributes: [
          {
            name: 'position',
            size: 3,
            type: 0x1406,
            normalized: false,
            offset: 0
          }
        ]
      };
      
      const vertexArray = bufferManager.createVertexArray(vertexBuffer, layout, indexBuffer);
      expect(vertexArray.indexBuffer).toBe(indexBuffer);
    });
  });

  describe('资源查找', () => {
    it('应该能够通过ID查找缓冲区', () => {
      const buffer = bufferManager.createBuffer(BufferType.VERTEX);
      const foundBuffer = bufferManager.getBuffer(buffer.id);
      expect(foundBuffer).toBe(buffer);
    });

    it('应该能够通过ID查找顶点数组', () => {
      const vertexBuffer = bufferManager.createBuffer(BufferType.VERTEX);
      const layout: IVertexLayout = {
        stride: 12,
        attributes: [{
          name: 'position',
          size: 3,
          type: 0x1406,
          normalized: false,
          offset: 0
        }]
      };
      
      const vertexArray = bufferManager.createVertexArray(vertexBuffer, layout);
      const foundVertexArray = bufferManager.getVertexArray(vertexArray.id);
      expect(foundVertexArray).toBe(vertexArray);
    });

    it('查找不存在的资源应该返回null', () => {
      expect(bufferManager.getBuffer('non-existent')).toBeNull();
      expect(bufferManager.getVertexArray('non-existent')).toBeNull();
    });
  });

  describe('资源删除', () => {
    it('应该能够删除缓冲区', () => {
      const buffer = bufferManager.createBuffer(BufferType.VERTEX);
      const bufferId = buffer.id;
      
      bufferManager.deleteBuffer(bufferId);
      expect(bufferManager.getBuffer(bufferId)).toBeNull();
    });

    it('应该能够删除顶点数组', () => {
      const vertexBuffer = bufferManager.createBuffer(BufferType.VERTEX);
      const layout: IVertexLayout = {
        stride: 12,
        attributes: [{
          name: 'position',
          size: 3,
          type: 0x1406,
          normalized: false,
          offset: 0
        }]
      };
      
      const vertexArray = bufferManager.createVertexArray(vertexBuffer, layout);
      const vaoId = vertexArray.id;
      
      bufferManager.deleteVertexArray(vaoId);
      expect(bufferManager.getVertexArray(vaoId)).toBeNull();
    });
  });

  describe('统计信息', () => {
    it('应该提供正确的统计信息', () => {
      const stats = bufferManager.getStats();
      expect(stats).toBeDefined();
      expect(typeof stats.bufferCount).toBe('number');
      expect(typeof stats.vaoCount).toBe('number');
      expect(typeof stats.totalMemory).toBe('number');
    });

    it('创建资源后统计信息应该更新', () => {
      const statsBefore = bufferManager.getStats();
      
      bufferManager.createBuffer(BufferType.VERTEX);
      const statsAfter = bufferManager.getStats();
      
      expect(statsAfter.bufferCount).toBe(statsBefore.bufferCount + 1);
    });
  });

  describe('生命周期管理', () => {
    it('应该能够正确释放所有资源', () => {
      // 创建一些资源
      bufferManager.createBuffer(BufferType.VERTEX);
      bufferManager.createBuffer(BufferType.INDEX);
      
      expect(() => {
        bufferManager.dispose();
      }).not.toThrow();
      
      const stats = bufferManager.getStats();
      expect(stats.bufferCount).toBe(0);
      expect(stats.vaoCount).toBe(0);
    });
  });
});