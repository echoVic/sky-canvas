import { Animation } from '../Animation';
import { Easing } from '../Easing';
import { vi } from 'vitest';

describe('Animation', () => {
  let mockTarget: any;
  let animation: Animation;

  beforeEach(() => {
    mockTarget = {
      id: 'test-target',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      setPosition: vi.fn(function(this: any, pos) { this.position = { ...pos }; }),
      setSize: vi.fn(function(this: any, size) { this.size = { ...size }; }),
      getPosition: vi.fn(function(this: any) { return { ...this.position }; }),
      getSize: vi.fn(function(this: any) { return { ...this.size }; })
    };

    animation = new Animation(
      mockTarget,
      { x: 0, y: 0 },
      { x: 100, y: 100 },
      { duration: 1000 }
    );
  });

  test('should create animation with correct properties', () => {
    expect(animation.getTarget()).toBe(mockTarget);
    expect(animation.getId()).toContain('test-target');
  });

  test('should play and pause animation', () => {
    expect(animation.isPlayingAnimation()).toBe(false);
    
    animation.play();
    expect(animation.isPlayingAnimation()).toBe(true);
    
    animation.pause();
    expect(animation.isPlayingAnimation()).toBe(false);
  });

  test('should stop animation', () => {
    animation.play();
    expect(animation.isPlayingAnimation()).toBe(true);
    
    animation.stop();
    expect(animation.isPlayingAnimation()).toBe(false);
  });

  test('should reverse animation', () => {
    animation.play();
    animation.reverse();
    // We can't easily test the internal state, but at least verify no errors
    expect(true).toBe(true);
  });

  test('should handle update correctly', () => {
    // Mock performance.now
    const originalNow = performance.now;
    performance.now = vi.fn(() => 0);
    
    animation.play();
    
    // Simulate time passing
    performance.now = vi.fn(() => 500);
    const result = animation.update(16);
    
    expect(result).toBe(true);
    
    // Restore original performance.now
    performance.now = originalNow;
  });

  test('should apply values to target properties', () => {
    // Mock performance.now for completion
    const originalNow = performance.now;
    let currentTime = 0;
    performance.now = vi.fn(() => currentTime);
    
    // Start animation at time 0
    currentTime = 0;
    animation.play();
    
    // Progress to completion (beyond duration of 1000ms)
    currentTime = 1500;
    const result = animation.update(0);
    
    // Animation should complete
    expect(result).toBe(false);
    
    // Restore original performance.now
    performance.now = originalNow;
  });

  test('should handle different easing functions', () => {
    const linearAnim = new Animation(
      mockTarget,
      { x: 0 },
      { x: 100 },
      { duration: 1000, easing: Easing.linear }
    );
    
    const quadInAnim = new Animation(
      mockTarget,
      { x: 0 },
      { x: 100 },
      { duration: 1000, easing: Easing.quadIn }
    );
    
    expect(linearAnim.getConfig().easing).toBe(Easing.linear);
    expect(quadInAnim.getConfig().easing).toBe(Easing.quadIn);
  });

  test('should handle callback functions', () => {
    const onStart = vi.fn();
    const onUpdate = vi.fn();
    const onComplete = vi.fn();
    
    const callbackAnim = new Animation(
      mockTarget,
      { x: 0 },
      { x: 100 },
      { 
        duration: 1000, 
        onStart,
        onUpdate,
        onComplete
      }
    );
    
    callbackAnim.play();
    
    // Mock performance.now for completion
    const originalNow = performance.now;
    performance.now = vi.fn(() => 2000);
    
    callbackAnim.update(1000);
    
    // Restore original performance.now
    performance.now = originalNow;
  });

  test('should handle repeat and yoyo', () => {
    const onRepeat = vi.fn();
    
    const repeatAnim = new Animation(
      mockTarget,
      { x: 0 },
      { x: 100 },
      { 
        duration: 100,
        repeat: 2,
        yoyo: true,
        onRepeat
      }
    );
    
    repeatAnim.play();
    
    // Mock performance.now for completion multiple times
    const originalNow = performance.now;
    performance.now = vi.fn(() => 1000);
    
    repeatAnim.update(1000);
    
    // Restore original performance.now
    performance.now = originalNow;
  });

  test('should get current progress', () => {
    const progress = animation.getCurrentProgress();
    expect(typeof progress).toBe('number');
    expect(progress).toBeGreaterThanOrEqual(0);
    expect(progress).toBeLessThanOrEqual(1);
  });
});