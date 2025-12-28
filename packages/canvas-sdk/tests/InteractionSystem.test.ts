/**
 * InteractionService 单元测试
 * 测试交互服务的基本功能
 */
import { afterEach, beforeEach, describe, test, expect, vi } from 'vitest';
import { InteractionService, ITool } from '../src/services/interaction/interactionService';
import { IEventBusService } from '../src/services/eventBus/eventBusService';
import { ILogService } from '../src/services/logging/logService';

describe('InteractionService', () => {
  let interactionService: InteractionService;
  let mockCanvas: HTMLCanvasElement;
  let mockEventBus: IEventBusService;
  let mockLogger: ILogService;

  beforeEach(() => {
    // 创建 mock canvas
    mockCanvas = {
      width: 800,
      height: 600,
      style: { cursor: 'default' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        top: 0,
        width: 800,
        height: 600
      }))
    } as unknown as HTMLCanvasElement;

    // 创建 mock EventBus
    mockEventBus = {
      _serviceBrand: undefined,
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      once: vi.fn()
    } as unknown as IEventBusService;

    // 创建 mock Logger
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
      _serviceBrand: undefined
    } as unknown as ILogService;

    // 创建 InteractionService 实例（使用类型断言绕过 DI）
    const ServiceClass = InteractionService as unknown as {
      new (eventBus: IEventBusService, logger: ILogService): InteractionService;
    };
    interactionService = new ServiceClass(mockEventBus, mockLogger);
  });

  afterEach(() => {
    if (interactionService) {
      interactionService.dispose();
    }
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该能够初始化交互服务', () => {
      interactionService.initialize(mockCanvas);

      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mousedown', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(mockCanvas.addEventListener).toHaveBeenCalledWith('mouseup', expect.any(Function));
      expect(mockEventBus.emit).toHaveBeenCalledWith('interaction:initialized', { canvas: mockCanvas });
    });

    test('应该默认处于启用状态', () => {
      interactionService.initialize(mockCanvas);
      expect(interactionService.isEnabled()).toBe(true);
    });
  });

  describe('工具管理', () => {
    let mockTool: ITool;

    beforeEach(() => {
      interactionService.initialize(mockCanvas);

      mockTool = {
        name: 'test-tool',
        activate: vi.fn(),
        deactivate: vi.fn(),
        handleMouseDown: vi.fn(),
        handleMouseMove: vi.fn(),
        handleMouseUp: vi.fn()
      };
    });

    test('应该能够注册工具', () => {
      interactionService.registerTool(mockTool);

      expect(interactionService.hasTool('test-tool')).toBe(true);
      expect(mockEventBus.emit).toHaveBeenCalledWith('interaction:tool_registered', {
        toolName: 'test-tool',
        tool: mockTool
      });
    });

    test('应该能够激活工具', () => {
      interactionService.registerTool(mockTool);

      const result = interactionService.setActiveTool('test-tool');

      expect(result).toBe(true);
      expect(mockTool.activate).toHaveBeenCalled();
      expect(interactionService.getActiveTool()).toBe(mockTool);
    });

    test('激活不存在的工具应返回 false', () => {
      const result = interactionService.setActiveTool('non-existent');

      expect(result).toBe(false);
      expect(interactionService.getActiveTool()).toBeNull();
    });

    test('应该能够停用当前工具', () => {
      interactionService.registerTool(mockTool);
      interactionService.setActiveTool('test-tool');

      const result = interactionService.setActiveTool(null);

      expect(result).toBe(true);
      expect(mockTool.deactivate).toHaveBeenCalled();
      expect(interactionService.getActiveTool()).toBeNull();
    });

    test('切换工具时应停用前一个工具', () => {
      const anotherTool: ITool = {
        name: 'another-tool',
        activate: vi.fn(),
        deactivate: vi.fn()
      };

      interactionService.registerTool(mockTool);
      interactionService.registerTool(anotherTool);

      interactionService.setActiveTool('test-tool');
      interactionService.setActiveTool('another-tool');

      expect(mockTool.deactivate).toHaveBeenCalled();
      expect(anotherTool.activate).toHaveBeenCalled();
    });

    test('应该能够注销工具', () => {
      interactionService.registerTool(mockTool);
      interactionService.unregisterTool('test-tool');

      expect(interactionService.hasTool('test-tool')).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('interaction:tool_unregistered', {
        toolName: 'test-tool'
      });
    });

    test('注销当前活动工具时应自动停用', () => {
      interactionService.registerTool(mockTool);
      interactionService.setActiveTool('test-tool');
      interactionService.unregisterTool('test-tool');

      expect(mockTool.deactivate).toHaveBeenCalled();
      expect(interactionService.getActiveTool()).toBeNull();
    });

    test('应该能够获取所有工具', () => {
      const anotherTool: ITool = {
        name: 'another-tool',
        activate: vi.fn(),
        deactivate: vi.fn()
      };

      interactionService.registerTool(mockTool);
      interactionService.registerTool(anotherTool);

      const tools = interactionService.getAllTools();

      expect(tools).toHaveLength(2);
      expect(tools).toContain(mockTool);
      expect(tools).toContain(anotherTool);
    });

    test('应该能够获取工具名称列表', () => {
      interactionService.registerTool(mockTool);

      const names = interactionService.getToolNames();

      expect(names).toContain('test-tool');
    });
  });

  describe('启用/禁用', () => {
    test('应该能够禁用交互服务', () => {
      interactionService.initialize(mockCanvas);
      interactionService.setEnabled(false);

      expect(interactionService.isEnabled()).toBe(false);
      expect(mockEventBus.emit).toHaveBeenCalledWith('interaction:enabled_changed', { enabled: false });
    });

    test('应该能够重新启用交互服务', () => {
      interactionService.initialize(mockCanvas);
      interactionService.setEnabled(false);
      interactionService.setEnabled(true);

      expect(interactionService.isEnabled()).toBe(true);
    });

    test('状态未改变时不应触发事件', () => {
      interactionService.initialize(mockCanvas);

      // 清除初始化时的事件调用
      vi.clearAllMocks();

      // 设置为相同状态
      interactionService.setEnabled(true);

      expect(mockEventBus.emit).not.toHaveBeenCalledWith(
        'interaction:enabled_changed',
        expect.anything()
      );
    });
  });

  describe('ToolManager 集成', () => {
    test('应该能够设置 ToolManager', () => {
      interactionService.initialize(mockCanvas);

      const mockToolManager = {
        handleMouseDown: vi.fn(),
        handleMouseMove: vi.fn(),
        handleMouseUp: vi.fn()
      };

      interactionService.setToolManager(mockToolManager);

      expect(mockLogger.debug).toHaveBeenCalledWith('ToolManager set in InteractionService');
    });
  });

  describe('销毁', () => {
    test('应该能够正确销毁服务', () => {
      const mockTool: ITool = {
        name: 'test-tool',
        activate: vi.fn(),
        deactivate: vi.fn()
      };

      interactionService.initialize(mockCanvas);
      interactionService.registerTool(mockTool);
      interactionService.setActiveTool('test-tool');

      interactionService.dispose();

      expect(mockTool.deactivate).toHaveBeenCalled();
      expect(mockEventBus.emit).toHaveBeenCalledWith('interaction:disposed', {});
    });

    test('销毁后应移除所有事件监听器', () => {
      interactionService.initialize(mockCanvas);
      interactionService.dispose();

      // 应该调用了 removeEventListener
      expect(mockCanvas.removeEventListener).toHaveBeenCalled();
    });
  });
});
