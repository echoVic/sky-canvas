/**
 * 调试渲染器
 * 提供可视化调试信息，包括线框、边界框、性能图表等
 */

import { IEventBus } from '../events/EventBus';
import { PerformanceMetrics } from './PerformanceAnalyzer';

export interface DebugRenderOptions {
  // 几何体调试
  showWireframe: boolean;
  showBoundingBoxes: boolean;
  showNormals: boolean;
  showTangents: boolean;
  showUVs: boolean;
  
  // 空间分割调试
  showSpatialGrid: boolean;
  showFrustum: boolean;
  showOctree: boolean;
  showQuadTree: boolean;
  
  // 光照调试
  showLights: boolean;
  showShadows: boolean;
  showLightVolumes: boolean;
  
  // 纹理调试
  showTextureAtlas: boolean;
  showMipmapLevels: boolean;
  showTextureUsage: boolean;
  
  // 性能调试
  showFpsCounter: boolean;
  showPerformanceGraph: boolean;
  showDrawCallInfo: boolean;
  showMemoryUsage: boolean;
  showGpuTiming: boolean;
  
  // 渲染调试
  showOverdraw: boolean;
  showDepthBuffer: boolean;
  showStencilBuffer: boolean;
  showRenderTargets: boolean;
  
  // 交互调试
  showMouseRay: boolean;
  showCollisionShapes: boolean;
  showPickingInfo: boolean;
  
  // 动画调试
  showBones: boolean;
  showAnimationCurves: boolean;
  showMotionPaths: boolean;
}

export interface DebugInfo {
  position: { x: number; y: number };
  text: string;
  color: string;
  size: number;
  persistent: boolean;
  ttl: number; // time to live in ms
}

export interface DebugLine {
  start: { x: number; y: number; z: number };
  end: { x: number; y: number; z: number };
  color: string;
  width: number;
  persistent: boolean;
  ttl: number;
}

export interface DebugShape {
  type: 'box' | 'sphere' | 'cylinder' | 'cone' | 'plane';
  transform: {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
  };
  color: string;
  wireframe: boolean;
  persistent: boolean;
  ttl: number;
}

export interface DebugRendererEvents {
  'debug-info-added': { info: DebugInfo };
  'debug-line-added': { line: DebugLine };
  'debug-shape-added': { shape: DebugShape };
  'debug-cleared': {};
}

/**
 * 调试渲染器实现
 */
export class DebugRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gl?: WebGLRenderingContext;
  
  private options: DebugRenderOptions;
  private eventBus?: IEventBus;
  
  // 调试元素
  private debugInfos: DebugInfo[] = [];
  private debugLines: DebugLine[] = [];
  private debugShapes: DebugShape[] = [];
  
  // 性能图表
  private performanceHistory: PerformanceMetrics[] = [];
  private maxHistorySize = 300;
  
  // UI元素
  private debugPanel?: HTMLElement;
  private isDebugPanelVisible = false;
  
  // 颜色
  private colors = {
    primary: '#00ff00',
    secondary: '#ffff00',
    warning: '#ff8800',
    error: '#ff0000',
    info: '#00ffff',
    background: 'rgba(0, 0, 0, 0.8)',
    text: '#ffffff'
  };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') || undefined;
    
    this.options = this.createDefaultOptions();
    
    this.createDebugPanel();
    this.setupEventListeners();
  }

  /**
   * 设置事件总线
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * 设置调试选项
   */
  setOptions(options: Partial<DebugRenderOptions>): void {
    this.options = { ...this.options, ...options };
    this.updateDebugPanel();
  }

  /**
   * 获取调试选项
   */
  getOptions(): DebugRenderOptions {
    return { ...this.options };
  }

  /**
   * 添加调试文本
   */
  addDebugInfo(
    position: { x: number; y: number },
    text: string,
    options: {
      color?: string;
      size?: number;
      persistent?: boolean;
      ttl?: number;
    } = {}
  ): void {
    const info: DebugInfo = {
      position,
      text,
      color: options.color || this.colors.info,
      size: options.size || 12,
      persistent: options.persistent || false,
      ttl: options.ttl || 1000
    };
    
    this.debugInfos.push(info);
    
    this.eventBus?.emit('debug-info-added', { info });
  }

  /**
   * 添加调试线段
   */
  addDebugLine(
    start: { x: number; y: number; z?: number },
    end: { x: number; y: number; z?: number },
    options: {
      color?: string;
      width?: number;
      persistent?: boolean;
      ttl?: number;
    } = {}
  ): void {
    const line: DebugLine = {
      start: { x: start.x, y: start.y, z: start.z || 0 },
      end: { x: end.x, y: end.y, z: end.z || 0 },
      color: options.color || this.colors.primary,
      width: options.width || 1,
      persistent: options.persistent || false,
      ttl: options.ttl || 1000
    };
    
    this.debugLines.push(line);
    
    this.eventBus?.emit('debug-line-added', { line });
  }

  /**
   * 添加调试形状
   */
  addDebugShape(
    type: DebugShape['type'],
    transform: DebugShape['transform'],
    options: {
      color?: string;
      wireframe?: boolean;
      persistent?: boolean;
      ttl?: number;
    } = {}
  ): void {
    const shape: DebugShape = {
      type,
      transform,
      color: options.color || this.colors.secondary,
      wireframe: options.wireframe !== false,
      persistent: options.persistent || false,
      ttl: options.ttl || 1000
    };
    
    this.debugShapes.push(shape);
    
    this.eventBus?.emit('debug-shape-added', { shape });
  }

  /**
   * 添加边界框
   */
  addBoundingBox(
    min: { x: number; y: number; z: number },
    max: { x: number; y: number; z: number },
    color: string = this.colors.warning
  ): void {
    const center = {
      x: (min.x + max.x) / 2,
      y: (min.y + max.y) / 2,
      z: (min.z + max.z) / 2
    };
    
    const size = {
      x: max.x - min.x,
      y: max.y - min.y,
      z: max.z - min.z
    };
    
    this.addDebugShape('box', {
      position: center,
      rotation: { x: 0, y: 0, z: 0 },
      scale: size
    }, { color, wireframe: true });
  }

  /**
   * 更新性能指标
   */
  updatePerformanceMetrics(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);
    
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory.shift();
    }
  }

  /**
   * 渲染调试信息
   */
  render(deltaTime: number): void {
    if (!this.canvas || !this.ctx) return;
    
    // 更新TTL
    this.updateTTL(deltaTime);
    
    // 保存画布状态
    this.ctx.save();
    
    try {
      // 渲染FPS计数器
      if (this.options.showFpsCounter) {
        this.renderFpsCounter();
      }
      
      // 渲染性能图表
      if (this.options.showPerformanceGraph) {
        this.renderPerformanceGraph();
      }
      
      // 渲染绘制调用信息
      if (this.options.showDrawCallInfo) {
        this.renderDrawCallInfo();
      }
      
      // 渲染内存使用信息
      if (this.options.showMemoryUsage) {
        this.renderMemoryUsage();
      }
      
      // 渲染调试文本
      this.renderDebugInfos();
      
      // 渲染调试线段
      this.renderDebugLines();
      
      // 渲染调试形状（2D投影）
      this.renderDebugShapes();
      
    } finally {
      // 恢复画布状态
      this.ctx.restore();
    }
  }

  /**
   * 清除所有调试元素
   */
  clear(): void {
    this.debugInfos = [];
    this.debugLines = [];
    this.debugShapes = [];
    
    this.eventBus?.emit('debug-cleared', {});
  }

  /**
   * 清除非持久化元素
   */
  clearNonPersistent(): void {
    this.debugInfos = this.debugInfos.filter(info => info.persistent);
    this.debugLines = this.debugLines.filter(line => line.persistent);
    this.debugShapes = this.debugShapes.filter(shape => shape.persistent);
  }

  /**
   * 切换调试面板可见性
   */
  toggleDebugPanel(): void {
    this.isDebugPanelVisible = !this.isDebugPanelVisible;
    
    if (this.debugPanel) {
      this.debugPanel.style.display = this.isDebugPanelVisible ? 'block' : 'none';
    }
  }

  /**
   * 创建默认选项
   */
  private createDefaultOptions(): DebugRenderOptions {
    return {
      showWireframe: false,
      showBoundingBoxes: false,
      showNormals: false,
      showTangents: false,
      showUVs: false,
      showSpatialGrid: false,
      showFrustum: false,
      showOctree: false,
      showQuadTree: false,
      showLights: false,
      showShadows: false,
      showLightVolumes: false,
      showTextureAtlas: false,
      showMipmapLevels: false,
      showTextureUsage: false,
      showFpsCounter: true,
      showPerformanceGraph: false,
      showDrawCallInfo: false,
      showMemoryUsage: false,
      showGpuTiming: false,
      showOverdraw: false,
      showDepthBuffer: false,
      showStencilBuffer: false,
      showRenderTargets: false,
      showMouseRay: false,
      showCollisionShapes: false,
      showPickingInfo: false,
      showBones: false,
      showAnimationCurves: false,
      showMotionPaths: false
    };
  }

  /**
   * 创建调试面板
   */
  private createDebugPanel(): void {
    this.debugPanel = document.createElement('div');
    this.debugPanel.id = 'debug-panel';
    this.debugPanel.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 250px;
      max-height: 80vh;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      border-radius: 5px;
      overflow-y: auto;
      z-index: 10000;
      display: none;
    `;
    
    document.body.appendChild(this.debugPanel);
    this.updateDebugPanel();
  }

  /**
   * 更新调试面板
   */
  private updateDebugPanel(): void {
    if (!this.debugPanel) return;
    
    const html = `
      <h3 style="margin: 0 0 10px 0; color: ${this.colors.primary};">Debug Options</h3>
      
      <div style="margin-bottom: 10px;">
        <strong>Geometry:</strong><br>
        <label><input type="checkbox" ${this.options.showWireframe ? 'checked' : ''}> Wireframe</label><br>
        <label><input type="checkbox" ${this.options.showBoundingBoxes ? 'checked' : ''}> Bounding Boxes</label><br>
        <label><input type="checkbox" ${this.options.showNormals ? 'checked' : ''}> Normals</label><br>
      </div>
      
      <div style="margin-bottom: 10px;">
        <strong>Performance:</strong><br>
        <label><input type="checkbox" ${this.options.showFpsCounter ? 'checked' : ''}> FPS Counter</label><br>
        <label><input type="checkbox" ${this.options.showPerformanceGraph ? 'checked' : ''}> Performance Graph</label><br>
        <label><input type="checkbox" ${this.options.showDrawCallInfo ? 'checked' : ''}> Draw Call Info</label><br>
        <label><input type="checkbox" ${this.options.showMemoryUsage ? 'checked' : ''}> Memory Usage</label><br>
      </div>
      
      <div style="margin-bottom: 10px;">
        <strong>Spatial:</strong><br>
        <label><input type="checkbox" ${this.options.showSpatialGrid ? 'checked' : ''}> Spatial Grid</label><br>
        <label><input type="checkbox" ${this.options.showFrustum ? 'checked' : ''}> View Frustum</label><br>
      </div>
      
      <div>
        <button style="width: 100%; margin: 5px 0; padding: 5px;">Clear Debug Info</button>
        <button style="width: 100%; margin: 5px 0; padding: 5px;">Export Debug Data</button>
      </div>
    `;
    
    this.debugPanel.innerHTML = html;
    
    // 添加事件监听器
    this.setupDebugPanelEvents();
  }

  /**
   * 设置调试面板事件
   */
  private setupDebugPanelEvents(): void {
    if (!this.debugPanel) return;
    
    const checkboxes = this.debugPanel.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox, index) => {
      checkbox.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const optionKeys = Object.keys(this.options);
        if (optionKeys[index]) {
          (this.options as any)[optionKeys[index]] = target.checked;
        }
      });
    });
    
    const buttons = this.debugPanel.querySelectorAll('button');
    if (buttons[0]) {
      buttons[0].addEventListener('click', () => this.clear());
    }
    if (buttons[1]) {
      buttons[1].addEventListener('click', () => this.exportDebugData());
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.key === 'F3' || (e.ctrlKey && e.key === 'd')) {
        e.preventDefault();
        this.toggleDebugPanel();
      }
    });
  }

  /**
   * 更新TTL
   */
  private updateTTL(deltaTime: number): void {
    const deltaMs = deltaTime * 1000;
    
    // 更新调试信息TTL
    this.debugInfos = this.debugInfos.filter(info => {
      if (info.persistent) return true;
      info.ttl -= deltaMs;
      return info.ttl > 0;
    });
    
    // 更新调试线段TTL
    this.debugLines = this.debugLines.filter(line => {
      if (line.persistent) return true;
      line.ttl -= deltaMs;
      return line.ttl > 0;
    });
    
    // 更新调试形状TTL
    this.debugShapes = this.debugShapes.filter(shape => {
      if (shape.persistent) return true;
      shape.ttl -= deltaMs;
      return shape.ttl > 0;
    });
  }

  /**
   * 渲染FPS计数器
   */
  private renderFpsCounter(): void {
    const metrics = this.performanceHistory[this.performanceHistory.length - 1];
    if (!metrics) return;
    
    const fps = metrics.fps.toFixed(1);
    const frameTime = metrics.frameTime.toFixed(2);
    
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(10, 10, 120, 60);
    
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '14px monospace';
    this.ctx.fillText(`FPS: ${fps}`, 15, 30);
    this.ctx.fillText(`Frame: ${frameTime}ms`, 15, 50);
    this.ctx.fillText(`GPU: ${metrics.gpuTime.toFixed(2)}ms`, 15, 70);
  }

  /**
   * 渲染性能图表
   */
  private renderPerformanceGraph(): void {
    if (this.performanceHistory.length < 2) return;
    
    const graphWidth = 200;
    const graphHeight = 100;
    const x = this.canvas.width - graphWidth - 10;
    const y = 80;
    
    // 背景
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(x, y, graphWidth, graphHeight);
    
    // 网格
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    this.ctx.lineWidth = 1;
    
    for (let i = 0; i <= 4; i++) {
      const gridY = y + (i / 4) * graphHeight;
      this.ctx.beginPath();
      this.ctx.moveTo(x, gridY);
      this.ctx.lineTo(x + graphWidth, gridY);
      this.ctx.stroke();
    }
    
    // FPS图表
    this.ctx.strokeStyle = this.colors.primary;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    
    const maxFps = 120;
    const stepX = graphWidth / (this.performanceHistory.length - 1);
    
    this.performanceHistory.forEach((metrics, index) => {
      const graphX = x + index * stepX;
      const graphY = y + graphHeight - (metrics.fps / maxFps) * graphHeight;
      
      if (index === 0) {
        this.ctx.moveTo(graphX, graphY);
      } else {
        this.ctx.lineTo(graphX, graphY);
      }
    });
    
    this.ctx.stroke();
    
    // 标签
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '10px monospace';
    this.ctx.fillText('FPS', x + 5, y + 15);
  }

  /**
   * 渲染绘制调用信息
   */
  private renderDrawCallInfo(): void {
    const metrics = this.performanceHistory[this.performanceHistory.length - 1];
    if (!metrics) return;
    
    const info = [
      `Draw Calls: ${metrics.drawCalls}`,
      `Triangles: ${metrics.triangles.toLocaleString()}`,
      `Vertices: ${metrics.vertices.toLocaleString()}`,
      `Batches: ${metrics.batchCount}`,
      `Instances: ${metrics.instanceCount}`
    ];
    
    const x = 10;
    const y = 80;
    const width = 200;
    const height = info.length * 20 + 10;
    
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(x, y, width, height);
    
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '12px monospace';
    
    info.forEach((text, index) => {
      this.ctx.fillText(text, x + 5, y + 20 + index * 20);
    });
  }

  /**
   * 渲染内存使用信息
   */
  private renderMemoryUsage(): void {
    const metrics = this.performanceHistory[this.performanceHistory.length - 1];
    if (!metrics) return;
    
    const toMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);
    
    const info = [
      `Memory: ${toMB(metrics.memoryUsage.used)}MB`,
      `Buffers: ${toMB(metrics.memoryUsage.buffers)}MB`,
      `Textures: ${toMB(metrics.memoryUsage.textures)}MB`,
      `Shaders: ${metrics.memoryUsage.shaders}`
    ];
    
    const x = 10;
    const y = 200;
    const width = 180;
    const height = info.length * 20 + 10;
    
    this.ctx.fillStyle = this.colors.background;
    this.ctx.fillRect(x, y, width, height);
    
    this.ctx.fillStyle = this.colors.text;
    this.ctx.font = '12px monospace';
    
    info.forEach((text, index) => {
      this.ctx.fillText(text, x + 5, y + 20 + index * 20);
    });
  }

  /**
   * 渲染调试文本
   */
  private renderDebugInfos(): void {
    this.ctx.font = '12px monospace';
    
    for (const info of this.debugInfos) {
      this.ctx.fillStyle = info.color;
      this.ctx.font = `${info.size}px monospace`;
      this.ctx.fillText(info.text, info.position.x, info.position.y);
    }
  }

  /**
   * 渲染调试线段
   */
  private renderDebugLines(): void {
    for (const line of this.debugLines) {
      this.ctx.strokeStyle = line.color;
      this.ctx.lineWidth = line.width;
      
      this.ctx.beginPath();
      this.ctx.moveTo(line.start.x, line.start.y);
      this.ctx.lineTo(line.end.x, line.end.y);
      this.ctx.stroke();
    }
  }

  /**
   * 渲染调试形状（2D投影）
   */
  private renderDebugShapes(): void {
    for (const shape of this.debugShapes) {
      this.ctx.strokeStyle = shape.color;
      this.ctx.lineWidth = shape.wireframe ? 1 : 2;
      
      const pos = shape.transform.position;
      const scale = shape.transform.scale;
      
      switch (shape.type) {
        case 'box':
          this.ctx.strokeRect(
            pos.x - scale.x / 2,
            pos.y - scale.y / 2,
            scale.x,
            scale.y
          );
          break;
          
        case 'sphere':
          this.ctx.beginPath();
          this.ctx.arc(pos.x, pos.y, scale.x / 2, 0, Math.PI * 2);
          this.ctx.stroke();
          break;
      }
    }
  }

  /**
   * 导出调试数据
   */
  private exportDebugData(): void {
    const data = {
      timestamp: Date.now(),
      options: this.options,
      performanceHistory: this.performanceHistory,
      debugInfos: this.debugInfos,
      debugLines: this.debugLines,
      debugShapes: this.debugShapes
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { 
      type: 'application/json' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-data-${Date.now()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * 销毁调试渲染器
   */
  dispose(): void {
    this.clear();
    
    if (this.debugPanel) {
      document.body.removeChild(this.debugPanel);
      this.debugPanel = undefined;
    }
    
    this.performanceHistory = [];
  }
}