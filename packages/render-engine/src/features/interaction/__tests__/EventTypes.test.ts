/**
 * EventTypes 单元测试
 */

import { describe, expect, it } from 'vitest';
import {
  BridgeEventType,
  CollisionType,
  EVENT_CONSTANTS,
  EventPriority,
  GestureState,
  GestureType,
  InputEventType,
  KEY_CODES,
  ModifierState,
  MOUSE_BUTTONS
} from '../EventTypes';

describe('EventTypes', () => {
  describe('InputEventType', () => {
    it('should define all mouse event types', () => {
      expect(InputEventType.MOUSE_DOWN).toBe('mousedown');
      expect(InputEventType.MOUSE_MOVE).toBe('mousemove');
      expect(InputEventType.MOUSE_UP).toBe('mouseup');
      expect(InputEventType.MOUSE_WHEEL).toBe('mousewheel');
      expect(InputEventType.MOUSE_ENTER).toBe('mouseenter');
      expect(InputEventType.MOUSE_LEAVE).toBe('mouseleave');
    });

    it('should define all touch event types', () => {
      expect(InputEventType.TOUCH_START).toBe('touchstart');
      expect(InputEventType.TOUCH_MOVE).toBe('touchmove');
      expect(InputEventType.TOUCH_END).toBe('touchend');
      expect(InputEventType.TOUCH_CANCEL).toBe('touchcancel');
    });

    it('should define all keyboard event types', () => {
      expect(InputEventType.KEY_DOWN).toBe('keydown');
      expect(InputEventType.KEY_UP).toBe('keyup');
      expect(InputEventType.KEY_PRESS).toBe('keypress');
    });

    it('should define all gesture event types', () => {
      expect(InputEventType.GESTURE_START).toBe('gesturestart');
      expect(InputEventType.GESTURE_CHANGE).toBe('gesturechange');
      expect(InputEventType.GESTURE_END).toBe('gestureend');
      expect(InputEventType.GESTURE_CANCEL).toBe('gesturecancel');
    });

    it('should define all composite event types', () => {
      expect(InputEventType.CLICK).toBe('click');
      expect(InputEventType.DOUBLE_CLICK).toBe('doubleclick');
      expect(InputEventType.LONG_PRESS).toBe('longpress');
    });

    it('should define all drag event types', () => {
      expect(InputEventType.DRAG_START).toBe('dragstart');
      expect(InputEventType.DRAG_MOVE).toBe('dragmove');
      expect(InputEventType.DRAG_END).toBe('dragend');
    });
  });

  describe('GestureType', () => {
    it('should define all gesture types', () => {
      expect(GestureType.PINCH).toBe('pinch');
      expect(GestureType.ROTATE).toBe('rotate');
      expect(GestureType.PAN).toBe('pan');
      expect(GestureType.TAP).toBe('tap');
      expect(GestureType.DOUBLE_TAP).toBe('doubletap');
      expect(GestureType.LONG_PRESS).toBe('longpress');
    });

    it('should have all expected gesture types', () => {
      const gestureTypes = Object.values(GestureType);
      expect(gestureTypes).toHaveLength(6);
      expect(gestureTypes).toContain('pinch');
      expect(gestureTypes).toContain('rotate');
      expect(gestureTypes).toContain('pan');
      expect(gestureTypes).toContain('tap');
      expect(gestureTypes).toContain('doubletap');
      expect(gestureTypes).toContain('longpress');
    });
  });

  describe('GestureState', () => {
    it('should define all gesture states', () => {
      expect(GestureState.POSSIBLE).toBe('possible');
      expect(GestureState.BEGAN).toBe('began');
      expect(GestureState.CHANGED).toBe('changed');
      expect(GestureState.ENDED).toBe('ended');
      expect(GestureState.CANCELLED).toBe('cancelled');
      expect(GestureState.FAILED).toBe('failed');
    });

    it('should have all expected gesture states', () => {
      const gestureStates = Object.values(GestureState);
      expect(gestureStates).toHaveLength(6);
      expect(gestureStates).toContain('possible');
      expect(gestureStates).toContain('began');
      expect(gestureStates).toContain('changed');
      expect(gestureStates).toContain('ended');
      expect(gestureStates).toContain('cancelled');
      expect(gestureStates).toContain('failed');
    });
  });

  describe('BridgeEventType', () => {
    it('should define all input event types', () => {
      expect(BridgeEventType.MOUSE_DOWN).toBe('mousedown');
      expect(BridgeEventType.MOUSE_MOVE).toBe('mousemove');
      expect(BridgeEventType.MOUSE_UP).toBe('mouseup');
      expect(BridgeEventType.MOUSE_WHEEL).toBe('mousewheel');
    });

    it('should define all touch event types', () => {
      expect(BridgeEventType.TOUCH_START).toBe('touchstart');
      expect(BridgeEventType.TOUCH_MOVE).toBe('touchmove');
      expect(BridgeEventType.TOUCH_END).toBe('touchend');
      expect(BridgeEventType.TOUCH_CANCEL).toBe('touchcancel');
    });

    it('should define all keyboard event types', () => {
      expect(BridgeEventType.KEY_DOWN).toBe('keydown');
      expect(BridgeEventType.KEY_UP).toBe('keyup');
    });

    it('should define all gesture event types', () => {
      expect(BridgeEventType.GESTURE_START).toBe('gesturestart');
      expect(BridgeEventType.GESTURE_CHANGE).toBe('gesturechange');
      expect(BridgeEventType.GESTURE_END).toBe('gestureend');
    });

    it('should define all scene event types', () => {
      expect(BridgeEventType.SCENE_UPDATE).toBe('sceneupdate');
      expect(BridgeEventType.SELECTION_CHANGE).toBe('selectionchange');
      expect(BridgeEventType.TRANSFORM_CHANGE).toBe('transformchange');
    });

    it('should define all render event types', () => {
      expect(BridgeEventType.RENDER_START).toBe('renderstart');
      expect(BridgeEventType.RENDER_END).toBe('renderend');
      expect(BridgeEventType.FRAME_START).toBe('framestart');
      expect(BridgeEventType.FRAME_END).toBe('frameend');
    });
  });

  describe('EventPriority', () => {
    it('should define priority levels with correct numeric values', () => {
      expect(EventPriority.IMMEDIATE).toBe(0);
      expect(EventPriority.HIGH).toBe(1);
      expect(EventPriority.NORMAL).toBe(2);
      expect(EventPriority.LOW).toBe(3);
      expect(EventPriority.IDLE).toBe(4);
    });

    it('should have priorities in ascending order', () => {
      expect(EventPriority.IMMEDIATE).toBeLessThan(EventPriority.HIGH);
      expect(EventPriority.HIGH).toBeLessThan(EventPriority.NORMAL);
      expect(EventPriority.NORMAL).toBeLessThan(EventPriority.LOW);
      expect(EventPriority.LOW).toBeLessThan(EventPriority.IDLE);
    });
  });

  describe('CollisionType', () => {
    it('should define all collision types', () => {
      expect(CollisionType.POINT).toBe('point');
      expect(CollisionType.CIRCLE).toBe('circle');
      expect(CollisionType.RECT).toBe('rect');
      expect(CollisionType.POLYGON).toBe('polygon');
    });

    it('should have all expected collision types', () => {
      const collisionTypes = Object.values(CollisionType);
      expect(collisionTypes).toHaveLength(4);
      expect(collisionTypes).toContain('point');
      expect(collisionTypes).toContain('circle');
      expect(collisionTypes).toContain('rect');
      expect(collisionTypes).toContain('polygon');
    });
  });

  describe('EVENT_CONSTANTS', () => {
    it('should define click-related constants', () => {
      expect(EVENT_CONSTANTS.DOUBLE_CLICK_DELAY).toBe(300);
      expect(EVENT_CONSTANTS.DOUBLE_CLICK_MAX_DISTANCE).toBe(5);
    });

    it('should define long press constants', () => {
      expect(EVENT_CONSTANTS.LONG_PRESS_DELAY).toBe(500);
    });

    it('should define gesture constants', () => {
      expect(EVENT_CONSTANTS.GESTURE_MIN_DISTANCE).toBe(10);
      expect(EVENT_CONSTANTS.GESTURE_MIN_SCALE).toBe(0.1);
      expect(EVENT_CONSTANTS.GESTURE_MIN_ROTATION).toBe(0.1);
    });

    it('should define performance constants', () => {
      expect(EVENT_CONSTANTS.DEDUPLICATION_WINDOW).toBe(16);
      expect(EVENT_CONSTANTS.EVENT_TIMEOUT).toBe(5000);
      expect(EVENT_CONSTANTS.MAX_QUEUE_SIZE).toBe(1000);
      expect(EVENT_CONSTANTS.MAX_LISTENERS_PER_EVENT).toBe(50);
      expect(EVENT_CONSTANTS.TIME_SLICE).toBe(5);
    });

    it('should have reasonable timing values', () => {
      expect(EVENT_CONSTANTS.DOUBLE_CLICK_DELAY).toBeGreaterThan(0);
      expect(EVENT_CONSTANTS.LONG_PRESS_DELAY).toBeGreaterThan(EVENT_CONSTANTS.DOUBLE_CLICK_DELAY);
      expect(EVENT_CONSTANTS.DEDUPLICATION_WINDOW).toBeGreaterThan(0);
      expect(EVENT_CONSTANTS.EVENT_TIMEOUT).toBeGreaterThan(1000);
    });

    it('should have reasonable size limits', () => {
      expect(EVENT_CONSTANTS.MAX_QUEUE_SIZE).toBeGreaterThan(100);
      expect(EVENT_CONSTANTS.MAX_LISTENERS_PER_EVENT).toBeGreaterThan(10);
      expect(EVENT_CONSTANTS.TIME_SLICE).toBeGreaterThan(0);
    });
  });

  describe('ModifierState', () => {
    it('should define modifier state interface', () => {
      const modifierState: ModifierState = {
        ctrl: false,
        shift: false,
        alt: false,
        meta: false
      };

      expect(modifierState).toHaveProperty('ctrl');
      expect(modifierState).toHaveProperty('shift');
      expect(modifierState).toHaveProperty('alt');
      expect(modifierState).toHaveProperty('meta');
    });

    it('should accept boolean values for all modifiers', () => {
      const modifierState: ModifierState = {
        ctrl: true,
        shift: false,
        alt: true,
        meta: false
      };

      expect(typeof modifierState.ctrl).toBe('boolean');
      expect(typeof modifierState.shift).toBe('boolean');
      expect(typeof modifierState.alt).toBe('boolean');
      expect(typeof modifierState.meta).toBe('boolean');
    });
  });

  describe('MOUSE_BUTTONS', () => {
    it('should define all mouse button constants', () => {
      expect(MOUSE_BUTTONS.PRIMARY).toBe(0);
      expect(MOUSE_BUTTONS.AUXILIARY).toBe(1);
      expect(MOUSE_BUTTONS.SECONDARY).toBe(2);
      expect(MOUSE_BUTTONS.FOURTH).toBe(3);
      expect(MOUSE_BUTTONS.FIFTH).toBe(4);
    });

    it('should have unique button values', () => {
      const buttonValues = Object.values(MOUSE_BUTTONS);
      const uniqueValues = new Set(buttonValues);
      expect(uniqueValues.size).toBe(buttonValues.length);
    });

    it('should have sequential button values', () => {
      expect(MOUSE_BUTTONS.PRIMARY).toBe(0);
      expect(MOUSE_BUTTONS.AUXILIARY).toBe(1);
      expect(MOUSE_BUTTONS.SECONDARY).toBe(2);
      expect(MOUSE_BUTTONS.FOURTH).toBe(3);
      expect(MOUSE_BUTTONS.FIFTH).toBe(4);
    });
  });

  describe('KEY_CODES', () => {
    it('should define arrow key codes', () => {
      expect(KEY_CODES.ARROW_UP).toBe('ArrowUp');
      expect(KEY_CODES.ARROW_DOWN).toBe('ArrowDown');
      expect(KEY_CODES.ARROW_LEFT).toBe('ArrowLeft');
      expect(KEY_CODES.ARROW_RIGHT).toBe('ArrowRight');
    });

    it('should define special key codes', () => {
      expect(KEY_CODES.ESCAPE).toBe('Escape');
      expect(KEY_CODES.ENTER).toBe('Enter');
      expect(KEY_CODES.SPACE).toBe('Space');
      expect(KEY_CODES.TAB).toBe('Tab');
      expect(KEY_CODES.BACKSPACE).toBe('Backspace');
      expect(KEY_CODES.DELETE).toBe('Delete');
    });

    it('should define modifier key codes', () => {
      expect(KEY_CODES.SHIFT).toBe('Shift');
      expect(KEY_CODES.CTRL).toBe('Control');
      expect(KEY_CODES.ALT).toBe('Alt');
      expect(KEY_CODES.META).toBe('Meta');
    });

    it('should define letter key codes', () => {
      expect(KEY_CODES.A).toBe('KeyA');
      expect(KEY_CODES.C).toBe('KeyC');
      expect(KEY_CODES.V).toBe('KeyV');
      expect(KEY_CODES.X).toBe('KeyX');
      expect(KEY_CODES.Z).toBe('KeyZ');
      expect(KEY_CODES.Y).toBe('KeyY');
    });

    it('should have consistent key code format', () => {
      // Arrow keys should start with 'Arrow'
      expect(KEY_CODES.ARROW_UP).toMatch(/^Arrow/);
      expect(KEY_CODES.ARROW_DOWN).toMatch(/^Arrow/);
      expect(KEY_CODES.ARROW_LEFT).toMatch(/^Arrow/);
      expect(KEY_CODES.ARROW_RIGHT).toMatch(/^Arrow/);

      // Letter keys should start with 'Key'
      expect(KEY_CODES.A).toMatch(/^Key/);
      expect(KEY_CODES.C).toMatch(/^Key/);
      expect(KEY_CODES.V).toMatch(/^Key/);
      expect(KEY_CODES.X).toMatch(/^Key/);
      expect(KEY_CODES.Z).toMatch(/^Key/);
      expect(KEY_CODES.Y).toMatch(/^Key/);
    });
  });

  describe('Type Consistency', () => {
    it('should have consistent event type values between InputEventType and BridgeEventType', () => {
      expect(InputEventType.MOUSE_DOWN).toBe(BridgeEventType.MOUSE_DOWN);
      expect(InputEventType.MOUSE_MOVE).toBe(BridgeEventType.MOUSE_MOVE);
      expect(InputEventType.MOUSE_UP).toBe(BridgeEventType.MOUSE_UP);
      expect(InputEventType.MOUSE_WHEEL).toBe(BridgeEventType.MOUSE_WHEEL);
      
      expect(InputEventType.TOUCH_START).toBe(BridgeEventType.TOUCH_START);
      expect(InputEventType.TOUCH_MOVE).toBe(BridgeEventType.TOUCH_MOVE);
      expect(InputEventType.TOUCH_END).toBe(BridgeEventType.TOUCH_END);
      expect(InputEventType.TOUCH_CANCEL).toBe(BridgeEventType.TOUCH_CANCEL);
      
      expect(InputEventType.KEY_DOWN).toBe(BridgeEventType.KEY_DOWN);
      expect(InputEventType.KEY_UP).toBe(BridgeEventType.KEY_UP);
      
      expect(InputEventType.GESTURE_START).toBe(BridgeEventType.GESTURE_START);
      expect(InputEventType.GESTURE_CHANGE).toBe(BridgeEventType.GESTURE_CHANGE);
      expect(InputEventType.GESTURE_END).toBe(BridgeEventType.GESTURE_END);
    });
  });

  describe('Constants Immutability', () => {
    it('should have immutable EVENT_CONSTANTS', () => {
      expect(() => {
        (EVENT_CONSTANTS as any).DOUBLE_CLICK_DELAY = 500;
      }).toThrow();
    });

    it('should have immutable MOUSE_BUTTONS', () => {
      expect(() => {
        (MOUSE_BUTTONS as any).PRIMARY = 1;
      }).toThrow();
    });

    it('should have immutable KEY_CODES', () => {
      expect(() => {
        (KEY_CODES as any).ESCAPE = 'Esc';
      }).toThrow();
    });
  });
});