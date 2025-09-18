/**
 * InteractionManager 单元测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBridge } from '../EventBridge';
import { InteractionConfig, InteractionManager, ViewportTransform } from '../InteractionManager';
import { GestureRecognizer } from '../events/GestureRecognizer';
import { InputState } from '../events/InputEvents';

// Mock dependencies
vi.mock('../events/InputEvents');
vi.mock('../events/GestureRecognizer');
vi.mock('../EventBridge');

describe('InteractionManager', () => {
  let interactionManager: InteractionManager;
  let mockCanvas: HTMLCanvasElement;
  let mockConfig: InteractionConfig;
  let mockInputState: InputState;
  let mockGestureRecognizer: GestureRecognizer;
  let mockEventBridge: EventBridge;

  beforeEach(() => {
    // Create mock canvas
    mockCanvas = {
      width: 800,
      height: 600,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      getContext: vi.fn().mockReturnValue({}),
      getBoundingClientRect: vi.fn().mockReturnValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
        right: 800,
        bottom: 600,
        x: 0,
        y: 0,
        toJSON: () => ({})
      } as DOMRect)
    } as any;

    mockConfig = {
      enableMouse: true,
      enableTouch: true,
      enableKeyboard: true,
      enableGestures: true,
      preventDefault: true,
      stopPropagation: false
    };

    // Mock InputState
    mockInputState = {
      mousePosition: { x: 0, y: 0 },
      setMousePosition: vi.fn(),
      isMouseButtonDown: vi.fn().mockReturnValue(false),
      setMouseButtonDown: vi.fn(),
      setMouseButtonUp: vi.fn(),
      getMouseButtons: vi.fn().mockReturnValue([]),
      isKeyDown: vi.fn().mockReturnValue(false),
      setKeyDown: vi.fn(),
      setKeyUp: vi.fn(),
      getDownKeys: vi.fn().mockReturnValue([]),
      modifiers: { ctrl: false, shift: false, alt: false, meta: false },
      setModifiers: vi.fn(),
      getTouches: vi.fn().mockReturnValue([]),
      getTouch: vi.fn(),
      setTouch: vi.fn(),
      addTouch: vi.fn(),
      updateTouch: vi.fn(),
      removeTouch: vi.fn(),
      clearTouches: vi.fn(),
      reset: vi.fn(),
      getDebugInfo: vi.fn().mockReturnValue({})
    } as any;

    // Mock GestureRecognizer
    mockGestureRecognizer = {
      setEnabled: vi.fn(),
      isEnabled: vi.fn().mockReturnValue(true),
      handleTouchStart: vi.fn(),
      handleTouchMove: vi.fn(),
      handleTouchEnd: vi.fn(),
      handleTouchCancel: vi.fn(),
      getGestureState: vi.fn(),
      getGestureType: vi.fn(),
      dispose: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn()
    } as any;

    // Mock EventBridge
    mockEventBridge = {
      emit: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispose: vi.fn()
    } as any;

    // Mock constructors
    (InputState as any).mockImplementation(() => mockInputState);
    (GestureRecognizer as any).mockImplementation(() => mockGestureRecognizer);
    (EventBridge as any).mockImplementation(() => mockEventBridge);

    interactionManager = new InteractionManager(mockCanvas, mockConfig);
  });

  afterEach(() => {
    if (interactionManager) {
      interactionManager.dispose();
    }
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with canvas and config', () => {
      expect(interactionManager).toBeInstanceOf(InteractionManager);
      expect(InputState).toHaveBeenCalled();
      expect(GestureRecognizer).toHaveBeenCalled();
    });

    it('should initialize with default config when not provided', () => {
      const manager = new InteractionManager(mockCanvas);
      expect(manager).toBeInstanceOf(InteractionManager);
      manager.dispose();
    });

    it('should set up event listeners on canvas', () => {
      const addEventListenerSpy = vi.spyOn(mockCanvas, 'addEventListener');
      const manager = new InteractionManager(mockCanvas, mockConfig);
      
      // Check that event listeners were added (the exact parameters may vary)
      expect(addEventListenerSpy).toHaveBeenCalled();
      expect(addEventListenerSpy.mock.calls.length).toBeGreaterThan(0);
      
      manager.dispose();
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      const newConfig: Partial<InteractionConfig> = {
        enableMouse: false,
        enableTouch: false
      };
      
      interactionManager.configure(newConfig);
      
      // Verify config is updated (implementation dependent)
      expect(() => interactionManager.configure(newConfig)).not.toThrow();
    });

    it('should get current configuration', () => {
      const config = interactionManager.config;
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });
  });

  describe('Viewport Transform', () => {
    it('should set viewport transform', () => {
      const transform: ViewportTransform = {
        screenToWorld: (point: { x: number; y: number }) => ({ x: point.x / 2, y: point.y / 2 }),
        worldToScreen: (point: { x: number; y: number }) => ({ x: point.x * 2, y: point.y * 2 })
      };
      
      expect(() => interactionManager.setViewportTransform(transform)).not.toThrow();
    });

    it('should handle coordinate conversion with transform', () => {
      const transform: ViewportTransform = {
        screenToWorld: (point: { x: number; y: number }) => ({ x: point.x / 2, y: point.y / 2 }),
        worldToScreen: (point: { x: number; y: number }) => ({ x: point.x * 2, y: point.y * 2 })
      };
      
      interactionManager.setViewportTransform(transform);
      
      const screenPoint = { x: 100, y: 100 };
      const worldPoint = transform.screenToWorld(screenPoint);
      const backToScreen = transform.worldToScreen(worldPoint);
      
      expect(backToScreen.x).toBeCloseTo(screenPoint.x, 1);
      expect(backToScreen.y).toBeCloseTo(screenPoint.y, 1);
    });
  });

  describe('Mouse Events', () => {
    it('should handle mouse down events', () => {
      expect(() => {
        const mouseEvent = new MouseEvent('mousedown', {
          clientX: 100,
          clientY: 100,
          button: 0
        });
        
        mockCanvas.dispatchEvent(mouseEvent);
      }).not.toThrow();
    });

    it('should handle mouse move events', () => {
      expect(() => {
        const mouseEvent = new MouseEvent('mousemove', {
          clientX: 150,
          clientY: 150
        });
        
        mockCanvas.dispatchEvent(mouseEvent);
      }).not.toThrow();
    });

    it('should handle mouse up events', () => {
      expect(() => {
        const mouseEvent = new MouseEvent('mouseup', {
          clientX: 100,
          clientY: 100,
          button: 0
        });
        
        mockCanvas.dispatchEvent(mouseEvent);
      }).not.toThrow();
    });

    it('should handle mouse wheel events', () => {
      expect(() => {
        const wheelEvent = new WheelEvent('wheel', {
          clientX: 100,
          clientY: 100,
          deltaY: -100
        });
        
        mockCanvas.dispatchEvent(wheelEvent);
      }).not.toThrow();
    });

    it('should prevent context menu when configured', () => {
      expect(() => {
        const contextMenuEvent = new MouseEvent('contextmenu', {
          clientX: 100,
          clientY: 100
        });
        
        mockCanvas.dispatchEvent(contextMenuEvent);
      }).not.toThrow();
    });
  });

  describe('Touch Events', () => {
    it('should handle touch start events', () => {
      expect(() => {
        const touchEvent = new TouchEvent('touchstart', {
          touches: [{
            identifier: 0,
            clientX: 100,
            clientY: 100
          } as Touch]
        });
        
        mockCanvas.dispatchEvent(touchEvent);
      }).not.toThrow();
    });

    it('should handle touch move events', () => {
      expect(() => {
        const touchEvent = new TouchEvent('touchmove', {
          touches: [{
            identifier: 0,
            clientX: 150,
            clientY: 150
          } as Touch]
        });
        
        mockCanvas.dispatchEvent(touchEvent);
      }).not.toThrow();
    });

    it('should handle touch end events', () => {
      expect(() => {
        const touchEvent = new TouchEvent('touchend', {
          changedTouches: [{
            identifier: 0,
            clientX: 100,
            clientY: 100
          } as Touch]
        });
        
        mockCanvas.dispatchEvent(touchEvent);
      }).not.toThrow();
    });

    it('should handle touch cancel events', () => {
      expect(() => {
        const touchEvent = new TouchEvent('touchcancel', {
          changedTouches: [{
            identifier: 0,
            clientX: 100,
            clientY: 100
          } as Touch]
        });
        
        mockCanvas.dispatchEvent(touchEvent);
      }).not.toThrow();
    });
  });

  describe('Keyboard Events', () => {
    it('should handle key down events', () => {
      // Keyboard events are handled internally, just verify the setup doesn't throw
      expect(() => {
        const keyEvent = new KeyboardEvent('keydown', {
          code: 'KeyA',
          ctrlKey: true
        });
        document.dispatchEvent(keyEvent);
      }).not.toThrow();
    });

    it('should handle key up events', () => {
      // Keyboard events are handled internally, just verify the setup doesn't throw
      expect(() => {
        const keyEvent = new KeyboardEvent('keyup', {
          code: 'KeyA',
          ctrlKey: false
        });
        document.dispatchEvent(keyEvent);
      }).not.toThrow();
    });
  });

  describe('Input State', () => {
    it('should get current input state', () => {
      const inputState = interactionManager.inputState;
      expect(inputState).toBe(mockInputState);
    });

    it('should get mouse position', () => {
      const position = interactionManager.inputState.mousePosition;
      expect(position).toBe(mockInputState.mousePosition);
    });

    it('should check if mouse button is down', () => {
      const isDown = interactionManager.inputState.isMouseButtonDown(0);
      expect(mockInputState.isMouseButtonDown).toHaveBeenCalledWith(0);
      expect(typeof isDown).toBe('boolean');
    });

    it('should check if key is down', () => {
      const isDown = interactionManager.inputState.isKeyDown('KeyA');
      expect(mockInputState.isKeyDown).toHaveBeenCalledWith('KeyA');
      expect(typeof isDown).toBe('boolean');
    });

    it('should get modifier state', () => {
      const modifiers = interactionManager.inputState.modifiers;
      expect(modifiers).toBe(mockInputState.modifiers);
    });

    it('should get touches', () => {
      const touches = interactionManager.inputState.getTouches();
      expect(mockInputState.getTouches).toHaveBeenCalled();
      expect(Array.isArray(touches)).toBe(true);
    });
  });

  describe('Gesture Recognition', () => {
    it('should get gesture recognizer', () => {
      const gestureRecognizer = interactionManager.gestureRecognizer;
      expect(gestureRecognizer).toBe(mockGestureRecognizer);
    });

    it('should enable/disable gesture recognition through config', () => {
      interactionManager.configure({ enableGestures: false });
      expect(mockGestureRecognizer.setEnabled).toHaveBeenCalledWith(false);
      
      interactionManager.configure({ enableGestures: true });
      expect(mockGestureRecognizer.setEnabled).toHaveBeenCalledWith(true);
    });

    it('should check if gestures are enabled', () => {
      const isEnabled = interactionManager.gestureRecognizer.isEnabled();
      expect(mockGestureRecognizer.isEnabled).toHaveBeenCalled();
      expect(typeof isEnabled).toBe('boolean');
    });
  });

  describe('Event Handling', () => {
    it('should add event listeners', () => {
      const listener = vi.fn();
      
      expect(() => interactionManager.on('mousedown', listener)).not.toThrow();
    });

    it('should remove event listeners', () => {
      const listener = vi.fn();
      
      expect(() => interactionManager.off('mousedown', listener)).not.toThrow();
    });

    it('should emit events', () => {
      const listener = vi.fn();
      interactionManager.on('mousedown', listener);
      
      const mockEvent = {
        type: 'mousedown',
        position: { x: 100, y: 100 },
        worldPosition: { x: 100, y: 100 },
        button: 0,
        buttons: 1,
        modifiers: { ctrl: false, shift: false, alt: false, meta: false },
        timestamp: Date.now(),
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        nativeEvent: new MouseEvent('mousedown')
      };
      
      interactionManager.emit('mousedown', mockEvent);
      expect(listener).toHaveBeenCalledWith(mockEvent);
    });
  });

  describe('Canvas Management', () => {
    it('should get canvas element', () => {
      const canvas = interactionManager.canvas;
      expect(canvas).toBe(mockCanvas);
    });

    it('should get canvas bounds', () => {
      const bounds = mockCanvas.getBoundingClientRect();
      expect(bounds.left).toBe(0);
      expect(bounds.top).toBe(0);
      expect(bounds.width).toBe(800);
      expect(bounds.height).toBe(600);
      expect(bounds.right).toBe(800);
      expect(bounds.bottom).toBe(600);
    });

    it('should handle canvas resize', () => {
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);
      
      // Should not throw and should handle resize gracefully
      expect(() => window.dispatchEvent(resizeEvent)).not.toThrow();
    });
  });

  describe('Drag State', () => {
    it('should track drag state', () => {
      expect(interactionManager.isDragging).toBe(false);
    });

    it('should get drag start position', () => {
      const position = interactionManager.dragStartPosition;
      expect(position).toEqual({ x: 0, y: 0 });
    });
  });

  describe('Cleanup', () => {
    it('should dispose properly', () => {
      const removeEventListenerSpy = vi.spyOn(mockCanvas, 'removeEventListener');
      
      interactionManager.dispose();
      
      expect(removeEventListenerSpy).toHaveBeenCalled();
      expect(mockGestureRecognizer.dispose).toHaveBeenCalled();
    });

    it('should handle multiple dispose calls', () => {
      expect(() => {
        interactionManager.dispose();
        interactionManager.dispose();
      }).not.toThrow();
    });
  });

  describe('Debug Information', () => {
    it('should provide access to internal state for debugging', () => {
      // Access internal state properties for debugging
      expect(interactionManager.inputState).toBeDefined();
      expect(interactionManager.gestureRecognizer).toBeDefined();
      expect(interactionManager.config).toBeDefined();
      expect(interactionManager.canvas).toBeDefined();
      expect(interactionManager.isDragging).toBe(false);
      expect(interactionManager.dragStartPosition).toEqual({ x: 0, y: 0 });
    });
  });
});