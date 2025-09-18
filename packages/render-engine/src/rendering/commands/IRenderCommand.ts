/**
 * 渲染命令接口
 * 基于Command模式，将渲染操作抽象为可批处理的命令
 */
import { IGraphicsContext, IPoint, IRect } from '../../core/interface/IGraphicsContext';

/**
 * 渲染命令类型
 */
export enum RenderCommandType {
  CLEAR = 'clear',
  RECT = 'rect',
  CIRCLE = 'circle', 
  PATH = 'path',
  TEXT = 'text',
  IMAGE = 'image',
  COMPOSITE = 'composite',
  QUAD = 'quad',
  TRIANGLE = 'triangle'
}

/**
 * 渲染材质键 - 用于批处理分组
 */
export interface MaterialKey {
  /** 纹理ID */
  textureId?: string;
  /** 着色器ID */
  shaderId?: string;
  /** 混合模式 */
  blendMode?: string;
  /** 填充颜色 */
  fillColor?: string;
  /** 描边颜色 */
  strokeColor?: string;
  /** 其他渲染状态 */
  [key: string]: any;
}

/**
 * 渲染命令基础接口
 */
export interface IRenderCommand {
  /** 唯一标识 */
  readonly id: string;
  
  /** 命令类型 */
  readonly type: RenderCommandType;
  
  /** Z轴层级 */
  readonly zIndex: number;
  
  /** 材质键 - 用于批处理分组 */
  readonly materialKey: MaterialKey;
  
  /**
   * 执行渲染命令
   * @param context 图形上下文
   */
  execute(context: IGraphicsContext): void;
  
  /**
   * 获取边界框
   * @returns 边界框
   */
  getBounds(): IRect;
  
  /**
   * 检查是否可以与其他命令批处理
   * @param other 其他渲染命令
   * @returns 是否可以批处理
   */
  canBatchWith(other: IRenderCommand): boolean;
  
  /**
   * 获取渲染数据用于批处理
   * @returns 渲染数据
   */
  getBatchData(): any;
  
  /**
   * 检查是否在视口内
   * @param viewport 视口
   * @returns 是否可见
   */
  isVisible(viewport: IRect): boolean;
  
  /**
   * 释放资源
   */
  dispose(): void;
}

/**
 * 渲染命令基类
 */
export abstract class RenderCommand implements IRenderCommand {
  protected static idCounter = 0;
  
  readonly id: string;
  readonly zIndex: number;
  protected _bounds?: IRect;
  protected _materialKey: MaterialKey;
  
  constructor(
    public readonly type: RenderCommandType,
    zIndex: number = 0,
    materialKey: Partial<MaterialKey> = {}
  ) {
    this.id = `${type}_${++RenderCommand.idCounter}`;
    this.zIndex = zIndex;
    this._materialKey = { ...materialKey };
  }
  
  get materialKey(): MaterialKey {
    return { ...this._materialKey };
  }
  
  abstract execute(context: IGraphicsContext): void;
  abstract getBounds(): IRect;
  abstract getBatchData(): any;
  
  canBatchWith(other: IRenderCommand): boolean {
    // 基本批处理条件：相同类型和材质
    if (this.type !== other.type) return false;
    
    const myKey = this.materialKey;
    const otherKey = other.materialKey;
    
    // 检查关键材质属性是否相同
    return myKey.textureId === otherKey.textureId &&
           myKey.shaderId === otherKey.shaderId &&
           myKey.blendMode === otherKey.blendMode &&
           myKey.fillColor === otherKey.fillColor &&
           myKey.strokeColor === otherKey.strokeColor;
  }
  
  isVisible(viewport: IRect): boolean {
    const bounds = this.getBounds();
    return this.rectsIntersect(bounds, viewport);
  }
  
  protected rectsIntersect(a: IRect, b: IRect): boolean {
    return !(a.x + a.width < b.x ||
             b.x + b.width < a.x ||
             a.y + a.height < b.y ||
             b.y + b.height < a.y);
  }
  
  dispose(): void {
    this._bounds = undefined;
  }
}

/**
 * 清屏命令
 */
export class ClearCommand extends RenderCommand {
  constructor(
    private color?: string,
    zIndex: number = -1000
  ) {
    super(RenderCommandType.CLEAR, zIndex, { fillColor: color });
  }
  
  execute(context: IGraphicsContext): void {
    context.clear();
  }
  
  getBounds(): IRect {
    return { x: 0, y: 0, width: Infinity, height: Infinity };
  }
  
  getBatchData(): any {
    return { color: this.color };
  }
  
  canBatchWith(other: IRenderCommand): boolean {
    // 清屏命令不能批处理
    return false;
  }
}

/**
 * 矩形绘制命令
 */
export class RectCommand extends RenderCommand {
  constructor(
    private rect: IRect,
    private fill: boolean = false,
    private stroke: boolean = true,
    fillColor?: string,
    strokeColor?: string,
    lineWidth: number = 1,
    zIndex: number = 0
  ) {
    super(RenderCommandType.RECT, zIndex, {
      fillColor: fill ? fillColor : undefined,
      strokeColor: stroke ? strokeColor : undefined,
      lineWidth
    });
  }
  
  execute(context: IGraphicsContext): void {
    context.drawRect(this.rect, this.fill, this.stroke);
  }
  
  getBounds(): IRect {
    const lineWidth = this._materialKey.lineWidth || 1;
    const halfLine = lineWidth / 2;
    return {
      x: this.rect.x - halfLine,
      y: this.rect.y - halfLine,
      width: this.rect.width + lineWidth,
      height: this.rect.height + lineWidth
    };
  }
  
  getBatchData(): any {
    return {
      x: this.rect.x,
      y: this.rect.y,
      width: this.rect.width,
      height: this.rect.height,
      fill: this.fill,
      stroke: this.stroke
    };
  }
}

/**
 * 圆形绘制命令
 */
export class CircleCommand extends RenderCommand {
  constructor(
    private center: IPoint,
    private radius: number,
    private fill: boolean = false,
    private stroke: boolean = true,
    fillColor?: string,
    strokeColor?: string,
    lineWidth: number = 1,
    zIndex: number = 0
  ) {
    super(RenderCommandType.CIRCLE, zIndex, {
      fillColor: fill ? fillColor : undefined,
      strokeColor: stroke ? strokeColor : undefined,
      lineWidth
    });
  }
  
  execute(context: IGraphicsContext): void {
    context.drawCircle(this.center, this.radius, this.fill, this.stroke);
  }
  
  getBounds(): IRect {
    const lineWidth = this._materialKey.lineWidth || 1;
    const halfLine = lineWidth / 2;
    const effectiveRadius = this.radius + halfLine;
    return {
      x: this.center.x - effectiveRadius,
      y: this.center.y - effectiveRadius,
      width: effectiveRadius * 2,
      height: effectiveRadius * 2
    };
  }
  
  getBatchData(): any {
    return {
      centerX: this.center.x,
      centerY: this.center.y,
      radius: this.radius,
      fill: this.fill,
      stroke: this.stroke
    };
  }
}