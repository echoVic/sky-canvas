import { Animation, AnimationConfig, AnimatedProps } from './Animation';

/**
 * 补间动画引擎
 */
export class TweenEngine {
  private activeAnimations: Map<string, Animation> = new Map();
  private lastUpdateTime: number = 0;
  private isRunning: boolean = false;
  private animationFrameId: number = 0;
  
  /**
   * 创建补间动画（到目标值）
   */
  to(target: any, props: AnimatedProps, config: AnimationConfig = {}): Animation {
    const fromProps: AnimatedProps = {};
    
    // 获取当前属性值作为起始值
    for (const prop in props) {
      if (props.hasOwnProperty(prop)) {
        fromProps[prop] = this.getCurrentPropertyValue(target, prop);
      }
    }
    
    const animation = new Animation(target, fromProps, props, config);
    this.activeAnimations.set(animation.getId(), animation);
    
    if (!this.isRunning) {
      this.start();
    }
    
    return animation;
  }
  
  /**
   * 创建补间动画（从起始值）
   */
  from(target: any, props: AnimatedProps, config: AnimationConfig = {}): Animation {
    const toProps: AnimatedProps = {};
    
    // 获取当前属性值作为目标值
    for (const prop in props) {
      if (props.hasOwnProperty(prop)) {
        toProps[prop] = this.getCurrentPropertyValue(target, prop);
      }
    }
    
    const animation = new Animation(target, props, toProps, config);
    this.activeAnimations.set(animation.getId(), animation);
    
    if (!this.isRunning) {
      this.start();
    }
    
    return animation;
  }
  
  /**
   * 创建补间动画（从起始值到目标值）
   */
  fromTo(
    target: any, 
    fromProps: AnimatedProps, 
    toProps: AnimatedProps, 
    config: AnimationConfig = {}
  ): Animation {
    const animation = new Animation(target, fromProps, toProps, config);
    this.activeAnimations.set(animation.getId(), animation);
    
    if (!this.isRunning) {
      this.start();
    }
    
    return animation;
  }
  
  /**
   * 获取当前属性值
   */
  private getCurrentPropertyValue(target: any, prop: string): any {
    switch (prop) {
      case 'x':
        return target.getPosition ? target.getPosition().x : (target.position ? target.position.x : 0);
      case 'y':
        return target.getPosition ? target.getPosition().y : (target.position ? target.position.y : 0);
      case 'position':
        return target.getPosition ? target.getPosition() : (target.position || { x: 0, y: 0 });
      case 'width':
        return target.getSize ? target.getSize().width : (target.size ? target.size.width : 0);
      case 'height':
        return target.getSize ? target.getSize().height : (target.size ? target.size.height : 0);
      case 'size':
        return target.getSize ? target.getSize() : (target.size || { width: 0, height: 0 });
      case 'scale':
        return target.getScale ? target.getScale() : (target.scale || 1);
      case 'rotation':
        return target.getRotation ? target.getRotation() : (target.rotation || 0);
      case 'opacity':
        return target.getOpacity ? target.getOpacity() : (target.opacity || 1);
      default:
        return target[prop];
    }
  }
  
  /**
   * 播放指定动画
   */
  play(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.play();
    }
    
    if (!this.isRunning) {
      this.start();
    }
  }
  
  /**
   * 暂停指定动画
   */
  pause(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.pause();
    }
  }
  
  /**
   * 停止指定动画
   */
  stop(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.stop();
      this.activeAnimations.delete(animationId);
    }
  }
  
  /**
   * 反向播放指定动画
   */
  reverse(animationId: string): void {
    const animation = this.activeAnimations.get(animationId);
    if (animation) {
      animation.reverse();
    }
  }
  
  /**
   * 更新所有动画
   */
  update(deltaTime: number): void {
    if (this.activeAnimations.size === 0) {
      this.stopEngine();
      return;
    }
    
    // 更新所有活动动画
    for (const [id, animation] of this.activeAnimations.entries()) {
      const isStillActive = animation.update(deltaTime);
      if (!isStillActive) {
        // 动画完成，移除
        this.activeAnimations.delete(id);
      }
    }
  }
  
  /**
   * 开始动画引擎
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
  }
  
  /**
   * 停止动画引擎（私有）
   */
  private stopEngine(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
  
  /**
   * 停止动画引擎（公共）
   */
  stopTweenEngine(): void {
    this.stopEngine();
  }
  
  /**
   * 动画循环
   */
  private animate(timestamp: number): void {
    if (!this.isRunning) return;
    
    const deltaTime = timestamp - this.lastUpdateTime;
    this.lastUpdateTime = timestamp;
    
    this.update(deltaTime);
    
    if (this.isRunning) {
      this.animationFrameId = requestAnimationFrame(this.animate.bind(this));
    }
  }
  
  /**
   * 检查动画引擎是否正在运行
   */
  isRunningAnimation(): boolean {
    return this.isRunning;
  }
  
  /**
   * 获取活动动画数量
   */
  getActiveAnimationCount(): number {
    return this.activeAnimations.size;
  }
  
  /**
   * 停止所有动画
   */
  stopAll(): void {
    for (const animation of this.activeAnimations.values()) {
      animation.stop();
    }
    this.activeAnimations.clear();
    this.stopEngine();
  }
  
  /**
   * 暂停所有动画
   */
  pauseAll(): void {
    for (const animation of this.activeAnimations.values()) {
      animation.pause();
    }
  }
  
  /**
   * 恢复所有动画
   */
  resumeAll(): void {
    for (const animation of this.activeAnimations.values()) {
      animation.play();
    }
    
    if (!this.isRunning && this.activeAnimations.size > 0) {
      this.start();
    }
  }
}