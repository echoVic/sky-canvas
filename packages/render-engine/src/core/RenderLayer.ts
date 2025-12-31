/**
 * 渲染层实现
 */

import { IRenderLayer, IRenderable } from './IRenderEngine';

/**
 * 渲染层类
 * 管理一组可渲染对象
 */
export class RenderLayer implements IRenderLayer {
  private renderables: Map<string, IRenderable> = new Map();

  constructor(
    public readonly id: string,
    public visible: boolean = true,
    public opacity: number = 1,
    public zIndex: number = 0
  ) {}

  /**
   * 添加可渲染对象
   */
  addRenderable(renderable: IRenderable): void {
    this.renderables.set(renderable.id, renderable);
  }

  /**
   * 移除可渲染对象
   */
  removeRenderable(id: string): void {
    this.renderables.delete(id);
  }

  /**
   * 获取所有可见的可渲染对象（按 zIndex 排序）
   */
  getRenderables(): IRenderable[] {
    const all = Array.from(this.renderables.values());
    const visible = all.filter((r) => r.visible);
    return visible.sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * 清空所有可渲染对象
   */
  clear(): void {
    this.renderables.clear();
  }
}
