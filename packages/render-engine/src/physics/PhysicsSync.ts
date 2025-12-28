/**
 * 物理世界与渲染世界同步器
 * 负责将物理引擎的状态同步到渲染系统
 */

import { PhysicsWorld, PhysicsBody } from './PhysicsWorld';
import { IEventBus } from '../events/EventBus';

export interface RenderObject {
  id: string;
  position: { x: number; y: number };
  rotation: number;
  scale: { x: number; y: number };
  type: 'rectangle' | 'circle' | 'polygon' | 'compound';
  width?: number;
  height?: number;
  radius?: number;
  visible: boolean;
  userData?: any;
}

export interface PhysicsSyncEvents {
  'render-object-updated': { object: RenderObject };
  'render-object-created': { object: RenderObject };
  'render-object-removed': { objectId: string };
  'sync-complete': { updatedCount: number };
}

/**
 * 物理体到渲染对象的映射
 */
export interface PhysicsRenderMapping {
  physicsId: string;
  renderId: string;
  syncPosition: boolean;
  syncRotation: boolean;
  syncScale: boolean;
  offset?: { x: number; y: number; rotation: number };
}

export class PhysicsSync {
  private mappings: Map<string, PhysicsRenderMapping> = new Map();
  private renderObjects: Map<string, RenderObject> = new Map();
  private isActive = false;
  private syncInterval = 16; // 60fps
  private lastSyncTime = 0;
  private eventBus?: IEventBus;

  constructor(
    private physicsWorld: PhysicsWorld
  ) {
    this.initialize();
  }

  private initialize(): void {
    // 监听物理世界事件
    this.physicsWorld.setEventBus({
      emit: (event: string, data: any) => {
        this.handlePhysicsEvent(event, data);
      },
      on: () => ({ dispose: () => {} }),
      off: () => {},
      dispose: () => {}
    });
  }

  /**
   * 设置事件总线
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * 处理物理世界事件
   */
  private handlePhysicsEvent(event: string, data: any): void {
    switch (event) {
      case 'body-created':
        this.onPhysicsBodyCreated(data.body);
        break;
      case 'body-removed':
        this.onPhysicsBodyRemoved(data.bodyId);
        break;
    }
  }

  /**
   * 物理体创建时的处理
   */
  private onPhysicsBodyCreated(physicsBody: PhysicsBody): void {
    // 自动创建渲染对象映射
    const renderObject = this.createRenderObjectFromPhysicsBody(physicsBody);
    
    const mapping: PhysicsRenderMapping = {
      physicsId: physicsBody.id,
      renderId: renderObject.id,
      syncPosition: true,
      syncRotation: true,
      syncScale: true
    };

    this.mappings.set(physicsBody.id, mapping);
    this.renderObjects.set(renderObject.id, renderObject);

    this.eventBus?.emit('render-object-created', { object: renderObject });
  }

  /**
   * 物理体移除时的处理
   */
  private onPhysicsBodyRemoved(physicsBodyId: string): void {
    const mapping = this.mappings.get(physicsBodyId);
    if (mapping) {
      this.renderObjects.delete(mapping.renderId);
      this.mappings.delete(physicsBodyId);
      
      this.eventBus?.emit('render-object-removed', { objectId: mapping.renderId });
    }
  }

  /**
   * 从物理体创建渲染对象
   */
  private createRenderObjectFromPhysicsBody(physicsBody: PhysicsBody): RenderObject {
    const body = physicsBody.body;
    const bounds = body.bounds;
    
    const renderObject: RenderObject = {
      id: physicsBody.id,
      position: { x: body.position.x, y: body.position.y },
      rotation: body.angle,
      scale: { x: 1, y: 1 },
      type: physicsBody.type,
      visible: true,
      userData: physicsBody.userData
    };

    // 根据物理体类型设置尺寸信息
    switch (physicsBody.type) {
      case 'rectangle':
        renderObject.width = bounds.max.x - bounds.min.x;
        renderObject.height = bounds.max.y - bounds.min.y;
        break;
      case 'circle':
        // 计算半径（取边界框的一半）
        const width = bounds.max.x - bounds.min.x;
        const height = bounds.max.y - bounds.min.y;
        renderObject.radius = Math.max(width, height) / 2;
        break;
      case 'polygon':
        renderObject.width = bounds.max.x - bounds.min.x;
        renderObject.height = bounds.max.y - bounds.min.y;
        break;
    }

    return renderObject;
  }

  /**
   * 添加物理体和渲染对象的映射
   */
  addMapping(
    physicsId: string,
    renderId: string,
    options: {
      syncPosition?: boolean;
      syncRotation?: boolean;
      syncScale?: boolean;
      offset?: { x: number; y: number; rotation: number };
    } = {}
  ): boolean {
    const physicsBody = this.physicsWorld.getBody(physicsId);
    if (!physicsBody) return false;

    const mapping: PhysicsRenderMapping = {
      physicsId,
      renderId,
      syncPosition: options.syncPosition ?? true,
      syncRotation: options.syncRotation ?? true,
      syncScale: options.syncScale ?? true,
      offset: options.offset
    };

    this.mappings.set(physicsId, mapping);
    return true;
  }

  /**
   * 移除映射
   */
  removeMapping(physicsId: string): boolean {
    return this.mappings.delete(physicsId);
  }

  /**
   * 创建渲染对象
   */
  createRenderObject(renderObject: RenderObject): void {
    this.renderObjects.set(renderObject.id, renderObject);
  }

  /**
   * 获取渲染对象
   */
  getRenderObject(id: string): RenderObject | undefined {
    return this.renderObjects.get(id);
  }

  /**
   * 获取所有渲染对象
   */
  getAllRenderObjects(): RenderObject[] {
    return Array.from(this.renderObjects.values());
  }

  /**
   * 启动同步
   */
  start(): void {
    if (this.isActive) return;

    this.isActive = true;
    this.lastSyncTime = Date.now();
    this.syncLoop();
  }

  /**
   * 停止同步
   */
  stop(): void {
    this.isActive = false;
  }

  /**
   * 同步循环
   */
  private syncLoop(): void {
    if (!this.isActive) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - this.lastSyncTime;

    if (deltaTime >= this.syncInterval) {
      this.syncAll();
      this.lastSyncTime = currentTime;
    }

    requestAnimationFrame(() => this.syncLoop());
  }

  /**
   * 同步所有映射的对象
   */
  private syncAll(): void {
    let updatedCount = 0;

    for (const mapping of this.mappings.values()) {
      if (this.syncSingle(mapping)) {
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      this.eventBus?.emit('sync-complete', { updatedCount });
    }
  }

  /**
   * 同步单个对象
   */
  private syncSingle(mapping: PhysicsRenderMapping): boolean {
    const physicsBody = this.physicsWorld.getBody(mapping.physicsId);
    const renderObject = this.renderObjects.get(mapping.renderId);

    if (!physicsBody || !renderObject) return false;

    const body = physicsBody.body;
    let updated = false;

    // 同步位置
    if (mapping.syncPosition) {
      const newX = body.position.x + (mapping.offset?.x || 0);
      const newY = body.position.y + (mapping.offset?.y || 0);

      if (renderObject.position.x !== newX || renderObject.position.y !== newY) {
        renderObject.position.x = newX;
        renderObject.position.y = newY;
        updated = true;
      }
    }

    // 同步旋转
    if (mapping.syncRotation) {
      const newRotation = body.angle + (mapping.offset?.rotation || 0);
      if (renderObject.rotation !== newRotation) {
        renderObject.rotation = newRotation;
        updated = true;
      }
    }

    // 同步缩放（基于物理体的bounds变化）
    if (mapping.syncScale) {
      const bounds = body.bounds;
      const newWidth = bounds.max.x - bounds.min.x;
      const newHeight = bounds.max.y - bounds.min.y;

      if (renderObject.type === 'rectangle') {
        if (renderObject.width !== newWidth || renderObject.height !== newHeight) {
          renderObject.width = newWidth;
          renderObject.height = newHeight;
          updated = true;
        }
      } else if (renderObject.type === 'circle') {
        const newRadius = Math.max(newWidth, newHeight) / 2;
        if (renderObject.radius !== newRadius) {
          renderObject.radius = newRadius;
          updated = true;
        }
      }
    }

    if (updated) {
      this.eventBus?.emit('render-object-updated', { object: renderObject });
    }

    return updated;
  }

  /**
   * 手动同步指定的物理体
   */
  syncBody(physicsId: string): boolean {
    const mapping = this.mappings.get(physicsId);
    if (!mapping) return false;

    return this.syncSingle(mapping);
  }

  /**
   * 设置同步帧率
   */
  setSyncFrameRate(fps: number): void {
    this.syncInterval = Math.max(1, 1000 / fps);
  }

  /**
   * 清除所有映射
   */
  clear(): void {
    this.mappings.clear();
    this.renderObjects.clear();
  }

  /**
   * 销毁同步器
   */
  dispose(): void {
    this.stop();
    this.clear();
  }
}