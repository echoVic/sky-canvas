/**
 * 粒子工厂测试
 */

import { describe, expect, it } from 'vitest'
import { ParticleFactory } from '../particles/ParticleFactory'
import { EmitterShape } from '../types/ParticleTypes'

describe('ParticleFactory', () => {
  let factory: ParticleFactory

  beforeEach(() => {
    factory = new ParticleFactory()
  })

  describe('基础粒子创建', () => {
    it('应该创建默认粒子', () => {
      const particle = factory.create()

      expect(particle.position).toEqual({ x: 0, y: 0 })
      expect(particle.velocity).toEqual({ x: 0, y: 0 })
      expect(particle.size).toBe(1)
      expect(particle.alpha).toBe(1)
      expect(particle.life).toBe(1000)
    })

    it('应该创建配置粒子', () => {
      const particle = factory.create({
        position: { x: 10, y: 20 },
        size: 5,
        color: '#ff0000',
      })

      expect(particle.position).toEqual({ x: 10, y: 20 })
      expect(particle.size).toBe(5)
      expect(particle.color).toBe('#ff0000')
    })
  })

  describe('从发射配置创建', () => {
    it('应该创建基本发射粒子', () => {
      const emission = {
        position: { min: { x: 0, y: 0 }, max: { x: 10, y: 10 } },
        velocity: { min: { x: -5, y: -5 }, max: { x: 5, y: 5 } },
        size: { min: 1, max: 5 },
        life: { min: 500, max: 1000 },
        rate: 10,
      }

      const particle = factory.createFromEmission(emission)

      expect(particle.position.x).toBeGreaterThanOrEqual(0)
      expect(particle.position.x).toBeLessThanOrEqual(10)
      expect(particle.position.y).toBeGreaterThanOrEqual(0)
      expect(particle.position.y).toBeLessThanOrEqual(10)

      expect(particle.velocity.x).toBeGreaterThanOrEqual(-5)
      expect(particle.velocity.x).toBeLessThanOrEqual(5)

      expect(particle.size).toBeGreaterThanOrEqual(1)
      expect(particle.size).toBeLessThanOrEqual(5)

      expect(particle.life).toBeGreaterThanOrEqual(500)
      expect(particle.life).toBeLessThanOrEqual(1000)
    })

    it('应该应用发射器形状 - 直线', () => {
      const emission = {
        position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        velocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        size: { min: 1, max: 1 },
        life: { min: 1000, max: 1000 },
        rate: 10,
        emitterShape: EmitterShape.LINE,
        emitterSize: { x: 100, y: 0 },
      }

      const particles = Array.from({ length: 10 }, () => factory.createFromEmission(emission))

      // 粒子应该分布在直线上
      const xPositions = particles.map((p) => p.position.x)
      const minX = Math.min(...xPositions)
      const maxX = Math.max(...xPositions)

      expect(maxX - minX).toBeGreaterThan(0) // 应该有分布
    })

    it('应该应用发射器形状 - 圆形', () => {
      const emission = {
        position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        velocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        size: { min: 1, max: 1 },
        life: { min: 1000, max: 1000 },
        rate: 10,
        emitterShape: EmitterShape.CIRCLE,
        emitterRadius: 50,
      }

      const particles = Array.from({ length: 20 }, () => factory.createFromEmission(emission))

      // 所有粒子应该在圆形范围内
      particles.forEach((particle) => {
        const distance = Math.sqrt(particle.position.x ** 2 + particle.position.y ** 2)
        expect(distance).toBeLessThanOrEqual(50)
      })
    })

    it('应该应用发射器形状 - 矩形', () => {
      const emission = {
        position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        velocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        size: { min: 1, max: 1 },
        life: { min: 1000, max: 1000 },
        rate: 10,
        emitterShape: EmitterShape.RECTANGLE,
        emitterSize: { x: 100, y: 60 },
      }

      const particles = Array.from({ length: 20 }, () => factory.createFromEmission(emission))

      // 粒子应该在矩形范围内
      particles.forEach((particle) => {
        expect(particle.position.x).toBeGreaterThanOrEqual(-50)
        expect(particle.position.x).toBeLessThanOrEqual(50)
        expect(particle.position.y).toBeGreaterThanOrEqual(-30)
        expect(particle.position.y).toBeLessThanOrEqual(30)
      })
    })

    it('应该应用发射器形状 - 弧形', () => {
      const emission = {
        position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        velocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        size: { min: 1, max: 1 },
        life: { min: 1000, max: 1000 },
        rate: 10,
        emitterShape: EmitterShape.ARC,
        emitterRadius: 30,
      }

      const particles = Array.from({ length: 10 }, () => factory.createFromEmission(emission))

      // 粒子应该在弧形半径上
      particles.forEach((particle) => {
        const distance = Math.sqrt(particle.position.x ** 2 + particle.position.y ** 2)
        expect(distance).toBeCloseTo(30, 1)
      })
    })

    it('应该处理颜色数组', () => {
      const colors = ['#ff0000', '#00ff00', '#0000ff']
      const emission = {
        position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        velocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        size: { min: 1, max: 1 },
        life: { min: 1000, max: 1000 },
        rate: 10,
        color: colors,
      }

      const particles = Array.from({ length: 20 }, () => factory.createFromEmission(emission))

      // 所有粒子颜色应该在提供的颜色列表中
      particles.forEach((particle) => {
        expect(colors).toContain(particle.color)
      })
    })

    it('应该设置用户数据', () => {
      const userData = { type: 'fire', intensity: 0.8 }
      const emission = {
        position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        velocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        size: { min: 1, max: 1 },
        life: { min: 1000, max: 1000 },
        rate: 10,
        userData,
      }

      const particle = factory.createFromEmission(emission)

      expect(particle.userData).toEqual(userData)
    })
  })

  describe('预设效果', () => {
    it('应该创建火焰效果配置', () => {
      const fireConfig = ParticleFactory.createFireEmission()

      expect(fireConfig.emitterShape).toBe(EmitterShape.LINE)
      expect(fireConfig.color).toContain('#ff4500')
      expect(fireConfig.velocity.max.y).toBeLessThan(0) // 向上运动
      expect(fireConfig.rate).toBeGreaterThan(0)
    })

    it('应该创建烟雾效果配置', () => {
      const smokeConfig = ParticleFactory.createSmokeEmission()

      expect(smokeConfig.emitterShape).toBe(EmitterShape.CIRCLE)
      expect(smokeConfig.color).toContain('#666666')
      expect(smokeConfig.velocity.max.y).toBeLessThan(0) // 向上运动
    })

    it('应该创建闪烁效果配置', () => {
      const sparkleConfig = ParticleFactory.createSparkleEmission()

      expect(sparkleConfig.emitterShape).toBe(EmitterShape.CIRCLE)
      expect(sparkleConfig.color).toContain('#ffffff')
      expect(sparkleConfig.rate).toBeGreaterThan(0)
    })

    it('应该创建雪花效果配置', () => {
      const snowConfig = ParticleFactory.createSnowEmission()

      expect(snowConfig.emitterShape).toBe(EmitterShape.LINE)
      expect(snowConfig.color).toContain('#ffffff')
      expect(snowConfig.velocity.min.y).toBeGreaterThan(0) // 向下运动
    })

    it('应该创建爆炸效果配置', () => {
      const explosionConfig = ParticleFactory.createExplosionEmission()

      expect(explosionConfig.emitterShape).toBe(EmitterShape.POINT)
      expect(explosionConfig.burst).toBeGreaterThan(0)
      expect(explosionConfig.rate).toBe(0) // 只使用爆发
    })
  })

  describe('随机化功能', () => {
    it('应该在范围内随机化数值', () => {
      const emission = {
        position: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        velocity: { min: { x: 10, y: 10 }, max: { x: 20, y: 20 } },
        size: { min: 5, max: 15 },
        life: { min: 1000, max: 2000 },
        rate: 10,
      }

      // 创建多个粒子检查随机性
      const particles = Array.from({ length: 50 }, () => factory.createFromEmission(emission))

      // 检查是否有变化（说明确实在随机化）
      const sizes = particles.map((p) => p.size)
      const uniqueSizes = new Set(sizes)
      expect(uniqueSizes.size).toBeGreaterThan(1)

      // 检查范围
      particles.forEach((particle) => {
        expect(particle.velocity.x).toBeGreaterThanOrEqual(10)
        expect(particle.velocity.x).toBeLessThanOrEqual(20)
        expect(particle.size).toBeGreaterThanOrEqual(5)
        expect(particle.size).toBeLessThanOrEqual(15)
      })
    })

    it('应该处理单值作为范围', () => {
      const emission = {
        position: { min: { x: 5, y: 5 }, max: { x: 5, y: 5 } },
        velocity: { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } },
        size: { min: 3, max: 3 },
        life: { min: 1000, max: 1000 },
        rate: 10,
      }

      const particle = factory.createFromEmission(emission)

      expect(particle.position).toEqual({ x: 5, y: 5 })
      expect(particle.size).toBe(3)
    })
  })
})
