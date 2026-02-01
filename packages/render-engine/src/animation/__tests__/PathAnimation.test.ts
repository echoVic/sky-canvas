/**
 * 路径动画测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PathAnimation } from '../animations/PathAnimation'
import { PathType, type SplinePathConfig } from '../types/PathTypes'

describe('PathAnimation', () => {
  let mockTarget: Record<string, unknown>

  beforeEach(() => {
    // 创建模拟动画目标对象
    mockTarget = {
      x: 0,
      y: 0,
      rotation: 0,
      position: { x: 0, y: 0 },
    }

    // Mock performance.now
    vi.spyOn(performance, 'now').mockReturnValue(0)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('构造函数', () => {
    it('应该正确创建线性路径动画', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
      })

      expect(animation.duration).toBe(1000)
      expect(animation.state).toBe('idle')
      expect(animation.progress).toBe(0)
    })

    it('应该正确设置自动旋转参数', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
        autoRotate: true,
        rotationOffset: 45,
      })

      const info = animation.getAnimationInfo()
      expect(info.autoRotate).toBe(true)
      expect(info.rotationOffset).toBe(45)
    })

    it('应该正确设置路径范围', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
        startOffset: 0.2,
        endOffset: 0.8,
      })

      const info = animation.getAnimationInfo()
      expect(info.startOffset).toBe(0.2)
      expect(info.endOffset).toBe(0.8)
    })
  })

  describe('位置更新', () => {
    it('应该在线性路径上正确更新位置', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
      })

      // 50%进度时应该在中点
      animation.seek(500)
      expect(mockTarget.x).toBeCloseTo(50, 5)
      expect(mockTarget.y).toBeCloseTo(50, 5)

      // 100%进度时应该在终点
      animation.seek(1000)
      expect(mockTarget.x).toBeCloseTo(100, 5)
      expect(mockTarget.y).toBeCloseTo(100, 5)
    })

    it('应该支持不同的目标属性结构', () => {
      const target = {
        position: { x: 0, y: 0 },
      }

      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(target, {
        duration: 1000,
        path: pathConfig,
      })

      animation.seek(500)
      expect(target.position.x).toBeCloseTo(50, 5)
      expect(target.position.y).toBeCloseTo(50, 5)
    })

    it('应该支持变换对象结构', () => {
      const target = {
        transform: { x: 0, y: 0 },
      }

      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(target, {
        duration: 1000,
        path: pathConfig,
      })

      animation.seek(500)
      expect(target.transform.x).toBeCloseTo(50, 5)
      expect(target.transform.y).toBeCloseTo(50, 5)
    })
  })

  describe('自动旋转', () => {
    it('应该根据路径切线方向自动旋转', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
        autoRotate: true,
      })

      animation.seek(500)
      // 45度线的角度应该是π/4弧度
      expect(mockTarget.rotation).toBeCloseTo(Math.PI / 4, 5)
    })

    it('应该应用旋转偏移', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
        autoRotate: true,
        rotationOffset: 90, // 90度偏移
      })

      animation.seek(500)
      // 水平线(0度) + 90度偏移 = 90度
      expect(mockTarget.rotation).toBeCloseTo(Math.PI / 2, 5)
    })

    it('应该支持不同的旋转属性', () => {
      const target = {
        x: 0,
        y: 0,
        angle: 0,
      }

      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(target, {
        duration: 1000,
        path: pathConfig,
        autoRotate: true,
      })

      animation.seek(500)
      expect(target.angle).toBeCloseTo(Math.PI / 4, 5)
    })
  })

  describe('路径范围', () => {
    it('应该支持部分路径动画', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
        startOffset: 0.25,
        endOffset: 0.75,
      })

      // 0%进度时应该在路径的25%位置
      animation.seek(0)
      expect(mockTarget.x).toBeCloseTo(25, 5)
      expect(mockTarget.y).toBeCloseTo(25, 5)

      // 100%进度时应该在路径的75%位置
      animation.seek(1000)
      expect(mockTarget.x).toBeCloseTo(75, 5)
      expect(mockTarget.y).toBeCloseTo(75, 5)
    })
  })

  describe('圆形路径', () => {
    it('应该在圆形路径上正确移动', () => {
      const pathConfig = {
        type: PathType.CIRCLE,
        center: { x: 50, y: 50 },
        radius: 30,
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
      })

      // 0%进度时应该在起始点 (center.x + radius, center.y)
      animation.seek(0)
      expect(mockTarget.x).toBeCloseTo(80, 5)
      expect(mockTarget.y).toBeCloseTo(50, 5)

      // 25%进度时应该在顶部 (center.x, center.y + radius)
      animation.seek(250)
      expect(mockTarget.x).toBeCloseTo(50, 5)
      expect(mockTarget.y).toBeCloseTo(80, 5)
    })
  })

  describe('贝塞尔曲线路径', () => {
    it('应该在二次贝塞尔曲线上正确移动', () => {
      const pathConfig = {
        type: PathType.BEZIER_QUADRATIC,
        start: { x: 0, y: 0 },
        control: { x: 50, y: 100 },
        end: { x: 100, y: 0 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
      })

      // 0%进度时应该在起点
      animation.seek(0)
      expect(mockTarget.x).toBeCloseTo(0, 5)
      expect(mockTarget.y).toBeCloseTo(0, 5)

      // 50%进度时应该接近控制点
      animation.seek(500)
      expect(mockTarget.x).toBeCloseTo(50, 5)
      expect(mockTarget.y).toBeCloseTo(50, 5)

      // 100%进度时应该在终点
      animation.seek(1000)
      expect(mockTarget.x).toBeCloseTo(100, 5)
      expect(mockTarget.y).toBeCloseTo(0, 5)
    })
  })

  describe('样条曲线路径', () => {
    it('应该在样条曲线上正确移动', () => {
      const pathConfig: SplinePathConfig = {
        type: PathType.SPLINE,
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 50 },
          { x: 100, y: 0 },
          { x: 150, y: 50 },
        ],
      }

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
      })

      // 0%进度时应该在第一个点
      animation.seek(0)
      expect(mockTarget.x).toBeCloseTo(0, 5)
      expect(mockTarget.y).toBeCloseTo(0, 5)

      // 100%进度时应该在最后一个点
      animation.seek(1000)
      expect(mockTarget.x).toBeCloseTo(150, 5)
      expect(mockTarget.y).toBeCloseTo(50, 5)
    })
  })

  describe('运动信息', () => {
    it('应该提供完整的运动信息', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
        autoRotate: true,
      })

      const motionInfo = animation.getMotionInfo(0.5)

      expect(motionInfo.position.x).toBeCloseTo(50, 5)
      expect(motionInfo.position.y).toBeCloseTo(50, 5)
      expect(motionInfo.tangent?.x).toBeCloseTo(Math.sqrt(0.5), 5)
      expect(motionInfo.tangent?.y).toBeCloseTo(Math.sqrt(0.5), 5)
      expect(motionInfo.rotation).toBeCloseTo(Math.PI / 4, 5)
      expect(motionInfo.progress).toBe(0.5)
      expect(motionInfo.distance).toBeGreaterThan(0)
    })
  })

  describe('路径工具方法', () => {
    it('应该获取指定进度的位置', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
      })

      const position = animation.getPositionAt(0.3)
      expect(position.x).toBeCloseTo(30, 5)
      expect(position.y).toBeCloseTo(30, 5)
    })

    it('应该获取指定进度的旋转角度', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
        rotationOffset: 45,
      })

      const rotation = animation.getRotationAt(0.5)
      expect(rotation).toBeCloseTo(Math.PI / 4 + Math.PI / 4, 5)
    })

    it('应该获取路径长度', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 30, y: 40 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
      })

      const pathLength = animation.getPathLength()
      expect(pathLength).toBeCloseTo(50, 5) // 3-4-5直角三角形
    })

    it('应该创建路径预览点', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
      })

      const previewPoints = animation.createPathPreview(10)
      expect(previewPoints).toHaveLength(11) // 0到10包含11个点
      expect(previewPoints[0]).toEqual({ x: 0, y: 0 })
      expect(previewPoints[10]).toEqual({ x: 100, y: 100 })
    })
  })

  describe('配置方法', () => {
    it('应该设置新路径', () => {
      const originalConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 50, y: 50 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: originalConfig,
      })

      const newConfig = {
        type: PathType.CIRCLE,
        center: { x: 50, y: 50 },
        radius: 25,
      } as const

      animation.setPath(newConfig)

      // 验证路径已更改
      animation.seek(0)
      expect(mockTarget.x).toBeCloseTo(75, 5) // center.x + radius
      expect(mockTarget.y).toBeCloseTo(50, 5) // center.y
    })

    it('应该设置自动旋转参数', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
      })

      animation.setAutoRotate(true, 90)

      animation.seek(500)
      expect(mockTarget.rotation).toBeCloseTo(Math.PI / 4 + Math.PI / 2, 5)
    })

    it('应该设置路径范围', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
      })

      animation.setPathRange(0.3, 0.7)

      animation.seek(0)
      expect(mockTarget.x).toBeCloseTo(30, 5)
      expect(mockTarget.y).toBeCloseTo(30, 5)

      animation.seek(1000)
      expect(mockTarget.x).toBeCloseTo(70, 5)
      expect(mockTarget.y).toBeCloseTo(70, 5)
    })

    it('应该设置属性映射', () => {
      const target = {
        pos: { x: 0, y: 0 },
        angle: 0,
      }

      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(target, {
        duration: 1000,
        path: pathConfig,
        autoRotate: true,
      })

      animation.setPropertyMapping('pos', 'angle')

      animation.seek(500)
      expect(target.pos.x).toBeCloseTo(50, 5)
      expect(target.pos.y).toBeCloseTo(50, 5)
      expect(target.angle).toBeCloseTo(Math.PI / 4, 5)
    })
  })

  describe('事件系统', () => {
    it('应该触发路径更新事件', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
      })

      animation.on('pathUpdate', (anim, motionInfo) => {
        expect(anim).toBe(animation)
        expect(motionInfo.position).toBeDefined()
        expect(motionInfo.tangent).toBeDefined()
        expect(motionInfo.normal).toBeDefined()
        // 使用 vi 的 done 函数替代
        expect.assertions(4)
      })

      animation.seek(500)
    })
  })

  describe('边界条件', () => {
    it('应该处理无效目标对象', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(
        {},
        {
          duration: 1000,
          path: pathConfig,
        }
      )

      // 不应该抛出错误
      expect(() => animation.seek(500)).not.toThrow()
    })

    it('应该限制偏移值在有效范围内', () => {
      const pathConfig = {
        type: PathType.LINEAR,
        start: { x: 0, y: 0 },
        end: { x: 100, y: 100 },
      } as const

      const animation = new PathAnimation(mockTarget, {
        duration: 1000,
        path: pathConfig,
        startOffset: -0.5, // 无效值
        endOffset: 1.5, // 无效值
      })

      const info = animation.getAnimationInfo()
      expect(info.startOffset).toBe(0)
      expect(info.endOffset).toBe(1)
    })
  })
})
