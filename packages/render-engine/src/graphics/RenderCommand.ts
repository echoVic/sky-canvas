/**
 * 渲染命令系统
 * 使用命令模式将渲染操作抽象为可执行的命令
 */

import { IGraphicsContext, IGraphicsStyle, ITextStyle, IImageData } from './IGraphicsContext';

/**
 * 渲染命令基础接口
 */
export interface IRenderCommand {
  readonly type: string;
  execute(context: IGraphicsContext): void;
  canBatch?: boolean;
  priority?: number;
}

/**
 * 状态管理命令
 */
export class SaveStateCommand implements IRenderCommand {
  readonly type = 'save-state';
  
  execute(context: IGraphicsContext): void {
    context.save();
  }
}

export class RestoreStateCommand implements IRenderCommand {
  readonly type = 'restore-state';
  
  execute(context: IGraphicsContext): void {
    context.restore();
  }
}

/**
 * 变换命令
 */
export class TranslateCommand implements IRenderCommand {
  readonly type = 'translate';
  
  constructor(
    private readonly x: number,
    private readonly y: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.translate(this.x, this.y);
  }
}

export class RotateCommand implements IRenderCommand {
  readonly type = 'rotate';
  
  constructor(private readonly angle: number) {}
  
  execute(context: IGraphicsContext): void {
    context.rotate(this.angle);
  }
}

export class ScaleCommand implements IRenderCommand {
  readonly type = 'scale';
  
  constructor(
    private readonly x: number,
    private readonly y: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.scale(this.x, this.y);
  }
}

/**
 * 样式命令
 */
export class SetStyleCommand implements IRenderCommand {
  readonly type = 'set-style';
  
  constructor(private readonly style: Partial<IGraphicsStyle>) {}
  
  execute(context: IGraphicsContext): void {
    context.setStyle(this.style);
  }
}

/**
 * 清除命令
 */
export class ClearCommand implements IRenderCommand {
  readonly type = 'clear';
  
  execute(context: IGraphicsContext): void {
    context.clear();
  }
}

export class ClearRectCommand implements IRenderCommand {
  readonly type = 'clear-rect';
  
  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.clearRect(this.x, this.y, this.width, this.height);
  }
}

/**
 * 路径命令
 */
export class BeginPathCommand implements IRenderCommand {
  readonly type = 'begin-path';
  
  execute(context: IGraphicsContext): void {
    context.beginPath();
  }
}

export class ClosePathCommand implements IRenderCommand {
  readonly type = 'close-path';
  
  execute(context: IGraphicsContext): void {
    context.closePath();
  }
}

export class MoveToCommand implements IRenderCommand {
  readonly type = 'move-to';
  
  constructor(
    private readonly x: number,
    private readonly y: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.moveTo(this.x, this.y);
  }
}

export class LineToCommand implements IRenderCommand {
  readonly type = 'line-to';
  
  constructor(
    private readonly x: number,
    private readonly y: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.lineTo(this.x, this.y);
  }
}

export class ArcCommand implements IRenderCommand {
  readonly type = 'arc';
  
  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly radius: number,
    private readonly startAngle: number,
    private readonly endAngle: number,
    private readonly counterclockwise?: boolean
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.arc(this.x, this.y, this.radius, this.startAngle, this.endAngle, this.counterclockwise);
  }
}

export class RectCommand implements IRenderCommand {
  readonly type = 'rect';
  
  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.rect(this.x, this.y, this.width, this.height);
  }
}

/**
 * 填充和描边命令
 */
export class FillCommand implements IRenderCommand {
  readonly type = 'fill';
  
  execute(context: IGraphicsContext): void {
    context.fill();
  }
}

export class StrokeCommand implements IRenderCommand {
  readonly type = 'stroke';
  
  execute(context: IGraphicsContext): void {
    context.stroke();
  }
}

export class FillRectCommand implements IRenderCommand {
  readonly type = 'fill-rect';
  readonly canBatch = true;
  
  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.fillRect(this.x, this.y, this.width, this.height);
  }
}

export class StrokeRectCommand implements IRenderCommand {
  readonly type = 'stroke-rect';
  readonly canBatch = true;
  
  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.strokeRect(this.x, this.y, this.width, this.height);
  }
}

/**
 * 圆形命令
 */
export class FillCircleCommand implements IRenderCommand {
  readonly type = 'fill-circle';
  readonly canBatch = true;
  
  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly radius: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.fillCircle(this.x, this.y, this.radius);
  }
}

export class StrokeCircleCommand implements IRenderCommand {
  readonly type = 'stroke-circle';
  readonly canBatch = true;
  
  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly radius: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.strokeCircle(this.x, this.y, this.radius);
  }
}

/**
 * 文本命令
 */
export class FillTextCommand implements IRenderCommand {
  readonly type = 'fill-text';
  readonly canBatch = true;
  
  constructor(
    private readonly text: string,
    private readonly x: number,
    private readonly y: number,
    private readonly style?: ITextStyle
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.fillText(this.text, this.x, this.y, this.style);
  }
}

export class StrokeTextCommand implements IRenderCommand {
  readonly type = 'stroke-text';
  readonly canBatch = true;
  
  constructor(
    private readonly text: string,
    private readonly x: number,
    private readonly y: number,
    private readonly style?: ITextStyle
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.strokeText(this.text, this.x, this.y, this.style);
  }
}

/**
 * 图像命令
 */
export class DrawImageCommand implements IRenderCommand {
  readonly type = 'draw-image';
  
  constructor(
    private readonly imageData: IImageData,
    private readonly dx: number,
    private readonly dy: number,
    private readonly dw?: number,
    private readonly dh?: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    if (this.dw !== undefined && this.dh !== undefined) {
      context.drawImage(this.imageData, this.dx, this.dy, this.dw, this.dh);
    } else {
      context.drawImage(this.imageData, this.dx, this.dy);
    }
  }
}

/**
 * 裁剪命令
 */
export class ClipCommand implements IRenderCommand {
  readonly type = 'clip';
  
  execute(context: IGraphicsContext): void {
    context.clip();
  }
}

export class ClipRectCommand implements IRenderCommand {
  readonly type = 'clip-rect';
  
  constructor(
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number
  ) {}
  
  execute(context: IGraphicsContext): void {
    context.clipRect(this.x, this.y, this.width, this.height);
  }
}

/**
 * 复合命令 - 将多个命令组合为一个
 */
export class CompositeCommand implements IRenderCommand {
  readonly type = 'composite';
  
  constructor(private readonly commands: IRenderCommand[]) {}
  
  execute(context: IGraphicsContext): void {
    for (const command of this.commands) {
      command.execute(context);
    }
  }
}

/**
 * 命令构建器 - 提供流式API来构建渲染命令
 */
export class RenderCommandBuilder {
  private commands: IRenderCommand[] = [];
  
  save(): this {
    this.commands.push(new SaveStateCommand());
    return this;
  }
  
  restore(): this {
    this.commands.push(new RestoreStateCommand());
    return this;
  }
  
  translate(x: number, y: number): this {
    this.commands.push(new TranslateCommand(x, y));
    return this;
  }
  
  rotate(angle: number): this {
    this.commands.push(new RotateCommand(angle));
    return this;
  }
  
  scale(x: number, y: number): this {
    this.commands.push(new ScaleCommand(x, y));
    return this;
  }
  
  setStyle(style: Partial<IGraphicsStyle>): this {
    this.commands.push(new SetStyleCommand(style));
    return this;
  }
  
  clear(): this {
    this.commands.push(new ClearCommand());
    return this;
  }
  
  clearRect(x: number, y: number, width: number, height: number): this {
    this.commands.push(new ClearRectCommand(x, y, width, height));
    return this;
  }
  
  beginPath(): this {
    this.commands.push(new BeginPathCommand());
    return this;
  }
  
  closePath(): this {
    this.commands.push(new ClosePathCommand());
    return this;
  }
  
  moveTo(x: number, y: number): this {
    this.commands.push(new MoveToCommand(x, y));
    return this;
  }
  
  lineTo(x: number, y: number): this {
    this.commands.push(new LineToCommand(x, y));
    return this;
  }
  
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number, counterclockwise?: boolean): this {
    this.commands.push(new ArcCommand(x, y, radius, startAngle, endAngle, counterclockwise));
    return this;
  }
  
  rect(x: number, y: number, width: number, height: number): this {
    this.commands.push(new RectCommand(x, y, width, height));
    return this;
  }
  
  fill(): this {
    this.commands.push(new FillCommand());
    return this;
  }
  
  stroke(): this {
    this.commands.push(new StrokeCommand());
    return this;
  }
  
  fillRect(x: number, y: number, width: number, height: number): this {
    this.commands.push(new FillRectCommand(x, y, width, height));
    return this;
  }
  
  strokeRect(x: number, y: number, width: number, height: number): this {
    this.commands.push(new StrokeRectCommand(x, y, width, height));
    return this;
  }
  
  fillCircle(x: number, y: number, radius: number): this {
    this.commands.push(new FillCircleCommand(x, y, radius));
    return this;
  }
  
  strokeCircle(x: number, y: number, radius: number): this {
    this.commands.push(new StrokeCircleCommand(x, y, radius));
    return this;
  }
  
  fillText(text: string, x: number, y: number, style?: ITextStyle): this {
    this.commands.push(new FillTextCommand(text, x, y, style));
    return this;
  }
  
  strokeText(text: string, x: number, y: number, style?: ITextStyle): this {
    this.commands.push(new StrokeTextCommand(text, x, y, style));
    return this;
  }
  
  drawImage(imageData: IImageData, dx: number, dy: number, dw?: number, dh?: number): this {
    this.commands.push(new DrawImageCommand(imageData, dx, dy, dw, dh));
    return this;
  }
  
  clip(): this {
    this.commands.push(new ClipCommand());
    return this;
  }
  
  clipRect(x: number, y: number, width: number, height: number): this {
    this.commands.push(new ClipRectCommand(x, y, width, height));
    return this;
  }
  
  build(): IRenderCommand {
    if (this.commands.length === 1) {
      return this.commands[0];
    }
    return new CompositeCommand([...this.commands]);
  }
  
  buildAll(): IRenderCommand[] {
    return [...this.commands];
  }
  
  reset(): this {
    this.commands = [];
    return this;
  }
}