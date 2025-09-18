import { describe, it, expect } from 'vitest';

// Test all exports from the batch core module
describe('Batch Core Module Exports', () => {
  describe('Type Exports', () => {
    it('should export interface types from IBatchRenderer', async () => {
      const coreModule = await import('../index');
      
      // These are type exports, so we can't test them directly at runtime
      // But we can verify the module imports without errors
      expect(coreModule).toBeDefined();
    });

    it('should export interface types from IBatchStrategy', async () => {
      const coreModule = await import('../index');
      
      // These are type exports, so we can't test them directly at runtime
      // But we can verify the module imports without errors
      expect(coreModule).toBeDefined();
    });
  });

  describe('BatchData Exports', () => {
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
  });

  describe('BatchManager Exports', () => {
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

  describe('Module Structure', () => {
    it('should export all expected members', async () => {
      const coreModule = await import('../index');
      
      const expectedExports = [
        'BatchBuffer',
        'BatchDataUtils',
        'BatchManager',
        'createBatchManager'
      ];
      
      expectedExports.forEach(exportName => {
        expect(coreModule).toHaveProperty(exportName);
        expect((coreModule as any)[exportName]).toBeDefined();
      });
    });

    it('should not export unexpected members', async () => {
      const coreModule = await import('../index');
      
      // Get all exported keys (excluding type-only exports)
      const exportedKeys = Object.keys(coreModule);
      
      const expectedExports = [
        'BatchBuffer',
        'BatchDataUtils',
        'BatchManager',
        'createBatchManager'
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
        BatchManager
      } = await import('../index');
      
      const constructors = [
        BatchBuffer,
        BatchManager
      ];
      
      constructors.forEach(Constructor => {
        expect(typeof Constructor).toBe('function');
        expect(Constructor.prototype).toBeDefined();
      });
    });

    it('should export factory functions', async () => {
      const { createBatchManager } = await import('../index');
      
      expect(typeof createBatchManager).toBe('function');
    });

    it('should export utility objects', async () => {
      const { BatchDataUtils } = await import('../index');
      
      expect(typeof BatchDataUtils).toBe('function');
    });
  });

  describe('Import Consistency', () => {
    it('should maintain consistent exports across multiple imports', async () => {
      const import1 = await import('../index');
      const import2 = await import('../index');
      
      // Should be the same references (module caching)
      expect(import1.BatchManager).toBe(import2.BatchManager);
      expect(import1.BatchBuffer).toBe(import2.BatchBuffer);
      expect(import1.BatchDataUtils).toBe(import2.BatchDataUtils);
      expect(import1.createBatchManager).toBe(import2.createBatchManager);
    });

    it('should allow destructured imports', async () => {
      const {
        BatchManager,
        BatchBuffer,
        BatchDataUtils,
        createBatchManager
      } = await import('../index');
      
      expect(BatchManager).toBeDefined();
      expect(BatchBuffer).toBeDefined();
      expect(BatchDataUtils).toBeDefined();
      expect(createBatchManager).toBeDefined();
    });

    it('should allow namespace imports', async () => {
      const CoreModule = await import('../index');
      
      expect(CoreModule.BatchManager).toBeDefined();
      expect(CoreModule.BatchBuffer).toBeDefined();
      expect(CoreModule.BatchDataUtils).toBeDefined();
      expect(CoreModule.createBatchManager).toBeDefined();
    });
  });

  describe('Re-export Validation', () => {
    it('should properly re-export from BatchData module', async () => {
      const { BatchBuffer, BatchDataUtils } = await import('../index');
      const { 
        BatchBuffer: DataBatchBuffer, 
        BatchDataUtils: DataBatchDataUtils 
      } = await import('../BatchData');
      
      expect(BatchBuffer).toBe(DataBatchBuffer);
      expect(BatchDataUtils).toBe(DataBatchDataUtils);
    });

    it('should properly re-export from BatchManager module', async () => {
      const { BatchManager, createBatchManager } = await import('../index');
      const { 
        BatchManager: ManagerBatchManager,
        createBatchManager: ManagerCreateBatchManager
      } = await import('../BatchManager');
      
      expect(BatchManager).toBe(ManagerBatchManager);
      expect(createBatchManager).toBe(ManagerCreateBatchManager);
    });
  });

  describe('Module Loading Performance', () => {
    it('should load module efficiently', async () => {
      const startTime = performance.now();
      
      await import('../index');
      
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      // Module should load quickly (less than 50ms)
      expect(loadTime).toBeLessThan(50);
    });

    it('should handle multiple concurrent imports', async () => {
      const importPromises = Array.from({ length: 5 }, () => import('../index'));
      
      const results = await Promise.all(importPromises);
      
      // All imports should resolve to the same module
      results.forEach(result => {
        expect(result.BatchManager).toBe(results[0].BatchManager);
        expect(result.BatchBuffer).toBe(results[0].BatchBuffer);
      });
    });
  });

  describe('Tree Shaking Support', () => {
    it('should support selective imports for tree shaking', async () => {
      // Test that individual exports can be imported
      const { BatchManager } = await import('../index');
      const { BatchBuffer } = await import('../index');
      const { BatchDataUtils } = await import('../index');
      const { createBatchManager } = await import('../index');
      
      expect(BatchManager).toBeDefined();
      expect(BatchBuffer).toBeDefined();
      expect(BatchDataUtils).toBeDefined();
      expect(createBatchManager).toBeDefined();
    });
  });

  describe('Type Safety', () => {
    it('should provide proper TypeScript types', async () => {
      const {
        BatchManager,
        BatchBuffer,
        BatchDataUtils,
        createBatchManager
      } = await import('../index');
      
      // Test that exports have expected types
      expect(typeof BatchManager).toBe('function');
      expect(typeof BatchBuffer).toBe('function');
      expect(typeof BatchDataUtils).toBe('function');
      expect(typeof createBatchManager).toBe('function');
    });

    it('should maintain type information for interfaces', async () => {
      // This test verifies that type exports don't cause runtime errors
      const coreModule = await import('../index');
      
      // Type exports should not appear in runtime object
      expect(coreModule).not.toHaveProperty('BatchStats');
      expect(coreModule).not.toHaveProperty('IBatchRenderer');
      expect(coreModule).not.toHaveProperty('IRenderable');
      expect(coreModule).not.toHaveProperty('BatchContext');
      expect(coreModule).not.toHaveProperty('BatchData');
      expect(coreModule).not.toHaveProperty('IBatchStrategy');
    });
  });

  describe('Module Dependencies', () => {
    it('should properly handle internal dependencies', async () => {
      // Test that the module can be imported without circular dependency issues
      const coreModule = await import('../index');
      
      expect(coreModule).toBeDefined();
      expect(Object.keys(coreModule).length).toBeGreaterThan(0);
    });

    it('should not expose internal implementation details', async () => {
      const coreModule = await import('../index');
      
      // Should only export public API
      const exportedKeys = Object.keys(coreModule);
      const publicExports = [
        'BatchBuffer',
        'BatchDataUtils',
        'BatchManager',
        'createBatchManager'
      ];
      
      expect(exportedKeys).toEqual(expect.arrayContaining(publicExports));
      expect(exportedKeys.length).toBe(publicExports.length);
    });
  });

  describe('API Consistency', () => {
    it('should maintain consistent API surface', async () => {
      const coreModule = await import('../index');
      
      // Verify that all expected exports are present and have correct types
      expect(typeof coreModule.BatchManager).toBe('function');
      expect(typeof coreModule.BatchBuffer).toBe('function');
      expect(typeof coreModule.BatchDataUtils).toBe('function');
      expect(typeof coreModule.createBatchManager).toBe('function');
    });

    it('should provide stable export names', async () => {
      const coreModule = await import('../index');
      
      // Export names should be consistent
      const expectedNames = [
        'BatchBuffer',
        'BatchDataUtils', 
        'BatchManager',
        'createBatchManager'
      ].sort();
      
      const actualNames = Object.keys(coreModule).sort();
      
      expect(actualNames).toEqual(expectedNames);
    });
  });
});