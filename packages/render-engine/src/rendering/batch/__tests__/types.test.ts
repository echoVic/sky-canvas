import { describe, it, expect } from 'vitest';
import type { RenderBatch } from '../types';

describe('Batch Types', () => {
  describe('RenderBatch Interface', () => {
    it('should define RenderBatch interface correctly', () => {
      const mockRenderBatch: RenderBatch = {
        id: 'batch-001',
        pipeline: 'basic-pipeline',
        vertexBuffer: new ArrayBuffer(1024),
        indexBuffer: new ArrayBuffer(512),
        uniforms: {
          uProjection: new Float32Array(16),
          uTime: 1.0,
          uColor: [1.0, 0.0, 0.0, 1.0]
        },
        instanceCount: 100,
        primitiveCount: 200
      };

      expect(mockRenderBatch.id).toBe('batch-001');
      expect(mockRenderBatch.pipeline).toBe('basic-pipeline');
      expect(mockRenderBatch.vertexBuffer).toBeInstanceOf(ArrayBuffer);
      expect(mockRenderBatch.indexBuffer).toBeInstanceOf(ArrayBuffer);
      expect(mockRenderBatch.uniforms).toBeDefined();
      expect(mockRenderBatch.instanceCount).toBe(100);
      expect(mockRenderBatch.primitiveCount).toBe(200);
    });

    it('should allow optional indexBuffer', () => {
      const batchWithoutIndex: RenderBatch = {
        id: 'batch-002',
        pipeline: 'instanced-pipeline',
        vertexBuffer: new ArrayBuffer(2048),
        uniforms: {
          uModelMatrix: new Float32Array(16)
        },
        instanceCount: 50,
        primitiveCount: 150
      };

      expect(batchWithoutIndex.indexBuffer).toBeUndefined();
      expect(batchWithoutIndex.vertexBuffer).toBeInstanceOf(ArrayBuffer);
    });

    it('should support different uniform types', () => {
      const batchWithVariousUniforms: RenderBatch = {
        id: 'batch-003',
        pipeline: 'complex-pipeline',
        vertexBuffer: new ArrayBuffer(4096),
        uniforms: {
          // Single number
          uTime: 42.5,
          // Number array
          uLightPositions: [1.0, 2.0, 3.0, 4.0, 5.0, 6.0],
          // Float32Array
          uTransformMatrix: new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
          ]),
          // Mixed types
          uAlpha: 0.8,
          uColors: [0.2, 0.4, 0.6, 0.8, 1.0]
        },
        instanceCount: 25,
        primitiveCount: 75
      };

      expect(typeof batchWithVariousUniforms.uniforms.uTime).toBe('number');
      expect(Array.isArray(batchWithVariousUniforms.uniforms.uLightPositions)).toBe(true);
      expect(batchWithVariousUniforms.uniforms.uTransformMatrix).toBeInstanceOf(Float32Array);
      expect(typeof batchWithVariousUniforms.uniforms.uAlpha).toBe('number');
      expect(Array.isArray(batchWithVariousUniforms.uniforms.uColors)).toBe(true);
    });

    it('should handle empty uniforms object', () => {
      const batchWithEmptyUniforms: RenderBatch = {
        id: 'batch-004',
        pipeline: 'minimal-pipeline',
        vertexBuffer: new ArrayBuffer(256),
        uniforms: {},
        instanceCount: 1,
        primitiveCount: 2
      };

      expect(Object.keys(batchWithEmptyUniforms.uniforms)).toHaveLength(0);
    });

    it('should support large buffer sizes', () => {
      const largeBatch: RenderBatch = {
        id: 'batch-large',
        pipeline: 'high-poly-pipeline',
        vertexBuffer: new ArrayBuffer(1024 * 1024), // 1MB
        indexBuffer: new ArrayBuffer(512 * 1024), // 512KB
        uniforms: {
          uDetailLevel: 10,
          uLODMatrix: new Float32Array(64) // Large uniform array
        },
        instanceCount: 10000,
        primitiveCount: 50000
      };

      expect(largeBatch.vertexBuffer.byteLength).toBe(1024 * 1024);
      expect(largeBatch.indexBuffer?.byteLength).toBe(512 * 1024);
      expect(largeBatch.instanceCount).toBe(10000);
      expect(largeBatch.primitiveCount).toBe(50000);
    });

    it('should handle string IDs of various formats', () => {
      const batches: RenderBatch[] = [
        {
          id: 'simple-id',
          pipeline: 'test',
          vertexBuffer: new ArrayBuffer(100),
          uniforms: {},
          instanceCount: 1,
          primitiveCount: 1
        },
        {
          id: 'batch_with_underscores',
          pipeline: 'test',
          vertexBuffer: new ArrayBuffer(100),
          uniforms: {},
          instanceCount: 1,
          primitiveCount: 1
        },
        {
          id: 'batch-with-dashes-123',
          pipeline: 'test',
          vertexBuffer: new ArrayBuffer(100),
          uniforms: {},
          instanceCount: 1,
          primitiveCount: 1
        },
        {
          id: 'UPPERCASE_BATCH_ID',
          pipeline: 'test',
          vertexBuffer: new ArrayBuffer(100),
          uniforms: {},
          instanceCount: 1,
          primitiveCount: 1
        },
        {
          id: 'batch.with.dots',
          pipeline: 'test',
          vertexBuffer: new ArrayBuffer(100),
          uniforms: {},
          instanceCount: 1,
          primitiveCount: 1
        }
      ];

      batches.forEach(batch => {
        expect(typeof batch.id).toBe('string');
        expect(batch.id.length).toBeGreaterThan(0);
      });
    });

    it('should handle various pipeline names', () => {
      const pipelineNames = [
        'basic',
        'instanced',
        'enhanced',
        'particle-system',
        'post-processing',
        'shadow-mapping',
        'deferred-rendering',
        'forward-plus'
      ];

      pipelineNames.forEach(pipelineName => {
        const batch: RenderBatch = {
          id: `batch-${pipelineName}`,
          pipeline: pipelineName,
          vertexBuffer: new ArrayBuffer(100),
          uniforms: {},
          instanceCount: 1,
          primitiveCount: 1
        };

        expect(batch.pipeline).toBe(pipelineName);
      });
    });

    it('should handle zero counts', () => {
      const emptyBatch: RenderBatch = {
        id: 'empty-batch',
        pipeline: 'empty-pipeline',
        vertexBuffer: new ArrayBuffer(0),
        uniforms: {},
        instanceCount: 0,
        primitiveCount: 0
      };

      expect(emptyBatch.instanceCount).toBe(0);
      expect(emptyBatch.primitiveCount).toBe(0);
      expect(emptyBatch.vertexBuffer.byteLength).toBe(0);
    });

    it('should support complex uniform structures', () => {
      const complexBatch: RenderBatch = {
        id: 'complex-uniforms',
        pipeline: 'advanced-pipeline',
        vertexBuffer: new ArrayBuffer(1024),
        uniforms: {
          // Matrices
          uModelMatrix: new Float32Array(16),
          uViewMatrix: new Float32Array(16),
          uProjectionMatrix: new Float32Array(16),
          uNormalMatrix: new Float32Array(9),
          
          // Lighting
          uLightCount: 4,
          uLightPositions: new Float32Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
          uLightColors: new Float32Array([1, 1, 1, 0.8, 0.8, 1, 1, 0.8, 0.8, 0.9, 0.9, 0.9]),
          
          // Material properties
          uMaterialAmbient: [0.2, 0.2, 0.2],
          uMaterialDiffuse: [0.8, 0.8, 0.8],
          uMaterialSpecular: [1.0, 1.0, 1.0],
          uMaterialShininess: 32.0,
          
          // Animation
          uTime: 0.0,
          uDeltaTime: 0.016,
          uFrameCount: 0,
          
          // Texture samplers (represented as integers)
          uDiffuseTexture: 0,
          uNormalTexture: 1,
          uSpecularTexture: 2,
          uEnvironmentTexture: 3
        },
        instanceCount: 100,
        primitiveCount: 300
      };

      expect(Object.keys(complexBatch.uniforms)).toHaveLength(18);
      expect(complexBatch.uniforms.uModelMatrix).toBeInstanceOf(Float32Array);
      expect(Array.isArray(complexBatch.uniforms.uMaterialAmbient)).toBe(true);
      expect(typeof complexBatch.uniforms.uMaterialShininess).toBe('number');
    });
  });

  describe('Type Safety', () => {
    it('should enforce required properties', () => {
      // This test ensures TypeScript compilation catches missing properties
      const validBatch: RenderBatch = {
        id: 'test',
        pipeline: 'test',
        vertexBuffer: new ArrayBuffer(100),
        uniforms: {},
        instanceCount: 1,
        primitiveCount: 1
      };

      expect(validBatch).toBeDefined();
    });

    it('should allow proper uniform value types', () => {
      const batch: RenderBatch = {
        id: 'type-test',
        pipeline: 'test',
        vertexBuffer: new ArrayBuffer(100),
        uniforms: {
          numberUniform: 42,
          arrayUniform: [1, 2, 3, 4],
          float32Uniform: new Float32Array([1, 2, 3, 4])
        },
        instanceCount: 1,
        primitiveCount: 1
      };

      expect(typeof batch.uniforms.numberUniform).toBe('number');
      expect(Array.isArray(batch.uniforms.arrayUniform)).toBe(true);
      expect(batch.uniforms.float32Uniform).toBeInstanceOf(Float32Array);
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should handle sprite batch scenario', () => {
      const spriteBatch: RenderBatch = {
        id: 'sprite-batch-001',
        pipeline: 'sprite-pipeline',
        vertexBuffer: new ArrayBuffer(4 * 4 * 100 * 4), // 100 sprites, 4 vertices each, 4 floats per vertex
        indexBuffer: new ArrayBuffer(6 * 100 * 2), // 100 sprites, 6 indices each, 2 bytes per index
        uniforms: {
          uProjectionMatrix: new Float32Array(16),
          uTextureAtlas: 0,
          uTime: 0.0
        },
        instanceCount: 100,
        primitiveCount: 200 // 2 triangles per sprite
      };

      expect(spriteBatch.vertexBuffer.byteLength).toBe(6400);
      expect(spriteBatch.indexBuffer?.byteLength).toBe(1200);
    });

    it('should handle particle system scenario', () => {
      const particleBatch: RenderBatch = {
        id: 'particle-system-001',
        pipeline: 'particle-pipeline',
        vertexBuffer: new ArrayBuffer(1000 * 3 * 4), // 1000 particles, 3 floats per particle (position)
        uniforms: {
          uProjectionMatrix: new Float32Array(16),
          uViewMatrix: new Float32Array(16),
          uTime: 0.0,
          uGravity: [0, -9.81, 0],
          uParticleSize: 2.0,
          uParticleTexture: 0
        },
        instanceCount: 1000,
        primitiveCount: 1000 // 1 point per particle
      };

      expect(particleBatch.instanceCount).toBe(1000);
      expect(particleBatch.primitiveCount).toBe(1000);
    });

    it('should handle instanced rendering scenario', () => {
      const instancedBatch: RenderBatch = {
        id: 'instanced-cubes',
        pipeline: 'instanced-pipeline',
        vertexBuffer: new ArrayBuffer(8 * 3 * 4), // 8 vertices for cube, 3 floats per vertex
        indexBuffer: new ArrayBuffer(36 * 2), // 36 indices for cube faces
        uniforms: {
          uProjectionMatrix: new Float32Array(16),
          uViewMatrix: new Float32Array(16),
          uInstanceTransforms: new Float32Array(16 * 500), // 500 instance transforms
          uInstanceColors: new Float32Array(4 * 500), // 500 instance colors
          uLightDirection: [1, 1, 1]
        },
        instanceCount: 500,
        primitiveCount: 12 * 500 // 12 triangles per cube * 500 instances
      };

      expect(instancedBatch.instanceCount).toBe(500);
      expect(instancedBatch.primitiveCount).toBe(6000);
    });
  });
});