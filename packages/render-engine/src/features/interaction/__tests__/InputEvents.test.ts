/**
 * InputEvents 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BaseEvent,
  InputState,
  createMouseEvent,
  createTouchEvent,
  createGestureEvent,
  IPointerEvent,
  IMouseEvent,
  ITouchEvent,
  IGestureEvent,
  IPoint,
  ITouch
} from '../events/InputEvents';
import { InputEventType } from '../EventTypes';
import { Vector2 } from '../../../math/Vector2';

describe('InputEvents', () => {
  describe('BaseEvent', () => {
    it('should create base event with required properties', () => {
      const event = new BaseEvent(InputEventType.MOUSE_DOWN);

      expect(event.type).toBe(InputEventType.MOUSE_DOWN);
      expect(event.timestamp).toBeTypeOf('number');
      expect(event.timestamp).toBeGreaterThan(0);
    });

    it('should handle preventDefault and stopPropagation', () => {
      const event = new BaseEvent(InputEventType.MOUSE_MOVE);

      expect(event.isDefaultPrevented()).toBe(false);
      expect(event.isPropagationStopped()).toBe(false);
      
      event.preventDefault();
      event.stopPropagation();
      
      expect(event.isDefaultPrevented()).toBe(true);
      expect(event.isPropagationStopped()).toBe(true);
    });
  });

  describe('InputState', () => {
    let inputState: InputState;

    beforeEach(() => {
      inputState = new InputState();
    });

    describe('Mouse State', () => {
      it('should track mouse position', () => {
        inputState.setMousePosition({ x: 100, y: 200 });
        
        expect(inputState.mousePosition).toEqual({ x: 100, y: 200 });
      });

      it('should track mouse button states', () => {
        inputState.setMouseButtonDown(0); // Left button
        
        expect(inputState.isMouseButtonDown(0)).toBe(true);
        expect(inputState.isMouseButtonDown(1)).toBe(false);
        expect(inputState.isMouseButtonDown(2)).toBe(false);
      });

      it('should release mouse buttons', () => {
        inputState.setMouseButtonDown(0);
        inputState.setMouseButtonUp(0);
        
        expect(inputState.isMouseButtonDown(0)).toBe(false);
      });

      it('should track multiple mouse buttons', () => {
        inputState.setMouseButtonDown(0); // Left
        inputState.setMouseButtonDown(2); // Right
        
        expect(inputState.isMouseButtonDown(0)).toBe(true);
        expect(inputState.isMouseButtonDown(1)).toBe(false);
        expect(inputState.isMouseButtonDown(2)).toBe(true);
      });

      it('should get all pressed mouse buttons', () => {
        inputState.setMouseButtonDown(0);
        inputState.setMouseButtonDown(2);
        
        const buttons = inputState.getMouseButtons();
        expect(buttons).toContain(0);
        expect(buttons).toContain(2);
        expect(buttons).toHaveLength(2);
      });
    });

    describe('Keyboard State', () => {
      it('should track key states', () => {
        inputState.setKeyDown('KeyA');
        
        expect(inputState.isKeyDown('KeyA')).toBe(true);
        expect(inputState.isKeyDown('KeyB')).toBe(false);
      });

      it('should release keys', () => {
        inputState.setKeyDown('KeyA');
        inputState.setKeyUp('KeyA');
        
        expect(inputState.isKeyDown('KeyA')).toBe(false);
      });

      it('should track multiple keys', () => {
        inputState.setKeyDown('KeyA');
        inputState.setKeyDown('KeyB');
        
        expect(inputState.isKeyDown('KeyA')).toBe(true);
        expect(inputState.isKeyDown('KeyB')).toBe(true);
        expect(inputState.isKeyDown('KeyC')).toBe(false);
      });

      it('should get all pressed keys', () => {
        inputState.setKeyDown('KeyA');
        inputState.setKeyDown('KeyB');
        
        const pressedKeys = inputState.getDownKeys();
        expect(pressedKeys).toContain('keya'); // Keys are stored in lowercase
        expect(pressedKeys).toContain('keyb'); // Keys are stored in lowercase
        expect(pressedKeys).toHaveLength(2);
      });

      it('should track modifier keys', () => {
        inputState.setModifiers({
          ctrl: true,
          shift: false,
          alt: true,
          meta: false
        });
        
        const modifiers = inputState.modifiers;
        expect(modifiers.ctrl).toBe(true);
        expect(modifiers.shift).toBe(false);
        expect(modifiers.alt).toBe(true);
        expect(modifiers.meta).toBe(false);
      });
    });

    describe('Touch State', () => {
      it('should track active touches', () => {
        const touch: ITouch = {
          identifier: 0,
          screenPosition: { x: 100, y: 200 },
          worldPosition: { x: 100, y: 200 }
        };
        
        inputState.setTouch(touch);
        
        const touches = inputState.getTouches();
        expect(touches).toHaveLength(1);
        expect(touches[0]).toEqual(touch);
      });

      it('should remove touches', () => {
        const touch: ITouch = {
          identifier: 0,
          screenPosition: { x: 100, y: 200 },
          worldPosition: { x: 100, y: 200 }
        };
        
        inputState.setTouch(touch);
        expect(inputState.getTouches()).toHaveLength(1);
        
        inputState.removeTouch(0);
        expect(inputState.getTouches()).toHaveLength(0);
      });

      it('should handle multiple touches', () => {
        const touch1: ITouch = {
          identifier: 0,
          screenPosition: { x: 100, y: 200 },
          worldPosition: { x: 100, y: 200 }
        };
        
        const touch2: ITouch = {
          identifier: 1,
          screenPosition: { x: 300, y: 400 },
          worldPosition: { x: 300, y: 400 }
        };
        
        inputState.setTouch(touch1);
        inputState.setTouch(touch2);
        
        const touches = inputState.getTouches();
        expect(touches).toHaveLength(2);
      });

      it('should get touch by identifier', () => {
        const touch: ITouch = {
          identifier: 5,
          screenPosition: { x: 100, y: 200 },
          worldPosition: { x: 100, y: 200 }
        };
        
        inputState.setTouch(touch);
        
        const foundTouch = inputState.getTouch(5);
        expect(foundTouch).toEqual(touch);
        
        const notFoundTouch = inputState.getTouch(10);
        expect(notFoundTouch).toBeUndefined();
      });

      it('should clear all touches', () => {
        const touch: ITouch = {
          identifier: 0,
          screenPosition: { x: 100, y: 200 },
          worldPosition: { x: 100, y: 200 }
        };
        
        inputState.setTouch(touch);
        expect(inputState.getTouches()).toHaveLength(1);
        
        inputState.clearTouches();
        expect(inputState.getTouches()).toHaveLength(0);
      });
    });

    describe('State Reset', () => {
      it('should reset all state', () => {
        // Set up some state
        inputState.setMousePosition({ x: 100, y: 200 });
        inputState.setMouseButtonDown(0);
        inputState.setKeyDown('KeyA');
        inputState.setTouch({
          identifier: 0,
          screenPosition: { x: 50, y: 75 },
          worldPosition: { x: 50, y: 75 }
        });
        
        // Reset
        inputState.reset();
        
        // Check everything is cleared
        expect(inputState.mousePosition).toEqual({ x: 0, y: 0 });
        expect(inputState.isMouseButtonDown(0)).toBe(false);
        expect(inputState.isKeyDown('KeyA')).toBe(false);
        expect(inputState.getDownKeys()).toHaveLength(0);
        expect(inputState.getTouches()).toHaveLength(0);
      });

      it('should provide debug information', () => {
        inputState.setMousePosition({ x: 100, y: 200 });
        inputState.setMouseButtonDown(0);
        inputState.setKeyDown('KeyA');
        
        const debugInfo = inputState.getDebugInfo();
        expect(debugInfo).toBeTypeOf('object');
      });
    });
  });

  describe('Event Creation Functions', () => {
    describe('createMouseEvent', () => {
      it('should create mouse event with required properties', () => {
        const nativeEvent = {
          type: 'mousedown',
          clientX: 100,
          clientY: 200,
          button: 0,
          buttons: 1,
          ctrlKey: false,
          shiftKey: false,
          altKey: false,
          metaKey: false,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        } as any;
        
        const worldPosition = { x: 100, y: 200 };
        const mouseEvent = createMouseEvent(InputEventType.MOUSE_DOWN, nativeEvent, worldPosition);
        
        expect(mouseEvent.type).toBe(InputEventType.MOUSE_DOWN);
        expect(mouseEvent.screenPosition).toEqual({ x: 100, y: 200 });
        expect(mouseEvent.worldPosition).toEqual(worldPosition);
        expect(mouseEvent.button).toBe(0);
        expect(mouseEvent.buttons).toBe(1);
        expect(mouseEvent.ctrlKey).toBe(false);
        expect(mouseEvent.shiftKey).toBe(false);
        expect(mouseEvent.altKey).toBe(false);
        expect(mouseEvent.metaKey).toBe(false);
      });

      it('should handle different mouse event types', () => {
        const mouseMoveEvent = {
          type: 'mousemove',
          clientX: 50,
          clientY: 75,
          button: -1,
          buttons: 0,
          ctrlKey: true,
          shiftKey: false,
          altKey: false,
          metaKey: false,
          deltaX: 10,
          deltaY: 20,
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        } as any;
        
        const worldPosition = { x: 50, y: 75 };
        const event = createMouseEvent(InputEventType.MOUSE_MOVE, mouseMoveEvent, worldPosition);
        expect(event.type).toBe(InputEventType.MOUSE_MOVE);
        expect(event.ctrlKey).toBe(true);
        // deltaX and deltaY are only set for mousewheel events
        expect(event.deltaX).toBeUndefined();
        expect(event.deltaY).toBeUndefined();
      });
    });

    describe('createTouchEvent', () => {
      it('should create touch event with touch data', () => {
        const mockTouch = {
          identifier: 0,
          clientX: 100,
          clientY: 200,
          pageX: 100,
          pageY: 200,
          screenX: 100,
          screenY: 200,
          radiusX: 1,
          radiusY: 1,
          rotationAngle: 0,
          force: 1,
          target: document.createElement('canvas')
        } as Touch;
        
        const nativeEvent = {
          type: 'touchstart',
          touches: [mockTouch],
          changedTouches: [mockTouch],
          targetTouches: [mockTouch],
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        } as any;
        
        const worldPositions = [{ x: 100, y: 200 }];
        const touchEvent = createTouchEvent(InputEventType.TOUCH_START, nativeEvent, worldPositions);
        
        expect(touchEvent.type).toBe(InputEventType.TOUCH_START);
        expect(touchEvent.touches).toHaveLength(1);
        expect(touchEvent.touches[0].identifier).toBe(0);
        expect(touchEvent.touches[0].screenPosition).toEqual({ x: 100, y: 200 });
        expect(touchEvent.touches[0].worldPosition).toEqual({ x: 100, y: 200 });
      });

      it('should handle multiple touches', () => {
        const touch1 = {
          identifier: 0,
          clientX: 100,
          clientY: 200,
          pageX: 100,
          pageY: 200,
          screenX: 100,
          screenY: 200,
          radiusX: 1,
          radiusY: 1,
          rotationAngle: 0,
          force: 1,
          target: document.createElement('canvas')
        } as Touch;
        
        const touch2 = {
          identifier: 1,
          clientX: 300,
          clientY: 400,
          pageX: 300,
          pageY: 400,
          screenX: 300,
          screenY: 400,
          radiusX: 1,
          radiusY: 1,
          rotationAngle: 0,
          force: 1,
          target: document.createElement('canvas')
        } as Touch;
        
        const nativeEvent = {
          type: 'touchmove',
          touches: [touch1, touch2],
          changedTouches: [touch1, touch2],
          targetTouches: [touch1, touch2],
          preventDefault: vi.fn(),
          stopPropagation: vi.fn()
        } as any;
        
        const worldPositions = [{ x: 100, y: 200 }, { x: 300, y: 400 }];
        const touchEvent = createTouchEvent(InputEventType.TOUCH_MOVE, nativeEvent, worldPositions);
        
        expect(touchEvent.type).toBe(InputEventType.TOUCH_MOVE);
        expect(touchEvent.touches).toHaveLength(2);
      });
    });

    describe('createGestureEvent', () => {
      it('should create gesture event with gesture data', () => {
        const center = { x: 150, y: 150 };
        const scale = 1.5;
        const rotation = 45;
        const velocity = new Vector2(10, 20);
        const deltaScale = 0.1;
        const deltaRotation = 5;
        const deltaTranslation = new Vector2(5, 10);
        
        const gestureEvent = createGestureEvent(
          InputEventType.GESTURE_CHANGE,
          center,
          scale,
          rotation,
          velocity,
          deltaScale,
          deltaRotation,
          deltaTranslation
        );
        
        expect(gestureEvent.type).toBe(InputEventType.GESTURE_CHANGE);
        expect(gestureEvent.center).toEqual(center);
        expect(gestureEvent.scale).toBe(scale);
        expect(gestureEvent.rotation).toBe(rotation);
        expect(gestureEvent.velocity).toEqual(velocity);
        expect(gestureEvent.deltaScale).toBe(deltaScale);
        expect(gestureEvent.deltaRotation).toBe(deltaRotation);
        expect(gestureEvent.deltaTranslation).toEqual(deltaTranslation);
      });

      it('should create gesture event with default delta values', () => {
        const center = { x: 100, y: 100 };
        const scale = 1.0;
        const rotation = 0;
        const velocity = new Vector2(0, 0);
        
        const gestureEvent = createGestureEvent(
          InputEventType.GESTURE_START,
          center,
          scale,
          rotation,
          velocity
        );
        
        expect(gestureEvent.type).toBe(InputEventType.GESTURE_START);
        expect(gestureEvent.deltaScale).toBe(0);
        expect(gestureEvent.deltaRotation).toBe(0);
        expect(gestureEvent.deltaTranslation).toEqual(new Vector2(0, 0));
      });
    });
  });

  describe('Event Interfaces', () => {
    it('should have proper type definitions', () => {
      // This test ensures TypeScript compilation works correctly
      const pointerEvent: IPointerEvent = {
        type: InputEventType.MOUSE_DOWN,
        timestamp: Date.now(),
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        isDefaultPrevented: vi.fn().mockReturnValue(false),
        isPropagationStopped: vi.fn().mockReturnValue(false),
        pointerId: 1,
        screenPosition: { x: 0, y: 0 },
        worldPosition: { x: 0, y: 0 },
        button: 0,
        buttons: 1,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false
      };
      
      expect(pointerEvent.pointerId).toBe(1);
      expect(pointerEvent.screenPosition).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid input gracefully', () => {
      const inputState = new InputState();
      
      // Test with invalid button numbers
      expect(() => inputState.setMouseButtonDown(-1)).not.toThrow();
      expect(() => inputState.setMouseButtonDown(10)).not.toThrow();
      
      // Test with invalid touch identifiers
      expect(() => inputState.removeTouch(-1)).not.toThrow();
      expect(() => inputState.getTouch(-1)).not.toThrow();
      
      // Test with empty strings
      expect(() => inputState.setKeyDown('')).not.toThrow();
      expect(() => inputState.isKeyDown('')).not.toThrow();
    });

    it('should handle null/undefined values', () => {
      const inputState = new InputState();
      
      expect(() => inputState.setMousePosition(null as any)).not.toThrow();
      expect(() => inputState.setModifiers(null as any)).not.toThrow();
      // setTouch requires a valid touch object, so we skip null test for it
    });
  });
});