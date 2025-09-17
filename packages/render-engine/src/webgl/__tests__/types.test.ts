/**
 * WebGL Types 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { describe, expect, it } from 'vitest';
import {
  ShaderType,
  BufferType,
  BlendMode,
  type VertexAttribute,
  type VertexLayout,
  type ShaderSource,
  type UniformDescriptor,
  type PipelineState,
  type Buffer,
  type Shader,
  type RenderPipeline
} from '../types';

describe('WebGL Types', () => {
  describe('Enums', () => {
    describe('ShaderType', () => {
      describe('Given ShaderType enum', () => {
        it('Then should have correct vertex shader type', () => {
          // Arrange & Act: 获取顶点着色器类型
          const vertexType = ShaderType.VERTEX;

          // Assert: 验证类型值
          expect(vertexType).toBe('vertex');
        });

        it('Then should have correct fragment shader type', () => {
          // Arrange & Act: 获取片段着色器类型
          const fragmentType = ShaderType.FRAGMENT;

          // Assert: 验证类型值
          expect(fragmentType).toBe('fragment');
        });

        it('Then should have correct compute shader type', () => {
          // Arrange & Act: 获取计算着色器类型
          const computeType = ShaderType.COMPUTE;

          // Assert: 验证类型值
          expect(computeType).toBe('compute');
        });

        it('Then should have all expected shader types', () => {
          // Arrange: 获取所有着色器类型
          const expectedTypes = ['vertex', 'fragment', 'compute'];
          const actualTypes = Object.values(ShaderType);

          // Act & Assert: 验证包含所有预期类型
          expectedTypes.forEach(type => {
            expect(actualTypes).toContain(type);
          });
          expect(actualTypes).toHaveLength(3);
        });
      });
    });

    describe('BufferType', () => {
      describe('Given BufferType enum', () => {
        it('Then should have correct vertex buffer type', () => {
          // Arrange & Act: 获取顶点缓冲区类型
          const vertexType = BufferType.VERTEX;

          // Assert: 验证类型值
          expect(vertexType).toBe('vertex');
        });

        it('Then should have correct index buffer type', () => {
          // Arrange & Act: 获取索引缓冲区类型
          const indexType = BufferType.INDEX;

          // Assert: 验证类型值
          expect(indexType).toBe('index');
        });

        it('Then should have correct uniform buffer type', () => {
          // Arrange & Act: 获取统一缓冲区类型
          const uniformType = BufferType.UNIFORM;

          // Assert: 验证类型值
          expect(uniformType).toBe('uniform');
        });

        it('Then should have correct storage buffer type', () => {
          // Arrange & Act: 获取存储缓冲区类型
          const storageType = BufferType.STORAGE;

          // Assert: 验证类型值
          expect(storageType).toBe('storage');
        });

        it('Then should have all expected buffer types', () => {
          // Arrange: 获取所有缓冲区类型
          const expectedTypes = ['vertex', 'index', 'uniform', 'storage'];
          const actualTypes = Object.values(BufferType);

          // Act & Assert: 验证包含所有预期类型
          expectedTypes.forEach(type => {
            expect(actualTypes).toContain(type);
          });
          expect(actualTypes).toHaveLength(4);
        });
      });
    });

    describe('BlendMode', () => {
      describe('Given BlendMode enum', () => {
        it('Then should have correct normal blend mode', () => {
          // Arrange & Act: 获取正常混合模式
          const normalMode = BlendMode.NORMAL;

          // Assert: 验证模式值
          expect(normalMode).toBe('normal');
        });

        it('Then should have correct add blend mode', () => {
          // Arrange & Act: 获取加法混合模式
          const addMode = BlendMode.ADD;

          // Assert: 验证模式值
          expect(addMode).toBe('add');
        });

        it('Then should have correct multiply blend mode', () => {
          // Arrange & Act: 获取乘法混合模式
          const multiplyMode = BlendMode.MULTIPLY;

          // Assert: 验证模式值
          expect(multiplyMode).toBe('multiply');
        });

        it('Then should have correct screen blend mode', () => {
          // Arrange & Act: 获取屏幕混合模式
          const screenMode = BlendMode.SCREEN;

          // Assert: 验证模式值
          expect(screenMode).toBe('screen');
        });

        it('Then should have correct overlay blend mode', () => {
          // Arrange & Act: 获取覆盖混合模式
          const overlayMode = BlendMode.OVERLAY;

          // Assert: 验证模式值
          expect(overlayMode).toBe('overlay');
        });

        it('Then should have all expected blend modes', () => {
          // Arrange: 获取所有混合模式
          const expectedModes = ['normal', 'add', 'multiply', 'screen', 'overlay'];
          const actualModes = Object.values(BlendMode);

          // Act & Assert: 验证包含所有预期模式
          expectedModes.forEach(mode => {
            expect(actualModes).toContain(mode);
          });
          expect(actualModes).toHaveLength(5);
        });
      });
    });
  });

  describe('Interface Types', () => {
    describe('VertexAttribute', () => {
      describe('Given VertexAttribute interface', () => {
        it('Then should accept valid vertex attribute object', () => {
          // Arrange: 创建顶点属性对象
          const attribute: VertexAttribute = {
            name: 'position',
            location: 0,
            format: 'float32x3',
            offset: 0,
            size: 12
          };

          // Act & Assert: 验证对象结构
          expect(attribute.name).toBe('position');
          expect(attribute.location).toBe(0);
          expect(attribute.format).toBe('float32x3');
          expect(attribute.offset).toBe(0);
          expect(attribute.size).toBe(12);
        });

        it('Then should accept texture coordinate attribute', () => {
          // Arrange: 创建纹理坐标属性
          const texCoordAttribute: VertexAttribute = {
            name: 'texCoord',
            location: 1,
            format: 'float32x2',
            offset: 12,
            size: 8
          };

          // Act & Assert: 验证纹理坐标属性
          expect(texCoordAttribute.name).toBe('texCoord');
          expect(texCoordAttribute.location).toBe(1);
          expect(texCoordAttribute.format).toBe('float32x2');
          expect(texCoordAttribute.offset).toBe(12);
          expect(texCoordAttribute.size).toBe(8);
        });
      });
    });

    describe('VertexLayout', () => {
      describe('Given VertexLayout interface', () => {
        it('Then should accept valid vertex layout object', () => {
          // Arrange: 创建顶点布局对象
          const layout: VertexLayout = {
            stride: 20,
            attributes: [
              {
                name: 'position',
                location: 0,
                format: 'float32x3',
                offset: 0,
                size: 12
              },
              {
                name: 'texCoord',
                location: 1,
                format: 'float32x2',
                offset: 12,
                size: 8
              }
            ]
          };

          // Act & Assert: 验证布局结构
          expect(layout.stride).toBe(20);
          expect(layout.attributes).toHaveLength(2);
          expect(layout.attributes[0].name).toBe('position');
          expect(layout.attributes[1].name).toBe('texCoord');
        });
      });
    });

    describe('ShaderSource', () => {
      describe('Given ShaderSource interface', () => {
        it('Then should accept vertex and fragment shaders', () => {
          // Arrange: 创建着色器源码对象
          const shaderSource: ShaderSource = {
            vertex: 'attribute vec3 position; void main() { gl_Position = vec4(position, 1.0); }',
            fragment: 'void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }'
          };

          // Act & Assert: 验证着色器源码
          expect(shaderSource.vertex).toContain('attribute vec3 position');
          expect(shaderSource.fragment).toContain('gl_FragColor');
          expect(shaderSource.compute).toBeUndefined();
        });

        it('Then should accept compute shader optionally', () => {
          // Arrange: 创建包含计算着色器的源码对象
          const shaderSource: ShaderSource = {
            vertex: 'attribute vec3 position; void main() { gl_Position = vec4(position, 1.0); }',
            fragment: 'void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }',
            compute: 'void main() { /* compute shader code */ }'
          };

          // Act & Assert: 验证包含计算着色器
          expect(shaderSource.compute).toBeDefined();
          expect(shaderSource.compute).toContain('compute shader code');
        });
      });
    });

    describe('UniformDescriptor', () => {
      describe('Given UniformDescriptor interface', () => {
        it('Then should accept basic uniform descriptor', () => {
          // Arrange: 创建统一变量描述符
          const uniform: UniformDescriptor = {
            name: 'modelMatrix',
            type: 'mat4',
            size: 64
          };

          // Act & Assert: 验证统一变量描述符
          expect(uniform.name).toBe('modelMatrix');
          expect(uniform.type).toBe('mat4');
          expect(uniform.size).toBe(64);
          expect(uniform.binding).toBeUndefined();
        });

        it('Then should accept uniform descriptor with binding', () => {
          // Arrange: 创建带绑定点的统一变量描述符
          const uniform: UniformDescriptor = {
            name: 'lightData',
            type: 'vec3',
            size: 12,
            binding: 1
          };

          // Act & Assert: 验证带绑定点的统一变量
          expect(uniform.binding).toBe(1);
        });
      });
    });

    describe('PipelineState', () => {
      describe('Given PipelineState interface', () => {
        it('Then should accept complete pipeline state', () => {
          // Arrange: 创建完整的管线状态
          const pipelineState: PipelineState = {
            shader: 'basic-shader',
            vertexLayout: {
              stride: 20,
              attributes: [
                {
                  name: 'position',
                  location: 0,
                  format: 'float32x3',
                  offset: 0,
                  size: 12
                }
              ]
            },
            uniforms: [
              {
                name: 'modelMatrix',
                type: 'mat4',
                size: 64
              }
            ],
            blendMode: BlendMode.NORMAL,
            depthTest: true,
            cullFace: false
          };

          // Act & Assert: 验证管线状态
          expect(pipelineState.shader).toBe('basic-shader');
          expect(pipelineState.vertexLayout.stride).toBe(20);
          expect(pipelineState.uniforms).toHaveLength(1);
          expect(pipelineState.blendMode).toBe(BlendMode.NORMAL);
          expect(pipelineState.depthTest).toBe(true);
          expect(pipelineState.cullFace).toBe(false);
        });
      });
    });
  });

  describe('Interface Contracts', () => {
    describe('Buffer Interface', () => {
      describe('Given Buffer interface contract', () => {
        it('Then should define required properties and methods', () => {
          // Arrange: 创建模拟缓冲区对象
          const mockBuffer: Buffer = {
            id: 'buffer-1',
            type: BufferType.VERTEX,
            data: new ArrayBuffer(100),
            memoryUsage: 100,
            lastUsed: Date.now(),
            dispose: () => {},
            update: (data: ArrayBuffer, offset?: number) => {},
            bind: () => {}
          };

          // Act & Assert: 验证接口契约
          expect(mockBuffer.id).toBeDefined();
          expect(mockBuffer.type).toBe(BufferType.VERTEX);
          expect(mockBuffer.data).toBeInstanceOf(ArrayBuffer);
          expect(typeof mockBuffer.update).toBe('function');
          expect(typeof mockBuffer.bind).toBe('function');
          expect(typeof mockBuffer.dispose).toBe('function');
        });
      });
    });

    describe('Shader Interface', () => {
      describe('Given Shader interface contract', () => {
        it('Then should define required properties and methods', () => {
          // Arrange: 创建模拟着色器对象
          const mockShader: Shader = {
            id: 'shader-1',
            type: ShaderType.VERTEX,
            source: 'attribute vec3 position;',
            compiled: false,
            memoryUsage: 1024,
            lastUsed: Date.now(),
            dispose: () => {},
            compile: async () => true
          };

          // Act & Assert: 验证接口契约
          expect(mockShader.id).toBeDefined();
          expect(mockShader.type).toBe(ShaderType.VERTEX);
          expect(mockShader.source).toBeDefined();
          expect(typeof mockShader.compiled).toBe('boolean');
          expect(typeof mockShader.compile).toBe('function');
          expect(typeof mockShader.dispose).toBe('function');
        });
      });
    });

    describe('RenderPipeline Interface', () => {
      describe('Given RenderPipeline interface contract', () => {
        it('Then should define required properties and methods', () => {
          // Arrange: 创建模拟渲染管线对象
          const mockPipeline: RenderPipeline = {
            id: 'pipeline-1',
            state: {
              shader: 'test-shader',
              vertexLayout: { stride: 12, attributes: [] },
              uniforms: [],
              blendMode: BlendMode.NORMAL,
              depthTest: true,
              cullFace: false
            },
            memoryUsage: 512,
            lastUsed: Date.now(),
            dispose: () => {},
            bind: () => {},
            setUniforms: (uniforms: Record<string, number | number[] | Float32Array>) => {}
          };

          // Act & Assert: 验证接口契约
          expect(mockPipeline.id).toBeDefined();
          expect(mockPipeline.state).toBeDefined();
          expect(typeof mockPipeline.bind).toBe('function');
          expect(typeof mockPipeline.setUniforms).toBe('function');
          expect(typeof mockPipeline.dispose).toBe('function');
        });
      });
    });
  });
});