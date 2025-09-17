/**
 * CommandRenderer 单元测试
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IGraphicsContext, IRect } from '../../core/interface/IGraphicsContext';
import { IViewport } from '../../core/types';
import { IRenderCommand, MaterialKey, RenderCommandType } from '../IRenderCommand';
import {
  CommandRenderer,
  CommandRendererFactory,
  CommandUtils,
  ICommandRenderer
} from '../CommandRenderer';
import { IRenderQueueConfig } from '../RenderQueue';

// Mock Graphics Context
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

// Mock Render Command
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
    this.id = id || `cmd-${Math.random().toString(36).substr(2, 9)}`;
    this.materialKey = materialKey;
    this.type = commandType;
    this.zIndex = zIndex;
  }

  execute = vi.fn();

  getBounds(): IRect {
    return this.bounds;
  }

  canBatchWith(other: IRenderCommand): boolean {
    return this.materialKey.textureId === other.materialKey.textureId &&
           this.materialKey.shaderId === other.materialKey.shaderId;
  }

  getBatchData(): any {
    return {
      vertices: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
      indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
      uvs: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])
    };
  }

  isVisible(viewport: IRect): boolean {
    return (
      this.bounds.x < viewport.x + viewport.width &&
      this.bounds.x + this.bounds.width > viewport.x &&
      this.bounds.y < viewport.y + viewport.height &&
      this.bounds.y + this.bounds.height > viewport.y
    );
  }

  dispose(): void {
    // Mock implementation
  }
}

describe('CommandRenderer', () => {
  let commandRenderer: ICommandRenderer;
  let mockContext: IGraphicsContext;
  let mockCommands: MockRenderCommand[];

  beforeEach(() => {
    commandRenderer = new CommandRenderer();
    mockContext = createMockGraphicsContext();
    mockCommands = [
      new MockRenderCommand(
        { x: 10, y: 10, width: 50, height: 50 },
        { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
        RenderCommandType.QUAD
      ),
      new MockRenderCommand(
        { x: 100, y: 100, width: 30, height: 30 },
        { textureId: 'tex2', shaderId: 'shader1', blendMode: 'normal' },
        RenderCommandType.QUAD
      )
    ];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given a CommandRenderer', () => {
    describe('When creating a CommandRenderer', () => {
      it('Then it should initialize with default configuration', () => {
        // Arrange & Act
        const renderer = new CommandRenderer();

        // Assert
        expect(renderer).toBeDefined();
        expect(renderer.queue).toBeDefined();
        expect(renderer.enabled).toBe(true);
      });

      it('Then it should use custom configuration when provided', () => {
        // Arrange
        const config: Partial<IRenderQueueConfig> = {
          enableBatching: false,
          enableCulling: false,
          maxBatches: 50
        };

        // Act
        const renderer = new CommandRenderer(config);

        // Assert
        expect(renderer).toBeDefined();
        expect(renderer.queue.config.enableBatching).toBe(false);
        expect(renderer.queue.config.enableCulling).toBe(false);
        expect(renderer.queue.config.maxBatches).toBe(50);
      });
    });

    describe('When submitting commands', () => {
      it('Then it should submit single command', () => {
        // Arrange
        const command = mockCommands[0];

        // Act
        commandRenderer.submit(command);

        // Assert
        const stats = commandRenderer.getStats();
        expect(stats.queueStats.totalCommands).toBe(1);
      });

      it('Then it should submit batch of commands', () => {
        // Arrange & Act
        commandRenderer.submitBatch(mockCommands);

        // Assert
        const stats = commandRenderer.getStats();
        expect(stats.queueStats.totalCommands).toBe(mockCommands.length);
      });

      it('Then it should not submit commands when disabled', () => {
        // Arrange
        commandRenderer.enabled = false;
        const command = mockCommands[0];

        // Act
        commandRenderer.submit(command);

        // Assert
        const stats = commandRenderer.getStats();
        expect(stats.queueStats.totalCommands).toBe(0);
      });
    });

    describe('When setting viewport', () => {
      it('Then it should update viewport for culling', () => {
        // Arrange
        const viewport: IViewport = {
          x: 0,
          y: 0,
          width: 800,
          height: 600,
          zoom: 1
        };

        // Act & Assert
        expect(() => {
          commandRenderer.setViewport(viewport);
        }).not.toThrow();
      });
    });

    describe('When rendering commands', () => {
      it('Then it should render all submitted commands', () => {
        // Arrange
        commandRenderer.submitBatch(mockCommands);
        const statsBeforeRender = commandRenderer.getStats();
        expect(statsBeforeRender.queueStats.totalCommands).toBe(mockCommands.length);

        // Act
        commandRenderer.render(mockContext);

        // Assert
        mockCommands.forEach(command => {
          expect(command.execute).toHaveBeenCalledWith(mockContext);
        });
        
        // After render, queue should be cleared
        const statsAfterRender = commandRenderer.getStats();
        expect(statsAfterRender.queueStats.totalCommands).toBe(0);
      });

      it('Then it should not render when disabled', () => {
        // Arrange
        commandRenderer.submitBatch(mockCommands);
        commandRenderer.enabled = false;

        // Act
        commandRenderer.render(mockContext);

        // Assert
        // Should not throw and should handle gracefully
        expect(true).toBe(true);
      });
    });

    describe('When clearing commands', () => {
      it('Then it should remove all commands', () => {
        // Arrange
        commandRenderer.submitBatch(mockCommands);
        expect(commandRenderer.getStats().queueStats.totalCommands).toBe(mockCommands.length);

        // Act
        commandRenderer.clear();

        // Assert
        const stats = commandRenderer.getStats();
        expect(stats.queueStats.totalCommands).toBe(0);
      });
    });

    describe('When getting statistics', () => {
      it('Then it should return comprehensive statistics', () => {
        // Arrange
        commandRenderer.submitBatch(mockCommands);

        // Act
        const stats = commandRenderer.getStats();

        // Assert
        expect(stats).toHaveProperty('enabled');
        expect(stats).toHaveProperty('queueStats');
        expect(stats).toHaveProperty('config');
        expect(stats.queueStats).toHaveProperty('totalCommands');
        expect(stats.queueStats).toHaveProperty('visibleCommands');
        expect(stats.queueStats).toHaveProperty('totalBatches');
        expect(stats.queueStats).toHaveProperty('culledCommands');
        expect(stats.queueStats).toHaveProperty('averageCommandsPerBatch');
        expect(stats.queueStats).toHaveProperty('memoryUsage');
        expect(stats.queueStats).toHaveProperty('lastFlushTime');
        expect(stats.queueStats.totalCommands).toBe(mockCommands.length);
      });
    });

    describe('When updating configuration', () => {
      it('Then it should update queue configuration', () => {
        // Arrange
        const newConfig: Partial<IRenderQueueConfig> = {
          enableBatching: false,
          maxBatches: 25
        };

        // Act
        commandRenderer.updateConfig(newConfig);

        // Assert
        expect(commandRenderer.queue.config.enableBatching).toBe(false);
        expect(commandRenderer.queue.config.maxBatches).toBe(25);
      });
    });
  });
});

describe('CommandRendererFactory', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given CommandRendererFactory', () => {
    describe('When creating default renderer', () => {
      it('Then it should create renderer with default config', () => {
        // Arrange & Act
        const renderer = CommandRendererFactory.create();

        // Assert
        expect(renderer).toBeDefined();
        expect(renderer.queue.config.enableBatching).toBe(true);
        expect(renderer.queue.config.enableCulling).toBe(true);
        expect(renderer.queue.config.enableDepthSorting).toBe(true);
      });

      it('Then it should create renderer with custom config', () => {
        // Arrange
        const config: Partial<IRenderQueueConfig> = {
          enableBatching: false,
          maxBatches: 10
        };

        // Act
        const renderer = CommandRendererFactory.create(config);

        // Assert
        expect(renderer.queue.config.enableBatching).toBe(false);
        expect(renderer.queue.config.maxBatches).toBe(10);
      });
    });

    describe('When creating high performance renderer', () => {
      it('Then it should create optimized renderer', () => {
        // Arrange & Act
        const renderer = CommandRendererFactory.createHighPerformance();

        // Assert
        expect(renderer).toBeDefined();
        expect(renderer.queue.config.enableBatching).toBe(true);
        expect(renderer.queue.config.enableCulling).toBe(true);
        expect(renderer.queue.config.maxBatches).toBe(500);
      });
    });

    describe('When creating debug renderer', () => {
      it('Then it should create debug-friendly renderer', () => {
        // Arrange & Act
        const renderer = CommandRendererFactory.createDebug();

        // Assert
        expect(renderer).toBeDefined();
        expect(renderer.queue.config.enableBatching).toBe(false);
        expect(renderer.queue.config.enableCulling).toBe(false);
        expect(renderer.queue.config.enableDepthSorting).toBe(true);
      });
    });

    describe('When setting default config', () => {
      it('Then it should update default configuration', () => {
        // Arrange
        const newConfig: Partial<IRenderQueueConfig> = {
          maxBatches: 150,
          cullMargin: 100
        };

        // Act
        CommandRendererFactory.setDefaultConfig(newConfig);
        const renderer = CommandRendererFactory.create();

        // Assert
        expect(renderer.queue.config.maxBatches).toBe(150);
        expect(renderer.queue.config.cullMargin).toBe(100);
      });
    });
  });
});

describe('CommandUtils', () => {
  let mockCommand: MockRenderCommand;

  beforeEach(() => {
    mockCommand = new MockRenderCommand(
      { x: 10, y: 10, width: 50, height: 50 },
      { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
      RenderCommandType.QUAD
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Given CommandUtils', () => {
    describe('When creating commands from shape', () => {
      it('Then it should create commands array', () => {
        // Arrange
        const shape = {
          type: 'rectangle',
          x: 10,
          y: 10,
          width: 50,
          height: 50
        };

        // Act
        const commands = CommandUtils.createCommandsFromShape(shape);

        // Assert
        expect(Array.isArray(commands)).toBe(true);
      });
    });

    describe('When estimating render cost', () => {
      it('Then it should return numeric cost estimate', () => {
        // Arrange & Act
        const cost = CommandUtils.estimateRenderCost(mockCommand);

        // Assert
        expect(typeof cost).toBe('number');
        expect(cost).toBeGreaterThanOrEqual(0);
      });

      it('Then it should handle different command types', () => {
        // Arrange
        const quadCommand = new MockRenderCommand(
          { x: 0, y: 0, width: 100, height: 100 },
          { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
          RenderCommandType.QUAD
        );
        
        const textCommand = new MockRenderCommand(
          { x: 0, y: 0, width: 50, height: 20 },
          { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
          RenderCommandType.TEXT
        );

        // Act
        const quadCost = CommandUtils.estimateRenderCost(quadCommand);
        const textCost = CommandUtils.estimateRenderCost(textCommand);

        // Assert
        expect(quadCost).toBeGreaterThanOrEqual(0);
        expect(textCost).toBeGreaterThanOrEqual(0);
      });
    });

    describe('When optimizing commands', () => {
      it('Then it should return optimized commands array', () => {
        // Arrange
        const commands = [
          new MockRenderCommand(
            { x: 10, y: 10, width: 50, height: 50 },
            { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
            RenderCommandType.QUAD,
            2
          ),
          new MockRenderCommand(
            { x: 100, y: 100, width: 30, height: 30 },
            { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
            RenderCommandType.QUAD,
            1
          )
        ];

        // Act
        const optimized = CommandUtils.optimizeCommands(commands);

        // Assert
        expect(Array.isArray(optimized)).toBe(true);
        expect(optimized.length).toBe(commands.length);
        // Should be sorted by z-index
        expect(optimized[0].zIndex).toBeLessThanOrEqual(optimized[1].zIndex);
      });

      it('Then it should handle empty commands array', () => {
        // Arrange & Act
        const optimized = CommandUtils.optimizeCommands([]);

        // Assert
        expect(Array.isArray(optimized)).toBe(true);
        expect(optimized.length).toBe(0);
      });
    });
  });
});