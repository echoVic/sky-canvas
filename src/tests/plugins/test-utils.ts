/**
 * 插件系统测试工具和辅助函数
 */

import { vi } from 'vitest';
import { 
  Plugin, 
  PluginManifest, 
  PluginPermission, 
  PluginContext,
  ExtensionPoint,
  ExtensionProvider
} from '../../engine/plugins/types/PluginTypes';

/**
 * 创建测试插件清单
 */
export function createTestManifest(
  id: string, 
  overrides: Partial<PluginManifest> = {}
): PluginManifest {
  return {
    id,
    name: `Test Plugin ${id}`,
    version: '1.0.0',
    description: 'A test plugin for unit testing',
    author: 'Test Author',
    license: 'MIT',
    main: 'index.js',
    minEngineVersion: '1.0.0',
    permissions: [PluginPermission.READ_ONLY],
    extensionPoints: [],
    keywords: ['test', 'plugin'],
    ...overrides
  };
}

/**
 * 创建测试扩展点
 */
export function createTestExtensionPoint(
  id: string,
  overrides: Partial<ExtensionPoint> = {}
): ExtensionPoint {
  return {
    id,
    name: `Test Extension Point ${id}`,
    description: 'A test extension point',
    ...overrides
  };
}

/**
 * Mock插件实现
 */
export class MockPlugin implements Plugin {
  private activated = false;
  private context?: PluginContext;

  constructor(
    private shouldThrowOnActivate = false,
    private shouldThrowOnDeactivate = false
  ) {}

  async activate(context: PluginContext): Promise<void> {
    if (this.shouldThrowOnActivate) {
      throw new Error('Mock activation error');
    }
    this.activated = true;
    this.context = context;
  }

  async deactivate(): Promise<void> {
    if (this.shouldThrowOnDeactivate) {
      throw new Error('Mock deactivation error');
    }
    this.activated = false;
    this.context = undefined;
  }

  isActivated(): boolean {
    return this.activated;
  }

  getContext(): PluginContext | undefined {
    return this.context;
  }
}

/**
 * Mock扩展提供者
 */
export class MockExtensionProvider implements ExtensionProvider {
  public extensionId: string;
  public implementation: unknown;
  public config: Record<string, unknown>;

  constructor(
    public id: string,
    public pluginId: string,
    private data: unknown = {},
    private shouldThrow = false
  ) {
    this.extensionId = id;
    this.implementation = data;
    this.config = {};
  }

  provide(): unknown {
    if (this.shouldThrow) {
      throw new Error('Mock provider error');
    }
    return this.data;
  }
}

/**
 * 创建Mock画布API
 */
export function createMockCanvasAPI() {
  return {
    addElement: vi.fn(),
    removeElement: vi.fn(),
    updateElement: vi.fn(),
    getElement: vi.fn(),
    getAllElements: vi.fn().mockReturnValue([]),
    clear: vi.fn(),
    setTool: vi.fn(),
    getTool: vi.fn().mockReturnValue('select'),
    undo: vi.fn(),
    redo: vi.fn(),
    zoom: vi.fn(),
    pan: vi.fn(),
    getViewport: vi.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600, zoom: 1 })
  };
}

/**
 * 创建Mock UI API
 */
export function createMockUIAPI() {
  return {
    addPanel: vi.fn(),
    removePanel: vi.fn(),
    showDialog: vi.fn(),
    showNotification: vi.fn(),
    addMenuItem: vi.fn(),
    removeMenuItem: vi.fn(),
    addToolbarButton: vi.fn(),
    removeToolbarButton: vi.fn()
  };
}

/**
 * 创建Mock文件系统API
 */
export function createMockFileSystemAPI() {
  return {
    readFile: vi.fn().mockResolvedValue('mock file content'),
    writeFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    listFiles: vi.fn().mockResolvedValue(['file1.txt', 'file2.txt']),
    createDirectory: vi.fn().mockResolvedValue(undefined)
  };
}

/**
 * 创建Mock权限管理器
 */
export function createMockPermissionManager() {
  return {
    hasPermission: vi.fn().mockReturnValue(true),
    validatePermission: vi.fn().mockReturnValue(true),
    checkPermissions: vi.fn().mockResolvedValue(true),
    grantPermission: vi.fn(),
    revokePermission: vi.fn(),
    revokeAllPermissions: vi.fn(),
    getPluginPermissions: vi.fn().mockReturnValue([]),
    getAllPermissions: vi.fn().mockReturnValue({}),
    isHighRiskPermission: vi.fn().mockReturnValue(false),
    resetAllPermissions: vi.fn(),
    exportPermissions: vi.fn().mockReturnValue({}),
    importPermissions: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  };
}

/**
 * 创建Mock性能监控器
 */
export function createMockPerformanceMonitor() {
  return {
    startLoadTime: vi.fn(),
    endLoadTime: vi.fn(),
    startActivationTime: vi.fn(),
    endActivationTime: vi.fn(),
    recordMemoryUsage: vi.fn(),
    incrementApiCalls: vi.fn(),
    incrementErrors: vi.fn(),
    recordError: vi.fn(),
    getPluginMetrics: vi.fn().mockReturnValue({
      loadTime: 0,
      activationTime: 0,
      memoryUsage: 0,
      apiCalls: 0,
      errors: 0,
      lastError: undefined
    }),
    generateReport: vi.fn().mockReturnValue({
      totalPlugins: 0,
      totalLoadTime: 0,
      totalActivationTime: 0,
      totalApiCalls: 0,
      totalErrors: 0,
      averageLoadTime: 0,
      averageActivationTime: 0,
      plugins: []
    }),
    getPerformanceWarnings: vi.fn().mockReturnValue([]),
    clearPluginMetrics: vi.fn(),
    clearAllMetrics: vi.fn(),
    startRealTimeMonitoring: vi.fn(),
    stopRealTimeMonitoring: vi.fn(),
    setBenchmark: vi.fn(),
    exportData: vi.fn().mockReturnValue({ timestamp: Date.now(), plugins: {} }),
    importData: vi.fn(),
    dispose: vi.fn()
  };
}

/**
 * 创建Mock内存管理器
 */
export function createMockMemoryManager() {
  return {
    registerResource: vi.fn(),
    getResource: vi.fn(),
    hasResource: vi.fn().mockReturnValue(false),
    getPluginResources: vi.fn().mockReturnValue([]),
    releaseResource: vi.fn(),
    releasePluginResources: vi.fn(),
    getPluginMemoryUsage: vi.fn().mockReturnValue({
      totalSize: 0,
      resourceCount: 0,
      resources: []
    }),
    detectMemoryLeaks: vi.fn().mockReturnValue([]),
    forceGarbageCollection: vi.fn(),
    getMemoryStats: vi.fn().mockReturnValue({
      totalPlugins: 0,
      totalResources: 0,
      totalMemoryUsage: 0,
      averageMemoryPerPlugin: 0,
      largestPlugin: '',
      largestPluginSize: 0,
      plugins: []
    }),
    startMemoryMonitoring: vi.fn(),
    stopMemoryMonitoring: vi.fn(),
    getMemoryTrend: vi.fn().mockReturnValue([]),
    analyzeMemoryTrend: vi.fn().mockReturnValue({
      isGrowing: false,
      isStable: true,
      growthRate: 0
    }),
    getOptimizationSuggestions: vi.fn().mockReturnValue([]),
    clearPluginData: vi.fn(),
    clearAllData: vi.fn(),
    setPluginMemoryLimit: vi.fn(),
    setGlobalMemoryLimit: vi.fn(),
    getMemoryLimits: vi.fn().mockReturnValue({
      global: 0,
      plugins: {}
    }),
    dispose: vi.fn()
  };
}

/**
 * 等待异步操作完成
 */
export function waitForAsync(ms = 0): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建测试用的插件模块
 */
export function createTestPluginModule(PluginClass: typeof MockPlugin = MockPlugin) {
  return {
    default: PluginClass
  };
}

/**
 * 模拟localStorage
 */
export function mockLocalStorage() {
  const storage: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    key: vi.fn((index: number) => Object.keys(storage)[index] || null),
    get length() {
      return Object.keys(storage).length;
    }
  };
}

/**
 * 模拟performance.memory
 */
export function mockPerformanceMemory(
  usedJSHeapSize = 10 * 1024 * 1024,
  totalJSHeapSize = 20 * 1024 * 1024,
  jsHeapSizeLimit = 100 * 1024 * 1024
) {
  Object.defineProperty(performance, 'memory', {
    value: {
      usedJSHeapSize,
      totalJSHeapSize,
      jsHeapSizeLimit
    },
    configurable: true
  });
}

/**
 * 模拟window.confirm
 */
export function mockConfirm(returnValue = true) {
  return vi.spyOn(window, 'confirm').mockReturnValue(returnValue);
}

/**
 * 模拟console方法
 */
export function mockConsole() {
  return {
    log: vi.spyOn(console, 'log').mockImplementation(() => {}),
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    debug: vi.spyOn(console, 'debug').mockImplementation(() => {})
  };
}

/**
 * 创建测试事件
 */
export function createTestEvent(type: string, data?: unknown) {
  return new CustomEvent(type, { detail: data });
}

/**
 * 验证插件清单格式
 */
export function validatePluginManifest(manifest: unknown): boolean {
  const requiredFields = ['id', 'name', 'version', 'description', 'author', 'main'];
  return requiredFields.every(field => field in manifest && manifest[field]);
}

/**
 * 生成随机插件ID
 */
export function generateRandomPluginId(): string {
  return `test-plugin-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 创建测试资源
 */
export function createTestResource(id: string, size: number, disposable = true) {
  return {
    id,
    size,
    dispose: disposable ? vi.fn() : undefined,
    data: `test-data-${id}`
  };
}

/**
 * 断言函数：检查权限
 */
export function assertHasPermission(
  permissionManager: { hasPermission: (pluginId: string, permission: PluginPermission) => boolean },
  pluginId: string,
  permission: PluginPermission
) {
  expect(permissionManager.hasPermission(pluginId, permission)).toBe(true);
}

/**
 * 断言函数：检查资源存在
 */
export function assertResourceExists(
  memoryManager: { hasResource: (pluginId: string, resourceId: string) => boolean },
  pluginId: string,
  resourceId: string
) {
  expect(memoryManager.hasResource(pluginId, resourceId)).toBe(true);
}

/**
 * 断言函数：检查插件状态
 */
export function assertPluginStatus(
  pluginManager: { getPluginStatus: (pluginId: string) => string },
  pluginId: string,
  expectedStatus: string
) {
  expect(pluginManager.getPluginStatus(pluginId)).toBe(expectedStatus);
}
