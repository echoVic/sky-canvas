import { afterEach, beforeEach, describe, test, expect } from 'vitest';
import { Circle, Rectangle } from '../engine/core/shapes';
import { EventType } from '../engine/events/EventSystem';
import { InteractionManager, InteractionMode, PanTool, SelectTool, ZoomTool } from '../engine/interaction/InteractionManager';
import { SelectionMode } from '../engine/interaction/SelectionManager';
import { Transform, Vector2 } from '../engine/math';
import { Camera, Scene } from '../engine/scene/Scene';
import { Viewport } from '../engine/scene/Viewport';
import { ShapeNode, wrapShape } from '../engine/scene/ShapeNode';

// Mock Canvas API
class MockCanvas {
  width = 800;
  height = 600;
  style = { cursor: 'default' };
  
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  getBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    width: this.width,
    height: this.height
  }));
}

// Mock CanvasRenderingContext2D
class MockCanvasContext {
  save = jest.fn();
  restore = jest.fn();
  translate = jest.fn();
  rotate = jest.fn();
  scale = jest.fn();
  setTransform = jest.fn();
  strokeRect = jest.fn();
  fillRect = jest.fn();
  beginPath = jest.fn();
  arc = jest.fn();
  stroke = jest.fn();
  fill = jest.fn();
  fillText = jest.fn();
  strokeText = jest.fn();
  setLineDash = jest.fn();
  
  strokeStyle = '#000000';
  fillStyle = '#000000';
  lineWidth = 1;
  font = '10px sans-serif';
}

describe('InteractionSystem', () => {
  let canvas: MockCanvas;
  let scene: Scene;
  let viewport: Viewport;
  let interactionManager: InteractionManager;
  let rect1: ShapeNode;
  let rect2: ShapeNode;
  let circle: ShapeNode;

  beforeEach(() => {
    // 设置 mock
    canvas = new MockCanvas();
    global.HTMLCanvasElement = jest.fn(() => canvas) as any;
    global.window = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    } as any;

    // 创建场景和视口
    scene = new Scene();
    viewport = new Viewport({ x: 0, y: 0, width: 800, height: 600 });
    
    const camera = new Camera('camera1');
    camera.setViewport({ x: 0, y: 0, width: 800, height: 600 });
    scene.setActiveCamera(camera);

    // 创建交互管理器
    interactionManager = new InteractionManager();
    interactionManager.initialize(canvas as any, scene, viewport);

    // 创建测试图形
    const rectShape1 = new Rectangle('rect1', 100, 100, 100, 50, false, { fillStyle: '#ff0000' });
    rect1 = wrapShape(rectShape1);
    scene.addChild(rect1);

    const rectShape2 = new Rectangle('rect2', 250, 150, 80, 80, false, { fillStyle: '#00ff00' });
    rect2 = wrapShape(rectShape2);
    scene.addChild(rect2);

    const circleShape = new Circle('circle1', 400, 200, 40, false, { fillStyle: '#0000ff' });
    circle = wrapShape(circleShape);
    scene.addChild(circle);

    // 更新碰撞检测
    interactionManager.updateCollisionNodes();
  });

  afterEach(() => {
    interactionManager.dispose();
  });

  describe('工具管理', () => {
    test('应该注册默认工具', () => {
      const tools = interactionManager.getTools();
      expect(tools).toHaveLength(3);
      
      const toolNames = tools.map(t => t.name);
      expect(toolNames).toContain('select');
      expect(toolNames).toContain('pan');
      expect(toolNames).toContain('zoom');
    });

    test('应该能够切换工具', () => {
      expect(interactionManager.setActiveTool('pan')).toBe(true);
      expect(interactionManager.getActiveTool()?.name).toBe('pan');
      
      expect(interactionManager.setActiveTool('zoom')).toBe(true);
      expect(interactionManager.getActiveTool()?.name).toBe('zoom');
      
      expect(interactionManager.setActiveTool('invalid')).toBe(false);
      expect(interactionManager.getActiveTool()?.name).toBe('zoom');
    });

    test('应该能够注册和注销自定义工具', () => {
      const customTool = {
        name: 'custom',
        mode: InteractionMode.DRAW,
        cursor: 'crosshair',
        enabled: true,
        onActivate: jest.fn(),
        onDeactivate: jest.fn(),
        onMouseDown: jest.fn(),
        onMouseMove: jest.fn(),
        onMouseUp: jest.fn(),
        onGesture: jest.fn(),
        onKeyDown: jest.fn(),
        onKeyUp: jest.fn()
      };

      interactionManager.registerTool(customTool);
      expect(interactionManager.getTools()).toHaveLength(4);
      
      expect(interactionManager.setActiveTool('custom')).toBe(true);
      expect(customTool.onActivate).toHaveBeenCalled();
      
      interactionManager.unregisterTool('custom');
      expect(interactionManager.getTools()).toHaveLength(3);
      expect(interactionManager.getActiveTool()).toBeNull();
    });
  });

  describe('坐标转换', () => {
    test('应该正确转换屏幕坐标到世界坐标', () => {
      const screenPoint = { x: 400, y: 300 };
      const worldPoint = interactionManager.screenToWorld(screenPoint);
      
      // 默认情况下坐标应该相同
      expect(worldPoint.x).toBeCloseTo(400);
      expect(worldPoint.y).toBeCloseTo(300);
    });

    test('应该正确转换世界坐标到屏幕坐标', () => {
      const worldPoint = { x: 200, y: 150 };
      const screenPoint = interactionManager.worldToScreen(worldPoint);
      
      expect(screenPoint.x).toBeCloseTo(200);
      expect(screenPoint.y).toBeCloseTo(150);
    });

    test('应该在缩放后正确转换坐标', () => {
      viewport.setZoom(2);
      
      const screenPoint = { x: 400, y: 300 };
      const worldPoint = interactionManager.screenToWorld(screenPoint);
      
      // 缩放2倍后，屏幕坐标对应的世界坐标应该减半
      expect(worldPoint.x).toBeCloseTo(200);
      expect(worldPoint.y).toBeCloseTo(150);
    });
  });

  describe('碰撞检测', () => {
    test('应该检测到点击的图形', () => {
      const hitNode = interactionManager.hitTest({ x: 100, y: 100 });
      expect(hitNode).toBe(rect1);
      
      const hitNode2 = interactionManager.hitTest({ x: 250, y: 150 });
      expect(hitNode2).toBe(rect2);
      
      const hitNode3 = interactionManager.hitTest({ x: 400, y: 200 });
      expect(hitNode3).toBe(circle);
    });

    test('应该在空白区域返回null', () => {
      const hitNode = interactionManager.hitTest({ x: 50, y: 50 });
      expect(hitNode).toBeNull();
    });

    test('应该检测到所有重叠的图形', () => {
      // 移动rect2到与rect1重叠
      rect2.transform.setPosition(new Vector2(120, 110));
      interactionManager.updateCollisionNodes();
      
      const hitNodes = interactionManager.hitTestAll({ x: 120, y: 110 });
      expect(hitNodes).toHaveLength(2);
      expect(hitNodes).toContain(rect1);
      expect(hitNodes).toContain(rect2);
    });
  });

  describe('选择管理', () => {
    test('应该能够选择单个节点', () => {
      const result = interactionManager.select(rect1);
      expect(result).toBe(true);
      
      const selected = interactionManager.getSelectedNodes();
      expect(selected).toHaveLength(1);
      expect(selected[0]).toBe(rect1);
      expect(interactionManager.isSelected(rect1)).toBe(true);
    });

    test('应该能够选择多个节点', () => {
      const result = interactionManager.select([rect1, rect2], SelectionMode.MULTIPLE);
      expect(result).toBe(true);
      
      const selected = interactionManager.getSelectedNodes();
      expect(selected).toHaveLength(2);
      expect(selected).toContain(rect1);
      expect(selected).toContain(rect2);
    });

    test('应该能够切换选择', () => {
      interactionManager.select(rect1);
      
      const result = interactionManager.select(rect2, SelectionMode.TOGGLE);
      expect(result).toBe(true);
      
      const selected = interactionManager.getSelectedNodes();
      expect(selected).toHaveLength(2);
      
      // 再次切换应该取消选择
      interactionManager.select(rect2, SelectionMode.TOGGLE);
      const selected2 = interactionManager.getSelectedNodes();
      expect(selected2).toHaveLength(1);
      expect(selected2[0]).toBe(rect1);
    });

    test('应该能够清空选择', () => {
      interactionManager.select([rect1, rect2], SelectionMode.MULTIPLE);
      expect(interactionManager.getSelectedNodes()).toHaveLength(2);
      
      const result = interactionManager.clearSelection();
      expect(result).toBe(true);
      expect(interactionManager.getSelectedNodes()).toHaveLength(0);
    });

    test('应该能够区域选择', () => {
      const bounds = { x: 80, y: 80, width: 200, height: 100 };
      const result = interactionManager.selectInBounds(bounds, SelectionMode.MULTIPLE);
      expect(result).toBe(true);
      
      const selected = interactionManager.getSelectedNodes();
      expect(selected).toHaveLength(2); // rect1 和 rect2 应该被选中
      expect(selected).toContain(rect1);
      expect(selected).toContain(rect2);
    });
  });

  describe('选择工具', () => {
    let selectTool: SelectTool;

    beforeEach(() => {
      selectTool = interactionManager.getTools().find(t => t.name === 'select') as SelectTool;
      interactionManager.setActiveTool('select');
    });

    test('应该在点击图形时选择它', () => {
      const mouseEvent = {
        type: EventType.MOUSE_DOWN,
        pointerId: 1,
        screenPosition: { x: 100, y: 100 },
        worldPosition: { x: 100, y: 100 },
        button: 0,
        buttons: 1,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now(),
        preventDefault: () => {},
        stopPropagation: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false
      };

      const handled = selectTool.onMouseDown(mouseEvent);
      expect(handled).toBe(true);
      expect(interactionManager.isSelected(rect1)).toBe(true);
    });

    test('应该支持Ctrl+点击多选', () => {
      // 先选择rect1
      interactionManager.select(rect1);
      
      const mouseEvent = {
        type: EventType.MOUSE_DOWN,
        pointerId: 1,
        screenPosition: { x: 250, y: 150 },
        worldPosition: { x: 250, y: 150 },
        button: 0,
        buttons: 1,
        ctrlKey: true,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now(),
        preventDefault: () => {},
        stopPropagation: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false
      };

      selectTool.onMouseDown(mouseEvent);
      
      const selected = interactionManager.getSelectedNodes();
      expect(selected).toHaveLength(2);
      expect(selected).toContain(rect1);
      expect(selected).toContain(rect2);
    });

    test('应该支持框选', () => {
      // 开始拖拽
      const mouseDown = {
        type: EventType.MOUSE_DOWN,
        pointerId: 1,
        screenPosition: { x: 80, y: 80 },
        worldPosition: { x: 80, y: 80 },
        button: 0,
        buttons: 1,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now(),
        preventDefault: () => {},
        stopPropagation: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false
      };

      selectTool.onMouseDown(mouseDown);

      // 拖拽移动
      const mouseMove = {
        type: EventType.MOUSE_MOVE,
        pointerId: 1,
        screenPosition: { x: 280, y: 180 },
        worldPosition: { x: 280, y: 180 },
        button: 0,
        buttons: 1,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now(),
        preventDefault: () => {},
        stopPropagation: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false
      };

      selectTool.onMouseMove(mouseMove);
      
      const selectionRect = selectTool.getSelectionRect();
      expect(selectionRect).not.toBeNull();
      expect(selectionRect!.x).toBe(80);
      expect(selectionRect!.y).toBe(80);
      expect(selectionRect!.width).toBe(200);
      expect(selectionRect!.height).toBe(100);

      // 结束拖拽
      const mouseUp = {
        type: EventType.MOUSE_UP,
        pointerId: 1,
        screenPosition: { x: 280, y: 180 },
        worldPosition: { x: 280, y: 180 },
        button: 0,
        buttons: 1,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now(),
        preventDefault: () => {},
        stopPropagation: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false
      };

      selectTool.onMouseUp(mouseUp);
      
      const selected = interactionManager.getSelectedNodes();
      expect(selected).toHaveLength(2); // rect1 和 rect2
    });
  });

  describe('平移工具', () => {
    let panTool: PanTool;

    beforeEach(() => {
      panTool = interactionManager.getTools().find(t => t.name === 'pan') as PanTool;
      interactionManager.setActiveTool('pan');
    });

    test('应该能够平移视口', () => {
      const initialTransform = viewport.getTransform().clone();
      
      // 开始平移
      const mouseDown = {
        type: EventType.MOUSE_DOWN,
        pointerId: 1,
        screenPosition: { x: 400, y: 300 },
        worldPosition: { x: 400, y: 300 },
        button: 0,
        buttons: 1,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now(),
        preventDefault: () => {},
        stopPropagation: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false
      };

      panTool.onMouseDown(mouseDown);

      // 移动鼠标
      const mouseMove = {
        type: EventType.MOUSE_MOVE,
        pointerId: 1,
        screenPosition: { x: 450, y: 350 },
        worldPosition: { x: 450, y: 350 },
        button: 0,
        buttons: 1,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now(),
        preventDefault: () => {},
        stopPropagation: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false
      };

      panTool.onMouseMove(mouseMove);

      // 视口变换应该改变
      const currentTransform = viewport.getTransform();
      expect(currentTransform.position.x).not.toBe(initialTransform.position.x);
      expect(currentTransform.position.y).not.toBe(initialTransform.position.y);
    });
  });

  describe('缩放工具', () => {
    let zoomTool: ZoomTool;

    beforeEach(() => {
      zoomTool = interactionManager.getTools().find(t => t.name === 'zoom') as ZoomTool;
      interactionManager.setActiveTool('zoom');
    });

    test('应该能够缩放视口', () => {
      const initialZoom = viewport.zoom;
      
      const mouseDown = {
        type: EventType.MOUSE_DOWN,
        pointerId: 1,
        screenPosition: { x: 400, y: 300 },
        worldPosition: { x: 400, y: 300 },
        button: 0, // 左键放大
        buttons: 1,
        ctrlKey: false,
        shiftKey: false,
        altKey: false,
        metaKey: false,
        timestamp: Date.now(),
        preventDefault: () => {},
        stopPropagation: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false
      };

      zoomTool.onMouseDown(mouseDown);
      
      expect(viewport.zoom).toBeGreaterThan(initialZoom);
    });

    test('应该支持手势缩放', () => {
      const initialZoom = viewport.zoom;
      
      const gestureEvent = {
        type: EventType.GESTURE_CHANGE,
        center: { x: 400, y: 300 },
        scale: 1.1,
        rotation: 0,
        velocity: new Vector2(0, 0),
        deltaScale: 10, // 放大
        deltaRotation: 0,
        deltaTranslation: new Vector2(0, 0),
        timestamp: Date.now(),
        preventDefault: () => {},
        stopPropagation: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false
      };

      zoomTool.onGesture(gestureEvent);
      
      expect(viewport.zoom).toBeGreaterThan(initialZoom);
    });
  });

  describe('事件分发', () => {
    test('应该分发选择变化事件', () => {
      return new Promise<void>((resolve) => {
        interactionManager.addEventListener(EventType.SELECTION_CHANGE, (event: any) => {
          expect(event.selectedNodes).toHaveLength(1);
          expect(event.selectedNodes[0]).toBe(rect1);
          resolve();
        });

        interactionManager.select(rect1);
      });
    });

    test('应该能够启用和禁用', () => {
      expect(interactionManager.enabled).toBe(true);
      
      interactionManager.setEnabled(false);
      expect(interactionManager.enabled).toBe(false);
      
      interactionManager.setEnabled(true);
      expect(interactionManager.enabled).toBe(true);
    });
  });

  describe('性能测试', () => {
    test('应该能够处理大量节点的碰撞检测', () => {
      // 创建大量节点
      const nodeCount = 1000;
      for (let i = 0; i < nodeCount; i++) {
        const rectShape = new Rectangle(`rect-${i}`, 0, 0, 10, 10, false);
        const rectNode = wrapShape(rectShape);
        rectNode.transform = new Transform(new Vector2(
          Math.random() * 800,
          Math.random() * 600
        ));
        scene.addChild(rectNode);
      }

      const startTime = performance.now();
      interactionManager.updateCollisionNodes();
      const updateTime = performance.now() - startTime;

      // 更新应该在合理时间内完成
      expect(updateTime).toBeLessThan(100); // 100ms

      const hitTestStart = performance.now();
      for (let i = 0; i < 100; i++) {
        interactionManager.hitTest({
          x: Math.random() * 800,
          y: Math.random() * 600
        });
      }
      const hitTestTime = performance.now() - hitTestStart;

      // 100次碰撞检测应该在合理时间内完成
      expect(hitTestTime).toBeLessThan(50); // 50ms
    });
  });
});
