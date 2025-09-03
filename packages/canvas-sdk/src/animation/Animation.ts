import { Easing, EasingFunction } from './Easing';
import { IPoint } from '@sky-canvas/render-engine';

/**
 * 动画配置接口
 */
export interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: EasingFunction | string;
  repeat?: number;
  yoyo?: boolean;
  onStart?: () => void;
  onUpdate?: (progress: number) => void;
  onComplete?: () => void;
  onRepeat?: () => void;
}

/**
 * 动画属性接口
 */
export interface AnimatedProps {
  [key: string]: any;
}

/**
 * 动画类
 */
export class Animation {
  private target: any;
  private fromProps: AnimatedProps;
  private toProps: AnimatedProps;
  private config: Required<AnimationConfig>;
  private startTime: number = 0;
  private elapsed: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private repeatCount: number = 0;
  private reversed: boolean = false;
  
  constructor(
    target: any,
    fromProps: AnimatedProps,
    toProps: AnimatedProps,
    config: AnimationConfig = {}
  ) {
    this.target = target;
    this.fromProps = fromProps;
    this.toProps = toProps;
    
    // 默认配置
    this.config = {
      duration: config.duration || 1000,
      delay: config.delay || 0,
      easing: typeof config.easing === 'string' 
        ? Easing.get(config.easing) 
        : config.easing || Easing.linear,
      repeat: config.repeat || 0,
      yoyo: config.yoyo || false,
      onStart: config.onStart || (() => {}),
      onUpdate: config.onUpdate || (() => {}),
      onComplete: config.onComplete || (() => {}),
      onRepeat: config.onRepeat || (() => {})
    };
  }
  
  /**
   * 播放动画
   */
  play(): void {
    if (this.isPlaying && !this.isPaused) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    this.startTime = performance.now() - this.elapsed;
    
    if (this.elapsed === 0) {
      this.config.onStart();
    }
  }
  
  /**
   * 暂停动画
   */
  pause(): void {
    if (!this.isPlaying) return;
    
    this.isPaused = true;
    this.isPlaying = false;
  }
  
  /**
   * 停止动画
   */
  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.elapsed = 0;
  }
  
  /**
   * 反向播放
   */
  reverse(): void {
    this.reversed = !this.reversed;
    if (this.isPlaying) {
      // 重新计算开始时间以保持平滑反向
      const progress = this.getProgress();
      this.startTime = performance.now() - (1 - progress) * this.config.duration;
    }
  }
  
  /**
   * 更新动画
   */
  update(deltaTime: number): boolean {
    if (!this.isPlaying || this.isPaused) return true;
    
    this.elapsed = performance.now() - this.startTime - this.config.delay;
    
    // 延迟处理
    if (this.elapsed < 0) return true;
    
    const progress = this.getProgress();
    const easedProgress = this.config.easing(progress);
    
    // 应用动画值
    this.applyValues(easedProgress);
    
    // 调用更新回调
    this.config.onUpdate(progress);
    
    // 检查是否完成
    if (progress >= 1) {
      if (this.config.repeat > 0 && this.repeatCount < this.config.repeat) {
        // 重复播放
        this.repeatCount++;
        this.config.onRepeat();
        
        if (this.config.yoyo) {
          this.reversed = !this.reversed;
        }
        
        this.startTime = performance.now();
        this.elapsed = 0;
        return true;
      } else {
        // 动画完成
        this.isPlaying = false;
        this.config.onComplete();
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 获取动画进度
   */
  private getProgress(): number {
    let progress = Math.min(1, this.elapsed / this.config.duration);
    
    if (this.reversed) {
      progress = 1 - progress;
    }
    
    return progress;
  }
  
  /**
   * 应用动画值
   */
  private applyValues(progress: number): void {
    for (const prop in this.toProps) {
      if (this.toProps.hasOwnProperty(prop)) {
        const fromValue = this.fromProps[prop];
        const toValue = this.toProps[prop];
        
        if (typeof fromValue === 'number' && typeof toValue === 'number') {
          const value = fromValue + (toValue - fromValue) * progress;
          this.setTargetProperty(prop, value);
        } else if (Array.isArray(fromValue) && Array.isArray(toValue)) {
          // 处理数组属性（如位置、大小等）
          const value = fromValue.map((from: number, index: number) => {
            const to = toValue[index];
            return from + (to - from) * progress;
          });
          this.setTargetProperty(prop, value);
        }
      }
    }
  }
  
  /**
   * 设置目标属性
   */
  private setTargetProperty(prop: string, value: any): void {
    // 根据属性名称调用相应的方法
    switch (prop) {
      case 'x':
        if (this.target.setPosition) {
          const currentPos = this.target.getPosition ? this.target.getPosition() : { x: 0, y: 0 };
          this.target.setPosition({ x: value, y: currentPos.y });
        } else if (this.target.position) {
          this.target.position.x = value;
        }
        break;
      case 'y':
        if (this.target.setPosition) {
          const currentPos = this.target.getPosition ? this.target.getPosition() : { x: 0, y: 0 };
          this.target.setPosition({ x: currentPos.x, y: value });
        } else if (this.target.position) {
          this.target.position.y = value;
        }
        break;
      case 'position':
        if (this.target.setPosition) {
          this.target.setPosition(value);
        } else if (this.target.position) {
          this.target.position = { ...this.target.position, ...value };
        }
        break;
      case 'width':
        if (this.target.setSize) {
          const currentSize = this.target.getSize ? this.target.getSize() : { width: 0, height: 0 };
          this.target.setSize({ width: value, height: currentSize.height });
        } else if (this.target.size) {
          this.target.size.width = value;
        }
        break;
      case 'height':
        if (this.target.setSize) {
          const currentSize = this.target.getSize ? this.target.getSize() : { width: 0, height: 0 };
          this.target.setSize({ width: currentSize.width, height: value });
        } else if (this.target.size) {
          this.target.size.height = value;
        }
        break;
      case 'size':
        if (this.target.setSize) {
          this.target.setSize(value);
        } else if (this.target.size) {
          this.target.size = { ...this.target.size, ...value };
        }
        break;
      case 'scale':
        if (this.target.setScale) {
          this.target.setScale(value);
        } else if (this.target.scale) {
          this.target.scale = value;
        }
        break;
      case 'rotation':
        if (this.target.setRotation) {
          this.target.setRotation(value);
        } else if (this.target.rotation !== undefined) {
          this.target.rotation = value;
        }
        break;
      case 'opacity':
        if (this.target.setOpacity) {
          this.target.setOpacity(value);
        } else if (this.target.opacity !== undefined) {
          this.target.opacity = value;
        }
        break;
      case 'color':
        if (this.target.setColor) {
          this.target.setColor(value);
        } else if (this.target.color) {
          this.target.color = value;
        }
        break;
      default:
        // 尝试直接设置属性
        if (this.target && this.target[prop] !== undefined) {
          this.target[prop] = value;
        }
        break;
    }
  }
  
  /**
   * 检查动画是否正在播放
   */
  isPlayingAnimation(): boolean {
    return this.isPlaying && !this.isPaused;
  }
  
  /**
   * 获取目标对象
   */
  getTarget(): any {
    return this.target;
  }
  
  /**
   * 获取动画ID
   */
  getId(): string {
    return this.target.id + '_' + Date.now();
  }
  
  /**
   * 获取配置
   */
  getConfig(): Required<AnimationConfig> {
    return { ...this.config };
  }
  
  /**
   * 获取当前进度
   */
  getCurrentProgress(): number {
    return this.getProgress();
  }
}