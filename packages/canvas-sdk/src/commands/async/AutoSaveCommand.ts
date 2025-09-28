/**
* 自动保存异步命令
 * 定期保存Canvas状态到本地存储或服务器
 */

import { AsyncCommand } from '../base';
import { ICanvasModel } from '../../models/CanvasModel';
import { GraphicData } from '../../actions/types';
import { Shape } from '@sky-canvas/render-engine';

/**
 * 自动保存参数
 */
export interface AutoSaveParams {
  target: 'localStorage' | 'sessionStorage' | 'server';
  key?: string; // 本地存储键名
  url?: string; // 服务器URL
  interval?: number; // 自动保存间隔（毫秒）
  enableCompression?: boolean; // 是否启用数据压缩
}

/**
 * 保存数据结构
 */
interface SaveData {
  version: string;
  timestamp: number;
  shapes: GraphicData[];
  selection: string[];
  metadata?: Record<string, any>;
}

/**
 * 自动保存命令
 */
export class AutoSaveCommand extends AsyncCommand {
  private params: AutoSaveParams;
  private saveData?: SaveData;
  private intervalId?: NodeJS.Timeout;

  constructor(model: ICanvasModel, params: AutoSaveParams) {
    super(model, 'Auto-save canvas data');
    this.params = params;
  }

  async execute(): Promise<void> {
    this.resetProgress();
    this.updateProgress(0, 3);

    try {
      // 第1步：收集数据
      this.updateProgress(1);
      this.saveData = this.collectCanvasData();
      this.checkAborted();

      // 第2步：保存数据
      this.updateProgress(2);
      await this.saveData_();
      this.checkAborted();

      // 第3步：设置定时保存（如果有间隔设置）
      this.updateProgress(3);
      if (this.params.interval) {
        this.setupAutoSave();
      }

      this.markAsExecuted();
    } catch (error) {
      if (error instanceof Error && error.message === 'Command was aborted') {
        throw error;
      }
      throw new Error(`Auto-save failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async undo(): Promise<void> {
    // 停止自动保存
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // 清除保存的数据
    if (this.params.target === 'localStorage' || this.params.target === 'sessionStorage') {
      const storage = this.params.target === 'localStorage' ? localStorage : sessionStorage;
      const key = this.params.key || 'sky-canvas-autosave';
      storage.removeItem(key);
    }

    this.markAsNotExecuted();
  }

  /**
   * 收集Canvas数据
   */
  private collectCanvasData(): SaveData {
    const shapes = this.model.getShapes();
    const selection = this.model.getSelection();

    return {
      version: '1.0',
      timestamp: Date.now(),
      shapes: shapes.map(shape => this.shapeToGraphicData(shape)),
      selection,
      metadata: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        shapeCount: shapes.length,
        selectedCount: selection.length
      }
    };
  }

  /**
   * 保存数据
   */
  private async saveData_(): Promise<void> {
    if (!this.saveData) return;

    let dataToSave = JSON.stringify(this.saveData);

    // 压缩数据（简化版）
    if (this.params.enableCompression) {
      dataToSave = this.compressData(dataToSave);
    }

    switch (this.params.target) {
      case 'localStorage':
        this.saveToLocalStorage(dataToSave);
        break;
      case 'sessionStorage':
        this.saveToSessionStorage(dataToSave);
        break;
      case 'server':
        await this.saveToServer(dataToSave);
        break;
      default:
        throw new Error(`Unsupported save target: ${this.params.target}`);
    }
  }

  /**
   * 保存到LocalStorage
   */
  private saveToLocalStorage(data: string): void {
    try {
      const key = this.params.key || 'sky-canvas-autosave';
      localStorage.setItem(key, data);

      // 同时保存时间戳
      localStorage.setItem(`${key}-timestamp`, Date.now().toString());
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('LocalStorage quota exceeded. Consider enabling compression or clearing old data.');
      }
      throw error;
    }
  }

  /**
   * 保存到SessionStorage
   */
  private saveToSessionStorage(data: string): void {
    try {
      const key = this.params.key || 'sky-canvas-autosave';
      sessionStorage.setItem(key, data);
      sessionStorage.setItem(`${key}-timestamp`, Date.now().toString());
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('SessionStorage quota exceeded. Consider enabling compression.');
      }
      throw error;
    }
  }

  /**
   * 保存到服务器
   */
  private async saveToServer(data: string): Promise<void> {
    if (!this.params.url) {
      throw new Error('Server URL not provided');
    }

    const response = await fetch(this.params.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Auto-Save': 'true'
      },
      body: data
    });

    if (!response.ok) {
      throw new Error(`Server save failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * 设置自动保存定时器
   */
  private setupAutoSave(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(async () => {
      try {
        // 收集最新数据
        this.saveData = this.collectCanvasData();
        await this.saveData_();

        console.log(`Auto-saved at ${new Date().toLocaleTimeString()}`);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.params.interval);
  }

  /**
   * 将Shape转换为GraphicData
   */
  private shapeToGraphicData(shape: Shape): GraphicData {
    const shapeAny = shape as any;
    return {
      id: shape.id,
      type: shape.type as any,
      x: shape.x,
      y: shape.y,
      width: shapeAny.width,
      height: shapeAny.height,
      radius: shapeAny.radius,
      text: shapeAny.text,
      style: shapeAny.style,
      visible: shape.visible,
      locked: shapeAny.locked,
      zIndex: shape.zIndex
    };
  }

  /**
   * 压缩数据（简化版LZ压缩）
   */
  private compressData(data: string): string {
    // 这是一个简化的压缩算法
    // 实际项目中可以使用更高效的压缩库如pako
    const dict: Record<string, string> = {};
    let dictIndex = 0;

    // 查找常见模式并替换
    const commonPatterns = [
      'shape',
      'rectangle',
      'circle',
      'text',
      'style',
      'fill',
      'stroke',
      'width',
      'height',
      'visible',
      'zIndex'
    ];

    let compressed = data;
    for (const pattern of commonPatterns) {
      const key = `\u0001${dictIndex++}`;
      dict[key] = pattern;
      compressed = compressed.replace(new RegExp(`"${pattern}"`, 'g'), `"${key}"`);
    }

    // 在开头添加字典信息
    return JSON.stringify({ dict, data: compressed });
  }

  /**
   * 获取保存的数据大小（字节）
   */
  getDataSize(): number {
    return this.saveData ? JSON.stringify(this.saveData).length : 0;
  }

  /**
   * 获取保存统计信息
   */
  getSaveStats(): {
    target: string;
    timestamp: number;
    dataSize: number;
    shapeCount: number;
    compressionEnabled: boolean;
  } {
    return {
      target: this.params.target,
      timestamp: this.saveData?.timestamp || 0,
      dataSize: this.getDataSize(),
      shapeCount: this.saveData?.shapes.length || 0,
      compressionEnabled: this.params.enableCompression || false
    };
  }

  /**
   * 静态方法：从保存数据恢复Canvas状态
   */
  static async restoreFromSave(
    model: ICanvasModel,
    target: 'localStorage' | 'sessionStorage',
    key: string = 'sky-canvas-autosave'
  ): Promise<boolean> {
    try {
      const storage = target === 'localStorage' ? localStorage : sessionStorage;
      const savedData = storage.getItem(key);

      if (!savedData) {
        return false;
      }

      let saveData: SaveData;

      try {
        // 尝试解析为压缩数据
        const parsed = JSON.parse(savedData);
        if (parsed.dict && parsed.data) {
          // 解压缩数据
          saveData = AutoSaveCommand.decompressData(parsed);
        } else {
          saveData = parsed;
        }
      } catch {
        // 如果解析失败，可能是旧格式的数据
        saveData = JSON.parse(savedData);
      }

      // 清空现有形状
      const currentShapes = model.getShapes();
      for (const shape of currentShapes) {
        model.removeShape(shape.id!);
      }

      // 恢复形状
      for (const shapeData of saveData.shapes) {
        const shape = AutoSaveCommand.createShapeFromData(shapeData);
        model.addShape(shape);
      }

      // 恢复选择
      // 这里需要根据具体实现来恢复选择状态

      return true;
    } catch (error) {
      console.error('Failed to restore from save:', error);
      return false;
    }
  }

  /**
   * 解压缩数据
   */
  private static decompressData(compressed: { dict: Record<string, string>; data: string }): SaveData {
    let decompressed = compressed.data;

    // 还原字典替换
    for (const [key, value] of Object.entries(compressed.dict)) {
      decompressed = decompressed.replace(new RegExp(`"${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'), `"${value}"`);
    }

    return JSON.parse(decompressed);
  }

  /**
   * 从GraphicData创建Shape对象
   */
  private static createShapeFromData(data: GraphicData): any {
    return {
      id: data.id || `shape-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      type: data.type,
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
      radius: data.radius,
      text: data.text,
      style: data.style,
      zIndex: data.zIndex || 0,
      visible: data.visible !== false,
      locked: data.locked || false
    };
  }
}