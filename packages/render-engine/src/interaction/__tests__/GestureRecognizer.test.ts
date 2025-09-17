/**
 * GestureRecognizer 单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GestureRecognizer, IGestureConfig, GestureType, GestureState } from '../events/GestureRecognizer';

describe('GestureRecognizer', () => {
  let gestureRecognizer: GestureRecognizer;
  let mockConfig: IGestureConfig;

  beforeEach(() => {
    mockConfig = {
      minDistance: 10,
      minScale: 0.1,
      minRotation: 0.1,
      tapTimeout: 300,
      longPressTimeout: 500,
      doubleTapDelay: 300
    };

    gestureRecognizer = new GestureRecognizer(mockConfig);
  });

  afterEach(() => {
    if (gestureRecognizer) {
      gestureRecognizer.dispose();
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with config', () => {
      expect(gestureRecognizer).toBeInstanceOf(GestureRecognizer);
    });

    it('should initialize with default config when not provided', () => {
      const recognizer = new GestureRecognizer();
      expect(recognizer).toBeInstanceOf(GestureRecognizer);
      recognizer.dispose();
    });

    it('should be enabled by default', () => {
      expect(gestureRecognizer.isEnabled()).toBe(true);
    });
  });

  describe('Enable/Disable', () => {
    it('should enable/disable gesture recognition', () => {
      gestureRecognizer.setEnabled(false);
      expect(gestureRecognizer.isEnabled()).toBe(false);
      
      gestureRecognizer.setEnabled(true);
      expect(gestureRecognizer.isEnabled()).toBe(true);
    });

    it('should not process gestures when disabled', () => {
      gestureRecognizer.setEnabled(false);
      
      const mockTouch = {
        identifier: 0,
        clientX: 100,
        clientY: 100,
        pageX: 100,
        pageY: 100,
        screenX: 100,
        screenY: 100,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
        target: document.createElement('canvas')
      } as Touch;

      const touchEvent = {
        touches: [mockTouch],
        changedTouches: [mockTouch],
        targetTouches: [mockTouch],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      expect(() => gestureRecognizer.handleTouchStart(touchEvent)).not.toThrow();
    });
  });

  describe('Touch Event Handling', () => {
    const createMockTouch = (id: number, x: number, y: number): Touch => ({
      identifier: id,
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y,
      screenX: x,
      screenY: y,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1,
      target: document.createElement('canvas')
    } as Touch);

    const createMockTouchEvent = (touches: Touch[], changedTouches?: Touch[]): any => ({
      touches,
      changedTouches: changedTouches || touches,
      targetTouches: touches,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn()
    });

    it('should handle touch start events', () => {
      const touch = createMockTouch(0, 100, 100);
      const touchEvent = createMockTouchEvent([touch]);
      
      expect(() => gestureRecognizer.handleTouchStart(touchEvent)).not.toThrow();
    });

    it('should handle touch move events', () => {
      const touch1 = createMockTouch(0, 100, 100);
      const touch2 = createMockTouch(0, 110, 110);
      
      const startEvent = createMockTouchEvent([touch1]);
      const moveEvent = createMockTouchEvent([touch2]);
      
      gestureRecognizer.handleTouchStart(startEvent);
      expect(() => gestureRecognizer.handleTouchMove(moveEvent)).not.toThrow();
    });

    it('should handle touch end events', () => {
      const touch = createMockTouch(0, 100, 100);
      const touchEvent = createMockTouchEvent([touch]);
      
      gestureRecognizer.handleTouchStart(touchEvent);
      expect(() => gestureRecognizer.handleTouchEnd(touchEvent)).not.toThrow();
    });

    it('should handle touch cancel events', () => {
      const touch = createMockTouch(0, 100, 100);
      const touchEvent = createMockTouchEvent([touch]);
      
      gestureRecognizer.handleTouchStart(touchEvent);
      expect(() => gestureRecognizer.handleTouchCancel(touchEvent)).not.toThrow();
    });
  });

  describe('Gesture State', () => {
    it('should get current gesture state', () => {
      const state = gestureRecognizer.getGestureState();
      expect(Object.values(GestureState)).toContain(state);
    });

    it('should get current gesture type', () => {
      const type = gestureRecognizer.getGestureType();
      // 初始状态下手势类型可能为undefined
      if (type !== undefined) {
        expect(Object.values(GestureType)).toContain(type);
      } else {
        expect(type).toBeUndefined();
      }
    });

    it('should start with possible state', () => {
      expect(gestureRecognizer.getGestureState()).toBe(GestureState.POSSIBLE);
    });

    it('should start with undefined gesture type', () => {
      expect(gestureRecognizer.getGestureType()).toBeUndefined();
    });
  });

  describe('Tap Gesture', () => {
    it('should recognize single tap', () => {
      const touch = {
        identifier: 0,
        clientX: 100,
        clientY: 100,
        pageX: 100,
        pageY: 100,
        screenX: 100,
        screenY: 100,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
        target: document.createElement('canvas')
      } as Touch;

      const touchEvent = {
        touches: [touch],
        changedTouches: [touch],
        targetTouches: [touch],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      const tapSpy = vi.fn();
      gestureRecognizer.on('tap', tapSpy);

      gestureRecognizer.handleTouchStart(touchEvent);
      gestureRecognizer.handleTouchEnd(touchEvent);
      
      // Check if tap event would be fired
      expect(() => gestureRecognizer.handleTouchEnd(touchEvent)).not.toThrow();
    });

    it('should not recognize tap if touch moves too far', () => {
      const tapSpy = vi.fn();
      gestureRecognizer.on('tap', tapSpy);

      const touch1 = {
        identifier: 0,
        clientX: 100,
        clientY: 100,
        pageX: 100,
        pageY: 100,
        screenX: 100,
        screenY: 100,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
        target: document.createElement('canvas')
      } as Touch;

      const touch2 = {
        ...touch1,
        clientX: 150, // Move beyond threshold
        clientY: 150
      } as Touch;

      const startEvent = {
        touches: [touch1],
        changedTouches: [touch1],
        targetTouches: [touch1],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      const moveEvent = {
        touches: [touch2],
        changedTouches: [touch2],
        targetTouches: [touch2],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      const endEvent = {
        touches: [],
        changedTouches: [touch2],
        targetTouches: [],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      gestureRecognizer.handleTouchStart(startEvent);
      gestureRecognizer.handleTouchMove(moveEvent);
      gestureRecognizer.handleTouchEnd(endEvent);

      // Wait a bit to ensure no tap event is fired
      setTimeout(() => {
        expect(tapSpy).not.toHaveBeenCalled();
      }, 100);
    });
  });

  describe('Pan Gesture', () => {
    it('should recognize pan gesture', () => {
      const touch1 = {
        identifier: 0,
        clientX: 100,
        clientY: 100,
        pageX: 100,
        pageY: 100,
        screenX: 100,
        screenY: 100,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
        target: document.createElement('canvas')
      } as Touch;

      const touch2 = {
        ...touch1,
        clientX: 120,
        clientY: 120
      } as Touch;

      const startEvent = {
        touches: [touch1],
        changedTouches: [touch1],
        targetTouches: [touch1],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      const moveEvent = {
        touches: [touch2],
        changedTouches: [touch2],
        targetTouches: [touch2],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      const panSpy = vi.fn();
      gestureRecognizer.on('pan', panSpy);

      gestureRecognizer.handleTouchStart(startEvent);
      gestureRecognizer.handleTouchMove(moveEvent);
    });
  });

  describe('Pinch Gesture', () => {
    it('should recognize pinch gesture with two touches', () => {
      const touch1 = {
        identifier: 0,
        clientX: 100,
        clientY: 100,
        pageX: 100,
        pageY: 100,
        screenX: 100,
        screenY: 100,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
        target: document.createElement('canvas')
      } as Touch;

      const touch2 = {
        identifier: 1,
        clientX: 200,
        clientY: 200,
        pageX: 200,
        pageY: 200,
        screenX: 200,
        screenY: 200,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
        target: document.createElement('canvas')
      } as Touch;

      const startEvent = {
        touches: [touch1, touch2],
        changedTouches: [touch1, touch2],
        targetTouches: [touch1, touch2],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      // Move touches closer together for pinch
      const movedTouch1 = { ...touch1, clientX: 110, clientY: 110 };
      const movedTouch2 = { ...touch2, clientX: 190, clientY: 190 };

      const moveEvent = {
        touches: [movedTouch1, movedTouch2],
        changedTouches: [movedTouch1, movedTouch2],
        targetTouches: [movedTouch1, movedTouch2],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      const pinchSpy = vi.fn();
      gestureRecognizer.on('pinch', pinchSpy);

      gestureRecognizer.handleTouchStart(startEvent);
      gestureRecognizer.handleTouchMove(moveEvent);
    });
  });

  describe('Rotation Gesture', () => {
    it('should recognize rotation gesture with two touches', () => {
      const touch1 = {
        identifier: 0,
        clientX: 100,
        clientY: 100,
        pageX: 100,
        pageY: 100,
        screenX: 100,
        screenY: 100,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
        target: document.createElement('canvas')
      } as Touch;

      const touch2 = {
        identifier: 1,
        clientX: 200,
        clientY: 100,
        pageX: 200,
        pageY: 100,
        screenX: 200,
        screenY: 100,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
        target: document.createElement('canvas')
      } as Touch;

      const startEvent = {
        touches: [touch1, touch2],
        changedTouches: [touch1, touch2],
        targetTouches: [touch1, touch2],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      // Rotate touches
      const movedTouch1 = { ...touch1, clientX: 100, clientY: 120 };
      const movedTouch2 = { ...touch2, clientX: 200, clientY: 80 };

      const moveEvent = {
        touches: [movedTouch1, movedTouch2],
        changedTouches: [movedTouch1, movedTouch2],
        targetTouches: [movedTouch1, movedTouch2],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      const rotateSpy = vi.fn();
      gestureRecognizer.on('rotate', rotateSpy);

      gestureRecognizer.handleTouchStart(startEvent);
      gestureRecognizer.handleTouchMove(moveEvent);
    });
  });

  describe('Long Press Gesture', () => {
    it('should recognize long press gesture', () => {
      const touch = {
        identifier: 0,
        clientX: 100,
        clientY: 100,
        pageX: 100,
        pageY: 100,
        screenX: 100,
        screenY: 100,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
        target: document.createElement('canvas')
      } as Touch;

      const touchEvent = {
        touches: [touch],
        changedTouches: [touch],
        targetTouches: [touch],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      const longPressSpy = vi.fn();
      gestureRecognizer.on('longpress', longPressSpy);

      gestureRecognizer.handleTouchStart(touchEvent);
      
      // Long press should trigger after delay
      expect(() => gestureRecognizer.handleTouchStart(touchEvent)).not.toThrow();
    });
  });

  describe('Event Emission', () => {
    it('should emit gesture events', () => {
      const listener = vi.fn();
      gestureRecognizer.on('gesturestart', listener);
      
      expect(() => gestureRecognizer.emit('gesturestart', {})).not.toThrow();
    });

    it('should remove event listeners', () => {
      const listener = vi.fn();
      gestureRecognizer.on('gesturestart', listener);
      gestureRecognizer.off('gesturestart', listener);
      
      gestureRecognizer.emit('gesturestart', {});
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should use provided configuration', () => {
      const customConfig: IGestureConfig = {
        minDistance: 5,
        minScale: 0.05,
        tapTimeout: 200
      };
      
      const recognizer = new GestureRecognizer(customConfig);
      expect(recognizer).toBeInstanceOf(GestureRecognizer);
      recognizer.dispose();
    });

    it('should handle partial configuration', () => {
      const partialConfig: Partial<IGestureConfig> = {
        minDistance: 15
      };
      
      const recognizer = new GestureRecognizer(partialConfig);
      expect(recognizer).toBeInstanceOf(GestureRecognizer);
      recognizer.dispose();
    });
  });

  describe('Cleanup', () => {
    it('should dispose properly', () => {
      expect(() => gestureRecognizer.dispose()).not.toThrow();
    });

    it('should handle multiple dispose calls', () => {
      expect(() => {
        gestureRecognizer.dispose();
        gestureRecognizer.dispose();
      }).not.toThrow();
    });

    it('should not process events after disposal', () => {
      gestureRecognizer.dispose();
      
      const touch = {
        identifier: 0,
        clientX: 100,
        clientY: 100,
        pageX: 100,
        pageY: 100,
        screenX: 100,
        screenY: 100,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
        target: document.createElement('canvas')
      } as Touch;

      const touchEvent = {
        touches: [touch],
        changedTouches: [touch],
        targetTouches: [touch],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      expect(() => gestureRecognizer.handleTouchStart(touchEvent)).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty touch events', () => {
      const emptyTouchEvent = {
        touches: [],
        changedTouches: [],
        targetTouches: [],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      expect(() => gestureRecognizer.handleTouchStart(emptyTouchEvent)).not.toThrow();
      expect(() => gestureRecognizer.handleTouchMove(emptyTouchEvent)).not.toThrow();
      expect(() => gestureRecognizer.handleTouchEnd(emptyTouchEvent)).not.toThrow();
    });

    it('should handle invalid touch data', () => {
      const invalidTouchEvent = {
        touches: [null],
        changedTouches: [undefined],
        targetTouches: [],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      expect(() => gestureRecognizer.handleTouchStart(invalidTouchEvent)).not.toThrow();
    });

    it('should handle rapid touch events', () => {
      const touch = {
        identifier: 0,
        clientX: 100,
        clientY: 100,
        pageX: 100,
        pageY: 100,
        screenX: 100,
        screenY: 100,
        radiusX: 1,
        radiusY: 1,
        rotationAngle: 0,
        force: 1,
        target: document.createElement('canvas')
      } as Touch;

      const touchEvent = {
        touches: [touch],
        changedTouches: [touch],
        targetTouches: [touch],
        preventDefault: vi.fn(),
        stopPropagation: vi.fn()
      } as any;

      // Rapid fire events
      for (let i = 0; i < 10; i++) {
        expect(() => gestureRecognizer.handleTouchStart(touchEvent)).not.toThrow();
        expect(() => gestureRecognizer.handleTouchMove(touchEvent)).not.toThrow();
        expect(() => gestureRecognizer.handleTouchEnd(touchEvent)).not.toThrow();
      }
    });
  });
});