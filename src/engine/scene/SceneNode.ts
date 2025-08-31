import { Point, Rect, RenderContext } from '../../types';
import { Transform, Vector2 } from '../math';

/**
 * 场景节点接口
 */
export interface ISceneNode {
  id: string;
  name: string;
  parent: ISceneNode | null;
  children: ISceneNode[];
  transform: Transform;
  visible: boolean;
  enabled: boolean;
  zIndex: number;

  addChild(child: ISceneNode): void;
  removeChild(child: ISceneNode): void;
  removeFromParent(): void;
  getWorldTransform(): Transform;
  getWorldBounds(): Rect;
  getBounds(): Rect;
  findChildRecursive(id: string): ISceneNode | null;
  hitTest(point: Point): ISceneNode | null;
  update(deltaTime: number): void;
  render(context: RenderContext): void;
  dispose(): void;
}

/**
 * 场景节点基类
 */
export abstract class SceneNode implements ISceneNode {
  public id: string;
  public name: string;
  public parent: ISceneNode | null = null;
  public children: ISceneNode[] = [];
  public transform: Transform;
  public visible: boolean = true;
  public enabled: boolean = true;
  public zIndex: number = 0;
  
  protected _localBounds: Rect = { x: 0, y: 0, width: 0, height: 0 };
  protected _worldTransform: Transform | null = null;
  protected _worldTransformDirty: boolean = true;
  protected _userData: Record<string, unknown> = {};

  constructor(id: string, name?: string) {
    this.id = id;
    this.name = name || id;
    this.transform = new Transform();
    
    // 监听变换变化
    this.setupTransformListeners();
  }

  // Drawable接口实现
  get bounds(): Rect {
    return this.getWorldBounds();
  }

  getBounds(): Rect {
    return this.getWorldBounds();
  }

  setTransform(transform: Transform): void {
    this.transform = transform;
    this.markWorldTransformDirty();
  }

  draw(context: RenderContext): void {
    this.render(context);
  }

  // 层级管理
  addChild(child: ISceneNode): void {
    if (child.parent) {
      child.removeFromParent();
    }
    
    this.children.push(child);
    child.parent = this;
    this.sortChildren();
    this.markWorldTransformDirty();
  }

  removeChild(child: ISceneNode): void {
    const index = this.children.indexOf(child);
    if (index !== -1) {
      this.children.splice(index, 1);
      child.parent = null;
      this.markWorldTransformDirty();
    }
  }

  removeFromParent(): void {
    if (this.parent) {
      this.parent.removeChild(this);
    }
  }

  removeAllChildren(): void {
    while (this.children.length > 0) {
      this.removeChild(this.children[0]);
    }
  }

  // 查找方法
  findChild(id: string): ISceneNode | null {
    return this.children.find(child => child.id === id) || null;
  }

  findChildByName(name: string): ISceneNode | null {
    return this.children.find(child => child.name === name) || null;
  }

  findChildRecursive(id: string): ISceneNode | null {
    const child = this.findChild(id);
    if (child) return child;

    for (const child of this.children) {
      const found = child.findChildRecursive(id);
      if (found) return found;
    }

    return null;
  }

  // 变换相关
  getWorldTransform(): Transform {
    if (this._worldTransformDirty) {
      this.updateWorldTransform();
    }
    return this._worldTransform!;
  }

  getWorldBounds(): Rect {
    const worldTransform = this.getWorldTransform();
    const localBounds = this.getLocalBounds();
    
    // 变换局部边界框的四个角点
    const corners = [
      new Vector2(localBounds.x, localBounds.y),
      new Vector2(localBounds.x + localBounds.width, localBounds.y),
      new Vector2(localBounds.x + localBounds.width, localBounds.y + localBounds.height),
      new Vector2(localBounds.x, localBounds.y + localBounds.height)
    ];

    const transformedCorners = worldTransform.transformPoints(corners);
    
    let minX = transformedCorners[0].x;
    let minY = transformedCorners[0].y;
    let maxX = transformedCorners[0].x;
    let maxY = transformedCorners[0].y;

    for (const corner of transformedCorners) {
      minX = Math.min(minX, corner.x);
      minY = Math.min(minY, corner.y);
      maxX = Math.max(maxX, corner.x);
      maxY = Math.max(maxY, corner.y);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  protected getLocalBounds(): Rect {
    return { ...this._localBounds };
  }

  protected setLocalBounds(bounds: Rect): void {
    this._localBounds = { ...bounds };
    this.markWorldTransformDirty();
  }

  // 碰撞检测
  hitTest(point: Point): ISceneNode | null {
    if (!this.visible || !this.enabled) return null;

    // 先检查子节点（从前到后，即zIndex高的先检查）
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      const hit = child.hitTest(point);
      if (hit) return hit;
    }

    // 检查自身
    if (this.hitTestSelf(point)) {
      return this;
    }

    return null;
  }

  protected hitTestSelf(point: Point): boolean {
    const worldTransform = this.getWorldTransform();
    const localPoint = worldTransform.inverseTransformPoint(new Vector2(point.x, point.y));
    const localBounds = this.getLocalBounds();
    
    return localPoint.x >= localBounds.x && 
           localPoint.x <= localBounds.x + localBounds.width &&
           localPoint.y >= localBounds.y && 
           localPoint.y <= localBounds.y + localBounds.height;
  }

  // 更新和渲染
  update(deltaTime: number): void {
    if (!this.enabled) return;

    this.updateSelf(deltaTime);

    // 更新子节点
    for (const child of this.children) {
      child.update(deltaTime);
    }
  }

  render(context: RenderContext): void {
    if (!this.visible) return;

    const { ctx } = context;
    
    // 只在Canvas 2D上下文中使用变换
    if (ctx instanceof CanvasRenderingContext2D) {
      ctx.save();

      // 应用世界变换
      const worldTransform = this.getWorldTransform();
      const matrix = worldTransform.matrix;
      const e = matrix.elements;
      ctx.transform(e[0], e[1], e[3], e[4], e[6], e[7]);
    }

    // 渲染自身
    this.renderSelf(context);

    // 渲染子节点
    for (const child of this.children) {
      child.render(context);
    }

    if (ctx instanceof CanvasRenderingContext2D) {
      ctx.restore();
    }
  }

  // 抽象方法，子类实现
  protected abstract updateSelf(deltaTime: number): void;
  protected abstract renderSelf(context: RenderContext): void;

  // 用户数据
  setUserData(key: string, value: any): void {
    this._userData[key] = value;
  }

  getUserData(key: string): any {
    return this._userData[key];
  }

  hasUserData(key: string): boolean {
    return key in this._userData;
  }

  // 工具方法
  private updateWorldTransform(): void {
    if (this.parent) {
      const parentWorldTransform = this.parent.getWorldTransform();
      this._worldTransform = parentWorldTransform.combine(this.transform);
    } else {
      this._worldTransform = this.transform.clone();
    }
    this._worldTransformDirty = false;
  }

  private markWorldTransformDirty(): void {
    this._worldTransformDirty = true;
    
    // 递归标记子节点的世界变换为脏
    for (const child of this.children) {
      if (child instanceof SceneNode) {
        child.markWorldTransformDirty();
      }
    }
  }

  private setupTransformListeners(): void {
    // 这里可以添加变换监听逻辑
    // 当transform发生变化时，标记世界变换为脏
  }

  private sortChildren(): void {
    this.children.sort((a, b) => a.zIndex - b.zIndex);
  }

  // 销毁
  dispose(): void {
    this.removeAllChildren();
    this.removeFromParent();
    this._userData = {};
  }

  // 调试信息
  toString(): string {
    return `${this.constructor.name}(id: ${this.id}, name: ${this.name})`;
  }

  getDebugInfo(): object {
    return {
      id: this.id,
      name: this.name,
      visible: this.visible,
      enabled: this.enabled,
      zIndex: this.zIndex,
      childCount: this.children.length,
      localBounds: this.getLocalBounds(),
      worldBounds: this.getWorldBounds(),
      transform: this.transform.toObject()
    };
  }
}
