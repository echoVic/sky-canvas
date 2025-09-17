import { describe, it, expect } from 'vitest';

// Test all exports from the batch module
describe('Batch Module Exports', () => {
  describe('Type Exports', () => {
    it('should export core types', async () => {
      const batchModule = await import('../index');
      
      // These are type exports, so we can't test them directly at runtime
      // But we can verify the module imports without errors
      expect(batchModule).toBeDefined();
    });
  });

  describe('Core Class Exports', () => {
    it('should export BatchBuffer', async () => {
      const { BatchBuffer } = await import('../index');
      
      expect(BatchBuffer).toBeDefined();
      expect(typeof BatchBuffer).toBe('function'); // Constructor function
    });

    it('should export BatchDataUtils', async () => {
      const { BatchDataUtils } = await import('../index');
      
      expect(BatchDataUtils).toBeDefined();
      expect(typeof BatchDataUtils).toBe('function');
    });

    it('should export BatchManager', async () => {
      const { BatchManager } = await import('../index');
      
      expect(BatchManager).toBeDefined();
      expect(typeof BatchManager).toBe('function'); // Constructor function
    });

    it('should export createBatchManager', async () => {
      const { createBatchManager } = await import('../index');
      
      expect(createBatchManager).toBeDefined();
      expect(typeof createBatchManager).toBe('function');
    });
  });

  describe('Strategy Exports', () => {
    it('should export BasicStrategy', async () => {
      const { BasicStrategy } = await import('../index');
      
      expect(BasicStrategy).toBeDefined();
      expect(typeof BasicStrategy).toBe('function'); // Constructor function
    });

    it('should export EnhancedStrategy', async () => {
      const { EnhancedStrategy } = await import('../index');
      
      expect(EnhancedStrategy).toBeDefined();
      expect(typeof EnhancedStrategy).toBe('function'); // Constructor function
    });

    it('should export InstancedStrategy', async () => {
      const { InstancedStrategy } = await import('../index');
      
      expect(InstancedStrategy).toBeDefined();
      expect(typeof InstancedStrategy).toBe('function'); // Constructor function
    });
  });

  describe('Utility Exports', () => {
    it('should export BatchOptimizer', async () => {
      const { BatchOptimizer } = await import('../index');
      
      expect(BatchOptimizer).toBeDefined();
      expect(typeof BatchOptimizer).toBe('function'); // Constructor function
    });

    it('should export OptimizationType', async () => {
      const { OptimizationType } = await import('../index');
      
      expect(OptimizationType).toBeDefined();
      expect(typeof OptimizationType).toBe('object'); // Enum object
    });
  });

  describe('Factory Function Exports', () => {
    it('should export createBasicBatchManager', async () => {
      const { createBasicBatchManager } = await import('../index');
      
      expect(createBasicBatchManager).toBeDefined();
      expect(typeof createBasicBatchManager).toBe('function');
    });

    it('should export createEnhancedBatchManager', async () => {
      const { createEnhancedBatchManager } = await import('../index');
      
      expect(createEnhancedBatchManager).toBeDefined();
      expect(typeof createEnhancedBatchManager).toBe('function');
    });

    it('should export createInstancedBatchManager', async () => {
      const { createInstancedBatchManager } = await import('../index');
      
      expect(createInstancedBatchManager).toBeDefined();
      expect(typeof createInstancedBatchManager).toBe('function');
    });

    it('should export createBatchManagerWithDefaultStrategies', async () => {
      const { createBatchManagerWithDefaultStrategies } = await import('../index');
      
      expect(createBatchManagerWithDefaultStrategies).toBeDefined();
      expect(typeof createBatchManagerWithDefaultStrategies).toBe('function');
    });
  });

  describe('Module Structure', () => {
    it('should export all expected members', async () => {
      const batchModule = await import('../index');
      
      const expectedExports = [
        // Core classes
        'BatchBuffer',
        'BatchDataUtils',
        'BatchManager',
        'createBatchManager',
        
        // Strategies
        'BasicStrategy',
        'EnhancedStrategy',
        'InstancedStrategy',
        
        // Utils
        'BatchOptimizer',
        'OptimizationType',
        
        // Factory functions
        'createBasicBatchManager',
        'createEnhancedBatchManager',
        'createInstancedBatchManager',
        'createBatchManagerWithDefaultStrategies'
      ];
      
      expectedExports.forEach(exportName => {
        expect(batchModule).toHaveProperty(exportName);
        expect((batchModule as any)[exportName]).toBeDefined();
      });
    });

    it('should not export unexpected members', async () => {
      const batchModule = await import('../index');
      
      // Get all exported keys
      const exportedKeys = Object.keys(batchModule);
      
      const expectedExports = [
        'BatchBuffer',
        'BatchDataUtils',
        'BatchManager',
        'createBatchManager',
        'BasicStrategy',
        'EnhancedStrategy',
        'InstancedStrategy',
        'BatchOptimizer',
        'OptimizationType',
        'createBasicBatchManager',
        'createEnhancedBatchManager',
        'createInstancedBatchManager',
        'createBatchManagerWithDefaultStrategies'
      ];
      
      // Check that we don't have unexpected exports
      exportedKeys.forEach(key => {
        expect(expectedExports).toContain(key);
      });
    });
  });

  describe('Export Types', () => {
    it('should export constructor functions for classes', async () => {
      const {
        BatchBuffer,
        BatchManager,
        BasicStrategy,
        EnhancedStrategy,
        InstancedStrategy,
        BatchOptimizer
      } = await import('../index');
      
      const constructors = [
        BatchBuffer,
        BatchManager,
        BasicStrategy,
        EnhancedStrategy,
        InstancedStrategy,
        BatchOptimizer
      ];
      
      constructors.forEach(Constructor => {
        expect(typeof Constructor).toBe('function');
        expect(Constructor.prototype).toBeDefined();
      });
    });

    it('should export factory functions', async () => {
      const {
        createBatchManager,
        createBasicBatchManager,
        createEnhancedBatchManager,
        createInstancedBatchManager,
        createBatchManagerWithDefaultStrategies
      } = await import('../index');
      
      const factories = [
        createBatchManager,
        createBasicBatchManager,
        createEnhancedBatchManager,
        createInstancedBatchManager,
        createBatchManagerWithDefaultStrategies
      ];
      
      factories.forEach(factory => {
        expect(typeof factory).toBe('function');
      });
    });

    it('should export utility objects and enums', async () => {
      const {
        BatchDataUtils,
        OptimizationType
      } = await import('../index');
      
      expect(typeof BatchDataUtils).toBe('function');
      expect(typeof OptimizationType).toBe('object');
    });
  });

  describe('Import Consistency', () => {
    it('should maintain consistent exports across multiple imports', async () => {
      const import1 = await import('../index');
      const import2 = await import('../index');
      
      // Should be the same references (module caching)
      expect(import1.BatchManager).toBe(import2.BatchManager);
      expect(import1.BasicStrategy).toBe(import2.BasicStrategy);
      expect(import1.BatchOptimizer).toBe(import2.BatchOptimizer);
    });

    it('should allow destructured imports', async () => {
      const {
        BatchManager,
        BasicStrategy,
        BatchOptimizer,
        createBasicBatchManager
      } = await import('../index');
      
      expect(BatchManager).toBeDefined();
      expect(BasicStrategy).toBeDefined();
      expect(BatchOptimizer).toBeDefined();
      expect(createBasicBatchManager).toBeDefined();
    });

    it('should allow namespace imports', async () => {
      const BatchModule = await import('../index');
      
      expect(BatchModule.BatchManager).toBeDefined();
      expect(BatchModule.BasicStrategy).toBeDefined();
      expect(BatchModule.BatchOptimizer).toBeDefined();
      expect(BatchModule.createBasicBatchManager).toBeDefined();
    });
  });

  describe('Re-export Validation', () => {
    it('should properly re-export from core module', async () => {
      const { BatchManager } = await import('../index');
      const { BatchManager: CoreBatchManager } = await import('../core');
      
      expect(BatchManager).toBe(CoreBatchManager);
    });

    it('should properly re-export from strategies module', async () => {
      const { BasicStrategy } = await import('../index');
      const { BasicStrategy: StrategiesBasicStrategy } = await import('../strategies');
      
      expect(BasicStrategy).toBe(StrategiesBasicStrategy);
    });

    it('should properly re-export from utils module', async () => {
      const { BatchOptimizer } = await import('../index');
      const { BatchOptimizer: UtilsBatchOptimizer } = await import('../utils');
      
      expect(BatchOptimizer).toBe(UtilsBatchOptimizer);
    });

    it('should properly re-export from BatchFactory', async () => {
      const { createBasicBatchManager } = await import('../index');
      const { createBasicBatchManager: FactoryCreateBasicBatchManager } = await import('../BatchFactory');
      
      expect(createBasicBatchManager).toBe(FactoryCreateBasicBatchManager);
    });
  });

  describe('Module Loading Performance', () => {
    it('should load module efficiently', async () => {
      const startTime = performance.now();
      
      await import('../index');
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Module should load quickly (less than 100ms)
      expect(loadTime).toBeLessThan(100);
    });

    it('should handle multiple concurrent imports', async () => {
      const importPromises = Array.from({ length: 10 }, () => import('../index'));
      
      const results = await Promise.all(importPromises);
      
      // All imports should resolve to the same module
      results.forEach(result => {
        expect(result.BatchManager).toBe(results[0].BatchManager);
      });
    });
  });

  describe('Tree Shaking Support', () => {
    it('should support selective imports for tree shaking', async () => {
      // Test that individual exports can be imported
      const { BatchManager } = await import('../index');
      const { BasicStrategy } = await import('../index');
      const { BatchOptimizer } = await import('../index');
      
      expect(BatchManager).toBeDefined();
      expect(BasicStrategy).toBeDefined();
      expect(BatchOptimizer).toBeDefined();
    });
  });
});