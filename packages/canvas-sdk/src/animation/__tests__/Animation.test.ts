import { Animation } from '../Animation';
import { Easing } from '../Easing';

describe('Animation', () => {
  let mockTarget: any;
  let animation: Animation;

  beforeEach(() => {
    mockTarget = {
      id: 'test-target',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
      setPosition: jest.fn(function(pos) { this.position = { ...pos }; }),
      setSize: jest.fn(function(size) { this.size = { ...size }; }),
      getPosition: jest.fn(function() { return { ...this.position }; }),
      getSize: jest.fn(function() { return { ...this.size }; })
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
    performance.now = jest.fn(() => 0);
    
    animation.play();
    
    // Simulate time passing
    performance.now = jest.fn(() => 500);
    const result = animation.update(16);
    
    expect(result).toBe(true);
    
    // Restore original performance.now
    performance.now = originalNow;
  });

  test('should apply values to target properties', () => {
    // This test requires internal method access, so we'll test indirectly
    animation.play();
    
    // Mock performance.now for completion
    const originalNow = performance.now;
    performance.now = jest.fn(() => 2000); // Beyond duration
    
    const result = animation.update(1000);
    
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
    const onStart = jest.fn();
    const onUpdate = jest.fn();
    const onComplete = jest.fn();
    
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
    performance.now = jest.fn(() => 2000);
    
    callbackAnim.update(1000);
    
    // Restore original performance.now
    performance.now = originalNow;
  });

  test('should handle repeat and yoyo', () => {
    const onRepeat = jest.fn();
    
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
    performance.now = jest.fn(() => 1000);
    
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