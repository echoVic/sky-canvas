import { Timeline } from '../Timeline';
import { Animation } from '../Animation';

describe('Timeline', () => {
  let timeline: Timeline;
  let mockTarget: any;

  beforeEach(() => {
    timeline = new Timeline();
    mockTarget = {
      id: 'test-target',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 }
    };
  });

  test('should create timeline', () => {
    expect(timeline).toBeInstanceOf(Timeline);
  });

  test('should add animation to timeline', () => {
    const animation = new Animation(
      mockTarget,
      { x: 0 },
      { x: 100 },
      { duration: 1000 }
    );
    
    timeline.add(animation);
    
    expect(timeline.getDuration()).toBeGreaterThanOrEqual(1000);
  });

  test('should add animation with to method', () => {
    timeline.to(mockTarget, { x: 100 }, { duration: 1000 });
    
    expect(timeline.getDuration()).toBeGreaterThanOrEqual(1000);
  });

  test('should add callback to timeline', () => {
    const callback = jest.fn();
    timeline.addCallback(callback, 500);
    
    expect(timeline.getDuration()).toBe(500);
  });

  test('should play and pause timeline', () => {
    expect(timeline.isPlayingTimeline()).toBe(false);
    
    timeline.play();
    // Note: In real usage, this would depend on whether there are animations
    // For testing, we just verify the methods don't throw
    
    timeline.pause();
    expect(timeline.isPlayingTimeline()).toBe(false);
  });

  test('should stop timeline', () => {
    timeline.to(mockTarget, { x: 100 }, { duration: 1000 });
    timeline.play();
    
    timeline.stop();
    expect(timeline.isPlayingTimeline()).toBe(false);
    expect(timeline.getCurrentTime()).toBe(0);
  });

  test('should seek to specific time', () => {
    timeline.to(mockTarget, { x: 100 }, { duration: 1000 });
    
    expect(() => {
      timeline.seek(500);
    }).not.toThrow();
    
    expect(timeline.getCurrentTime()).toBe(500);
  });

  test('should reverse timeline', () => {
    timeline.to(mockTarget, { x: 100 }, { duration: 1000 });
    
    expect(() => {
      timeline.reverse();
    }).not.toThrow();
  });

  test('should get current time and duration', () => {
    const currentTime = timeline.getCurrentTime();
    const duration = timeline.getDuration();
    
    expect(typeof currentTime).toBe('number');
    expect(typeof duration).toBe('number');
    expect(currentTime).toBeGreaterThanOrEqual(0);
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  test('should reset timeline', () => {
    timeline.to(mockTarget, { x: 100 }, { duration: 1000 });
    timeline.addCallback(() => {}, 500);
    
    timeline.reset();
    
    expect(timeline.getDuration()).toBe(0);
    expect(timeline.getCurrentTime()).toBe(0);
  });
});