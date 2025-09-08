/**
 * 其他核心服务的基础实现
 */

import { Injectable } from '../di';
import { 
  ISelectionService,
  IViewportService, 
  IHistoryService,
  IAnimationService,
  ILayerService,
  IInteractionService,
  IToolService,
  IImportExportService,
  IEventBusService, 
  ILogService
} from '../di';

/**
 * 选择服务实现
 */
@Injectable
export class SelectionService implements ISelectionService {
  private selectedShapeIds = new Set<string>();
  private eventBus: IEventBusService;
  private logger: ILogService;
  
  constructor(
    eventBus: IEventBusService,
    logger: ILogService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  selectShape(id: string): void {
    this.selectedShapeIds.add(id);
    this.logger.debug('Shape selected', { id });
    this.eventBus.emit('shape:selected', { id, selected: true });
  }

  deselectShape(id: string): void {
    this.selectedShapeIds.delete(id);
    this.logger.debug('Shape deselected', { id });
    this.eventBus.emit('shape:deselected', { id, selected: false });
  }

  clearSelection(): void {
    this.selectedShapeIds.clear();
    this.logger.debug('Selection cleared');
    this.eventBus.emit('selection:cleared', {});
  }

  isSelected(id: string): boolean {
    return this.selectedShapeIds.has(id);
  }

  getSelectedShapes(): any[] {
    return Array.from(this.selectedShapeIds).map(id => ({ id }));
  }

  multiSelect(shapes: any[]): void {
    this.clearSelection();
    shapes.forEach(shape => {
      if (shape && shape.id) {
        this.selectShape(shape.id);
      }
    });
  }

  addToSelection(shapes: any | any[]): void {
    const shapeList = Array.isArray(shapes) ? shapes : [shapes];
    shapeList.forEach(shape => {
      if (shape && shape.id) {
        this.selectShape(shape.id);
      }
    });
  }

  removeFromSelection(shapes: any | any[]): void {
    const shapeList = Array.isArray(shapes) ? shapes : [shapes];
    shapeList.forEach(shape => {
      if (shape && shape.id) {
        this.deselectShape(shape.id);
      }
    });
  }

  dispose(): void {
    this.clearSelection();
  }
}

/**
 * 视口服务实现
 */
@Injectable
export class ViewportService implements IViewportService {
  private viewport = {
    x: 0,
    y: 0,
    width: 800,
    height: 600,
    zoom: 1
  };
  
  private eventBus: IEventBusService;
  private logger: ILogService;
  
  constructor(
    eventBus: IEventBusService,
    logger: ILogService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  getViewport(): any {
    return { ...this.viewport };
  }

  setViewport(viewport: any): void {
    const oldViewport = { ...this.viewport };
    Object.assign(this.viewport, viewport);
    this.logger.debug('Viewport changed', { viewport: this.viewport });
    this.eventBus.emit('viewport:changed', { viewport: this.viewport, oldViewport });
  }

  panViewport(delta: any): void {
    this.setViewport({
      x: this.viewport.x + delta.x,
      y: this.viewport.y + delta.y
    });
  }

  zoomViewport(factor: number, center?: any): void {
    const newZoom = this.viewport.zoom * factor;
    const viewport = { zoom: newZoom };
    
    if (center) {
      const dx = (center.x - this.viewport.x) * (1 - factor);
      const dy = (center.y - this.viewport.y) * (1 - factor);
      Object.assign(viewport, {
        x: this.viewport.x + dx,
        y: this.viewport.y + dy
      });
    }
    
    this.setViewport(viewport);
  }

  fitToContent(): void {
    this.logger.debug('Fit to content requested');
    this.setViewport({ x: 0, y: 0, zoom: 1 });
  }

  resetViewport(): void {
    this.setViewport({ x: 0, y: 0, zoom: 1 });
  }

  screenToWorld(point: any): any {
    const scale = 1 / this.viewport.zoom;
    return {
      x: (point.x - this.viewport.x) * scale,
      y: (point.y - this.viewport.y) * scale
    };
  }

  worldToScreen(point: any): any {
    const scale = this.viewport.zoom;
    return {
      x: point.x * scale + this.viewport.x,
      y: point.y * scale + this.viewport.y
    };
  }

  dispose(): void {
    // 清理资源
  }
}

/**
 * 历史记录服务实现
 */
@Injectable
export class HistoryService implements IHistoryService {
  private undoStack: any[] = [];
  private redoStack: any[] = [];
  private maxHistorySize = 50;
  
  private eventBus: IEventBusService;
  private logger: ILogService;
  
  constructor(
    eventBus: IEventBusService,
    logger: ILogService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  execute(command: any): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack.length = 0;
    
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
    
    this.logger.debug('Command executed', { command: command.name });
    this.eventBus.emit('history:command:executed', { command });
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (command) {
      command.undo();
      this.redoStack.push(command);
      this.logger.debug('Command undone', { command: command.name });
      this.eventBus.emit('history:undone', { command });
    }
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
      this.logger.debug('Command redone', { command: command.name });
      this.eventBus.emit('history:redone', { command });
    }
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.logger.debug('History cleared');
  }

  dispose(): void {
    this.clear();
  }
}

/**
 * 动画服务实现
 */
@Injectable
export class AnimationService implements IAnimationService {
  private animations = new Map<string, any>();
  private animationFrame: number | null = null;
  
  private eventBus: IEventBusService;
  private logger: ILogService;
  
  constructor(
    eventBus: IEventBusService,
    logger: ILogService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  animate(target: any, props: any, config?: any): any {
    const animation = {
      id: Date.now().toString(),
      target,
      props,
      config: config || {},
      startTime: Date.now(),
      duration: config?.duration || 1000
    };
    
    this.animations.set(animation.id, animation);
    this.logger.debug('Animation created', { id: animation.id });
    
    if (!this.animationFrame) {
      this.startAnimationLoop();
    }
    
    return animation;
  }

  createTimeline(): any {
    return {
      animations: [],
      play: () => {},
      pause: () => {},
      stop: () => {}
    };
  }

  getTweenEngine(): any {
    return {
      create: (target: any) => ({ to: (props: any, config: any) => this.animate(target, props, config) })
    };
  }

  stopAll(): void {
    this.animations.clear();
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.logger.debug('All animations stopped');
  }

  update(deltaTime: number): void {
    const currentTime = Date.now();
    const completedAnimations: string[] = [];
    
    for (const [id, animation] of this.animations) {
      const elapsed = currentTime - animation.startTime;
      const progress = Math.min(elapsed / animation.duration, 1);
      
      for (const prop in animation.props) {
        const startValue = animation.target[prop] || 0;
        const endValue = animation.props[prop];
        animation.target[prop] = startValue + (endValue - startValue) * progress;
      }
      
      if (progress >= 1) {
        completedAnimations.push(id);
      }
    }
    
    completedAnimations.forEach(id => this.animations.delete(id));
    
    if (this.animations.size === 0 && this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.update(16);
      if (this.animations.size > 0) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.animationFrame = null;
      }
    };
    this.animationFrame = requestAnimationFrame(animate);
  }

  dispose(): void {
    this.stopAll();
  }
}

/**
 * 图层服务实现
 */
@Injectable
export class LayerService implements ILayerService {
  private layers = new Map<string, any>();
  
  private eventBus: IEventBusService;
  private logger: ILogService;
  
  constructor(
    eventBus: IEventBusService,
    logger: ILogService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  createLayer(id: string, zIndex?: number): any {
    const layer = {
      id,
      zIndex: zIndex || 0,
      visible: true,
      opacity: 1,
      shapes: []
    };
    
    this.layers.set(id, layer);
    this.logger.debug('Layer created', { id, zIndex });
    this.eventBus.emit('layer:created', { layer });
    
    return layer;
  }

  getLayer(id: string): any | undefined {
    return this.layers.get(id);
  }

  removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer) {
      this.layers.delete(id);
      this.logger.debug('Layer removed', { id });
      this.eventBus.emit('layer:removed', { layer });
    }
  }

  getLayers(): any[] {
    return Array.from(this.layers.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.visible = visible;
      this.logger.debug('Layer visibility changed', { id, visible });
      this.eventBus.emit('layer:visibility:changed', { layer, visible });
    }
  }

  setLayerOpacity(id: string, opacity: number): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.opacity = Math.max(0, Math.min(1, opacity));
      this.logger.debug('Layer opacity changed', { id, opacity });
      this.eventBus.emit('layer:opacity:changed', { layer, opacity });
    }
  }

  dispose(): void {
    this.layers.clear();
  }
}

/**
 * 交互服务实现
 */
@Injectable
export class InteractionService implements IInteractionService {
  private activeTool: any = null;
  private tools = new Map<string, any>();
  public enabled = true;
  
  private eventBus: IEventBusService;
  private logger: ILogService;
  
  constructor(
    eventBus: IEventBusService,
    logger: ILogService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  initialize(canvas: HTMLCanvasElement): void {
    this.logger.debug('Interaction service initialized');
    this.eventBus.emit('interaction:initialized', { canvas });
  }

  setActiveTool(toolName: string | null): boolean {
    if (toolName === null) {
      this.activeTool = null;
      this.logger.debug('Active tool cleared');
      return true;
    }
    
    const tool = this.tools.get(toolName);
    if (tool) {
      this.activeTool = tool;
      this.logger.debug('Active tool set', { toolName });
      this.eventBus.emit('interaction:tool:changed', { tool });
      return true;
    }
    
    return false;
  }

  getActiveTool(): any {
    return this.activeTool;
  }

  registerTool(tool: any): void {
    if (tool && tool.name) {
      this.tools.set(tool.name, tool);
      this.logger.debug('Tool registered', { name: tool.name });
    }
  }

  unregisterTool(name: string): void {
    if (this.tools.has(name)) {
      this.tools.delete(name);
      this.logger.debug('Tool unregistered', { name });
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.logger.debug('Interaction enabled changed', { enabled });
  }

  dispose(): void {
    this.tools.clear();
    this.activeTool = null;
    this.enabled = false;
  }
}

/**
 * 工具服务实现
 */
@Injectable
export class ToolService implements IToolService {
  private tools = new Map<string, any>();
  private activeTool: any = null;
  
  private eventBus: IEventBusService;
  private logger: ILogService;
  
  constructor(
    eventBus: IEventBusService,
    logger: ILogService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  registerTool(tool: any): void {
    if (tool && tool.name) {
      this.tools.set(tool.name, tool);
      this.logger.debug('Tool registered', { name: tool.name });
      this.eventBus.emit('tool:registered', { tool });
    }
  }

  unregisterTool(name: string): void {
    if (this.tools.has(name)) {
      const tool = this.tools.get(name);
      this.tools.delete(name);
      this.logger.debug('Tool unregistered', { name });
      this.eventBus.emit('tool:unregistered', { tool });
    }
  }

  getTool(name: string): any | undefined {
    return this.tools.get(name);
  }

  getTools(): any[] {
    return Array.from(this.tools.values());
  }

  setActiveTool(name: string | null): boolean {
    if (name === null) {
      this.activeTool = null;
      this.logger.debug('Active tool cleared');
      return true;
    }
    
    const tool = this.tools.get(name);
    if (tool) {
      this.activeTool = tool;
      this.logger.debug('Active tool set', { name });
      this.eventBus.emit('tool:activated', { tool });
      return true;
    }
    
    return false;
  }

  getActiveTool(): any {
    return this.activeTool;
  }

  dispose(): void {
    this.tools.clear();
    this.activeTool = null;
  }
}

/**
 * 导入导出服务实现
 */
@Injectable
export class ImportExportService implements IImportExportService {
  private eventBus: IEventBusService;
  private logger: ILogService;
  
  constructor(
    eventBus: IEventBusService,
    logger: ILogService
  ) {
    this.eventBus = eventBus;
    this.logger = logger;
  }

  exportToSVG(shapes: any[], options?: any): string {
    this.logger.debug('Exporting to SVG', { shapeCount: shapes.length });
    return `<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
      <!-- Exported ${shapes.length} shapes -->
    </svg>`;
  }

  async exportToPNG(canvas: HTMLCanvasElement, options?: any): Promise<Blob> {
    this.logger.debug('Exporting to PNG');
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'image/png');
    });
  }

  async exportToJPEG(canvas: HTMLCanvasElement, options?: any): Promise<Blob> {
    this.logger.debug('Exporting to JPEG');
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob || new Blob());
      }, 'image/jpeg', options?.quality || 0.8);
    });
  }

  exportToJSON(scene: any): string {
    this.logger.debug('Exporting to JSON');
    return JSON.stringify(scene, null, 2);
  }

  importFromJSON(jsonData: string): any {
    this.logger.debug('Importing from JSON');
    try {
      return JSON.parse(jsonData);
    } catch (error) {
      this.logger.error('Failed to parse JSON', error);
      throw error;
    }
  }

  importFromSVG(svgData: string): any[] {
    this.logger.debug('Importing from SVG');
    return [];
  }

  async importFromImage(imageFile: File): Promise<any> {
    this.logger.debug('Importing from image', { name: imageFile.name });
    return {
      type: 'image',
      name: imageFile.name,
      size: imageFile.size
    };
  }

  dispose(): void {
    // 清理资源
  }
}
