/**
 * RenderCommand 渲染命令系统单元测试
 * 测试所有渲染命令类和命令构建器
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IGraphicsContext, IGraphicsStyle, ITextStyle, IImageData } from '../IGraphicsContext';
import {
  type IRenderCommand,
  SaveStateCommand,
  RestoreStateCommand,
  TranslateCommand,
  RotateCommand,
  ScaleCommand,
  SetStyleCommand,
  ClearCommand,
  ClearRectCommand,
  BeginPathCommand,
  ClosePathCommand,
  MoveToCommand,
  LineToCommand,
  ArcCommand,
  RectCommand,
  FillCommand,
  StrokeCommand,
  FillRectCommand,
  StrokeRectCommand,
  FillCircleCommand,
  StrokeCircleCommand,
  FillTextCommand,
  StrokeTextCommand,
  DrawImageCommand,
  ClipCommand,
  ClipRectCommand,
  CompositeCommand,
  RenderCommandBuilder
} from '../RenderCommand';

describe('RenderCommand System', () => {
  let mockContext: IGraphicsContext;

  beforeEach(() => {
    mockContext = {
      width: 800,
      height: 600,
      devicePixelRatio: 1,

      // State management
      save: vi.fn(),
      restore: vi.fn(),
      getState: vi.fn(),
      setState: vi.fn(),

      // Transform operations
      setTransform: vi.fn(),
      transform: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      scale: vi.fn(),
      resetTransform: vi.fn(),

      // Style setting
      setStyle: vi.fn(),
      setFillColor: vi.fn(),
      setStrokeColor: vi.fn(),
      setFillStyle: vi.fn(),
      setStrokeStyle: vi.fn(),
      setLineWidth: vi.fn(),
      setOpacity: vi.fn(),
      setGlobalAlpha: vi.fn(),
      setLineDash: vi.fn(),
      setTextAlign: vi.fn(),
      setTextBaseline: vi.fn(),
      setFont: vi.fn(),

      // Clear and render
      clear: vi.fn(),
      clearRect: vi.fn(),
      present: vi.fn(),

      // Path drawing
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      bezierCurveTo: vi.fn(),
      arc: vi.fn(),
      rect: vi.fn(),

      // Draw methods
      fill: vi.fn(),
      stroke: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      drawLine: vi.fn(),
      drawRect: vi.fn(),

      // Circle drawing
      fillCircle: vi.fn(),
      strokeCircle: vi.fn(),
      drawCircle: vi.fn(),

      // Text drawing
      fillText: vi.fn(),
      strokeText: vi.fn(),
      measureText: vi.fn(),

      // Image operations
      drawImage: vi.fn() as unknown as {
        (imageData: IImageData, dx: number, dy: number): void;
        (imageData: IImageData, dx: number, dy: number, dw: number, dh: number): void;
      },
      getImageData: vi.fn(),
      putImageData: vi.fn(),

      // Clipping
      clip: vi.fn(),
      clipRect: vi.fn(),

      // Coordinate transformation
      screenToWorld: vi.fn(),
      worldToScreen: vi.fn(),

      // Resource management
      dispose: vi.fn()
    } as IGraphicsContext;
  });

  describe('IRenderCommand Interface', () => {
    it('should define command properties', () => {
      const command: IRenderCommand = {
        type: 'test-command',
        execute: vi.fn(),
        canBatch: true,
        priority: 5
      };

      expect(command.type).toBe('test-command');
      expect(typeof command.execute).toBe('function');
      expect(command.canBatch).toBe(true);
      expect(command.priority).toBe(5);
    });

    it('should support minimal command', () => {
      const command: IRenderCommand = {
        type: 'minimal',
        execute: vi.fn()
      };

      expect(command.type).toBe('minimal');
      expect(typeof command.execute).toBe('function');
      expect(command.canBatch).toBeUndefined();
      expect(command.priority).toBeUndefined();
    });
  });

  describe('State Management Commands', () => {
    describe('SaveStateCommand', () => {
      it('should have correct type and execute save', () => {
        const command = new SaveStateCommand();
        expect(command.type).toBe('save-state');

        command.execute(mockContext);
        expect(mockContext.save).toHaveBeenCalled();
      });
    });

    describe('RestoreStateCommand', () => {
      it('should have correct type and execute restore', () => {
        const command = new RestoreStateCommand();
        expect(command.type).toBe('restore-state');

        command.execute(mockContext);
        expect(mockContext.restore).toHaveBeenCalled();
      });
    });
  });

  describe('Transform Commands', () => {
    describe('TranslateCommand', () => {
      it('should store translation values and execute correctly', () => {
        const command = new TranslateCommand(10, 20);
        expect(command.type).toBe('translate');

        command.execute(mockContext);
        expect(mockContext.translate).toHaveBeenCalledWith(10, 20);
      });

      it('should support negative translation', () => {
        const command = new TranslateCommand(-5, -15);
        command.execute(mockContext);
        expect(mockContext.translate).toHaveBeenCalledWith(-5, -15);
      });

      it('should support fractional translation', () => {
        const command = new TranslateCommand(1.5, 2.7);
        command.execute(mockContext);
        expect(mockContext.translate).toHaveBeenCalledWith(1.5, 2.7);
      });
    });

    describe('RotateCommand', () => {
      it('should store rotation angle and execute correctly', () => {
        const angle = Math.PI / 4;
        const command = new RotateCommand(angle);
        expect(command.type).toBe('rotate');

        command.execute(mockContext);
        expect(mockContext.rotate).toHaveBeenCalledWith(angle);
      });

      it('should support negative rotation', () => {
        const angle = -Math.PI / 2;
        const command = new RotateCommand(angle);
        command.execute(mockContext);
        expect(mockContext.rotate).toHaveBeenCalledWith(angle);
      });

      it('should support full rotation', () => {
        const angle = Math.PI * 2;
        const command = new RotateCommand(angle);
        command.execute(mockContext);
        expect(mockContext.rotate).toHaveBeenCalledWith(angle);
      });
    });

    describe('ScaleCommand', () => {
      it('should store scale values and execute correctly', () => {
        const command = new ScaleCommand(2, 1.5);
        expect(command.type).toBe('scale');

        command.execute(mockContext);
        expect(mockContext.scale).toHaveBeenCalledWith(2, 1.5);
      });

      it('should support uniform scaling', () => {
        const command = new ScaleCommand(3, 3);
        command.execute(mockContext);
        expect(mockContext.scale).toHaveBeenCalledWith(3, 3);
      });

      it('should support fractional scaling', () => {
        const command = new ScaleCommand(0.5, 0.75);
        command.execute(mockContext);
        expect(mockContext.scale).toHaveBeenCalledWith(0.5, 0.75);
      });

      it('should support negative scaling (flip)', () => {
        const command = new ScaleCommand(-1, 1);
        command.execute(mockContext);
        expect(mockContext.scale).toHaveBeenCalledWith(-1, 1);
      });
    });
  });

  describe('Style Commands', () => {
    describe('SetStyleCommand', () => {
      it('should store style and execute correctly', () => {
        const style: Partial<IGraphicsStyle> = {
          fillColor: 'red',
          strokeColor: 'blue',
          lineWidth: 2
        };
        const command = new SetStyleCommand(style);
        expect(command.type).toBe('set-style');

        command.execute(mockContext);
        expect(mockContext.setStyle).toHaveBeenCalledWith(style);
      });

      it('should support empty style', () => {
        const style: Partial<IGraphicsStyle> = {};
        const command = new SetStyleCommand(style);
        command.execute(mockContext);
        expect(mockContext.setStyle).toHaveBeenCalledWith(style);
      });

      it('should support complex style', () => {
        const style: Partial<IGraphicsStyle> = {
          fillColor: { r: 255, g: 0, b: 0, a: 0.8 },
          strokeColor: 'hsla(240, 100%, 50%, 0.6)',
          lineWidth: 3.5,
          lineCap: 'round',
          lineJoin: 'bevel',
          opacity: 0.9,
          shadowColor: 'rgba(0, 0, 0, 0.3)',
          shadowBlur: 15,
          shadowOffsetX: 5,
          shadowOffsetY: -5
        };
        const command = new SetStyleCommand(style);
        command.execute(mockContext);
        expect(mockContext.setStyle).toHaveBeenCalledWith(style);
      });
    });
  });

  describe('Clear Commands', () => {
    describe('ClearCommand', () => {
      it('should have correct type and execute clear', () => {
        const command = new ClearCommand();
        expect(command.type).toBe('clear');

        command.execute(mockContext);
        expect(mockContext.clear).toHaveBeenCalled();
      });
    });

    describe('ClearRectCommand', () => {
      it('should store rectangle values and execute correctly', () => {
        const command = new ClearRectCommand(10, 20, 100, 150);
        expect(command.type).toBe('clear-rect');

        command.execute(mockContext);
        expect(mockContext.clearRect).toHaveBeenCalledWith(10, 20, 100, 150);
      });

      it('should support zero-sized rectangle', () => {
        const command = new ClearRectCommand(0, 0, 0, 0);
        command.execute(mockContext);
        expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 0, 0);
      });

      it('should support negative position', () => {
        const command = new ClearRectCommand(-10, -20, 100, 150);
        command.execute(mockContext);
        expect(mockContext.clearRect).toHaveBeenCalledWith(-10, -20, 100, 150);
      });
    });
  });

  describe('Path Commands', () => {
    describe('BeginPathCommand', () => {
      it('should have correct type and execute beginPath', () => {
        const command = new BeginPathCommand();
        expect(command.type).toBe('begin-path');

        command.execute(mockContext);
        expect(mockContext.beginPath).toHaveBeenCalled();
      });
    });

    describe('ClosePathCommand', () => {
      it('should have correct type and execute closePath', () => {
        const command = new ClosePathCommand();
        expect(command.type).toBe('close-path');

        command.execute(mockContext);
        expect(mockContext.closePath).toHaveBeenCalled();
      });
    });

    describe('MoveToCommand', () => {
      it('should store coordinates and execute moveTo', () => {
        const command = new MoveToCommand(50, 75);
        expect(command.type).toBe('move-to');

        command.execute(mockContext);
        expect(mockContext.moveTo).toHaveBeenCalledWith(50, 75);
      });
    });

    describe('LineToCommand', () => {
      it('should store coordinates and execute lineTo', () => {
        const command = new LineToCommand(100, 200);
        expect(command.type).toBe('line-to');

        command.execute(mockContext);
        expect(mockContext.lineTo).toHaveBeenCalledWith(100, 200);
      });
    });

    describe('ArcCommand', () => {
      it('should store arc parameters and execute arc', () => {
        const command = new ArcCommand(100, 100, 50, 0, Math.PI * 2);
        expect(command.type).toBe('arc');

        command.execute(mockContext);
        expect(mockContext.arc).toHaveBeenCalledWith(100, 100, 50, 0, Math.PI * 2, undefined);
      });

      it('should support counterclockwise arc', () => {
        const command = new ArcCommand(100, 100, 30, 0, Math.PI, true);
        command.execute(mockContext);
        expect(mockContext.arc).toHaveBeenCalledWith(100, 100, 30, 0, Math.PI, true);
      });

      it('should support clockwise arc', () => {
        const command = new ArcCommand(150, 150, 40, Math.PI, Math.PI * 2, false);
        command.execute(mockContext);
        expect(mockContext.arc).toHaveBeenCalledWith(150, 150, 40, Math.PI, Math.PI * 2, false);
      });
    });

    describe('RectCommand', () => {
      it('should store rectangle parameters and execute rect', () => {
        const command = new RectCommand(10, 20, 100, 150);
        expect(command.type).toBe('rect');

        command.execute(mockContext);
        expect(mockContext.rect).toHaveBeenCalledWith(10, 20, 100, 150);
      });
    });
  });

  describe('Fill and Stroke Commands', () => {
    describe('FillCommand', () => {
      it('should have correct type and execute fill', () => {
        const command = new FillCommand();
        expect(command.type).toBe('fill');

        command.execute(mockContext);
        expect(mockContext.fill).toHaveBeenCalled();
      });
    });

    describe('StrokeCommand', () => {
      it('should have correct type and execute stroke', () => {
        const command = new StrokeCommand();
        expect(command.type).toBe('stroke');

        command.execute(mockContext);
        expect(mockContext.stroke).toHaveBeenCalled();
      });
    });

    describe('FillRectCommand', () => {
      it('should have correct type, batching capability and execute fillRect', () => {
        const command = new FillRectCommand(10, 20, 100, 150);
        expect(command.type).toBe('fill-rect');
        expect(command.canBatch).toBe(true);

        command.execute(mockContext);
        expect(mockContext.fillRect).toHaveBeenCalledWith(10, 20, 100, 150);
      });
    });

    describe('StrokeRectCommand', () => {
      it('should have correct type, batching capability and execute strokeRect', () => {
        const command = new StrokeRectCommand(15, 25, 80, 120);
        expect(command.type).toBe('stroke-rect');
        expect(command.canBatch).toBe(true);

        command.execute(mockContext);
        expect(mockContext.strokeRect).toHaveBeenCalledWith(15, 25, 80, 120);
      });
    });
  });

  describe('Circle Commands', () => {
    describe('FillCircleCommand', () => {
      it('should have correct type, batching capability and execute fillCircle', () => {
        const command = new FillCircleCommand(100, 100, 50);
        expect(command.type).toBe('fill-circle');
        expect(command.canBatch).toBe(true);

        command.execute(mockContext);
        expect(mockContext.fillCircle).toHaveBeenCalledWith(100, 100, 50);
      });

      it('should support small circles', () => {
        const command = new FillCircleCommand(0, 0, 1);
        command.execute(mockContext);
        expect(mockContext.fillCircle).toHaveBeenCalledWith(0, 0, 1);
      });

      it('should support large circles', () => {
        const command = new FillCircleCommand(500, 500, 1000);
        command.execute(mockContext);
        expect(mockContext.fillCircle).toHaveBeenCalledWith(500, 500, 1000);
      });
    });

    describe('StrokeCircleCommand', () => {
      it('should have correct type, batching capability and execute strokeCircle', () => {
        const command = new StrokeCircleCommand(150, 200, 75);
        expect(command.type).toBe('stroke-circle');
        expect(command.canBatch).toBe(true);

        command.execute(mockContext);
        expect(mockContext.strokeCircle).toHaveBeenCalledWith(150, 200, 75);
      });
    });
  });

  describe('Text Commands', () => {
    describe('FillTextCommand', () => {
      it('should have correct type, batching capability and execute fillText', () => {
        const command = new FillTextCommand('Hello', 10, 20);
        expect(command.type).toBe('fill-text');
        expect(command.canBatch).toBe(true);

        command.execute(mockContext);
        expect(mockContext.fillText).toHaveBeenCalledWith('Hello', 10, 20, undefined);
      });

      it('should support text with style', () => {
        const textStyle: ITextStyle = {
          fontSize: 16,
          fontFamily: 'Arial',
          fillColor: 'blue'
        };
        const command = new FillTextCommand('World', 30, 40, textStyle);

        command.execute(mockContext);
        expect(mockContext.fillText).toHaveBeenCalledWith('World', 30, 40, textStyle);
      });

      it('should support empty text', () => {
        const command = new FillTextCommand('', 0, 0);
        command.execute(mockContext);
        expect(mockContext.fillText).toHaveBeenCalledWith('', 0, 0, undefined);
      });

      it('should support long text', () => {
        const longText = 'This is a very long text that might wrap or be clipped';
        const command = new FillTextCommand(longText, 50, 100);
        command.execute(mockContext);
        expect(mockContext.fillText).toHaveBeenCalledWith(longText, 50, 100, undefined);
      });
    });

    describe('StrokeTextCommand', () => {
      it('should have correct type, batching capability and execute strokeText', () => {
        const command = new StrokeTextCommand('Outline', 50, 75);
        expect(command.type).toBe('stroke-text');
        expect(command.canBatch).toBe(true);

        command.execute(mockContext);
        expect(mockContext.strokeText).toHaveBeenCalledWith('Outline', 50, 75, undefined);
      });

      it('should support text with complex style', () => {
        const textStyle: ITextStyle = {
          fontSize: 24,
          fontFamily: 'Helvetica',
          fontWeight: 'bold',
          strokeColor: 'red',
          lineWidth: 2
        };
        const command = new StrokeTextCommand('Bold', 100, 150, textStyle);

        command.execute(mockContext);
        expect(mockContext.strokeText).toHaveBeenCalledWith('Bold', 100, 150, textStyle);
      });
    });
  });

  describe('Image Commands', () => {
    describe('DrawImageCommand', () => {
      const mockImageData: IImageData = {
        width: 100,
        height: 100,
        data: new Uint8ClampedArray(100 * 100 * 4)
      };

      it('should have correct type and execute drawImage without scaling', () => {
        const command = new DrawImageCommand(mockImageData, 50, 100);
        expect(command.type).toBe('draw-image');

        command.execute(mockContext);
        expect(mockContext.drawImage).toHaveBeenCalledWith(mockImageData, 50, 100);
      });

      it('should execute drawImage with scaling', () => {
        const command = new DrawImageCommand(mockImageData, 50, 100, 200, 150);

        command.execute(mockContext);
        expect(mockContext.drawImage).toHaveBeenCalledWith(mockImageData, 50, 100, 200, 150);
      });

      it('should handle zero size scaling', () => {
        const command = new DrawImageCommand(mockImageData, 0, 0, 0, 0);

        command.execute(mockContext);
        expect(mockContext.drawImage).toHaveBeenCalledWith(mockImageData, 0, 0, 0, 0);
      });

      it('should handle partial scaling parameters', () => {
        // Test with only width provided (should still call without scaling)
        const command1 = new DrawImageCommand(mockImageData, 10, 20, 30, undefined);
        command1.execute(mockContext);
        expect(mockContext.drawImage).toHaveBeenCalledWith(mockImageData, 10, 20);

        // Test with only height provided (should still call without scaling)
        const command2 = new DrawImageCommand(mockImageData, 10, 20, undefined, 40);
        command2.execute(mockContext);
        expect(mockContext.drawImage).toHaveBeenCalledWith(mockImageData, 10, 20);
      });
    });
  });

  describe('Clip Commands', () => {
    describe('ClipCommand', () => {
      it('should have correct type and execute clip', () => {
        const command = new ClipCommand();
        expect(command.type).toBe('clip');

        command.execute(mockContext);
        expect(mockContext.clip).toHaveBeenCalled();
      });
    });

    describe('ClipRectCommand', () => {
      it('should have correct type and execute clipRect', () => {
        const command = new ClipRectCommand(10, 20, 100, 150);
        expect(command.type).toBe('clip-rect');

        command.execute(mockContext);
        expect(mockContext.clipRect).toHaveBeenCalledWith(10, 20, 100, 150);
      });
    });
  });

  describe('CompositeCommand', () => {
    it('should have correct type and execute all sub-commands', () => {
      const subCommands = [
        new SaveStateCommand(),
        new TranslateCommand(10, 20),
        new FillRectCommand(0, 0, 50, 50),
        new RestoreStateCommand()
      ];
      const command = new CompositeCommand(subCommands);

      expect(command.type).toBe('composite');

      command.execute(mockContext);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalledWith(10, 20);
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 50, 50);
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('should handle empty command list', () => {
      const command = new CompositeCommand([]);

      expect(() => command.execute(mockContext)).not.toThrow();
    });

    it('should handle single command', () => {
      const subCommand = new ClearCommand();
      const command = new CompositeCommand([subCommand]);

      command.execute(mockContext);
      expect(mockContext.clear).toHaveBeenCalled();
    });

    it('should maintain execution order', () => {
      const executionOrder: string[] = [];
      const mockCommand1: IRenderCommand = {
        type: 'test1',
        execute: () => executionOrder.push('command1')
      };
      const mockCommand2: IRenderCommand = {
        type: 'test2',
        execute: () => executionOrder.push('command2')
      };
      const mockCommand3: IRenderCommand = {
        type: 'test3',
        execute: () => executionOrder.push('command3')
      };

      const command = new CompositeCommand([mockCommand1, mockCommand2, mockCommand3]);
      command.execute(mockContext);

      expect(executionOrder).toEqual(['command1', 'command2', 'command3']);
    });
  });

  describe('RenderCommandBuilder', () => {
    let builder: RenderCommandBuilder;

    beforeEach(() => {
      builder = new RenderCommandBuilder();
    });

    it('should build simple commands with fluent interface', () => {
      const command = builder
        .save()
        .translate(10, 20)
        .rotate(Math.PI / 4)
        .scale(2, 2)
        .restore()
        .build();

      expect(command.type).toBe('composite');

      command.execute(mockContext);

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalledWith(10, 20);
      expect(mockContext.rotate).toHaveBeenCalledWith(Math.PI / 4);
      expect(mockContext.scale).toHaveBeenCalledWith(2, 2);
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('should build style commands', () => {
      const style: Partial<IGraphicsStyle> = { fillColor: 'red', lineWidth: 2 };

      builder
        .setStyle(style)
        .fillRect(10, 20, 100, 150)
        .strokeRect(15, 25, 80, 120);

      const commands = builder.buildAll();
      expect(commands).toHaveLength(3);
      expect(commands[0].type).toBe('set-style');
      expect(commands[1].type).toBe('fill-rect');
      expect(commands[2].type).toBe('stroke-rect');
    });

    it('should build path commands', () => {
      builder
        .beginPath()
        .moveTo(10, 10)
        .lineTo(50, 10)
        .lineTo(50, 50)
        .lineTo(10, 50)
        .closePath()
        .fill()
        .stroke();

      const commands = builder.buildAll();
      expect(commands).toHaveLength(8);
      expect(commands[0].type).toBe('begin-path');
      expect(commands[1].type).toBe('move-to');
      expect(commands[2].type).toBe('line-to');
      expect(commands[5].type).toBe('close-path');
      expect(commands[6].type).toBe('fill');
      expect(commands[7].type).toBe('stroke');
    });

    it('should build arc commands', () => {
      builder
        .arc(100, 100, 50, 0, Math.PI * 2)
        .arc(200, 200, 30, 0, Math.PI, true);

      const commands = builder.buildAll();
      expect(commands).toHaveLength(2);
      expect(commands[0].type).toBe('arc');
      expect(commands[1].type).toBe('arc');
    });

    it('should build rect commands', () => {
      builder
        .rect(10, 20, 100, 150)
        .fillRect(50, 75, 200, 100)
        .strokeRect(25, 25, 150, 200);

      const commands = builder.buildAll();
      expect(commands).toHaveLength(3);
      expect(commands[0].type).toBe('rect');
      expect(commands[1].type).toBe('fill-rect');
      expect(commands[2].type).toBe('stroke-rect');
    });

    it('should build circle commands', () => {
      builder
        .fillCircle(100, 100, 50)
        .strokeCircle(200, 200, 75);

      const commands = builder.buildAll();
      expect(commands).toHaveLength(2);
      expect(commands[0].type).toBe('fill-circle');
      expect(commands[1].type).toBe('stroke-circle');
    });

    it('should build text commands', () => {
      const textStyle: ITextStyle = { fontSize: 16 };

      builder
        .fillText('Hello', 10, 20)
        .strokeText('World', 30, 40, textStyle);

      const commands = builder.buildAll();
      expect(commands).toHaveLength(2);
      expect(commands[0].type).toBe('fill-text');
      expect(commands[1].type).toBe('stroke-text');
    });

    it('should build image commands', () => {
      const imageData: IImageData = {
        width: 50,
        height: 50,
        data: new Uint8ClampedArray(50 * 50 * 4)
      };

      builder
        .drawImage(imageData, 10, 20)
        .drawImage(imageData, 50, 100, 100, 200);

      const commands = builder.buildAll();
      expect(commands).toHaveLength(2);
      expect(commands[0].type).toBe('draw-image');
      expect(commands[1].type).toBe('draw-image');
    });

    it('should build clip commands', () => {
      builder
        .clip()
        .clipRect(10, 20, 100, 150);

      const commands = builder.buildAll();
      expect(commands).toHaveLength(2);
      expect(commands[0].type).toBe('clip');
      expect(commands[1].type).toBe('clip-rect');
    });

    it('should build clear commands', () => {
      builder
        .clear()
        .clearRect(10, 20, 100, 150);

      const commands = builder.buildAll();
      expect(commands).toHaveLength(2);
      expect(commands[0].type).toBe('clear');
      expect(commands[1].type).toBe('clear-rect');
    });

    it('should return single command when building one command', () => {
      const command = builder.fillRect(10, 20, 100, 150).build();

      expect(command.type).toBe('fill-rect');
      expect(command).toBeInstanceOf(FillRectCommand);
    });

    it('should return composite command when building multiple commands', () => {
      const command = builder
        .save()
        .fillRect(10, 20, 100, 150)
        .restore()
        .build();

      expect(command.type).toBe('composite');
      expect(command).toBeInstanceOf(CompositeCommand);
    });

    it('should support reset functionality', () => {
      builder
        .save()
        .translate(10, 20)
        .reset()
        .fillRect(0, 0, 50, 50);

      const commands = builder.buildAll();
      expect(commands).toHaveLength(1);
      expect(commands[0].type).toBe('fill-rect');
    });

    it('should support method chaining after reset', () => {
      const command = builder
        .save()
        .translate(10, 20)
        .reset()
        .fillRect(0, 0, 50, 50)
        .strokeRect(10, 10, 30, 30)
        .build();

      expect(command.type).toBe('composite');
    });

    it('should handle empty builder', () => {
      const commands = builder.buildAll();
      expect(commands).toHaveLength(0);
    });

    it('should create complex drawing sequence', () => {
      const command = builder
        .save()
        .setStyle({ fillColor: 'red', strokeColor: 'blue', lineWidth: 2 })
        .translate(100, 100)
        .rotate(Math.PI / 4)
        .scale(1.5, 1.5)
        .beginPath()
        .moveTo(0, 0)
        .lineTo(50, 0)
        .lineTo(25, 43.3)
        .closePath()
        .fill()
        .stroke()
        .restore()
        .fillText('Triangle', 50, 200)
        .build();

      expect(command.type).toBe('composite');

      command.execute(mockContext);

      // Verify complex sequence execution
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.setStyle).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalledWith(100, 100);
      expect(mockContext.rotate).toHaveBeenCalledWith(Math.PI / 4);
      expect(mockContext.scale).toHaveBeenCalledWith(1.5, 1.5);
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.moveTo).toHaveBeenCalledWith(0, 0);
      expect(mockContext.lineTo).toHaveBeenCalledWith(50, 0);
      expect(mockContext.lineTo).toHaveBeenCalledWith(25, 43.3);
      expect(mockContext.closePath).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalledWith('Triangle', 50, 200, undefined);
    });
  });

  describe('Command Properties and Batching', () => {
    it('should identify batchable commands', () => {
      const batchableCommands = [
        new FillRectCommand(0, 0, 10, 10),
        new StrokeRectCommand(0, 0, 10, 10),
        new FillCircleCommand(50, 50, 25),
        new StrokeCircleCommand(50, 50, 25),
        new FillTextCommand('test', 0, 0),
        new StrokeTextCommand('test', 0, 0)
      ];

      batchableCommands.forEach(command => {
        expect(command.canBatch).toBe(true);
      });
    });

    it('should identify non-batchable commands', () => {
      const nonBatchableCommands = [
        new SaveStateCommand(),
        new RestoreStateCommand(),
        new BeginPathCommand(),
        new ClosePathCommand(),
        new FillCommand(),
        new StrokeCommand(),
        new ClearCommand()
      ];

      nonBatchableCommands.forEach(command => {
        expect((command as any).canBatch).toBeUndefined();
      });
    });

    it('should support command priorities', () => {
      const commandWithPriority: IRenderCommand = {
        type: 'priority-command',
        execute: vi.fn(),
        priority: 10
      };

      expect(commandWithPriority.priority).toBe(10);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle command execution errors gracefully', () => {
      const errorCommand: IRenderCommand = {
        type: 'error-command',
        execute: () => {
          throw new Error('Command execution failed');
        }
      };

      expect(() => errorCommand.execute(mockContext)).toThrow('Command execution failed');
    });

    it('should handle null/undefined parameters', () => {
      // Commands should still construct with unusual but valid parameters
      const commands = [
        new TranslateCommand(0, 0),
        new RotateCommand(0),
        new ScaleCommand(1, 1),
        new FillRectCommand(0, 0, 0, 0),
        new ArcCommand(0, 0, 0, 0, 0)
      ];

      commands.forEach(command => {
        expect(() => command.execute(mockContext)).not.toThrow();
      });
    });

    it('should handle extreme parameter values', () => {
      const extremeCommands = [
        new TranslateCommand(Number.MAX_VALUE, Number.MIN_VALUE),
        new RotateCommand(Math.PI * 1000),
        new ScaleCommand(0.001, 1000),
        new FillRectCommand(-1000, -1000, 10000, 10000),
        new ArcCommand(0, 0, 10000, -Math.PI * 10, Math.PI * 10)
      ];

      extremeCommands.forEach(command => {
        expect(() => command.execute(mockContext)).not.toThrow();
      });
    });

    it('should handle composite command with failing sub-commands', () => {
      const failingCommand: IRenderCommand = {
        type: 'failing',
        execute: () => {
          throw new Error('Sub-command failed');
        }
      };

      const workingCommand = new SaveStateCommand();
      const composite = new CompositeCommand([workingCommand, failingCommand]);

      expect(() => composite.execute(mockContext)).toThrow('Sub-command failed');
      // First command should have executed before the failure
      expect(mockContext.save).toHaveBeenCalled();
    });
  });
});