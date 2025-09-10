/**
 * MVVM 集成服务
 * 将新的 MVVM 架构直接集成到现有的服务层中
 */

import { MVVMManager, createMVVMManager } from '../mvvm/core/MVVMManager';
import { ServiceMigrationManager } from '../mvvm/adapters/ServiceMigrationAdapter';
import { injectable, inject } from '../di/ServiceIdentifier';
import {
  IEventBusService,
  ILogService,
  IShapeService,
  ISelectionService,
  IViewportService,
  IHistoryService
} from '../di/ServiceIdentifiers';

/**
 * MVVM 集成服务配置
 */
export interface IMVVMIntegrationConfig {
  /** 是否启用 MVVM 模式 */
  enableMVVM: boolean;
  /** 是否启用渐进式迁移 */
  enableMigration: boolean;
  /** 是否启用调试模式 */
  debug: boolean;
  /** 自动保存间隔 */
  autoSaveInterval: number;
}

/**
 * MVVM 集成服务
 * 提供现有服务和新 MVVM 架构之间的无缝集成
 */
@injectable
export class MVVMIntegrationService {
  private mvvmManager: MVVMManager | null = null;
  private isInitialized: boolean = false;
  private config: IMVVMIntegrationConfig;

  constructor(
    @inject(IEventBusService) private eventBus: IEventBusService,
    @inject(ILogService) private logger: ILogService,
    @inject(IShapeService) private shapeService: IShapeService,
    @inject(ISelectionService) private selectionService: ISelectionService,
    @inject(IViewportService) private viewportService: IViewportService,
    @inject(IHistoryService) private historyService: IHistoryService
  ) {
    this.config = {
      enableMVVM: true,
      enableMigration: true,
      debug: false,
      autoSaveInterval: 30000
    };
  }

  /**
   * 初始化 MVVM 集成
   */
  async initialize(config?: Partial<IMVVMIntegrationConfig>): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.config = { ...this.config, ...config };
      this.logger.info('Initializing MVVM integration', { config: this.config });

      if (this.config.enableMVVM) {
        // 创建 MVVM 管理器
        this.mvvmManager = createMVVMManager({
          debug: this.config.debug,
          enableMigration: this.config.enableMigration,
          autoSaveInterval: this.config.autoSaveInterval
        });

        // 初始化 MVVM 管理器
        await this.mvvmManager.initialize();

        // 如果启用迁移，开始迁移过程
        if (this.config.enableMigration) {
          await this.startServiceMigration();
        }

        // 设置事件桥接
        this.setupEventBridge();

        this.logger.info('MVVM integration initialized successfully');
      }

      this.isInitialized = true;
      this.eventBus.emit('mvvm:integration:initialized', { config: this.config });

    } catch (error) {
      this.logger.error('Failed to initialize MVVM integration', error);
      throw error;
    }
  }

  /**
   * 获取 MVVM 管理器
   */
  getMVVMManager(): MVVMManager | null {
    return this.mvvmManager;
  }

  /**
   * 检查是否启用 MVVM 模式
   */
  isMVVMEnabled(): boolean {
    return this.config.enableMVVM && this.mvvmManager !== null;
  }

  /**
   * 获取混合服务接口
   * 根据配置返回传统服务或 MVVM 服务
   */
  getShapeService(): IShapeService {
    if (this.isMVVMEnabled() && this.mvvmManager) {
      return this.createShapeServiceAdapter();
    }
    return this.shapeService;
  }

  getSelectionService(): ISelectionService {
    if (this.isMVVMEnabled() && this.mvvmManager) {
      return this.createSelectionServiceAdapter();
    }
    return this.selectionService;
  }

  getViewportService(): IViewportService {
    if (this.isMVVMEnabled() && this.mvvmManager) {
      return this.createViewportServiceAdapter();
    }
    return this.viewportService;
  }

  getHistoryService(): IHistoryService {
    if (this.isMVVMEnabled() && this.mvvmManager) {
      return this.createHistoryServiceAdapter();
    }
    return this.historyService;
  }

  /**
   * 设置应用上下文
   */
  async setApplicationContext(context: {
    userId?: string;
    projectId?: string;
    sceneId?: string;
  }): Promise<void> {
    if (!this.isMVVMEnabled() || !this.mvvmManager) return;

    try {
      if (context.userId !== undefined) {
        await this.mvvmManager.setCurrentUser(context.userId);
      }

      if (context.projectId !== undefined) {
        await this.mvvmManager.setCurrentProject(context.projectId);
      }

      if (context.sceneId !== undefined) {
        await this.mvvmManager.setCurrentScene(context.sceneId);
      }

      this.logger.debug('Application context updated', context);
    } catch (error) {
      this.logger.error('Failed to set application context', error);
    }
  }

  /**
   * 开始服务迁移
   */
  private async startServiceMigration(): Promise<void> {
    if (!this.mvvmManager) return;

    this.logger.info('Starting service migration');

    await this.mvvmManager.startMigration({
      shapeService: this.shapeService,
      selectionService: this.selectionService,
      viewportService: this.viewportService,
      historyService: this.historyService
    });

    const progress = this.mvvmManager.getMigrationManager()?.getMigrationProgress();
    this.logger.info('Service migration started', { progress });
  }

  /**
   * 设置事件桥接
   */
  private setupEventBridge(): void {
    if (!this.mvvmManager) return;

    // 将 MVVM 事件转发到传统事件总线
    this.mvvmManager.events.on('app:scene:changed', (data) => {
      this.eventBus.emit('scene:changed', data);
    });

    this.mvvmManager.events.on('mvvm:error', (data) => {
      this.logger.error('MVVM error', data);
      this.eventBus.emit('system:error', data);
    });

    // 监听传统事件，同步到 MVVM
    this.eventBus.on('viewport:changed', (data) => {
      if (this.mvvmManager && data.viewport) {
        this.mvvmManager.viewport.setPosition(data.viewport.x, data.viewport.y);
        this.mvvmManager.viewport.setZoom(data.viewport.zoom);
      }
    });
  }

  /**
   * 创建图形服务适配器
   */
  private createShapeServiceAdapter(): IShapeService {
    const mvvmManager = this.mvvmManager!;

    return {
      addShape: (shape: any) => {
        mvvmManager.shapes.createShape({
          type: shape.type,
          position: shape.position || { x: 0, y: 0 },
          size: shape.size,
          properties: shape.properties
        }).then((createdShape) => {
          this.eventBus.emit('shape:added', { shape: createdShape });
        });
      },

      removeShape: (id: string) => {
        mvvmManager.shapes.deleteModel(id).then(() => {
          this.eventBus.emit('shape:removed', { id });
        });
      },

      getShape: (id: string) => {
        return mvvmManager.shapes.getModel(id)?.getData();
      },

      getShapes: () => {
        return mvvmManager.shapes.getAllModels().map(model => model.getData());
      },

      updateShape: (id: string, updates: any) => {
        const model = mvvmManager.shapes.getModel(id);
        if (model) {
          Object.assign(model, updates);
          model.markAsDirty();
          this.eventBus.emit('shape:updated', { id, updates });
        }
      },

      clearShapes: () => {
        mvvmManager.shapes.clearModels();
        this.eventBus.emit('shapes:cleared', {});
      }
    };
  }

  /**
   * 创建选择服务适配器
   */
  private createSelectionServiceAdapter(): ISelectionService {
    const mvvmManager = this.mvvmManager!;

    return {
      selectShape: (id: string) => {
        mvvmManager.shapes.selectShape(id);
      },

      deselectShape: (id: string) => {
        mvvmManager.shapes.deselectShape(id);
      },

      clearSelection: () => {
        mvvmManager.shapes.clearSelection();
      },

      getSelectedShapes: () => {
        return mvvmManager.shapes.selectedShapes.map(shape => shape.getData());
      },

      isSelected: (id: string) => {
        return mvvmManager.shapes.selectedShapeIds.includes(id);
      },

      multiSelect: (shapes: any[]) => {
        mvvmManager.shapes.selectShapes(shapes.map(s => s.id));
      },

      addToSelection: (shapes: any | any[]) => {
        const shapeIds = Array.isArray(shapes) ? shapes.map(s => s.id) : [shapes.id];
        shapeIds.forEach(id => mvvmManager.shapes.selectShape(id, true));
      },

      removeFromSelection: (shapes: any | any[]) => {
        const shapeIds = Array.isArray(shapes) ? shapes.map(s => s.id) : [shapes.id];
        shapeIds.forEach(id => mvvmManager.shapes.deselectShape(id));
      }
    };
  }

  /**
   * 创建视口服务适配器
   */
  private createViewportServiceAdapter(): IViewportService {
    const mvvmManager = this.mvvmManager!;

    return {
      getViewport: () => {
        const viewport = mvvmManager.viewport.currentViewport;
        return viewport ? {
          x: viewport.position.x,
          y: viewport.position.y,
          zoom: viewport.zoom,
          width: viewport.size.width,
          height: viewport.size.height
        } : null;
      },

      setViewport: (viewport: any) => {
        if (viewport.x !== undefined || viewport.y !== undefined) {
          mvvmManager.viewport.setPosition(viewport.x || 0, viewport.y || 0);
        }
        if (viewport.zoom !== undefined) {
          mvvmManager.viewport.setZoom(viewport.zoom);
        }
        if (viewport.width !== undefined || viewport.height !== undefined) {
          mvvmManager.viewport.setSize(viewport.width || 800, viewport.height || 600);
        }
      },

      panViewport: (delta: any) => {
        mvvmManager.viewport.pan(delta.x || 0, delta.y || 0);
      },

      zoomViewport: (factor: number, center?: any) => {
        mvvmManager.viewport.zoom(factor, center?.x, center?.y);
      },

      fitToContent: () => {
        // TODO: 实现适应内容功能
        mvvmManager.viewport.zoomToFit({ x: 0, y: 0, width: 800, height: 600 });
      },

      resetViewport: () => {
        mvvmManager.viewport.resetViewport();
      },

      screenToWorld: (point: any) => {
        return mvvmManager.viewport.screenToWorld(point.x, point.y);
      },

      worldToScreen: (point: any) => {
        return mvvmManager.viewport.worldToScreen(point.x, point.y);
      }
    };
  }

  /**
   * 创建历史服务适配器
   */
  private createHistoryServiceAdapter(): IHistoryService {
    const mvvmManager = this.mvvmManager!;

    return {
      execute: (command: any) => {
        // MVVM 架构中的命令通过 ViewModel 直接执行
        if (command.execute) {
          command.execute();
        }
      },

      undo: () => {
        mvvmManager.shapes.undo();
      },

      redo: () => {
        mvvmManager.shapes.redo();
      },

      canUndo: () => {
        return mvvmManager.shapes.canUndo;
      },

      canRedo: () => {
        return mvvmManager.shapes.canRedo;
      },

      clear: () => {
        // TODO: 实现历史清除
      }
    };
  }

  /**
   * 保存所有状态
   */
  async saveAll(): Promise<void> {
    if (this.isMVVMEnabled() && this.mvvmManager) {
      await this.mvvmManager.saveAll();
    }
  }

  /**
   * 获取系统状态
   */
  getSystemStatus(): any {
    if (this.isMVVMEnabled() && this.mvvmManager) {
      return this.mvvmManager.getSystemStatus();
    }
    
    return {
      mvvmEnabled: false,
      initialized: this.isInitialized,
      config: this.config
    };
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (this.mvvmManager) {
      this.mvvmManager.dispose();
      this.mvvmManager = null;
    }
    
    this.isInitialized = false;
    this.logger.info('MVVM integration service disposed');
  }
}