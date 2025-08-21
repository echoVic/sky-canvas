import { Point, Rect, RenderContext } from '../../types';
import { Shape } from '../core/shapes';
import { SceneNode } from './SceneNode';

/**
 * 图形节点类 - 将Shape包装为SceneNode
 */
export class ShapeNode extends SceneNode {
  private _shape: Shape;

  constructor(shape: Shape, name?: string) {
    super(shape.id, name || shape.id);
    this._shape = shape;
    
    // 同步属性
    this.visible = shape.visible;
    this.zIndex = shape.zIndex;
    this.transform = shape.transform;
    
    // 设置局部边界
    this.setLocalBounds(shape.bounds);
  }

  get shape(): Shape {
    return this._shape;
  }

  protected updateSelf(_deltaTime: number): void {
    // 同步属性
    this._shape.visible = this.visible;
    this._shape.zIndex = this.zIndex;
    this._shape.transform = this.transform;
  }

  protected renderSelf(context: RenderContext): void {
    // 委托给Shape进行渲染
    this._shape.draw(context);
  }

  protected hitTestSelf(point: Point): boolean {
    // 委托给Shape进行碰撞检测
    return this._shape.hitTest(point);
  }

  protected getLocalBounds(): Rect {
    return this._shape.bounds;
  }

  dispose(): void {
    // 清理资源
    super.dispose();
  }
}

/**
 * 便利函数：将Shape包装为ShapeNode
 */
export function wrapShape(shape: Shape, name?: string): ShapeNode {
  return new ShapeNode(shape, name);
}