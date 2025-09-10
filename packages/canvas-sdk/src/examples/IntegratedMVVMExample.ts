/**
 * 集成MVVM模式的使用示例
 * 展示如何在现有CanvasSDK中使用MVVM扩展
 */

import { createMVVMCanvasSDK, CanvasSDK } from '../index';
import { ShapeEntityFactory } from '../models/entities/Shape';

/**
 * 集成MVVM模式使用示例
 */
export class IntegratedMVVMExample {
  private sdk: CanvasSDK | null = null;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  async initialize(): Promise<void> {
    // 创建启用MVVM模式的SDK
    this.sdk = await createMVVMCanvasSDK(this.canvas, {
      renderEngine: 'canvas2d',
      enableInteraction: true,
      enableAnimation: true
    }, {
      // MVVM配置
      enableMVVM: true,
      initialViewport: {
        width: this.canvas.width,
        height: this.canvas.height
      }
    });

    // 设置事件监听
    this.setupEventListeners();

    // 添加示例形状
    await this.addExampleShapes();

    console.log('集成MVVM模式的Canvas SDK已初始化！');
  }

  private setupEventListeners(): void {
    if (!this.sdk?.mvvm) return;

    // 监听状态变化
    this.sdk.mvvm.onStateChanged((state, changes) => {
      console.log('Canvas状态变化:', changes);
    });

    // 监听选择变化
    this.sdk.mvvm.onSelectionChanged((selectedIds) => {
      console.log('选择变化:', selectedIds);
    });

    // 监听视口变化
    this.sdk.mvvm.onViewportChanged((viewport) => {
      console.log('视口变化:', viewport);
    });
  }

  private async addExampleShapes(): Promise<void> {
    if (!this.sdk?.mvvm) return;

    // 使用MVVM模式的API创建形状
    const rectangle = this.sdk.mvvm.createRectangle(100, 100, 120, 80);
    rectangle.style = {
      fillColor: '#ff6b6b',
      strokeColor: '#d63447',
      strokeWidth: 2
    };

    const circle = this.sdk.mvvm.createCircle(300, 100, 50);
    circle.style = {
      fillColor: '#4ecdc4',
      strokeColor: '#26d0ce',
      strokeWidth: 2
    };

    const text = this.sdk.mvvm.createText(150, 250, '集成MVVM模式');
    text.style = {
      fillColor: '#45b7d1',
      strokeColor: '#2980b9',
      strokeWidth: 1
    };
    if (text.type === 'text') {
      text.fontSize = 24;
      text.fontFamily = 'Arial';
    }

    // 添加形状到画布
    await this.sdk.mvvm.addShapes([rectangle, circle, text]);

    // 选择矩形
    this.sdk.mvvm.selectShape(rectangle.id);
  }

  // 公共API
  async addRandomRectangle(): Promise<void> {
    if (!this.sdk?.mvvm) return;

    const rect = this.sdk.mvvm.createRectangle(
      Math.random() * 400,
      Math.random() * 300,
      50 + Math.random() * 100,
      30 + Math.random() * 60
    );

    rect.style.fillColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
    rect.style.strokeColor = '#333';
    rect.style.strokeWidth = 2;

    await this.sdk.mvvm.addShape(rect);
  }

  async addRandomCircle(): Promise<void> {
    if (!this.sdk?.mvvm) return;

    const circle = this.sdk.mvvm.createCircle(
      Math.random() * 400,
      Math.random() * 300,
      20 + Math.random() * 40
    );

    circle.style.fillColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
    circle.style.strokeColor = '#333';
    circle.style.strokeWidth = 2;

    await this.sdk.mvvm.addShape(circle);
  }

  selectAll(): void {
    this.sdk?.mvvm?.selectAll();
  }

  clearSelection(): void {
    this.sdk?.mvvm?.clearSelection();
  }

  async clearAll(): Promise<void> {
    await this.sdk?.mvvm?.clearShapes();
  }

  zoomIn(): void {
    this.sdk?.mvvm?.zoomIn();
  }

  zoomOut(): void {
    this.sdk?.mvvm?.zoomOut();
  }

  resetZoom(): void {
    this.sdk?.mvvm?.resetZoom();
  }

  async getStats(): Promise<any> {
    if (!this.sdk?.mvvm) return null;
    return await this.sdk.mvvm.getStats();
  }

  getCurrentState(): any {
    return this.sdk?.mvvm?.getState();
  }

  // 传统SDK功能仍然可用
  useLegacyAPI(): void {
    if (!this.sdk) return;

    // 可以同时使用传统API和MVVM API
    console.log('SDK已创建，可以使用传统API和MVVM API');
    
    // 传统的事件监听
    // this.sdk.on('shape:added', (data) => {
    //   console.log('形状已添加（传统事件）:', data);
    // });
  }

  dispose(): void {
    if (this.sdk) {
      this.sdk.dispose();
      this.sdk = null;
    }
  }
}

/**
 * 快速创建示例的工具函数
 */
export function createIntegratedMVVMExample(canvasId: string): IntegratedMVVMExample {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
  if (!canvas) {
    throw new Error(`Canvas element with id "${canvasId}" not found`);
  }
  return new IntegratedMVVMExample(canvas);
}

/**
 * 全局使用示例
 */
export async function runIntegratedMVVMExample(): Promise<void> {
  try {
    const example = createIntegratedMVVMExample('canvas');
    await example.initialize();

    // 设置键盘快捷键
    document.addEventListener('keydown', async (e) => {
      switch (e.key.toLowerCase()) {
        case 'r':
          await example.addRandomRectangle();
          break;
        case 'c':
          await example.addRandomCircle();
          break;
        case 'a':
          example.selectAll();
          break;
        case 'escape':
          example.clearSelection();
          break;
        case 'delete':
        case 'backspace':
          await example.clearAll();
          break;
        case '=':
        case '+':
          example.zoomIn();
          break;
        case '-':
        case '_':
          example.zoomOut();
          break;
        case '0':
          example.resetZoom();
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const stats = await example.getStats();
            console.log('当前统计:', stats);
            console.log('当前状态:', example.getCurrentState());
          }
          break;
        case 'l':
          example.useLegacyAPI();
          break;
      }
    });

    console.log('集成MVVM模式示例启动完成！');
    console.log('快捷键说明：');
    console.log('- R: 添加随机矩形');
    console.log('- C: 添加随机圆形');
    console.log('- A: 全选');
    console.log('- Escape: 取消选择');
    console.log('- Delete/Backspace: 清空所有');
    console.log('- +/-: 缩放');
    console.log('- 0: 重置缩放');
    console.log('- Ctrl+S: 查看统计信息');
    console.log('- L: 使用传统API');

  } catch (error) {
    console.error('集成MVVM示例启动失败:', error);
  }
}

// 浏览器环境下的自动启动
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    if (canvas) {
      runIntegratedMVVMExample();
    }
  });
}