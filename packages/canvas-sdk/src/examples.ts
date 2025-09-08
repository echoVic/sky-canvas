/**
 * Canvas SDK 使用示例
 * 展示如何使用新的依赖注入架构
 */

import {
  // 核心创建函数
  createCanvasSDK,
  createCanvasSDKWithPlugins,
  createCanvasSDKWithServices,
  createDebugCanvasSDK,
  
  // 工厂和类型
  CanvasSDKFactory,
  ICanvasSDKPlugin,
  ServiceCollection,
  
  // 依赖注入相关
  Injectable,
  Inject,
  ServiceIdentifier,
  ServiceLifecycle,
  
  // 服务接口和标识符
  IEventBusService,
  IEventBusServiceId,
  ILogService,
  ILogServiceId,
  IConfigurationService,
  IConfigurationServiceId,
} from './index';

// ========================================
// 示例 1: 基础使用
// ========================================

export async function basicUsageExample() {
  const canvas = document.createElement('canvas');
  document.body.appendChild(canvas);
  
  // 创建 SDK 实例
  const sdk = await createCanvasSDK(canvas, {
    logLevel: 'info',
    enableHistory: true,
    maxHistorySize: 50
  });
  
  // 使用 SDK API
  const shape = sdk.createShape('rectangle', {
    x: 10,
    y: 10,
    width: 100,
    height: 50,
    fill: '#ff0000'
  });
  
  sdk.addShape(shape);
  
  // 监听事件
  sdk.on('shape-added', (event) => {
    console.log('Shape added:', event.shape.id);
  });
  
  return sdk;
}

// ========================================
// 示例 2: 调试模式
// ========================================

export async function debugModeExample() {
  const canvas = document.createElement('canvas');
  
  // 创建调试模式的 SDK
  const sdk = await createDebugCanvasSDK(canvas, {
    logLevel: 'debug',
    enableDevTools: true
  });
  
  // 在调试模式下，所有操作都会输出详细日志
  sdk.addShape(sdk.createShape('circle', {
    x: 50,
    y: 50,
    radius: 25,
    fill: '#00ff00'
  }));
  
  return sdk;
}

// ========================================
// 示例 3: 自定义服务
// ========================================

// 定义自定义服务接口
interface ICustomAnalyticsService {
  trackEvent(event: string, data: any): void;
  getStats(): any;
}

// 创建服务标识符
const ICustomAnalyticsServiceId = new ServiceIdentifier<ICustomAnalyticsService>('CustomAnalyticsService');

// 实现自定义服务
@Injectable
class CustomAnalyticsService implements ICustomAnalyticsService {
  private events: Array<{ event: string; data: any; timestamp: number }> = [];
  
  constructor(
    @Inject(ILogServiceId) private logger: ILogService,
    @Inject(IEventBusServiceId) private eventBus: IEventBusService
  ) {
    // 监听 SDK 事件
    this.eventBus.on('shape-added', (data) => {
      this.trackEvent('shape-added', data);
    });
  }
  
  trackEvent(event: string, data: any): void {
    this.events.push({
      event,
      data,
      timestamp: Date.now()
    });
    
    this.logger.info(`Analytics: ${event}`, data);
  }
  
  getStats(): any {
    return {
      totalEvents: this.events.length,
      eventTypes: [...new Set(this.events.map(e => e.event))],
      recentEvents: this.events.slice(-10)
    };
  }
}

export async function customServiceExample() {
  const canvas = document.createElement('canvas');
  
  // 创建带有自定义服务的 SDK
  const sdk = await createCanvasSDKWithServices(canvas, {}, (services: ServiceCollection) => {
    // 注册自定义分析服务
    services.addSingleton(ICustomAnalyticsServiceId, CustomAnalyticsService);
  });
  
  // 获取自定义服务
  const analytics = sdk.getService(ICustomAnalyticsServiceId);
  
  // 使用 SDK，分析服务会自动跟踪事件
  sdk.addShape(sdk.createShape('rectangle', { x: 0, y: 0, width: 50, height: 50 }));
  
  // 查看统计信息
  console.log('Analytics stats:', analytics.getStats());
  
  return { sdk, analytics };
}

// ========================================
// 示例 4: 插件系统
// ========================================

// 创建一个简单的插件
const themePlugin: ICanvasSDKPlugin = {
  name: 'ThemePlugin',
  version: '1.0.0',
  
  install(services: ServiceCollection) {
    // 注册主题服务
    services.addSingleton(IThemeServiceId, ThemeService);
  },
  
  activate(sdk: any) {
    console.log('Theme plugin activated');
    
    // 应用默认主题
    const themeService = sdk.getService(IThemeServiceId);
    themeService.applyTheme('default');
    
    // 监听主题变更
    sdk.on('theme-changed', (theme: string) => {
      console.log('Theme changed to:', theme);
    });
  },
  
  deactivate() {
    console.log('Theme plugin deactivated');
  }
};

// 主题服务接口和实现
interface IThemeService {
  applyTheme(theme: string): void;
  getCurrentTheme(): string;
}

const IThemeServiceId = new ServiceIdentifier<IThemeService>('ThemeService');

@Injectable
class ThemeService implements IThemeService {
  private currentTheme = 'light';
  
  constructor(
    @Inject(IEventBusServiceId) private eventBus: IEventBusService,
    @Inject(IConfigurationServiceId) private config: IConfigurationService
  ) {}
  
  applyTheme(theme: string): void {
    this.currentTheme = theme;
    
    // 更新配置
    this.config.set('theme', theme);
    
    // 触发主题变更事件
    this.eventBus.emit('theme-changed', theme);
  }
  
  getCurrentTheme(): string {
    return this.currentTheme;
  }
}

export async function pluginExample() {
  const canvas = document.createElement('canvas');
  
  // 创建带有插件的 SDK
  const sdk = await createCanvasSDKWithPlugins(canvas, {}, [themePlugin]);
  
  // 使用插件提供的功能
  const themeService = sdk.getService(IThemeServiceId);
  
  // 切换主题
  setTimeout(() => {
    themeService.applyTheme('dark');
  }, 1000);
  
  return sdk;
}

// ========================================
// 示例 5: 复杂的依赖注入场景
// ========================================

// 创建一个复杂的服务，依赖多个其他服务
interface IDrawingAssistantService {
  suggestNextShape(): any;
  autoLayout(): void;
  getRecommendations(): any[];
}

const IDrawingAssistantServiceId = new ServiceIdentifier<IDrawingAssistantService>('DrawingAssistantService');

@Injectable
class DrawingAssistantService implements IDrawingAssistantService {
  constructor(
    @Inject(IEventBusServiceId) private eventBus: IEventBusService,
    @Inject(ILogServiceId) private logger: ILogService,
    @Inject(IConfigurationServiceId) private config: IConfigurationService,
    // 假设我们有这些服务的标识符
    // @Inject(IShapeServiceId) private shapeService: IShapeService,
    // @Inject(ISelectionServiceId) private selectionService: ISelectionService,
    // @Inject(IViewportServiceId) private viewportService: IViewportService
  ) {
    this.logger.info('DrawingAssistantService initialized');
    
    // 监听相关事件
    this.eventBus.on('shape-added', this.onShapeAdded.bind(this));
    this.eventBus.on('selection-changed', this.onSelectionChanged.bind(this));
  }
  
  private onShapeAdded(data: any) {
    this.logger.debug('Shape added, updating recommendations', data);
    // 更新推荐逻辑
  }
  
  private onSelectionChanged(data: any) {
    this.logger.debug('Selection changed, updating suggestions', data);
    // 更新建议逻辑
  }
  
  suggestNextShape(): any {
    // 基于当前画布状态建议下一个形状
    return {
      type: 'rectangle',
      position: { x: 100, y: 100 },
      size: { width: 80, height: 60 },
      style: { fill: '#0066cc', stroke: '#004499' }
    };
  }
  
  autoLayout(): void {
    this.logger.info('Performing auto layout');
    // 自动布局逻辑
    this.eventBus.emit('layout-completed', { type: 'auto' });
  }
  
  getRecommendations(): any[] {
    return [
      { type: 'alignment', description: '对齐选中的形状' },
      { type: 'grouping', description: '将相近的形状分组' },
      { type: 'color-harmony', description: '应用和谐的配色方案' }
    ];
  }
}

export async function complexDependencyExample() {
  const canvas = document.createElement('canvas');
  
  const sdk = await createCanvasSDKWithServices(canvas, {
    logLevel: 'debug'
  }, (services: ServiceCollection) => {
    // 注册绘图助手服务
    services.addSingleton(IDrawingAssistantServiceId, DrawingAssistantService);
  });
  
  // 获取绘图助手
  const assistant = sdk.getService(IDrawingAssistantServiceId);
  
  // 添加一些形状
  sdk.addShape(sdk.createShape('rectangle', { x: 10, y: 10, width: 50, height: 30 }));
  sdk.addShape(sdk.createShape('circle', { x: 80, y: 40, radius: 20 }));
  
  // 使用助手功能
  const suggestion = assistant.suggestNextShape();
  console.log('Suggested next shape:', suggestion);
  
  const recommendations = assistant.getRecommendations();
  console.log('Recommendations:', recommendations);
  
  // 执行自动布局
  setTimeout(() => {
    assistant.autoLayout();
  }, 2000);
  
  return { sdk, assistant };
}

// ========================================
// 示例 6: 错误处理和恢复
// ========================================

export async function errorHandlingExample() {
  const canvas = document.createElement('canvas');
  
  try {
    const sdk = await createCanvasSDK(canvas, {
      logLevel: 'error',
      enableErrorRecovery: true
    });
    
    // 监听错误事件
    sdk.on('error', (error) => {
      console.error('SDK Error:', error);
      
      // 可以实现自定义的错误恢复逻辑
      if (error.type === 'rendering-error') {
        sdk.resetCanvas();
      }
    });
    
    // 故意触发一个错误（示例）
    try {
      // sdk.addShape(null); // 这会触发错误
    } catch (error) {
      console.error('Operation failed:', error);
    }
    
    return sdk;
    
  } catch (error) {
    console.error('Failed to create SDK:', error);
    
    // 可以实现回退策略
    console.log('Falling back to basic canvas operations...');
    return null;
  }
}

// ========================================
// 示例 7: 性能监控
// ========================================

export async function performanceMonitoringExample() {
  const canvas = document.createElement('canvas');
  
  const sdk = await createCanvasSDKWithServices(canvas, {
    logLevel: 'info',
    enablePerformanceMonitoring: true
  }, (services: ServiceCollection) => {
    // 可以注册性能监控服务
    // services.addSingleton(IPerformanceMonitorId, PerformanceMonitor);
  });
  
  // 监听性能事件
  sdk.on('performance-report', (report) => {
    console.log('Performance Report:', {
      renderTime: report.renderTime,
      shapeCount: report.shapeCount,
      memoryUsage: report.memoryUsage,
      fps: report.fps
    });
  });
  
  // 执行一些操作来生成性能数据
  for (let i = 0; i < 100; i++) {
    sdk.addShape(sdk.createShape('rectangle', {
      x: Math.random() * 800,
      y: Math.random() * 600,
      width: 20 + Math.random() * 50,
      height: 20 + Math.random() * 50,
      fill: `hsl(${Math.random() * 360}, 50%, 50%)`
    }));
  }
  
  return sdk;
}

// ========================================
// 导出所有示例
// ========================================

export const examples = {
  basicUsage: basicUsageExample,
  debugMode: debugModeExample,
  customService: customServiceExample,
  plugin: pluginExample,
  complexDependency: complexDependencyExample,
  errorHandling: errorHandlingExample,
  performanceMonitoring: performanceMonitoringExample
};

// 运行所有示例的辅助函数
export async function runAllExamples() {
  console.log('Running Canvas SDK examples...');
  
  for (const [name, example] of Object.entries(examples)) {
    try {
      console.log(`\n--- Running ${name} example ---`);
      const result = await example();
      console.log(`${name} example completed successfully`);
      
      // 清理资源
      if (result && typeof result.dispose === 'function') {
        result.dispose();
      }
    } catch (error) {
      console.error(`${name} example failed:`, error);
    }
  }
}
