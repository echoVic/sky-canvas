import { TweenEngine } from '../TweenEngine';
import { vi } from 'vitest';

describe('TweenEngine', () => {
  let tweenEngine: TweenEngine;
  let mockTarget: any;

  beforeEach(() => {
    tweenEngine = new TweenEngine();
    mockTarget = {
      id: 'test-target',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      setPosition: vi.fn(function(this: any, pos) { this.position = { ...pos }; }),
      setSize: vi.fn(function(this: any, size) { this.size = { ...size }; }),
      getPosition: vi.fn(function(this: any) { return { ...this.position }; }),
      getSize: vi.fn(function(this: any) { return { ...this.size }; })
    };
  });

  test('should create tween engine', () => {
    expect(tweenEngine).toBeInstanceOf(TweenEngine);
  });

  test('should create to animation', () => {
    const animation = tweenEngine.to(mockTarget, { x: 100, y: 100 }, { duration: 1000 });
    
    expect(animation).toBeDefined();
    expect(tweenEngine.getActiveAnimationCount()).toBe(1);
  });

  test('should create from animation', () => {
    const animation = tweenEngine.from(mockTarget, { x: 100, y: 100 }, { duration: 1000 });
    
    expect(animation).toBeDefined();
    expect(tweenEngine.getActiveAnimationCount()).toBe(1);
  });

  test('should create fromTo animation', () => {
    const animation = tweenEngine.fromTo(
      mockTarget, 
      { x: 0, y: 0 }, 
      { x: 100, y: 100 }, 
      { duration: 1000 }
    );
    
    expect(animation).toBeDefined();
    expect(tweenEngine.getActiveAnimationCount()).toBe(1);
  });

  test('should play, pause, and stop animations', () => {
    const animation = tweenEngine.to(mockTarget, { x: 100 }, { duration: 1000 });
    const animationId = animation.getId();
    
    // Play
    tweenEngine.play(animationId);
    expect(tweenEngine.isRunningAnimation()).toBe(true);
    
    // Pause
    tweenEngine.pause(animationId);
    // Stop
    tweenEngine.stop(animationId);
    expect(tweenEngine.getActiveAnimationCount()).toBe(0);
  });

  test('should reverse animation', () => {
    const animation = tweenEngine.to(mockTarget, { x: 100 }, { duration: 1000 });
    const animationId = animation.getId();
    
    expect(() => {
      tweenEngine.reverse(animationId);
    }).not.toThrow();
  });

  test('should stop all animations', () => {
    const mockTarget2 = {
      id: 'test-target-2',
      position: { x: 0, y: 0 },
      setPosition: vi.fn(function(this: any, pos) { this.position = { ...pos }; }),
      getPosition: vi.fn(function(this: any) { return { ...this.position }; })
    };
    
    tweenEngine.to(mockTarget, { x: 100 }, { duration: 1000 });
    tweenEngine.to(mockTarget2, { x: 100 }, { duration: 1000 });
    
    expect(tweenEngine.getActiveAnimationCount()).toBe(2);
    
    tweenEngine.stopAll();
    expect(tweenEngine.getActiveAnimationCount()).toBe(0);
    expect(tweenEngine.isRunningAnimation()).toBe(false);
  });

  test('should pause and resume all animations', () => {
    tweenEngine.to(mockTarget, { x: 100 }, { duration: 1000 });
    
    tweenEngine.pauseAll();
    // Resume all
    tweenEngine.resumeAll();
    
    expect(tweenEngine.isRunningAnimation()).toBe(true);
  });

  test('should update animations', () => {
    tweenEngine.to(mockTarget, { x: 100 }, { duration: 1000 });
    
    expect(() => {
      tweenEngine.update(16);
    }).not.toThrow();
  });

  test('should handle empty animation update', () => {
    // Update with no active animations
    tweenEngine.update(16);
    expect(tweenEngine.isRunningAnimation()).toBe(false);
  });

  test('should start and stop animation engine', () => {
    expect(tweenEngine.isRunningAnimation()).toBe(false);
    
    tweenEngine.start();
    expect(tweenEngine.isRunningAnimation()).toBe(true);
    
    tweenEngine.stopTweenEngine();
    expect(tweenEngine.isRunningAnimation()).toBe(false);
  });
});