/**
 * 粒子对象池
 * 用于高效的粒子对象重用，减少GC压力
 */

import {
  type IParticle,
  type IParticlePool,
  ParticleConfig,
  ParticleState,
} from '../types/ParticleTypes'
import { Particle } from './Particle'

export class ParticlePool implements IParticlePool {
  private particles: IParticle[] = []
  private availableParticles: IParticle[] = []
  private initialSize: number

  constructor(initialSize: number = 100) {
    this.initialSize = initialSize
    this.grow(initialSize)
  }

  get size(): number {
    return this.particles.length
  }

  get available(): number {
    return this.availableParticles.length
  }

  get(): IParticle | null {
    if (this.availableParticles.length === 0) {
      // 如果没有可用粒子，尝试自动扩展池
      this.grow(Math.max(10, this.size * 0.1))
    }

    const particle = this.availableParticles.pop()

    if (particle) {
      particle.state = ParticleState.ACTIVE
    }

    return particle || null
  }

  release(particle: IParticle): void {
    if (!particle || this.availableParticles.includes(particle)) {
      return
    }

    // 重置粒子状态
    particle.state = ParticleState.INACTIVE
    particle.reset()

    // 放回可用池
    this.availableParticles.push(particle)
  }

  grow(count: number): void {
    for (let i = 0; i < count; i++) {
      const particle = new Particle()
      particle.state = ParticleState.INACTIVE

      this.particles.push(particle)
      this.availableParticles.push(particle)
    }
  }

  clear(): void {
    this.particles.length = 0
    this.availableParticles.length = 0
    this.grow(this.initialSize)
  }

  /**
   * 收缩池到指定大小
   */
  shrink(targetSize: number): void {
    if (targetSize >= this.size) {
      return
    }

    const removeCount = this.size - targetSize
    let removed = 0

    // 从可用池中移除
    while (removed < removeCount && this.availableParticles.length > 0) {
      const particle = this.availableParticles.pop()
      if (particle) {
        const index = this.particles.indexOf(particle)
        if (index !== -1) {
          this.particles.splice(index, 1)
          removed++
        }
      }
    }
  }

  /**
   * 获取池统计信息
   */
  getStats(): {
    total: number
    available: number
    inUse: number
    utilizationRate: number
  } {
    const total = this.size
    const available = this.available
    const inUse = total - available
    const utilizationRate = total > 0 ? inUse / total : 0

    return {
      total,
      available,
      inUse,
      utilizationRate,
    }
  }

  /**
   * 预热池（创建并立即释放粒子以初始化）
   */
  prewarm(count: number = this.size): void {
    const particles: IParticle[] = []

    // 获取粒子
    for (let i = 0; i < Math.min(count, this.available); i++) {
      const particle = this.get()
      if (particle) {
        particles.push(particle)
      }
    }

    // 立即释放回池
    particles.forEach((particle) => this.release(particle))
  }

  /**
   * 优化池大小（基于使用统计）
   */
  optimize(): void {
    const stats = this.getStats()

    // 如果利用率很低，收缩池
    if (stats.utilizationRate < 0.2 && stats.total > this.initialSize) {
      const targetSize = Math.max(this.initialSize, Math.ceil(stats.inUse * 1.5))
      this.shrink(targetSize)
    }

    // 如果利用率很高，扩展池
    else if (stats.utilizationRate > 0.9) {
      this.grow(Math.ceil(stats.total * 0.2))
    }
  }

  /**
   * 销毁池
   */
  dispose(): void {
    this.particles.length = 0
    this.availableParticles.length = 0
  }
}
