/**
 * CircleToolViewModel 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircleToolViewModel } from '../../src/viewmodels/tools/CircleToolViewModel';
import type { ICanvasManager } from '../../src/managers/CanvasManager';
import type { IEventBusService } from '../../src/services/eventBus/eventBusService';

describe('CircleToolViewModel', () => {
  let viewModel: CircleToolViewModel;
  let mockCanvasManager: ICanvasManager;
  let mockEventBus: IEventBusService;

  beforeEach(() => {
    mockCanvasManager = {
      _serviceBrand: undefined,
      addShape: vi.fn(),
      removeShape: vi.fn(),
      updateShape: vi.fn(),
      getRenderables: vi.fn(() => []),
      hitTest: vi.fn(() => null),
      selectShape: vi.fn(),
      deselectShape: vi.fn(),
      clearSelection: vi.fn(),
      getSelectedShapes: vi.fn(() => []),
      isShapeSelected: vi.fn(() => false),
      copySelectedShapes: vi.fn(),
      cutSelectedShapes: vi.fn(),
      paste: vi.fn(() => []),
      undo: vi.fn(),
      redo: vi.fn(),
      bringToFront: vi.fn(),
      sendToBack: vi.fn(),
      bringForward: vi.fn(),
      sendBackward: vi.fn(),
      setZIndex: vi.fn(),
      getShapesByZOrder: vi.fn(() => []),
      getStats: vi.fn(() => ({
        shapes: { totalShapes: 0, selectedShapes: 0, visibleShapes: 0, shapesByType: {} },
        history: { canUndo: false, canRedo: false }
      })),
      clear: vi.fn(),
      dispose: vi.fn()
    };

    mockEventBus = {
      _serviceBrand: undefined,
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn()
    } as unknown as IEventBusService;

    viewModel = new CircleToolViewModel(mockCanvasManager, mockEventBus);
  });

  describe('initialization', () => {
    it('should initialize with correct default state', () => {
      expect(viewModel.state.isDrawing).toBe(false);
      expect(viewModel.state.startPoint).toBeNull();
      expect(viewModel.state.currentShape).toBeNull();
      expect(viewModel.state.cursor).toBe('crosshair');
      expect(viewModel.state.enabled).toBe(false);
    });

    it('should emit initialized event on initialize', async () => {
      await viewModel.initialize();
      expect(mockEventBus.emit).toHaveBeenCalledWith('circle-tool-viewmodel:initialized', {});
    });
  });

  describe('activate/deactivate', () => {
    it('should enable tool on activate', () => {
      viewModel.activate();
      expect(viewModel.state.enabled).toBe(true);
      expect(viewModel.state.cursor).toBe('crosshair');
      expect(mockEventBus.emit).toHaveBeenCalledWith('tool:activated', { toolName: 'circle' });
    });

    it('should disable tool and reset state on deactivate', () => {
      viewModel.activate();
      viewModel.handleMouseDown(100, 100);
      viewModel.deactivate();

      expect(viewModel.state.enabled).toBe(false);
      expect(viewModel.state.isDrawing).toBe(false);
      expect(viewModel.state.currentShape).toBeNull();
    });
  });

  describe('drawing flow', () => {
    beforeEach(() => {
      viewModel.activate();
    });

    it('should start drawing on mousedown', () => {
      viewModel.handleMouseDown(100, 100);

      expect(viewModel.state.isDrawing).toBe(true);
      expect(viewModel.state.startPoint).toEqual({ x: 100, y: 100 });
      expect(viewModel.state.currentShape).not.toBeNull();
      expect(viewModel.state.currentShape?.radius).toBe(0);
      expect(mockEventBus.emit).toHaveBeenCalledWith('tool:drawingStarted', { tool: 'circle' });
    });

    it('should update radius on mousemove', () => {
      viewModel.handleMouseDown(100, 100);
      viewModel.handleMouseMove(200, 100);

      expect(viewModel.state.currentShape?.radius).toBe(100);
    });

    it('should calculate correct radius with diagonal movement', () => {
      viewModel.handleMouseDown(0, 0);
      viewModel.handleMouseMove(30, 40);

      // 勾股定理: sqrt(30^2 + 40^2) = 50
      expect(viewModel.state.currentShape?.radius).toBe(50);
    });

    it('should add shape on mouseup with valid radius', () => {
      viewModel.handleMouseDown(100, 100);
      viewModel.handleMouseMove(200, 100);
      viewModel.handleMouseUp(200, 100);

      expect(mockCanvasManager.addShape).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('tool:drawingEnded', { tool: 'circle' });
      expect(viewModel.state.isDrawing).toBe(false);
      expect(viewModel.state.currentShape).toBeNull();
    });

    it('should not add shape if radius is too small', () => {
      viewModel.handleMouseDown(100, 100);
      viewModel.handleMouseMove(103, 100); // radius = 3 < 5
      viewModel.handleMouseUp(103, 100);

      expect(mockCanvasManager.addShape).not.toHaveBeenCalled();
      expect(viewModel.state.isDrawing).toBe(false);
    });

    it('should not respond when tool is disabled', () => {
      viewModel.deactivate();
      viewModel.handleMouseDown(100, 100);

      expect(viewModel.state.isDrawing).toBe(false);
      expect(viewModel.state.startPoint).toBeNull();
    });
  });

  describe('helper methods', () => {
    it('isCurrentlyDrawing should return correct state', () => {
      viewModel.activate();
      expect(viewModel.isCurrentlyDrawing()).toBe(false);

      viewModel.handleMouseDown(100, 100);
      expect(viewModel.isCurrentlyDrawing()).toBe(true);

      viewModel.handleMouseUp(200, 100);
      expect(viewModel.isCurrentlyDrawing()).toBe(false);
    });

    it('getCurrentShape should return current shape', () => {
      viewModel.activate();
      expect(viewModel.getCurrentShape()).toBeNull();

      viewModel.handleMouseDown(100, 100);
      expect(viewModel.getCurrentShape()).not.toBeNull();
      expect(viewModel.getCurrentShape()?.type).toBe('circle');
    });

    it('getSnapshot should return state', () => {
      expect(viewModel.getSnapshot()).toBe(viewModel.state);
    });
  });

  describe('dispose', () => {
    it('should deactivate and emit disposed event', () => {
      viewModel.activate();
      viewModel.handleMouseDown(100, 100);
      viewModel.dispose();

      expect(viewModel.state.enabled).toBe(false);
      expect(viewModel.state.isDrawing).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('circle-tool-viewmodel:disposed', {});
    });
  });
});
