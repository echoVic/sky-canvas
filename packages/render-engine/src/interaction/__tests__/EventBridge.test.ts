/**
 * EventBridge 单元测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BridgeEvent, BridgeEventListener, BridgeEventType, EventBridge, EventFilter, EventPriority, EventTransformer, globalEventBridge } from '../EventBridge';

describe('EventBridge', () => {
  let eventBridge: EventBridge;
  let mockListener: BridgeEventListener;
  let mockFilter: EventFilter;
  let mockTransformer: EventTransformer;

  beforeEach(() => {
    eventBridge = new EventBridge();
    mockListener = vi.fn();
    mockFilter = vi.fn().mockReturnValue(true);
    mockTransformer = vi.fn().mockImplementation((event) => event);
  });

  afterEach(() => {
    eventBridge.dispose();
    vi.clearAllMocks();
  });

  describe('Event Listener Management', () => {
    it('should add and remove event listeners', async () => {
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      
      // Wait for async event processing
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockListener).toHaveBeenCalledTimes(1);
      
      eventBridge.removeEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 30, y: 40 }, EventPriority.IMMEDIATE);
      
      // Wait for async event processing
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockListener).toHaveBeenCalledTimes(1);
    });

    it('should add and remove global listeners', async () => {
      eventBridge.addEventListener('*', mockListener);
      
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      eventBridge.emit(BridgeEventType.TOUCH_START, { touches: [] }, EventPriority.IMMEDIATE);
      
      // Wait for async event processing
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockListener).toHaveBeenCalledTimes(2);
      
      eventBridge.removeEventListener('*', mockListener);
      eventBridge.emit(BridgeEventType.KEY_DOWN, { key: 'a' }, EventPriority.IMMEDIATE);
      
      // Wait for async event processing
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockListener).toHaveBeenCalledTimes(2);
    });

    it('should handle listener priority', async () => {
      const highPriorityListener = vi.fn() as BridgeEventListener;
      const normalPriorityListener = vi.fn() as BridgeEventListener;
      
      (highPriorityListener as any).priority = EventPriority.HIGH;
      (normalPriorityListener as any).priority = EventPriority.NORMAL;
      
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, highPriorityListener);
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, normalPriorityListener);
      
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      
      // Wait for async event processing
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(highPriorityListener).toHaveBeenCalled();
      expect(normalPriorityListener).toHaveBeenCalled();
    });

    it('should handle once listeners', async () => {
      (mockListener as any).once = true;
      
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      
      // Wait for async event processing after first emit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 30, y: 40 }, EventPriority.IMMEDIATE);
      
      // Wait for async event processing after second emit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(mockListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Event Emission', () => {
    it('should emit events with correct properties', async () => {
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      
      const testData = { x: 10, y: 20 };
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, testData, EventPriority.IMMEDIATE, 'canvas-sdk');
      
      // Wait for async event processing
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: BridgeEventType.MOUSE_DOWN,
          data: testData,
          priority: EventPriority.IMMEDIATE,
          source: 'canvas-sdk',
          timestamp: expect.any(Number)
        })
      );
    });

    it('should emit batch events', async () => {
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      eventBridge.addEventListener(BridgeEventType.MOUSE_UP, mockListener);
      
      const events = [
        { type: BridgeEventType.MOUSE_DOWN, data: { x: 10, y: 20 }, priority: EventPriority.IMMEDIATE },
        { type: BridgeEventType.MOUSE_UP, data: { x: 10, y: 20 }, priority: EventPriority.IMMEDIATE }
      ];
      
      eventBridge.emitBatch(events);
      
      // Wait for async event processing with longer timeout for batch events
      await new Promise(resolve => setTimeout(resolve, 50));
      
      expect(mockListener).toHaveBeenCalledTimes(2);
    });

    it('should handle event propagation stopping', () => {
      const listener1 = vi.fn().mockImplementation((event: BridgeEvent) => {
        event.propagationStopped = true;
      });
      const listener2 = vi.fn();
      
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, listener1);
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, listener2);
      
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      
      expect(listener1).toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('Event Filtering', () => {
    it('should add and apply filters', () => {
      const filterFn = vi.fn().mockReturnValue(false);
      
      eventBridge.addFilter(BridgeEventType.MOUSE_DOWN, filterFn);
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      
      expect(filterFn).toHaveBeenCalled();
      expect(mockListener).not.toHaveBeenCalled();
    });

    it('should remove filters', () => {
      const filterFn = vi.fn().mockReturnValue(false);
      
      eventBridge.addFilter(BridgeEventType.MOUSE_DOWN, filterFn);
      eventBridge.removeFilter(BridgeEventType.MOUSE_DOWN, filterFn);
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      
      expect(mockListener).toHaveBeenCalled();
    });
  });

  describe('Event Transformation', () => {
    it('should add and apply transformers', () => {
      const transformerFn = vi.fn().mockImplementation((event: BridgeEvent) => ({
        ...event,
        data: { ...event.data, transformed: true }
      }));
      
      eventBridge.addTransformer(BridgeEventType.MOUSE_DOWN, transformerFn);
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      
      expect(transformerFn).toHaveBeenCalled();
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ transformed: true })
        })
      );
    });

    it('should handle null transformer results', () => {
      const transformerFn = vi.fn().mockReturnValue(null);
      
      eventBridge.addTransformer(BridgeEventType.MOUSE_DOWN, transformerFn);
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      
      expect(transformerFn).toHaveBeenCalled();
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('should configure event bridge options', () => {
      eventBridge.configure({
        enableBatching: false,
        enableDeduplication: false,
        enableStats: false
      });
      
      // Test that configuration is applied
      expect(() => eventBridge.emit(BridgeEventType.MOUSE_DOWN, {})).not.toThrow();
    });

    it('should enable/disable event bridge', () => {
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      
      eventBridge.setEnabled(false);
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      
      expect(mockListener).not.toHaveBeenCalled();
      
      eventBridge.setEnabled(true);
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      
      expect(mockListener).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should collect event statistics', async () => {
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      
      // Use IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 30, y: 40 }, EventPriority.IMMEDIATE);
      
      // Wait for async event processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const stats = eventBridge.getStats();
      
      expect(stats).toHaveProperty('totalEventsProcessed');
      expect(stats).toHaveProperty('eventStats');
      expect(stats.totalEventsProcessed).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should clear all listeners and data', () => {
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      eventBridge.addFilter(BridgeEventType.MOUSE_DOWN, mockFilter);
      eventBridge.addTransformer(BridgeEventType.MOUSE_DOWN, mockTransformer);
      
      eventBridge.clear();
      
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 });
      
      expect(mockListener).not.toHaveBeenCalled();
      expect(mockFilter).not.toHaveBeenCalled();
      expect(mockTransformer).not.toHaveBeenCalled();
    });

    it('should dispose properly', () => {
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      
      expect(() => eventBridge.dispose()).not.toThrow();
      
      eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 });
      expect(mockListener).not.toHaveBeenCalled();
    });
  });

  describe('Global Event Bridge', () => {
    it('should provide a global instance', () => {
      expect(globalEventBridge).toBeInstanceOf(EventBridge);
    });

    it('should work with global instance', () => {
      globalEventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      // Use IMMEDIATE priority to bypass batching
      globalEventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      
      expect(mockListener).toHaveBeenCalled();
      
      globalEventBridge.removeEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
    });
  });

  describe('Error Handling', () => {
    it('should handle listener errors gracefully', async () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Test error');
      });
      
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, errorListener);
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, mockListener);
      
      expect(() => {
        // Use IMMEDIATE priority to bypass batching
        eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      }).not.toThrow();
      
      // Wait for async event processing
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mockListener).toHaveBeenCalled();
    });

    it('should handle async listener errors', async () => {
      const asyncErrorListener = vi.fn().mockRejectedValue(new Error('Async error'));
      
      eventBridge.addEventListener(BridgeEventType.MOUSE_DOWN, asyncErrorListener);
      
      expect(() => {
        // Use IMMEDIATE priority to bypass batching
        eventBridge.emit(BridgeEventType.MOUSE_DOWN, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      }).not.toThrow();
    });
  });

  describe('Event Deduplication', () => {
    it('should deduplicate similar events', () => {
      eventBridge.addEventListener(BridgeEventType.MOUSE_MOVE, mockListener);
      
      // Emit same event multiple times quickly with IMMEDIATE priority to bypass batching
      eventBridge.emit(BridgeEventType.MOUSE_MOVE, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      eventBridge.emit(BridgeEventType.MOUSE_MOVE, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      eventBridge.emit(BridgeEventType.MOUSE_MOVE, { x: 10, y: 20 }, EventPriority.IMMEDIATE);
      
      // Should be deduplicated
      expect(mockListener).toHaveBeenCalledTimes(1);
    });
  });
});