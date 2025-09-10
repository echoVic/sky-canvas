/**
 * 粒子工厂
 * 负责根据配置创建粒子
 */

import { 
  IParticle, 
  IParticleFactory, 
  ParticleConfig,
  ParticleEmissionConfig,
  ParticleRange,
  EmitterShape,
  Point2D,
  Vector2D
} from '../types/ParticleTypes';
import { Particle } from './Particle';

export class ParticleFactory implements IParticleFactory {
  
  create(config: ParticleConfig = {}): IParticle {
    return new Particle(config);
  }

  createFromEmission(emission: ParticleEmissionConfig): IParticle {
    const config: ParticleConfig = {
      position: this.randomizePoint(emission.position),
      velocity: this.randomizeVector(emission.velocity),
      acceleration: emission.acceleration ? this.randomizeVector(emission.acceleration) : undefined,
      size: this.randomizeNumber(emission.size),
      scale: emission.scale ? this.randomizeVector(emission.scale) : undefined,
      rotation: emission.rotation ? this.randomizeNumber(emission.rotation) : undefined,
      angularVelocity: emission.angularVelocity ? this.randomizeNumber(emission.angularVelocity) : undefined,
      alpha: emission.alpha ? this.randomizeNumber(emission.alpha) : undefined,
      color: this.randomizeColor(emission.color),
      life: this.randomizeNumber(emission.life),
      mass: emission.mass ? this.randomizeNumber(emission.mass) : undefined,
      userData: emission.userData ? { ...emission.userData } : undefined
    };

    // 应用发射器形状
    this.applyEmitterShape(config, emission);

    return this.create(config);
  }

  /**
   * 应用发射器形状
   */
  private applyEmitterShape(config: ParticleConfig, emission: ParticleEmissionConfig): void {
    if (!emission.emitterShape || emission.emitterShape === EmitterShape.POINT) {
      return; // 点发射器不需要特殊处理
    }

    const basePosition = config.position!;
    let newPosition: Point2D;

    switch (emission.emitterShape) {
      case EmitterShape.LINE:
        newPosition = this.generateLinePosition(basePosition, emission.emitterSize);
        break;
        
      case EmitterShape.CIRCLE:
        newPosition = this.generateCirclePosition(basePosition, emission.emitterRadius || 50);
        break;
        
      case EmitterShape.RECTANGLE:
        newPosition = this.generateRectanglePosition(basePosition, emission.emitterSize);
        break;
        
      case EmitterShape.ARC:
        newPosition = this.generateArcPosition(basePosition, emission.emitterRadius || 50);
        break;
        
      default:
        newPosition = basePosition;
    }

    config.position = newPosition;
  }

  /**
   * 生成直线上的位置
   */
  private generateLinePosition(center: Point2D, size?: Point2D): Point2D {
    const lineSize = size || { x: 100, y: 0 };
    const t = Math.random();
    
    return {
      x: center.x + (lineSize.x * (t - 0.5)),
      y: center.y + (lineSize.y * (t - 0.5))
    };
  }

  /**
   * 生成圆形内的位置
   */
  private generateCirclePosition(center: Point2D, radius: number): Point2D {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    
    return {
      x: center.x + Math.cos(angle) * r,
      y: center.y + Math.sin(angle) * r
    };
  }

  /**
   * 生成矩形内的位置
   */
  private generateRectanglePosition(center: Point2D, size?: Point2D): Point2D {
    const rectSize = size || { x: 100, y: 100 };
    
    return {
      x: center.x + (Math.random() - 0.5) * rectSize.x,
      y: center.y + (Math.random() - 0.5) * rectSize.y
    };
  }

  /**
   * 生成弧形上的位置
   */
  private generateArcPosition(center: Point2D, radius: number): Point2D {
    // 简化实现：生成半圆弧
    const angle = Math.random() * Math.PI;
    
    return {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius
    };
  }

  /**
   * 随机化数值
   */
  private randomizeNumber(range: ParticleRange<number>): number {
    if (typeof range === 'number') {
      return range;
    }
    return range.min + Math.random() * (range.max - range.min);
  }

  /**
   * 随机化点
   */
  private randomizePoint(range: ParticleRange<Point2D>): Point2D {
    return {
      x: this.randomizeNumber({
        min: range.min.x,
        max: range.max.x
      }),
      y: this.randomizeNumber({
        min: range.min.y,
        max: range.max.y
      })
    };
  }

  /**
   * 随机化向量
   */
  private randomizeVector(range: ParticleRange<Vector2D>): Vector2D {
    return {
      x: this.randomizeNumber({
        min: range.min.x,
        max: range.max.x
      }),
      y: this.randomizeNumber({
        min: range.min.y,
        max: range.max.y
      })
    };
  }

  /**
   * 随机化颜色
   */
  private randomizeColor(color?: string[] | ParticleRange<string>): string {
    if (!color) {
      return '#ffffff';
    }

    if (Array.isArray(color)) {
      return color[Math.floor(Math.random() * color.length)];
    }

    // 简化实现：在两个颜色之间插值（需要颜色插值函数）
    return color.min; // 暂时返回最小值
  }

  /**
   * 创建预设粒子配置
   */
  static createFireEmission(): ParticleEmissionConfig {
    return {
      position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
      velocity: { min: { x: -50, y: -200 }, max: { x: 50, y: -100 } },
      acceleration: { min: { x: 0, y: 50 }, max: { x: 0, y: 100 } },
      size: { min: 2, max: 8 },
      alpha: { min: 0.8, max: 1.0 },
      color: ['#ff4500', '#ff6347', '#ffa500', '#ffff00'],
      life: { min: 500, max: 2000 },
      rate: 50,
      emitterShape: EmitterShape.LINE,
      emitterSize: { x: 20, y: 0 }
    };
  }

  static createSmokeEmission(): ParticleEmissionConfig {
    return {
      position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
      velocity: { min: { x: -20, y: -50 }, max: { x: 20, y: -30 } },
      acceleration: { min: { x: -10, y: -20 }, max: { x: 10, y: -10 } },
      size: { min: 5, max: 20 },
      alpha: { min: 0.3, max: 0.7 },
      color: ['#666666', '#888888', '#aaaaaa'],
      life: { min: 2000, max: 5000 },
      rate: 20,
      emitterShape: EmitterShape.CIRCLE,
      emitterRadius: 10
    };
  }

  static createSparkleEmission(): ParticleEmissionConfig {
    return {
      position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
      velocity: { min: { x: -100, y: -100 }, max: { x: 100, y: 100 } },
      acceleration: { min: { x: 0, y: 200 }, max: { x: 0, y: 300 } },
      size: { min: 1, max: 4 },
      alpha: { min: 0.8, max: 1.0 },
      color: ['#ffffff', '#ffff00', '#00ffff', '#ff00ff'],
      life: { min: 300, max: 1000 },
      rate: 100,
      emitterShape: EmitterShape.CIRCLE,
      emitterRadius: 5
    };
  }

  static createSnowEmission(): ParticleEmissionConfig {
    return {
      position: { min: { x: -100, y: -10 }, max: { x: 100, y: -10 } },
      velocity: { min: { x: -20, y: 50 }, max: { x: 20, y: 100 } },
      acceleration: { min: { x: -5, y: 10 }, max: { x: 5, y: 20 } },
      size: { min: 1, max: 6 },
      alpha: { min: 0.6, max: 0.9 },
      color: ['#ffffff', '#f0f8ff'],
      life: { min: 3000, max: 8000 },
      rate: 30,
      emitterShape: EmitterShape.LINE,
      emitterSize: { x: 200, y: 0 }
    };
  }

  static createExplosionEmission(): ParticleEmissionConfig {
    return {
      position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
      velocity: { min: { x: -200, y: -200 }, max: { x: 200, y: 200 } },
      acceleration: { min: { x: 0, y: 100 }, max: { x: 0, y: 200 } },
      size: { min: 3, max: 12 },
      alpha: { min: 0.8, max: 1.0 },
      color: ['#ff0000', '#ff4500', '#ffa500', '#ffff00'],
      life: { min: 200, max: 800 },
      rate: 0, // 用burst代替
      burst: 100,
      emitterShape: EmitterShape.POINT
    };
  }
}