import { IPoint } from '../graphics/IGraphicsContext';
import { RenderCommand, RenderState } from './index';

// Canvas 2D特定的渲染上下文
export interface Canvas2DRenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  viewport: { x: number; y: number; width: number; height: number };
  devicePixelRatio: number;
}

/**
 * 清空画布命令
 */
export class ClearCommand implements RenderCommand {
  type = 'clear';
  
  constructor(
    private color?: string,
    private bounds?: { x: number; y: number; width: number; height: number }
  ) {}

  execute(context: Canvas2DRenderContext | any): void {
    // 类型断言以确保是Canvas2D上下文
    if (!context.ctx || typeof context.ctx.save !== 'function') {
      console.warn('ClearCommand requires Canvas2D context');
      return;
    }
    const { ctx } = context;
    
    if (this.bounds) {
      ctx.save();
      if (this.color) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
      } else {
        ctx.clearRect(this.bounds.x, this.bounds.y, this.bounds.width, this.bounds.height);
      }
      ctx.restore();
    } else {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      if (this.color) {
        ctx.fillStyle = this.color;
        ctx.fillRect(0, 0, context.canvas.width, context.canvas.height);
      } else {
        ctx.clearRect(0, 0, context.canvas.width, context.canvas.height);
      }
      ctx.restore();
    }
  }
}

/**
 * 绘制线段命令
 */
export class DrawLineCommand implements RenderCommand {
  type = 'drawLine';
  
  constructor(
    private start: IPoint,
    private end: IPoint,
    private style?: Partial<RenderState>
  ) {}

  execute(context: any, state?: RenderState): void {
    // 类型检查，只处理Canvas2D上下文
    if (!context.ctx || typeof context.ctx.save !== 'function') {
      console.warn('DrawLineCommand requires Canvas2D context');
      return;
    }
    const { ctx } = context as Canvas2DRenderContext;
    ctx.save();
    
    this.applyStyle(ctx, state);
    
    ctx.beginPath();
    ctx.moveTo(this.start.x, this.start.y);
    ctx.lineTo(this.end.x, this.end.y);
    ctx.stroke();
    
    ctx.restore();
  }

  private applyStyle(ctx: CanvasRenderingContext2D, baseState?: RenderState): void {
    if (!baseState) return;
    const finalStyle = { ...baseState, ...this.style };
    
    ctx.strokeStyle = finalStyle.strokeStyle;
    ctx.lineWidth = finalStyle.lineWidth;
    ctx.lineCap = finalStyle.lineCap;
    ctx.lineJoin = finalStyle.lineJoin;
    ctx.globalAlpha = finalStyle.globalAlpha;
    ctx.globalCompositeOperation = finalStyle.globalCompositeOperation;
  }
}

/**
 * 绘制矩形命令
 */
export class DrawRectCommand implements RenderCommand {
  type = 'drawRect';
  
  constructor(
    private x: number,
    private y: number,
    private width: number,
    private height: number,
    private filled = false,
    private style?: Partial<RenderState>
  ) {}

  execute(context: any, state?: RenderState): void {
    if (!context.ctx || typeof context.ctx.save !== 'function') {
      console.warn('DrawRectCommand requires Canvas2D context');
      return;
    }
    const { ctx } = context;
    ctx.save();
    
    this.applyStyle(ctx, state);
    
    if (this.filled) {
      ctx.fillRect(this.x, this.y, this.width, this.height);
    } else {
      ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
    
    ctx.restore();
  }

  private applyStyle(ctx: CanvasRenderingContext2D, baseState?: RenderState): void {
    if (!baseState) return;
    const finalStyle = { ...baseState, ...this.style };
    
    if (this.filled) {
      ctx.fillStyle = finalStyle.fillStyle;
    } else {
      ctx.strokeStyle = finalStyle.strokeStyle;
      ctx.lineWidth = finalStyle.lineWidth;
    }
    
    ctx.globalAlpha = finalStyle.globalAlpha;
    ctx.globalCompositeOperation = finalStyle.globalCompositeOperation;
  }
}

/**
 * 绘制圆形命令
 */
export class DrawCircleCommand implements RenderCommand {
  type = 'drawCircle';
  
  constructor(
    private center: IPoint,
    private radius: number,
    private filled = false,
    private style?: Partial<RenderState>
  ) {}

  execute(context: any, state: RenderState): void {
    const { ctx } = context;
    ctx.save();
    
    this.applyStyle(ctx, state);
    
    ctx.beginPath();
    ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
    
    if (this.filled) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
    
    ctx.restore();
  }

  private applyStyle(ctx: CanvasRenderingContext2D, baseState: RenderState): void {
    const finalStyle = { ...baseState, ...this.style };
    
    if (this.filled) {
      ctx.fillStyle = finalStyle.fillStyle;
    } else {
      ctx.strokeStyle = finalStyle.strokeStyle;
      ctx.lineWidth = finalStyle.lineWidth;
    }
    
    ctx.globalAlpha = finalStyle.globalAlpha;
    ctx.globalCompositeOperation = finalStyle.globalCompositeOperation;
  }
}

/**
 * 绘制文本命令
 */
export class DrawTextCommand implements RenderCommand {
  type = 'drawText';
  
  constructor(
    private text: string,
    private position: IPoint,
    private style?: Partial<RenderState> & {
      font?: string;
      textAlign?: CanvasTextAlign;
      textBaseline?: CanvasTextBaseline;
    }
  ) {}

  execute(context: any, state: RenderState): void {
    const { ctx } = context;
    ctx.save();
    
    this.applyStyle(ctx, state);
    
    ctx.fillText(this.text, this.position.x, this.position.y);
    
    ctx.restore();
  }

  private applyStyle(ctx: CanvasRenderingContext2D, baseState: RenderState): void {
    const finalStyle = { ...baseState, ...this.style };
    
    ctx.fillStyle = finalStyle.fillStyle;
    ctx.globalAlpha = finalStyle.globalAlpha;
    ctx.globalCompositeOperation = finalStyle.globalCompositeOperation;
    
    if (this.style?.font) ctx.font = this.style.font;
    if (this.style?.textAlign) ctx.textAlign = this.style.textAlign;
    if (this.style?.textBaseline) ctx.textBaseline = this.style.textBaseline;
  }
}

/**
 * 保存渲染状态命令
 */
export class SaveStateCommand implements RenderCommand {
  type = 'saveState';
  
  execute(context: any): void {
    context.ctx.save();
  }
}

/**
 * 恢复渲染状态命令
 */
export class RestoreStateCommand implements RenderCommand {
  type = 'restoreState';
  
  execute(context: any): void {
    context.ctx.restore();
  }
}

/**
 * 变换命令
 */
export class TransformCommand implements RenderCommand {
  type = 'transform';
  
  constructor(
    private a: number,
    private b: number,
    private c: number,
    private d: number,
    private e: number,
    private f: number
  ) {}

  execute(context: any): void {
    context.ctx.transform(this.a, this.b, this.c, this.d, this.e, this.f);
  }
}

/**
 * 设置变换命令
 */
export class SetTransformCommand implements RenderCommand {
  type = 'setTransform';
  
  constructor(
    private a: number,
    private b: number,
    private c: number,
    private d: number,
    private e: number,
    private f: number
  ) {}

  execute(context: any): void {
    context.ctx.setTransform(this.a, this.b, this.c, this.d, this.e, this.f);
  }
}

/**
 * 命令批处理器
 */
export class CommandBatch {
  private commands: RenderCommand[] = [];

  add(command: RenderCommand): void {
    this.commands.push(command);
  }

  execute(context: any, state: RenderState): void {
    for (const command of this.commands) {
      command.execute(context, state);
    }
  }

  clear(): void {
    this.commands = [];
  }

  get length(): number {
    return this.commands.length;
  }
}
