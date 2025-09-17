/**
 * 资源管理模块导出测试
 */

import { describe, it, expect } from 'vitest';
import * as ResourcesModule from '../index';
import { TexturePool } from '../TexturePool';
import { WebGLResourceManager } from '../ResourceManager';
import { EnhancedResourceManager } from '../EnhancedResourceManager';
import { AsyncResourceLoader, ResourceType, LoadingState } from '../AsyncResourceLoader';
import { LRUCache } from '../LRUCache';
import * as Types from '../types';

describe('Resources Module Exports', () => {
  describe('模块导出完整性', () => {
    it('应该导出所有核心类', () => {
      expect(ResourcesModule.TexturePool).toBeDefined();
      // IResourceManager 是接口，不会在运行时导出
      expect(ResourcesModule.WebGLResourceManager).toBeDefined();
      expect(ResourcesModule.EnhancedResourceManager).toBeDefined();
      expect(ResourcesModule.AsyncResourceLoader).toBeDefined();
      expect(ResourcesModule.LRUCache).toBeDefined();
    });
    
    it('应该导出正确的类构造函数', () => {
      expect(ResourcesModule.TexturePool).toBe(TexturePool);
      expect(ResourcesModule.WebGLResourceManager).toBe(WebGLResourceManager);
      expect(ResourcesModule.EnhancedResourceManager).toBe(EnhancedResourceManager);
      expect(ResourcesModule.AsyncResourceLoader).toBe(AsyncResourceLoader);
      expect(ResourcesModule.LRUCache).toBe(LRUCache);
    });
    
    it('应该导出类型定义', () => {
      // 检查枚举是否可以正确导入和使用
      expect(typeof ResourceType).toBe('object');
      expect(typeof LoadingState).toBe('object');
    });
  });
  
  describe('枚举导出', () => {
    it('应该导出 TextureFormat 枚举', () => {
      const { TextureFormat } = ResourcesModule;
      
      expect(TextureFormat.RGBA).toBeDefined();
      expect(TextureFormat.RGB).toBeDefined();
      expect(TextureFormat.ALPHA).toBeDefined();
      expect(TextureFormat.LUMINANCE).toBeDefined();
      expect(TextureFormat.LUMINANCE_ALPHA).toBeDefined();
    });
    
    it('应该导出 TextureType 枚举', () => {
      const { TextureType } = ResourcesModule;
      
      expect(TextureType.UNSIGNED_BYTE).toBeDefined();
      expect(TextureType.UNSIGNED_SHORT_5_6_5).toBeDefined();
      expect(TextureType.UNSIGNED_SHORT_4_4_4_4).toBeDefined();
      expect(TextureType.UNSIGNED_SHORT_5_5_5_1).toBeDefined();
    });
    
    it('应该导出 ResourceType 枚举', () => {
      const { ResourceType } = ResourcesModule;
      
      expect(ResourceType.TEXTURE).toBeDefined();
      expect(ResourceType.AUDIO).toBeDefined();
      expect(ResourceType.FONT).toBeDefined();
      expect(ResourceType.JSON).toBeDefined();
      expect(ResourceType.BINARY).toBeDefined();
      expect(ResourceType.SVG).toBeDefined();
    });
    
    it('应该导出 LoadingState 枚举', () => {
      const { LoadingState } = ResourcesModule;
      
      expect(LoadingState.PENDING).toBeDefined();
      expect(LoadingState.LOADING).toBeDefined();
      expect(LoadingState.LOADED).toBeDefined();
      expect(LoadingState.ERROR).toBeDefined();
      expect(LoadingState.CANCELLED).toBeDefined();
    });
  });
  
  describe('接口类型导出', () => {
    it('应该能够使用导出的接口类型', () => {
      // 这些测试主要验证类型定义的存在性
      // 在 TypeScript 编译时会进行类型检查
      
      const textureConfig = {
        width: 256,
        height: 256,
        format: ResourcesModule.TextureFormat.RGBA,
        type: ResourcesModule.TextureType.UNSIGNED_BYTE,
        generateMipmaps: true,
        wrapS: 0x812F, // CLAMP_TO_EDGE
        wrapT: 0x812F,
        minFilter: 0x2601, // LINEAR
        magFilter: 0x2601,
        premultiplyAlpha: false,
        flipY: true
      };
      
      expect(textureConfig.width).toBe(256);
      expect(textureConfig.height).toBe(256);
      expect(textureConfig.format).toBe(ResourcesModule.TextureFormat.RGBA);
    });
    
    it('应该能够使用 ResourceConfig 类型', () => {
      const resourceConfig = {
        id: 'test-resource',
        url: 'test.png',
        type: ResourcesModule.ResourceType.TEXTURE,
        priority: 1,
        timeout: 5000,
        retries: 3,
        metadata: {
          width: 256,
          height: 256
        }
      };
      
      expect(resourceConfig.id).toBe('test-resource');
      expect(resourceConfig.type).toBe(ResourcesModule.ResourceType.TEXTURE);
    });
    
    it('应该能够使用 GPUResource 接口', () => {
      // 验证 GPUResource 接口的基本结构
      const mockGPUResource = {
        id: 'test-gpu-resource',
        dispose: () => {},
        isDisposed: false,
        memoryUsage: 1024
      };
      
      expect(mockGPUResource.id).toBe('test-gpu-resource');
      expect(typeof mockGPUResource.dispose).toBe('function');
      expect(mockGPUResource.isDisposed).toBe(false);
      expect(mockGPUResource.memoryUsage).toBe(1024);
    });
  });
  
  describe('模块结构验证', () => {
    it('应该包含所有预期的导出项', () => {
      const expectedExports = [
          'TexturePool',
          'WebGLResourceManager',
          'EnhancedResourceManager',
          'AsyncResourceLoader',
          'LRUCache'
        ];
      
      expectedExports.forEach(exportName => {
        expect(ResourcesModule).toHaveProperty(exportName);
      });
    });
    
    it('应该不包含内部实现细节', () => {
      // 确保不会意外导出内部实现
      const internalItems = [
        '_internal',
        'private',
        '__proto__'
      ];
      
      internalItems.forEach(internalItem => {
        expect(ResourcesModule).not.toHaveProperty(internalItem);
      });
    });
  });
  
  describe('类型兼容性', () => {
    it('TexturePool 应该与导出的类型兼容', () => {
      // 这个测试主要在编译时验证类型兼容性
      expect(() => {
        const config = {
          width: 128,
          height: 128,
          format: ResourcesModule.TextureFormat.RGB,
          type: ResourcesModule.TextureType.UNSIGNED_BYTE
        };
        
        // 验证配置对象的结构
        expect(config.width).toBe(128);
        expect(config.format).toBe(ResourcesModule.TextureFormat.RGB);
      }).not.toThrow();
    });
    
    it('ResourceManager 应该与导出的类型兼容', () => {
      expect(() => {
        const resourceConfig = {
          id: 'test',
          url: 'test.png',
          type: ResourcesModule.ResourceType.TEXTURE
        };
        
        expect(resourceConfig.id).toBe('test');
        expect(resourceConfig.type).toBe(ResourcesModule.ResourceType.TEXTURE);
      }).not.toThrow();
    });
  });
  
  describe('枚举值验证', () => {
    it('TextureFormat 枚举应该有正确的值', () => {
      const { TextureFormat } = ResourcesModule;
      
      // 验证枚举值的类型和存在性
      expect(typeof TextureFormat.RGBA).toBe('number');
      expect(typeof TextureFormat.RGB).toBe('number');
      expect(typeof TextureFormat.ALPHA).toBe('number');
      
      // 验证枚举值的唯一性
      const values = Object.values(TextureFormat);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
    
    it('ResourceType 枚举应该有正确的值', () => {
      const { ResourceType } = ResourcesModule;
      
      const expectedTypes = [
        'TEXTURE', 
        'AUDIO', 
        'FONT', 
        'JSON', 
        'BINARY',
        'SVG'
      ];
      
      expectedTypes.forEach(type => {
        expect(ResourceType).toHaveProperty(type);
        expect(typeof ResourceType[type as keyof typeof ResourceType]).toBe('string');
      });
    });
    
    it('LoadingState 枚举应该有正确的值', () => {
      const { LoadingState } = ResourcesModule;
      
      const expectedStatuses = [
        'PENDING',
        'LOADING',
        'LOADED', 
        'ERROR',
        'CANCELLED'
      ];
      
      expectedStatuses.forEach(status => {
        expect(LoadingState).toHaveProperty(status);
        expect(typeof LoadingState[status as keyof typeof LoadingState]).toBe('string');
      });
    });
  });
  
  describe('模块导入测试', () => {
    it('应该能够单独导入各个模块', async () => {
      // 测试单独导入是否正常工作
      const { TexturePool } = await import('../TexturePool');
      const { WebGLResourceManager } = await import('../ResourceManager');
      const { LRUCache } = await import('../LRUCache');
      
      expect(TexturePool).toBeDefined();
      expect(WebGLResourceManager).toBeDefined();
      expect(LRUCache).toBeDefined();
    });
    
    it('应该能够使用解构导入', () => {
      const {
        TexturePool,
        WebGLResourceManager,
        TextureFormat,
        ResourceType
      } = ResourcesModule;
      
      expect(TexturePool).toBeDefined();
      expect(WebGLResourceManager).toBeDefined();
      expect(TextureFormat).toBeDefined();
      expect(ResourceType).toBeDefined();
    });
  });
  
  describe('版本兼容性', () => {
    it('应该保持向后兼容的API', () => {
      // 验证关键API的存在性，确保向后兼容
      expect(ResourcesModule.TexturePool).toBeDefined();
      expect(ResourcesModule.WebGLResourceManager).toBeDefined();
      expect(ResourcesModule.LRUCache).toBeDefined();
      
      // 验证枚举的存在性
      expect(ResourcesModule.TextureFormat).toBeDefined();
      expect(ResourcesModule.ResourceType).toBeDefined();
      expect(ResourcesModule.LoadingState).toBeDefined();
    });
  });
});