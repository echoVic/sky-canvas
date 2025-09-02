import { Point, Rect } from '../../types';
import { Transform, Vector2 } from '../math';

/**
 * 视口管理器
 */
export class Viewport {
  private _bounds: Rect;
  private _zoom: number = 1.0;
  private _pan: Vector2 = new Vector2(0, 0);
  private _rotation: number = 0;
  private _transform: Transform;
  private _inverseTransform: Transform | null = null;
  private _transformDirty: boolean = true;

  // 约束参数
  private _minZoom: number = 0.1;
  private _maxZoom: number = 10.0;
  private _panBounds: Rect | null = null;

  constructor(bounds: Rect) {
    this._bounds = { ...bounds };
    this._transform = new Transform();
    this.updateTransform();
  }

  // 基础属性
  get bounds(): Rect {
    return { ...this._bounds };
  }

  set bounds(value: Rect) {
    this._bounds = { ...value };
    this._transformDirty = true;
  }

  get zoom(): number {
    return this._zoom;
  }

  set zoom(value: number) {
    this.setZoom(value);
  }

  get pan(): Vector2 {
    return this._pan.clone();
  }

  set pan(value: Vector2) {
    this.setPan(value);
  }

  get rotation(): number {
    return this._rotation;
  }

  set rotation(value: number) {
    this.setRotation(value);
  }

  get center(): Vector2 {
    return new Vector2(
      this._bounds.x + this._bounds.width / 2,
      this._bounds.y + this._bounds.height / 2
    );
  }

  // 缩放控制
  setZoom(zoom: number, center?: Point): void {
    const oldZoom = this._zoom;
    this._zoom = Math.max(this._minZoom, Math.min(this._maxZoom, zoom));

    if (center && oldZoom !== this._zoom) {
      // 以指定点为中心进行缩放
      const zoomFactor = this._zoom / oldZoom;
      const centerVector = new Vector2(center.x, center.y);
      const viewCenter = this.center;
      
      // 计算缩放后的偏移
      const offset = centerVector.subtract(viewCenter).multiplyScalar(1 - zoomFactor);
      this._pan = this._pan.add(offset);
    }

    this._transformDirty = true;
    this.applyConstraints();
  }

  zoomIn(factor: number = 1.2, center?: Point): void {
    this.setZoom(this._zoom * factor, center);
  }

  zoomOut(factor: number = 1.2, center?: Point): void {
    this.setZoom(this._zoom / factor, center);
  }

  zoomToFit(bounds: Rect, padding: number = 50): void {
    const availableWidth = this._bounds.width - padding * 2;
    const availableHeight = this._bounds.height - padding * 2;
    
    const scaleX = availableWidth / bounds.width;
    const scaleY = availableHeight / bounds.height;
    const scale = Math.min(scaleX, scaleY);

    this.setZoom(scale);
    this.panTo(new Vector2(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2
    ));
  }

  // 平移控制
  setPan(pan: Vector2): void {
    this._pan = pan.clone();
    this._transformDirty = true;
    this.applyConstraints();
  }

  panBy(delta: Vector2): void {
    this._pan = this._pan.add(delta);
    this._transformDirty = true;
    this.applyConstraints();
  }

  panTo(worldPoint: Vector2): void {
    const viewCenter = this.center;
    const worldCenter = this.screenToWorld(viewCenter);
    const delta = worldPoint.subtract(worldCenter);
    this.panBy(delta);
  }

  // 旋转控制
  setRotation(rotation: number): void {
    this._rotation = rotation;
    this._transformDirty = true;
  }

  rotateBy(deltaRotation: number): void {
    this.setRotation(this._rotation + deltaRotation);
  }

  // 约束设置
  setZoomConstraints(minZoom: number, maxZoom: number): void {
    this._minZoom = Math.max(0.01, minZoom);
    this._maxZoom = Math.max(this._minZoom, maxZoom);
    this.setZoom(this._zoom); // 重新应用约束
  }

  setPanConstraints(bounds: Rect | null): void {
    this._panBounds = bounds ? { ...bounds } : null;
    this.applyConstraints();
  }

  // 坐标转换
  screenToWorld(screenPoint: Point | Vector2): Vector2 {
    const point = screenPoint instanceof Vector2 ? screenPoint : new Vector2(screenPoint.x, screenPoint.y);
    
    // 转换到视口坐标系
    const viewportPoint = point.subtract(new Vector2(this._bounds.x, this._bounds.y));
    
    // 应用逆变换
    const inverseTransform = this.getInverseTransform();
    return inverseTransform.transformPoint(viewportPoint);
  }

  worldToScreen(worldPoint: Point | Vector2): Vector2 {
    const point = worldPoint instanceof Vector2 ? worldPoint : new Vector2(worldPoint.x, worldPoint.y);
    
    // 应用变换
    const transform = this.getTransform();
    const viewportPoint = transform.transformPoint(point);
    
    // 转换到屏幕坐标系
    return viewportPoint.add(new Vector2(this._bounds.x, this._bounds.y));
  }

  screenToViewport(screenPoint: Point | Vector2): Vector2 {
    const point = screenPoint instanceof Vector2 ? screenPoint : new Vector2(screenPoint.x, screenPoint.y);
    return point.subtract(new Vector2(this._bounds.x, this._bounds.y));
  }

  viewportToScreen(viewportPoint: Point | Vector2): Vector2 {
    const point = viewportPoint instanceof Vector2 ? viewportPoint : new Vector2(viewportPoint.x, viewportPoint.y);
    return point.add(new Vector2(this._bounds.x, this._bounds.y));
  }

  // 可见区域
  getVisibleWorldBounds(): Rect {
    const topLeft = this.screenToWorld(new Vector2(this._bounds.x, this._bounds.y));
    const bottomRight = this.screenToWorld(new Vector2(
      this._bounds.x + this._bounds.width,
      this._bounds.y + this._bounds.height
    ));

    return {
      x: Math.min(topLeft.x, bottomRight.x),
      y: Math.min(topLeft.y, bottomRight.y),
      width: Math.abs(bottomRight.x - topLeft.x),
      height: Math.abs(bottomRight.y - topLeft.y)
    };
  }

  isPointInViewport(screenPoint: Point): boolean {
    return screenPoint.x >= this._bounds.x &&
           screenPoint.x <= this._bounds.x + this._bounds.width &&
           screenPoint.y >= this._bounds.y &&
           screenPoint.y <= this._bounds.y + this._bounds.height;
  }

  isWorldBoundsVisible(worldBounds: Rect): boolean {
    const visibleBounds = this.getVisibleWorldBounds();
    return !(worldBounds.x + worldBounds.width < visibleBounds.x ||
             visibleBounds.x + visibleBounds.width < worldBounds.x ||
             worldBounds.y + worldBounds.height < visibleBounds.y ||
             visibleBounds.y + visibleBounds.height < worldBounds.y);
  }

  // 变换矩阵
  getTransform(): Transform {
    if (this._transformDirty) {
      this.updateTransform();
    }
    return this._transform;
  }

  getInverseTransform(): Transform {
    if (this._transformDirty || !this._inverseTransform) {
      this.updateTransform();
    }
    return this._inverseTransform!;
  }

  applyToContext(ctx: CanvasRenderingContext2D): void {
    const transform = this.getTransform();
    const matrix = transform.matrix;
    const e = matrix.elements;
    
    // 设置裁剪区域
    ctx.save();
    ctx.beginPath();
    ctx.rect(this._bounds.x, this._bounds.y, this._bounds.width, this._bounds.height);
    ctx.clip();
    
    // 移动到视口中心
    ctx.translate(
      this._bounds.x + this._bounds.width / 2,
      this._bounds.y + this._bounds.height / 2
    );
    
    // 应用变换
    ctx.transform(e[0], e[1], e[3], e[4], e[6], e[7]);
  }

  restoreContext(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }

  // 动画支持
  animateTo(
    targetZoom: number,
    targetPan: Vector2,
    targetRotation: number = this._rotation,
    duration: number = 300
  ): Promise<void> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const startZoom = this._zoom;
      const startPan = this._pan.clone();
      const startRotation = this._rotation;

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数
        const eased = this.easeInOutCubic(progress);
        
        // 插值计算
        const currentZoom = startZoom + (targetZoom - startZoom) * eased;
        const currentPan = startPan.lerp(targetPan, eased);
        const currentRotation = startRotation + (targetRotation - startRotation) * eased;
        
        this.setZoom(currentZoom);
        this.setPan(currentPan);
        this.setRotation(currentRotation);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }

  // 私有方法
  private updateTransform(): void {
    // 创建变换：平移到中心 -> 缩放 -> 旋转 -> 平移偏移
    this._transform = new Transform();
    this._transform.setPosition(-this._pan.x * this._zoom, -this._pan.y * this._zoom);
    this._transform.setScale(this._zoom, this._zoom);
    this._transform.setRotation(this._rotation);

    // 创建逆变换
    this._inverseTransform = this._transform.inverse();
    if (!this._inverseTransform) {
      throw new Error('Cannot create inverse transform');
    }

    this._transformDirty = false;
  }

  private applyConstraints(): void {
    // 应用缩放约束
    this._zoom = Math.max(this._minZoom, Math.min(this._maxZoom, this._zoom));

    // 应用平移约束
    if (this._panBounds) {
      const visibleBounds = this.getVisibleWorldBounds();
      
      if (visibleBounds.width <= this._panBounds.width) {
        const minX = this._panBounds.x;
        const maxX = this._panBounds.x + this._panBounds.width - visibleBounds.width;
        this._pan.x = Math.max(minX, Math.min(maxX, this._pan.x));
      }
      
      if (visibleBounds.height <= this._panBounds.height) {
        const minY = this._panBounds.y;
        const maxY = this._panBounds.y + this._panBounds.height - visibleBounds.height;
        this._pan.y = Math.max(minY, Math.min(maxY, this._pan.y));
      }
    }

    this._transformDirty = true;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // 重置
  reset(): void {
    this._zoom = 1.0;
    this._pan = new Vector2(0, 0);
    this._rotation = 0;
    this._transformDirty = true;
  }

  // 调试信息
  getDebugInfo(): object {
    return {
      bounds: this._bounds,
      zoom: this._zoom,
      pan: this._pan.toArray(),
      rotation: this._rotation,
      visibleWorldBounds: this.getVisibleWorldBounds(),
      constraints: {
        minZoom: this._minZoom,
        maxZoom: this._maxZoom,
        panBounds: this._panBounds
      }
    };
  }
}
