/**
 * 物理世界管理器
 * 集成Matter.js物理引擎，管理物理世界的创建、更新和销毁
 */

import Matter from 'matter-js';
import { IEventBus } from '../events/EventBus';

export interface PhysicsConfig {
  gravity: { x: number; y: number; scale: number };
  enableSleeping: boolean;
  debug: boolean;
  constraintIterations: number;
  positionIterations: number;
}

export interface PhysicsBodyOptions {
  isStatic?: boolean;
  density?: number;
  friction?: number;
  frictionAir?: number;
  restitution?: number;
  mass?: number;
  angle?: number;
  angularVelocity?: number;
  velocity?: { x: number; y: number };
}

export interface PhysicsBody {
  id: string;
  body: Matter.Body;
  type: 'rectangle' | 'circle' | 'polygon' | 'compound';
  userData?: any;
}

/**
 * 物理世界事件
 */
export interface PhysicsEvents {
  'body-created': { body: PhysicsBody };
  'body-removed': { bodyId: string };
  'collision-start': { pairs: Matter.Pair[] };
  'collision-end': { pairs: Matter.Pair[] };
  'constraint-created': { constraint: Matter.Constraint };
  'before-update': { delta: number };
  'after-update': { delta: number };
}

export class PhysicsWorld {
  private engine: Matter.Engine;
  private world: Matter.World;
  private render?: Matter.Render;
  private bodies: Map<string, PhysicsBody> = new Map();
  private constraints: Map<string, Matter.Constraint> = new Map();
  private isRunning = false;
  private lastTime = 0;
  private eventBus?: IEventBus;

  constructor(
    private config: PhysicsConfig = {
      gravity: { x: 0, y: 1, scale: 0.001 },
      enableSleeping: true,
      debug: false,
      constraintIterations: 2,
      positionIterations: 6
    }
  ) {
    this.initialize();
  }

  private initialize(): void {
    // 创建物理引擎
    this.engine = Matter.Engine.create();
    this.world = this.engine.world;

    // 配置引擎
    this.engine.world.gravity = this.config.gravity;
    this.engine.enableSleeping = this.config.enableSleeping;
    this.engine.constraintIterations = this.config.constraintIterations;
    this.engine.positionIterations = this.config.positionIterations;

    // 设置碰撞检测事件
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      this.eventBus?.emit('collision-start', { pairs: event.pairs });
    });

    Matter.Events.on(this.engine, 'collisionEnd', (event) => {
      this.eventBus?.emit('collision-end', { pairs: event.pairs });
    });

    // 初始化调试渲染器（如果启用）
    if (this.config.debug) {
      this.initializeDebugRender();
    }
  }

  private initializeDebugRender(): void {
    if (typeof window !== 'undefined' && window.document) {
      // 创建调试画布
      const debugCanvas = document.createElement('canvas');
      debugCanvas.id = 'physics-debug';
      debugCanvas.style.position = 'absolute';
      debugCanvas.style.top = '0';
      debugCanvas.style.left = '0';
      debugCanvas.style.zIndex = '9999';
      debugCanvas.style.pointerEvents = 'none';
      debugCanvas.style.border = '1px solid red';
      document.body.appendChild(debugCanvas);

      this.render = Matter.Render.create({
        canvas: debugCanvas,
        engine: this.engine,
        options: {
          width: 800,
          height: 600,
          wireframes: false,
          background: 'transparent'
        }
      });
    }
  }

  /**
   * 设置事件总线
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * 创建矩形物理体
   */
  createRectangle(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options: PhysicsBodyOptions = {}
  ): PhysicsBody {
    const body = Matter.Bodies.rectangle(x, y, width, height, {
      isStatic: options.isStatic || false,
      density: options.density || 0.001,
      friction: options.friction || 0.4,
      frictionAir: options.frictionAir || 0.01,
      restitution: options.restitution || 0.3
    });

    if (options.angle !== undefined) {
      Matter.Body.setAngle(body, options.angle);
    }

    if (options.velocity) {
      Matter.Body.setVelocity(body, options.velocity);
    }

    if (options.angularVelocity !== undefined) {
      Matter.Body.setAngularVelocity(body, options.angularVelocity);
    }

    const physicsBody: PhysicsBody = {
      id,
      body,
      type: 'rectangle',
      userData: options
    };

    Matter.World.add(this.world, body);
    this.bodies.set(id, physicsBody);

    this.eventBus?.emit('body-created', { body: physicsBody });

    return physicsBody;
  }

  /**
   * 创建圆形物理体
   */
  createCircle(
    id: string,
    x: number,
    y: number,
    radius: number,
    options: PhysicsBodyOptions = {}
  ): PhysicsBody {
    const body = Matter.Bodies.circle(x, y, radius, {
      isStatic: options.isStatic || false,
      density: options.density || 0.001,
      friction: options.friction || 0.4,
      frictionAir: options.frictionAir || 0.01,
      restitution: options.restitution || 0.3
    });

    if (options.angle !== undefined) {
      Matter.Body.setAngle(body, options.angle);
    }

    if (options.velocity) {
      Matter.Body.setVelocity(body, options.velocity);
    }

    if (options.angularVelocity !== undefined) {
      Matter.Body.setAngularVelocity(body, options.angularVelocity);
    }

    const physicsBody: PhysicsBody = {
      id,
      body,
      type: 'circle',
      userData: options
    };

    Matter.World.add(this.world, body);
    this.bodies.set(id, physicsBody);

    this.eventBus?.emit('body-created', { body: physicsBody });

    return physicsBody;
  }

  /**
   * 创建多边形物理体
   */
  createPolygon(
    id: string,
    x: number,
    y: number,
    sides: number,
    radius: number,
    options: PhysicsBodyOptions = {}
  ): PhysicsBody {
    const body = Matter.Bodies.polygon(x, y, sides, radius, {
      isStatic: options.isStatic || false,
      density: options.density || 0.001,
      friction: options.friction || 0.4,
      frictionAir: options.frictionAir || 0.01,
      restitution: options.restitution || 0.3
    });

    if (options.angle !== undefined) {
      Matter.Body.setAngle(body, options.angle);
    }

    if (options.velocity) {
      Matter.Body.setVelocity(body, options.velocity);
    }

    if (options.angularVelocity !== undefined) {
      Matter.Body.setAngularVelocity(body, options.angularVelocity);
    }

    const physicsBody: PhysicsBody = {
      id,
      body,
      type: 'polygon',
      userData: options
    };

    Matter.World.add(this.world, body);
    this.bodies.set(id, physicsBody);

    this.eventBus?.emit('body-created', { body: physicsBody });

    return physicsBody;
  }

  /**
   * 获取物理体
   */
  getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }

  /**
   * 移除物理体
   */
  removeBody(id: string): boolean {
    const physicsBody = this.bodies.get(id);
    if (!physicsBody) return false;

    Matter.World.remove(this.world, physicsBody.body);
    this.bodies.delete(id);

    this.eventBus?.emit('body-removed', { bodyId: id });
    return true;
  }

  /**
   * 应用力到物理体
   */
  applyForce(id: string, force: { x: number; y: number }, position?: { x: number; y: number }): boolean {
    const physicsBody = this.bodies.get(id);
    if (!physicsBody) return false;

    const pos = position || physicsBody.body.position;
    Matter.Body.applyForce(physicsBody.body, pos, force);
    return true;
  }

  /**
   * 设置物理体位置
   */
  setPosition(id: string, position: { x: number; y: number }): boolean {
    const physicsBody = this.bodies.get(id);
    if (!physicsBody) return false;

    Matter.Body.setPosition(physicsBody.body, position);
    return true;
  }

  /**
   * 设置物理体角度
   */
  setAngle(id: string, angle: number): boolean {
    const physicsBody = this.bodies.get(id);
    if (!physicsBody) return false;

    Matter.Body.setAngle(physicsBody.body, angle);
    return true;
  }

  /**
   * 设置物理体速度
   */
  setVelocity(id: string, velocity: { x: number; y: number }): boolean {
    const physicsBody = this.bodies.get(id);
    if (!physicsBody) return false;

    Matter.Body.setVelocity(physicsBody.body, velocity);
    return true;
  }

  /**
   * 创建约束（连接两个物理体）
   */
  createConstraint(
    id: string,
    bodyAId: string,
    bodyBId: string,
    options: {
      length?: number;
      stiffness?: number;
      damping?: number;
      pointA?: { x: number; y: number };
      pointB?: { x: number; y: number };
    } = {}
  ): Matter.Constraint | null {
    const bodyA = this.bodies.get(bodyAId);
    const bodyB = this.bodies.get(bodyBId);

    if (!bodyA || !bodyB) return null;

    const constraint = Matter.Constraint.create({
      bodyA: bodyA.body,
      bodyB: bodyB.body,
      length: options.length,
      stiffness: options.stiffness || 1,
      damping: options.damping || 0,
      pointA: options.pointA,
      pointB: options.pointB
    });

    Matter.World.add(this.world, constraint);
    this.constraints.set(id, constraint);

    this.eventBus?.emit('constraint-created', { constraint });

    return constraint;
  }

  /**
   * 启动物理世界
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.lastTime = Date.now();

    if (this.render) {
      Matter.Render.run(this.render);
    }

    this.update();
  }

  /**
   * 停止物理世界
   */
  stop(): void {
    this.isRunning = false;

    if (this.render) {
      Matter.Render.stop(this.render);
    }
  }

  /**
   * 更新物理世界
   */
  private update(): void {
    if (!this.isRunning) return;

    const currentTime = Date.now();
    const delta = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.eventBus?.emit('before-update', { delta });

    // 更新物理引擎
    Matter.Engine.update(this.engine, delta);

    this.eventBus?.emit('after-update', { delta });

    // 继续更新循环
    requestAnimationFrame(() => this.update());
  }

  /**
   * 获取所有物理体
   */
  getAllBodies(): PhysicsBody[] {
    return Array.from(this.bodies.values());
  }

  /**
   * 清除所有物理体
   */
  clear(): void {
    // 移除所有物理体
    for (const [id] of this.bodies) {
      this.removeBody(id);
    }

    // 移除所有约束
    for (const constraint of this.constraints.values()) {
      Matter.World.remove(this.world, constraint);
    }
    this.constraints.clear();
  }

  /**
   * 销毁物理世界
   */
  dispose(): void {
    this.stop();
    this.clear();

    if (this.render) {
      Matter.Render.stop(this.render);
      const canvas = document.getElementById('physics-debug');
      if (canvas) {
        canvas.remove();
      }
    }

    Matter.Engine.clear(this.engine);
  }
}