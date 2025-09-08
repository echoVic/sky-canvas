import { IPoint as Point, IRect as Rect, IGraphicsContext as RenderContext } from '@sky-canvas/render-engine';
import { IShape } from './IShape';
import { SceneNode } from './SceneNode';

/**
 * 图形节点类 - 将Shape包装为SceneNode
 */
export class ShapeNode extends SceneNode {
  private _shape: IShape;

  constructor(shape: IShape, name?: string) {
    super(shape.id, name || shape.id);
    this._shape = shape;
    
    // 同步属性
    this.visible = shape.visible;
    this.zIndex = shape.zIndex;
    
    // 设置局部边界
    this.setLocalBounds(shape.getBounds());
  }

  get shape(): IShape {
    return this._shape;
  }

  protected updateSelf(_deltaTime: number): void {
    // 形状属性同步由形状自身管理
    // IShape的visible和zIndex是只读属性
  }

  protected renderSelf(context: RenderContext): void {
    // 委托给Shape进行渲染
    this._shape.render(context);
  }

  protected hitTestSelf(point: Point): boolean {
    // 委托给Shape进行碰撞检测
    return this._shape.hitTest(point);
  }

  protected getLocalBounds(): Rect {
    return this._shape.getBounds();
  }

  dispose(): void {
    // 清理资源
    super.dispose();
  }
}

/**
 * 便利函数：将Shape包装为ShapeNode
 */
export function wrapShape(shape: IShape, name?: string): ShapeNode {
  return new ShapeNode(shape, name);
}