/**
 * IRenderCommand 接口单元测试
 */
import { describe, expect, it, vi } from 'vitest';
import { IRect } from '../../graphics/IGraphicsContext';
import {
  IRenderCommand,
  MaterialKey,
  RenderCommandType
} from '../IRenderCommand';

// Mock Render Command Implementation
class TestRenderCommand implements IRenderCommand {
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
    this.id = id || `test-cmd-${Math.random().toString(36).substr(2, 9)}`;
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
           this.materialKey.shaderId === other.materialKey.shaderId &&
           this.materialKey.blendMode === other.materialKey.blendMode &&
           this.type === other.type;
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
    // Test implementation
  }
}

describe('IRenderCommand', () => {
  describe('Given a RenderCommand implementation', () => {
    describe('When creating a render command', () => {
      it('Then it should have required properties', () => {
        // Arrange
        const bounds: IRect = { x: 10, y: 10, width: 50, height: 50 };
        const materialKey: MaterialKey = {
          textureId: 'tex1',
          shaderId: 'shader1',
          blendMode: 'normal'
        };

        // Act
        const command = new TestRenderCommand(
          bounds,
          materialKey,
          RenderCommandType.QUAD,
          5,
          'test-id'
        );

        // Assert
        expect(command.id).toBe('test-id');
        expect(command.type).toBe(RenderCommandType.QUAD);
        expect(command.zIndex).toBe(5);
        expect(command.materialKey).toEqual(materialKey);
        expect(command.getBounds()).toEqual(bounds);
      });

      it('Then it should generate unique ID when not provided', () => {
        // Arrange
        const bounds: IRect = { x: 0, y: 0, width: 10, height: 10 };
        const materialKey: MaterialKey = {
          textureId: 'tex1',
          shaderId: 'shader1',
          blendMode: 'normal'
        };

        // Act
        const command1 = new TestRenderCommand(bounds, materialKey, RenderCommandType.QUAD);
        const command2 = new TestRenderCommand(bounds, materialKey, RenderCommandType.QUAD);

        // Assert
        expect(command1.id).toBeDefined();
        expect(command2.id).toBeDefined();
        expect(command1.id).not.toBe(command2.id);
      });
    });

    describe('When checking batch compatibility', () => {
      it('Then it should batch with compatible commands', () => {
        // Arrange
        const materialKey: MaterialKey = {
          textureId: 'tex1',
          shaderId: 'shader1',
          blendMode: 'normal'
        };
        
        const command1 = new TestRenderCommand(
          { x: 0, y: 0, width: 10, height: 10 },
          materialKey,
          RenderCommandType.QUAD
        );
        
        const command2 = new TestRenderCommand(
          { x: 20, y: 20, width: 15, height: 15 },
          materialKey,
          RenderCommandType.QUAD
        );

        // Act & Assert
        expect(command1.canBatchWith(command2)).toBe(true);
        expect(command2.canBatchWith(command1)).toBe(true);
      });

      it('Then it should not batch with incompatible texture commands', () => {
        // Arrange
        const materialKey1: MaterialKey = {
          textureId: 'tex1',
          shaderId: 'shader1',
          blendMode: 'normal'
        };
        
        const materialKey2: MaterialKey = {
          textureId: 'tex2',
          shaderId: 'shader1',
          blendMode: 'normal'
        };
        
        const command1 = new TestRenderCommand(
          { x: 0, y: 0, width: 10, height: 10 },
          materialKey1,
          RenderCommandType.QUAD
        );
        
        const command2 = new TestRenderCommand(
          { x: 20, y: 20, width: 15, height: 15 },
          materialKey2,
          RenderCommandType.QUAD
        );

        // Act & Assert
        expect(command1.canBatchWith(command2)).toBe(false);
        expect(command2.canBatchWith(command1)).toBe(false);
      });

      it('Then it should not batch with different command types', () => {
        // Arrange
        const materialKey: MaterialKey = {
          textureId: 'tex1',
          shaderId: 'shader1',
          blendMode: 'normal'
        };
        
        const quadCommand = new TestRenderCommand(
          { x: 0, y: 0, width: 10, height: 10 },
          materialKey,
          RenderCommandType.QUAD
        );
        
        const textCommand = new TestRenderCommand(
          { x: 20, y: 20, width: 15, height: 15 },
          materialKey,
          RenderCommandType.TEXT
        );

        // Act & Assert
        expect(quadCommand.canBatchWith(textCommand)).toBe(false);
        expect(textCommand.canBatchWith(quadCommand)).toBe(false);
      });
    });

    describe('When checking visibility', () => {
      it('Then it should be visible when intersecting viewport', () => {
        // Arrange
        const command = new TestRenderCommand(
          { x: 10, y: 10, width: 50, height: 50 },
          { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
          RenderCommandType.QUAD
        );
        
        const viewport: IRect = { x: 0, y: 0, width: 100, height: 100 };

        // Act & Assert
        expect(command.isVisible(viewport)).toBe(true);
      });

      it('Then it should not be visible when outside viewport', () => {
        // Arrange
        const command = new TestRenderCommand(
          { x: 200, y: 200, width: 50, height: 50 },
          { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
          RenderCommandType.QUAD
        );
        
        const viewport: IRect = { x: 0, y: 0, width: 100, height: 100 };

        // Act & Assert
        expect(command.isVisible(viewport)).toBe(false);
      });

      it('Then it should be visible when partially intersecting viewport', () => {
        // Arrange
        const command = new TestRenderCommand(
          { x: 80, y: 80, width: 50, height: 50 },
          { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
          RenderCommandType.QUAD
        );
        
        const viewport: IRect = { x: 0, y: 0, width: 100, height: 100 };

        // Act & Assert
        expect(command.isVisible(viewport)).toBe(true);
      });
    });

    describe('When getting batch data', () => {
      it('Then it should return valid batch data', () => {
        // Arrange
        const command = new TestRenderCommand(
          { x: 10, y: 10, width: 50, height: 50 },
          { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
          RenderCommandType.QUAD
        );

        // Act
        const batchData = command.getBatchData();

        // Assert
        expect(batchData).toBeDefined();
        expect(batchData.vertices).toBeInstanceOf(Float32Array);
        expect(batchData.indices).toBeInstanceOf(Uint16Array);
        expect(batchData.uvs).toBeInstanceOf(Float32Array);
      });
    });

    describe('When executing command', () => {
      it('Then it should call execute method', () => {
        // Arrange
        const command = new TestRenderCommand(
          { x: 10, y: 10, width: 50, height: 50 },
          { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
          RenderCommandType.QUAD
        );
        
        const mockContext = {} as any;

        // Act
        command.execute(mockContext);

        // Assert
        expect(command.execute).toHaveBeenCalledWith(mockContext);
      });
    });

    describe('When disposing command', () => {
      it('Then it should call dispose method without errors', () => {
        // Arrange
        const command = new TestRenderCommand(
          { x: 10, y: 10, width: 50, height: 50 },
          { textureId: 'tex1', shaderId: 'shader1', blendMode: 'normal' },
          RenderCommandType.QUAD
        );

        // Act & Assert
        expect(() => command.dispose()).not.toThrow();
      });
    });
  });
});

describe('MaterialKey interface', () => {
  describe('Given MaterialKey interface', () => {
    describe('When creating material key', () => {
      it('Then it should have required properties', () => {
        // Arrange & Act
        const materialKey: MaterialKey = {
          textureId: 'tex1',
          shaderId: 'shader1',
          blendMode: 'normal'
        };

        // Assert
        expect(materialKey.textureId).toBe('tex1');
        expect(materialKey.shaderId).toBe('shader1');
        expect(materialKey.blendMode).toBe('normal');
      });

      it('Then it should support optional properties', () => {
        // Arrange & Act
        const materialKey: MaterialKey = {
          textureId: 'tex1',
          shaderId: 'shader1'
        };

        // Assert
        expect(materialKey.textureId).toBe('tex1');
        expect(materialKey.shaderId).toBe('shader1');
        expect(materialKey.blendMode).toBeUndefined();
      });
    });
  });
});

describe('RenderCommandType', () => {
  describe('Given RenderCommandType enum', () => {
    describe('When checking enum values', () => {
      it('Then it should have expected command types', () => {
        // Assert
        expect(RenderCommandType.QUAD).toBeDefined();
        expect(RenderCommandType.TEXT).toBeDefined();
        expect(RenderCommandType.PATH).toBeDefined();
        expect(RenderCommandType.CIRCLE).toBeDefined();
        expect(RenderCommandType.PATH).toBeDefined();
        expect(RenderCommandType.COMPOSITE).toBeDefined();
      });

      it('Then enum values should be strings', () => {
        // Assert
        expect(typeof RenderCommandType.QUAD).toBe('string');
        expect(typeof RenderCommandType.TEXT).toBe('string');
        expect(typeof RenderCommandType.PATH).toBe('string');
        expect(typeof RenderCommandType.CIRCLE).toBe('string');
        expect(typeof RenderCommandType.PATH).toBe('string');
        expect(typeof RenderCommandType.COMPOSITE).toBe('string');
      });
    });
  });
});