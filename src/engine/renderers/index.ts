import { CanvasRenderer } from './CanvasRenderer';

export { CanvasRenderer };

// 导出渲染器工厂
export class RendererFactory {
  static createCanvasRenderer(): CanvasRenderer {
    return new CanvasRenderer();
  }
  
  static getSupportedRenderers(): string[] {
    return ['canvas2d'];
  }
  
  static isRendererSupported(type: string): boolean {
    return this.getSupportedRenderers().includes(type);
  }
}
