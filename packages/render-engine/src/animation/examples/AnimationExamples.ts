/**
 * 动画系统使用示例
 */

import {
  AnimationGroup,
  AnimationManager,
  AnimationUtils,
  EasingType,
  GroupPlayMode,
  MultiPropertyAnimation,
  PropertyAnimation,
  Timeline,
} from '../index'

export class AnimationExamples {
  private manager: AnimationManager

  constructor() {
    this.manager = new AnimationManager()
    this.manager.start()
  }

  /**
   * 示例1：基础属性动画
   */
  basicPropertyAnimation() {
    const target = { x: 0, y: 0, opacity: 0 }

    // 创建简单的位置动画
    const moveAnimation = this.manager.createPropertyAnimation({
      target,
      property: 'x',
      from: 0,
      to: 300,
      duration: 1000,
      easing: EasingType.EASE_OUT_CUBIC,
    })

    // 监听动画事件
    moveAnimation.on('start', () => {
      console.log('动画开始')
    })

    moveAnimation.on('update', (animation, progress) => {
      console.log(`动画进度: ${Math.round(progress * 100)}%`)
    })

    moveAnimation.on('complete', () => {
      console.log('动画完成')
    })

    moveAnimation.start()

    return { target, animation: moveAnimation }
  }

  /**
   * 示例2：多属性动画
   */
  multiPropertyAnimation() {
    const target = {
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      opacity: 0,
      rotation: 0,
    }

    // 同时动画多个属性
    const multiAnimation = this.manager.createMultiPropertyAnimation({
      target,
      properties: {
        x: { from: 0, to: 200 },
        y: { from: 0, to: 150 },
        width: { from: 50, to: 100 },
        height: { from: 50, to: 100 },
        opacity: { from: 0, to: 1 },
        rotation: { from: 0, to: 360 },
      },
      duration: 2000,
      easing: EasingType.EASE_IN_OUT_BACK,
    })

    multiAnimation.start()

    return { target, animation: multiAnimation }
  }

  /**
   * 示例3：动画组（并行播放）
   */
  parallelAnimationGroup() {
    const circle = { x: 0, y: 0, radius: 10 }
    const square = { x: 100, y: 0, size: 20 }

    // 创建动画组
    const group = this.manager.createAnimationGroup(GroupPlayMode.PARALLEL)

    // 添加圆形动画
    const circleAnimation = this.manager.createMultiPropertyAnimation({
      target: circle,
      properties: {
        x: { to: 200 },
        y: { to: 100 },
        radius: { to: 30 },
      },
      duration: 1500,
      easing: EasingType.EASE_OUT_BOUNCE,
    })

    // 添加方形动画
    const squareAnimation = this.manager.createMultiPropertyAnimation({
      target: square,
      properties: {
        x: { to: 300 },
        y: { to: 150 },
        size: { to: 40 },
      },
      duration: 1200,
      easing: EasingType.EASE_IN_OUT_CUBIC,
    })

    group.add(circleAnimation)
    group.add(squareAnimation)

    group.start()

    return { circle, square, group }
  }

  /**
   * 示例4：时间轴动画序列
   */
  timelineSequence() {
    const elements = [
      { x: 0, y: 50, opacity: 0 },
      { x: 0, y: 100, opacity: 0 },
      { x: 0, y: 150, opacity: 0 },
    ]

    // 创建时间轴
    const timeline = this.manager.createTimeline()

    // 第一个元素立即开始
    timeline.at(
      0,
      this.manager.createMultiPropertyAnimation({
        target: elements[0],
        properties: {
          x: { to: 200 },
          opacity: { to: 1 },
        },
        duration: 800,
        easing: EasingType.EASE_OUT_CUBIC,
      })
    )

    // 第二个元素延迟200ms开始
    timeline.at(
      200,
      this.manager.createMultiPropertyAnimation({
        target: elements[1],
        properties: {
          x: { to: 200 },
          opacity: { to: 1 },
        },
        duration: 800,
        easing: EasingType.EASE_OUT_CUBIC,
      })
    )

    // 第三个元素再延迟200ms开始
    timeline.at(
      400,
      this.manager.createMultiPropertyAnimation({
        target: elements[2],
        properties: {
          x: { to: 200 },
          opacity: { to: 1 },
        },
        duration: 800,
        easing: EasingType.EASE_OUT_CUBIC,
      })
    )

    timeline.play()

    return { elements, timeline }
  }

  /**
   * 示例5：复杂的时间轴编排
   */
  complexTimelineChoreography() {
    const logo = { scale: 0, opacity: 0, rotation: -180 }
    const title = { y: -50, opacity: 0 }
    const button = { scale: 0, opacity: 0 }

    const timeline = this.manager.createTimeline()

    // Logo出现动画
    timeline.at(
      0,
      this.manager.createMultiPropertyAnimation({
        target: logo,
        properties: {
          scale: { to: 1 },
          opacity: { to: 1 },
          rotation: { to: 0 },
        },
        duration: 1000,
        easing: EasingType.EASE_OUT_BACK,
      })
    )

    // 标题下滑进入（与logo重叠300ms）
    timeline.at(
      700,
      this.manager.createMultiPropertyAnimation({
        target: title,
        properties: {
          y: { to: 0 },
          opacity: { to: 1 },
        },
        duration: 600,
        easing: EasingType.EASE_OUT_CUBIC,
      })
    )

    // 按钮弹跳进入
    timeline.at(
      1200,
      this.manager.createMultiPropertyAnimation({
        target: button,
        properties: {
          scale: { to: 1 },
          opacity: { to: 1 },
        },
        duration: 500,
        easing: EasingType.EASE_OUT_BOUNCE,
      })
    )

    timeline.play()

    return { logo, title, button, timeline }
  }

  /**
   * 示例6：循环和回弹动画
   */
  loopingAndYoyoAnimations() {
    const pulse = { scale: 1, opacity: 1 }
    const swing = { rotation: 0 }

    // 脉冲动画（无限循环）
    const pulseAnimation = this.manager.createMultiPropertyAnimation({
      target: pulse,
      properties: {
        scale: { from: 1, to: 1.2 },
        opacity: { from: 1, to: 0.7 },
      },
      duration: 1000,
      easing: EasingType.EASE_IN_OUT_QUAD,
      loop: true,
      yoyo: true,
    })

    // 摆动动画（回弹3次）
    const swingAnimation = this.manager.createPropertyAnimation({
      target: swing,
      property: 'rotation',
      from: -30,
      to: 30,
      duration: 800,
      easing: EasingType.EASE_IN_OUT,
      loop: 3,
      yoyo: true,
    })

    pulseAnimation.start()
    swingAnimation.start()

    return { pulse, swing, pulseAnimation, swingAnimation }
  }

  /**
   * 示例7：使用工具函数的简化API
   */
  utilityFunctionExamples() {
    const target = { x: 0, y: 0, opacity: 0 }

    // 使用AnimationUtils.to简化动画创建
    const fadeInMove = AnimationUtils.to(
      target,
      1000,
      {
        x: 100,
        y: 50,
        opacity: 1,
      },
      {
        easing: EasingType.EASE_OUT_CUBIC,
        delay: 500,
        onComplete: () => {
          console.log('淡入移动动画完成')
        },
      }
    )

    // 使用fromTo指定起始值
    const slideUp = AnimationUtils.fromTo(
      target,
      800,
      { y: 100 },
      { y: 0 },
      {
        easing: EasingType.EASE_OUT_BACK,
      }
    )

    return { target, fadeInMove, slideUp }
  }

  /**
   * 示例8：嵌套属性动画
   */
  nestedPropertyAnimation() {
    const transform = {
      position: { x: 0, y: 0 },
      scale: { x: 1, y: 1 },
      rotation: 0,
    }

    // 动画嵌套属性
    const complexTransform = this.manager.createMultiPropertyAnimation({
      target: transform,
      properties: {
        'position.x': { to: 200 },
        'position.y': { to: 100 },
        'scale.x': { to: 1.5 },
        'scale.y': { to: 1.5 },
        rotation: { to: 45 },
      },
      duration: 1500,
      easing: EasingType.EASE_IN_OUT_CUBIC,
    })

    complexTransform.start()

    return { transform, animation: complexTransform }
  }

  /**
   * 示例9：动画链式调用
   */
  animationChaining() {
    const target = { x: 0, y: 0, scale: 1, rotation: 0 }

    const timeline = AnimationUtils.timeline()

    // 使用时间轴工具函数链式调用
    timeline
      .to(target, 500, { x: 100 })
      .to(target, 300, { y: 50 })
      .to(target, 400, { scale: 1.5, rotation: 180 })
      .play()

    return { target, timeline }
  }

  /**
   * 销毁示例
   */
  dispose() {
    this.manager.dispose()
  }
}

// 使用示例
export function runAnimationExamples() {
  const examples = new AnimationExamples()

  console.log('=== 动画系统示例 ===')

  // 运行基础属性动画示例
  console.log('1. 基础属性动画')
  const basic = examples.basicPropertyAnimation()

  // 2秒后运行多属性动画示例
  setTimeout(() => {
    console.log('2. 多属性动画')
    examples.multiPropertyAnimation()
  }, 2000)

  // 4秒后运行并行动画组示例
  setTimeout(() => {
    console.log('3. 并行动画组')
    examples.parallelAnimationGroup()
  }, 4000)

  // 6秒后运行时间轴序列示例
  setTimeout(() => {
    console.log('4. 时间轴序列')
    examples.timelineSequence()
  }, 6000)

  // 10秒后清理
  setTimeout(() => {
    examples.dispose()
    console.log('动画系统示例结束')
  }, 10000)
}
