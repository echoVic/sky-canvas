/**
 * 圆形图形原语实现
 */
import type { IGraphicsContext, IPoint, IRect } from '../graphics/IGraphicsContext'
import { GraphicPrimitive } from './GraphicPrimitive'
import type { ICirclePrimitive } from './IGraphicPrimitive'

/**
 * 圆形图形原语
 */
export class CirclePrimitive extends GraphicPrimitive implements ICirclePrimitive {
  readonly type = 'circle' as const

  private _radius: number

  constructor(radius: number = 50, id?: string) {
    super('circle', id)
    this._radius = radius
  }

  get radius(): number {
    return this._radius
  }

  set radius(value: number) {
    this._radius = Math.max(0, value)
  }

  render(context: IGraphicsContext): void {
    if (!this.visible) return

    this.applyTransform(context)
    this.applyStyle(context)

    const center = { x: 0, y: 0 }
    context.drawCircle(
      center,
      this._radius,
      !!this._style.fillColor,
      !!this._style.strokeColor && this._style.strokeWidth! > 0
    )

    this.restoreTransform(context)
  }

  getBounds(): IRect {
    return {
      x: this._position.x - this._radius,
      y: this._position.y - this._radius,
      width: this._radius * 2,
      height: this._radius * 2,
    }
  }

  hitTest(point: IPoint): boolean {
    const dx = point.x - this._position.x
    const dy = point.y - this._position.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance <= this._radius
  }

  clone(): CirclePrimitive {
    const cloned = new CirclePrimitive(this._radius)
    cloned.setPosition(this._position)
    cloned.setTransform(this._transform)
    cloned.setStyle(this._style)
    cloned.visible = this.visible
    cloned.zIndex = this.zIndex
    return cloned
  }

  /**
   * 设置圆形半径
   * @param radius 半径
   */
  setRadius(radius: number): void {
    this.radius = radius
  }
}
