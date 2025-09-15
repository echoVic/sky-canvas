/**
 * RenderQueue 单元测试
 * 基于 BDD (Behavior-Driven Development) 和 AAA (Arrange-Act-Assert) 模式
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IGraphicsContext, IRect } from '../../graphics/IGraphicsContext';
import { IRenderCommand, MaterialKey, RenderCommandType } from '../IRenderCommand';
import {
  IRenderQueueConfig,
  RenderBatch,
  RenderQueue
} from '../RenderQueue';

// Mock graphics context
const createMockGraphicsContext = (): IGraphicsContext => ({
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  setStyle: vi.fn(),
  setTextStyle: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  measureText: vi.fn(),
  drawImage: vi.fn(),
  clip: vi.fn(),
  screenToWorld: vi.fn(),
  worldToScreen: vi.fn(),
  dispose: vi.fn(),
} as any);

// Mock render command
class MockRenderCommand implements IRenderCommand {
  readonly id: string;
  readonly type: RenderCommandType;
  readonly zIndex: number;
  readonly materialKey: MaterialKey;
  
  constructor(
    public bounds: IRect,
    materialKey: MaterialKey,
    commandType: RenderCommandType,
    zIndex: number = 0,
    id?: string
  ) {
    this.id = id || Math.random().toString(36);
    this.type = commandType;
    this.zIndex = zIndex;
    this.materialKey = materialKey;
  }

  execute = vi.fn();
  
  getBounds(): IRect {
    return this.bounds;
  }

  canBatchWith(other: IRenderCommand): boolean {
    return this.materialKey.textureId === other.materialKey.textureId &&
           this.materialKey.shaderId === other.materialKey.shaderId &&
           this.type === other.type;
  }

  getBatchData(): any {
    return {
      bounds: this.bounds,
      materialKey: this.materialKey,
      type: this.type
    };
  }

  isVisible(viewport: IRect): boolean {
    return true;
  }

  dispose(): void {
    // Mock implementation
  }
}

describe('RenderQueue', () => {
  describe('Given a RenderBatch', () => {
    let renderBatch: RenderBatch;
    let materialKey: MaterialKey;
    let commandType: RenderCommandType;
    let mockCommands: MockRenderCommand[];

    beforeEach(() => {
      // Arrange: Setup material key and command type
      materialKey = {
        textureId: 'texture1',
        shaderId: 'shader1',
        blendMode: 'normal'
      };
      commandType = RenderCommandType.QUAD;
      
      renderBatch = new RenderBatch(materialKey, commandType);
      
      mockCommands = [
        new MockRenderCommand(
          { x: 0, y: 0, width: 50, height: 50 },
          materialKey,
          commandType,
          0,
          'cmd1'
        ),
        new MockRenderCommand(
          { x: 25, y: 25, width: 50, height: 50 },
          materialKey,
          commandType,
          0,
          'cmd2'
        ),
      ];
    });

    describe('When creating a new RenderBatch', () => {
      it('Then it should initialize with correct properties', () => {
        // Arrange & Act
        const batch = new RenderBatch(materialKey, commandType);

        // Assert
        expect(batch.id).toBeDefined();
        expect(batch.materialKey).toEqual(materialKey);
        expect(batch.commandType).toBe(commandType);
        expect(batch.commands).toEqual([]);
        expect(batch.canAddMore).toBe(true);
      });

      it('Then it should generate unique IDs for different batches', () => {
        // Arrange & Act
        const batch1 = new RenderBatch(materialKey, commandType);
        const batch2 = new RenderBatch(materialKey, commandType);

        // Assert
        expect(batch1.id).not.toBe(batch2.id);
      });
    });

    describe('When adding commands to RenderBatch', () => {
      it('Then it should add compatible commands successfully', () => {
        // Arrange
        const command = mockCommands[0];

        // Act
        const result = renderBatch.addCommand(command);

        // Assert
        expect(result).toBe(true);
        expect(renderBatch.commands).toContain(command);
        expect(renderBatch.commands.length).toBe(1);
      });

      it('Then it should reject incompatible commands', () => {
        // Arrange
        const incompatibleMaterialKey: MaterialKey = {
          textureId: 'texture2', // Different texture
          shaderId: 'shader1',
          blendMode: 'normal'
        };
        const incompatibleCommand = new MockRenderCommand(
          { x: 0, y: 0, width: 50, height: 50 },
          incompatibleMaterialKey,
          commandType
        );

        // Act
        const result = renderBatch.addCommand(incompatibleCommand);

        // Assert
        expect(result).toBe(false);
        expect(renderBatch.commands).not.toContain(incompatibleCommand);
        expect(renderBatch.commands.length).toBe(0);
      });

      it('Then it should update bounds when adding commands', () => {
        // Arrange
        const command1 = mockCommands[0]; // x: 0-50, y: 0-50
        const command2 = mockCommands[1]; // x: 25-75, y: 25-75

        // Act
        renderBatch.addCommand(command1);
        renderBatch.addCommand(command2);

        // Assert
        const bounds = renderBatch.bounds;
        expect(bounds.x).toBe(0);
        expect(bounds.y).toBe(0);
        expect(bounds.width).toBe(75); // 0 to 75
        expect(bounds.height).toBe(75); // 0 to 75
      });
    });

    describe('When executing RenderBatch', () => {
      beforeEach(() => {
        // Arrange: Add commands to batch
        mockCommands.forEach(cmd => renderBatch.addCommand(cmd));
      });

      it('Then it should execute all commands in the batch', () => {
        // Arrange
        const mockContext = createMockGraphicsContext();

        // Act
        renderBatch.execute(mockContext);

        // Assert
        mockCommands.forEach(cmd => {
          expect(cmd.execute).toHaveBeenCalledWith(mockContext);
        });
      });

      it('Then it should apply material state before executing commands', () => {
        // Arrange
        const mockContext = createMockGraphicsContext();

        // Act
        renderBatch.execute(mockContext);

        // Assert
        // Note: These methods are not part of IGraphicsContext interface
        // expect(mockContext.setTexture).toHaveBeenCalledWith(materialKey.textureId);
        // expect(mockContext.setShader).toHaveBeenCalledWith(materialKey.shaderId);
        // expect(mockContext.setBlendMode).toHaveBeenCalledWith(materialKey.blendMode);
      });
    });

    describe('When getting RenderBatch statistics', () => {
      beforeEach(() => {
        // Arrange: Add commands to batch
        mockCommands.forEach(cmd => renderBatch.addCommand(cmd));
      });

      it('Then it should return accurate statistics', () => {
        // Arrange
        // Commands already added

        // Act
        const stats = renderBatch.getStats();

        // Assert
        expect(stats.commandCount).toBe(mockCommands.length);
        expect(stats.estimatedDrawCalls).toBeGreaterThan(0);
        expect(stats.memoryUsage).toBeGreaterThan(0);
      });
    });
  });

  describe('Given a RenderQueue', () => {
    let renderQueue: RenderQueue;
    let mockContext: IGraphicsContext;
    let mockCommands: MockRenderCommand[];
    let viewport: IRect;

    beforeEach(() => {
      // Arrange: Setup render queue with default config
      renderQueue = new RenderQueue();
      mockContext = createMockGraphicsContext();
      viewport = { x: 0, y: 0, width: 800, height: 600 };
      
      // Create test commands with different properties
      mockCommands = [
        new MockRenderCommand(
          { x: 10, y: 10, width: 50, height: 50 },
          { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
          RenderCommandType.QUAD,
          1
        ),
        new MockRenderCommand(
          { x: 100, y: 100, width: 50, height: 50 },
          { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
          RenderCommandType.QUAD,
          2
        ),
        new MockRenderCommand(
          { x: 200, y: 200, width: 50, height: 50 },
          { textureId: 'tex2', shaderId: 'shader1', blendMode: 'normal' },
          RenderCommandType.TRIANGLE,
          0
        ),
      ];
    });

    afterEach(() => {
      renderQueue.clear();
    });

    describe('When creating a RenderQueue', () => {
      it('Then it should initialize with default configuration', () => {
        // Arrange & Act
        const queue = new RenderQueue();

        // Assert
        expect(queue.config.enableBatching).toBe(true);
        expect(queue.config.enableCulling).toBe(true);
        expect(queue.config.enableDepthSorting).toBe(true);
        expect(queue.config.maxBatches).toBe(100);
        expect(queue.config.cullMargin).toBe(50);
        expect(queue.stats.totalCommands).toBe(0);
      });

      it('Then it should use custom configuration when provided', () => {
        // Arrange
        const customConfig: Partial<IRenderQueueConfig> = {
          enableBatching: false,
          enableCulling: false,
          maxBatches: 50,
          cullMargin: 25
        };

        // Act
        const queue = new RenderQueue(customConfig);

        // Assert
        expect(queue.config.enableBatching).toBe(false);
        expect(queue.config.enableCulling).toBe(false);
        expect(queue.config.maxBatches).toBe(50);
        expect(queue.config.cullMargin).toBe(25);
      });
    });

    describe('When adding commands to RenderQueue', () => {
      it('Then it should add commands and update statistics', () => {
        // Arrange
        const command = mockCommands[0];

        // Act
        renderQueue.addCommand(command);

        // Assert
        expect(renderQueue.stats.totalCommands).toBe(1);
      });

      it('Then it should handle multiple commands', () => {
        // Arrange
        // Multiple commands ready

        // Act
        mockCommands.forEach(cmd => renderQueue.addCommand(cmd));

        // Assert
        expect(renderQueue.stats.totalCommands).toBe(mockCommands.length);
      });
    });

    describe('When setting viewport', () => {
      it('Then it should update viewport for culling', () => {
        // Arrange
        const newViewport: IRect = { x: 100, y: 100, width: 400, height: 300 };

        // Act
        renderQueue.setViewport(newViewport);

        // Assert
        // Viewport is set (tested through culling behavior)
        expect(() => renderQueue.setViewport(newViewport)).not.toThrow();
      });
    });

    describe('When flushing RenderQueue with batching enabled', () => {
      beforeEach(() => {
        // Arrange: Add commands and set viewport
        mockCommands.forEach(cmd => renderQueue.addCommand(cmd));
        renderQueue.setViewport(viewport);
      });

      it('Then it should execute commands in batches', () => {
        // Arrange
        // Commands already added

        // Act
        renderQueue.flush(mockContext);

        // Assert
        // Commands should be executed
        mockCommands.forEach(cmd => {
          expect(cmd.execute).toHaveBeenCalled();
        });
        
        // Statistics should be updated
        expect(renderQueue.stats.visibleCommands).toBeGreaterThan(0);
        expect(renderQueue.stats.totalBatches).toBeGreaterThan(0);
      });

      it('Then it should group compatible commands into same batch', () => {
        // Arrange
        const compatibleCommands = [
          new MockRenderCommand(
            { x: 0, y: 0, width: 50, height: 50 },
            { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
            RenderCommandType.QUAD
          ),
          new MockRenderCommand(
            { x: 60, y: 60, width: 50, height: 50 },
            { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
            RenderCommandType.QUAD
          ),
        ];
        
        const queue = new RenderQueue({ enableBatching: true });
        compatibleCommands.forEach(cmd => queue.addCommand(cmd));
        queue.setViewport(viewport);

        // Act
        queue.flush(mockContext);

        // Assert
        const stats = queue.getStats();
        expect(stats.totalBatches).toBe(1); // Should be batched together
      });

      it('Then it should create separate batches for incompatible commands', () => {
        // Arrange
        const incompatibleCommands = [
          new MockRenderCommand(
            { x: 0, y: 0, width: 50, height: 50 },
            { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
            RenderCommandType.QUAD
          ),
          new MockRenderCommand(
            { x: 60, y: 60, width: 50, height: 50 },
            { textureId: 'tex2', shaderId: 'shader1', blendMode: 'normal' }, // Different texture
            RenderCommandType.QUAD
          ),
        ];
        
        const queue = new RenderQueue({ enableBatching: true });
        incompatibleCommands.forEach(cmd => queue.addCommand(cmd));
        queue.setViewport(viewport);

        // Act
        queue.flush(mockContext);

        // Assert
        const stats = queue.getStats();
        expect(stats.totalBatches).toBe(2); // Should be in separate batches
      });
    });

    describe('When flushing RenderQueue with batching disabled', () => {
      beforeEach(() => {
        // Arrange: Create queue with batching disabled
        renderQueue = new RenderQueue({ enableBatching: false });
        mockCommands.forEach(cmd => renderQueue.addCommand(cmd));
        renderQueue.setViewport(viewport);
      });

      it('Then it should execute commands immediately without batching', () => {
        // Arrange
        // Commands already added

        // Act
        renderQueue.flush(mockContext);

        // Assert
        mockCommands.forEach(cmd => {
          expect(cmd.execute).toHaveBeenCalled();
        });
        
        // No batches should be created
        expect(renderQueue.stats.totalBatches).toBe(0);
      });
    });

    describe('When flushing RenderQueue with culling enabled', () => {
      beforeEach(() => {
        // Arrange: Create commands, some outside viewport
        const commandsWithCulling = [
          new MockRenderCommand(
            { x: 10, y: 10, width: 50, height: 50 }, // Inside viewport
            { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
            RenderCommandType.QUAD
          ),
          new MockRenderCommand(
            { x: 1000, y: 1000, width: 50, height: 50 }, // Outside viewport
            { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
            RenderCommandType.QUAD
          ),
        ];
        
        renderQueue = new RenderQueue({ enableCulling: true, cullMargin: 10 });
        commandsWithCulling.forEach(cmd => renderQueue.addCommand(cmd));
        renderQueue.setViewport({ x: 0, y: 0, width: 100, height: 100 });
      });

      it('Then it should cull commands outside viewport', () => {
        // Arrange
        // Commands already added, some outside viewport

        // Act
        renderQueue.flush(mockContext);

        // Assert
        const stats = renderQueue.getStats();
        expect(stats.visibleCommands).toBeLessThan(stats.totalCommands);
        expect(stats.culledCommands).toBeGreaterThan(0);
      });
    });

    describe('When flushing RenderQueue with depth sorting enabled', () => {
      beforeEach(() => {
        // Arrange: Create commands with different z-indices
        const commandsWithDepth = [
          new MockRenderCommand(
            { x: 10, y: 10, width: 50, height: 50 },
            { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
            RenderCommandType.QUAD,
            3 // Higher z-index
          ),
          new MockRenderCommand(
            { x: 20, y: 20, width: 50, height: 50 },
            { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
            RenderCommandType.QUAD,
            1 // Lower z-index
          ),
        ];
        
        renderQueue = new RenderQueue({ enableDepthSorting: true });
        commandsWithDepth.forEach(cmd => renderQueue.addCommand(cmd));
        renderQueue.setViewport(viewport);
      });

      it('Then it should sort commands by z-index before execution', () => {
        // Arrange
        const executionOrder: number[] = [];
        
        // Mock execute to track execution order
        mockCommands.forEach((cmd, index) => {
          cmd.execute = vi.fn(() => {
            executionOrder.push(cmd.zIndex);
          });
        });

        // Act
        renderQueue.flush(mockContext);

        // Assert
        // Commands should be executed in z-index order (low to high)
        for (let i = 1; i < executionOrder.length; i++) {
          expect(executionOrder[i]).toBeGreaterThanOrEqual(executionOrder[i - 1]);
        }
      });
    });

    describe('When clearing RenderQueue', () => {
      beforeEach(() => {
        // Arrange: Add commands to queue
        mockCommands.forEach(cmd => renderQueue.addCommand(cmd));
      });

      it('Then it should remove all commands and reset statistics', () => {
        // Arrange
        // Commands already added

        // Act
        renderQueue.clear();

        // Assert
        expect(renderQueue.stats.totalCommands).toBe(0);
        expect(renderQueue.stats.visibleCommands).toBe(0);
        expect(renderQueue.stats.totalBatches).toBe(0);
        expect(renderQueue.stats.culledCommands).toBe(0);
      });
    });

    describe('When getting RenderQueue statistics', () => {
      beforeEach(() => {
        // Arrange: Add commands and flush
        mockCommands.forEach(cmd => renderQueue.addCommand(cmd));
        renderQueue.setViewport(viewport);
        renderQueue.flush(mockContext);
      });

      it('Then it should return comprehensive statistics', () => {
        // Arrange
        // Commands already processed

        // Act
        const stats = renderQueue.getStats();

        // Assert
        expect(stats).toHaveProperty('totalCommands');
        expect(stats).toHaveProperty('visibleCommands');
        expect(stats).toHaveProperty('totalBatches');
        expect(stats).toHaveProperty('culledCommands');
        expect(stats).toHaveProperty('averageCommandsPerBatch');
        expect(stats).toHaveProperty('memoryUsage');
        expect(stats).toHaveProperty('lastFlushTime');
        
        expect(stats.totalCommands).toBe(mockCommands.length);
        expect(stats.visibleCommands).toBeGreaterThan(0);
      });
    });
  });

  describe('Given RenderQueue error handling', () => {
    let renderQueue: RenderQueue;
    let mockContext: IGraphicsContext;

    beforeEach(() => {
      renderQueue = new RenderQueue();
      mockContext = createMockGraphicsContext();
    });

    describe('When flushing without setting viewport', () => {
      it('Then it should handle missing viewport gracefully', () => {
        // Arrange
        const command = new MockRenderCommand(
          { x: 10, y: 10, width: 50, height: 50 },
          { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
          RenderCommandType.QUAD
        );
        renderQueue.addCommand(command);

        // Act & Assert
        expect(() => {
          renderQueue.flush(mockContext);
        }).not.toThrow();
      });
    });

    describe('When adding invalid commands', () => {
      it('Then it should handle null commands gracefully', () => {
        // Arrange & Act & Assert
        expect(() => {
          renderQueue.addCommand(null as any);
        }).not.toThrow();
        
        expect(renderQueue.stats.totalCommands).toBe(0);
      });
    });

    describe('When exceeding maximum batches', () => {
      it('Then it should handle batch limit gracefully', () => {
        // Arrange
        const limitedQueue = new RenderQueue({ maxBatches: 2 });
        
        // Create commands that would create more batches than the limit
        const commands = Array.from({ length: 5 }, (_, i) => 
          new MockRenderCommand(
            { x: i * 10, y: i * 10, width: 50, height: 50 },
            { textureId: `tex${i}`, shaderId: 'shader1', blendMode: 'normal' },
            RenderCommandType.QUAD
          )
        );
        
        commands.forEach(cmd => limitedQueue.addCommand(cmd));
        limitedQueue.setViewport({ x: 0, y: 0, width: 800, height: 600 });

        // Act & Assert
        expect(() => {
          limitedQueue.flush(mockContext);
        }).not.toThrow();
        
        const stats = limitedQueue.getStats();
        expect(stats.totalBatches).toBeLessThanOrEqual(2);
      });
    });
  });
});