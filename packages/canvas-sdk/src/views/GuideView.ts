/**
 * 辅助线视图
 * 负责渲染辅助线、对齐线等
 */

import { IViewportState } from '../viewmodels/types/IViewModel';

export interface IGuide {
  id: string;
  type: 'horizontal' | 'vertical';
  position: number; // 世界坐标
  color?: string;
  style?: 'solid' | 'dashed';
  temporary?: boolean; // 临时辅助线（如对齐时显示）
}

export interface IGuideViewConfig {
  guideColor?: string;
  temporaryGuideColor?: string;
  lineWidth?: number;
  dashPattern?: number[];
  snapDistance?: number; // 吸附距离
}

export class GuideView {
  private config: IGuideViewConfig = {};
  private guides: Map<string, IGuide> = new Map();

  constructor(config: IGuideViewConfig = {}) {
    this.config = {
      guideColor: '#FF4081',
      temporaryGuideColor: '#00E676',
      lineWidth: 1,
      dashPattern: [5, 5],
      snapDistance: 5,
      ...config
    };
  }

  /**
   * 渲染所有辅助线
   */
  render(ctx: CanvasRenderingContext2D, viewport: IViewportState): void {
    if (this.guides.size === 0) return;

    ctx.save();
    
    // 应用视口变换
    ctx.translate(viewport.x, viewport.y);
    ctx.scale(viewport.zoom, viewport.zoom);

    // 渲染永久辅助线
    this.renderPermanentGuides(ctx, viewport);
    
    // 渲染临时辅助线
    this.renderTemporaryGuides(ctx, viewport);

    ctx.restore();
  }

  /**
   * 渲染永久辅助线
   */
  private renderPermanentGuides(ctx: CanvasRenderingContext2D, viewport: IViewportState): void {
    const permanentGuides = Array.from(this.guides.values()).filter(guide => !guide.temporary);
    
    ctx.strokeStyle = this.config.guideColor!;
    ctx.lineWidth = this.config.lineWidth! / viewport.zoom;
    ctx.setLineDash(this.config.dashPattern!);

    for (const guide of permanentGuides) {
      this.drawGuide(ctx, guide, viewport);
    }
  }

  /**
   * 渲染临时辅助线（对齐时显示）
   */
  private renderTemporaryGuides(ctx: CanvasRenderingContext2D, viewport: IViewportState): void {
    const temporaryGuides = Array.from(this.guides.values()).filter(guide => guide.temporary);
    
    ctx.strokeStyle = this.config.temporaryGuideColor!;
    ctx.lineWidth = this.config.lineWidth! / viewport.zoom;
    ctx.setLineDash([3, 3]);

    for (const guide of temporaryGuides) {
      this.drawGuide(ctx, guide, viewport);
    }
  }

  /**
   * 绘制单条辅助线
   */
  private drawGuide(ctx: CanvasRenderingContext2D, guide: IGuide, viewport: IViewportState): void {
    const { type, position, color } = guide;
    
    if (color) {
      ctx.strokeStyle = color;
    }

    ctx.beginPath();
    
    if (type === 'horizontal') {
      // 水平辅助线
      const screenX1 = -viewport.x / viewport.zoom;
      const screenX2 = (ctx.canvas.width - viewport.x) / viewport.zoom;
      ctx.moveTo(screenX1, position);
      ctx.lineTo(screenX2, position);
    } else {
      // 垂直辅助线
      const screenY1 = -viewport.y / viewport.zoom;
      const screenY2 = (ctx.canvas.height - viewport.y) / viewport.zoom;
      ctx.moveTo(position, screenY1);
      ctx.lineTo(position, screenY2);
    }
    
    ctx.stroke();
  }

  /**
   * 添加辅助线
   */
  addGuide(guide: IGuide): void {
    this.guides.set(guide.id, guide);
  }

  /**
   * 移除辅助线
   */
  removeGuide(id: string): boolean {
    return this.guides.delete(id);
  }

  /**
   * 清空所有辅助线
   */
  clearGuides(): void {
    this.guides.clear();
  }

  /**
   * 清空临时辅助线
   */
  clearTemporaryGuides(): void {
    const permanentGuides = Array.from(this.guides.entries())
      .filter(([_, guide]) => !guide.temporary);
    
    this.guides.clear();
    permanentGuides.forEach(([id, guide]) => {
      this.guides.set(id, guide);
    });
  }

  /**
   * 获取指定位置的辅助线
   */
  getGuide(id: string): IGuide | undefined {
    return this.guides.get(id);
  }

  /**
   * 获取所有辅助线
   */
  getAllGuides(): IGuide[] {
    return Array.from(this.guides.values());
  }

  /**
   * 获取指定类型的辅助线
   */
  getGuidesByType(type: 'horizontal' | 'vertical'): IGuide[] {
    return Array.from(this.guides.values()).filter(guide => guide.type === type);
  }

  /**
   * 检查点是否接近辅助线（用于吸附）
   */
  checkSnap(point: { x: number; y: number }, viewport: IViewportState): { 
    snapped: boolean; 
    snapPoint: { x: number; y: number }; 
    guides: IGuide[] 
  } {
    const snapDistance = this.config.snapDistance! / viewport.zoom;
    const snappedGuides: IGuide[] = [];
    let snapPoint = { ...point };
    let snapped = false;

    // 检查垂直辅助线（影响 X 坐标）
    const verticalGuides = this.getGuidesByType('vertical');
    for (const guide of verticalGuides) {
      if (Math.abs(point.x - guide.position) <= snapDistance) {
        snapPoint.x = guide.position;
        snappedGuides.push(guide);
        snapped = true;
        break; // 只吸附到最近的一条线
      }
    }

    // 检查水平辅助线（影响 Y 坐标）
    const horizontalGuides = this.getGuidesByType('horizontal');
    for (const guide of horizontalGuides) {
      if (Math.abs(point.y - guide.position) <= snapDistance) {
        snapPoint.y = guide.position;
        snappedGuides.push(guide);
        snapped = true;
        break; // 只吸附到最近的一条线
      }
    }

    return {
      snapped,
      snapPoint,
      guides: snappedGuides
    };
  }

  /**
   * 添加临时对齐辅助线
   */
  showAlignmentGuides(alignments: { horizontal?: number[]; vertical?: number[] }): void {
    // 清除之前的临时辅助线
    this.clearTemporaryGuides();

    // 添加水平对齐线
    if (alignments.horizontal) {
      alignments.horizontal.forEach((y, index) => {
        this.addGuide({
          id: `temp_h_${index}`,
          type: 'horizontal',
          position: y,
          temporary: true
        });
      });
    }

    // 添加垂直对齐线
    if (alignments.vertical) {
      alignments.vertical.forEach((x, index) => {
        this.addGuide({
          id: `temp_v_${index}`,
          type: 'vertical',
          position: x,
          temporary: true
        });
      });
    }
  }

  /**
   * 从鼠标位置创建辅助线
   */
  createGuideFromMouse(mousePos: { x: number; y: number }, type: 'horizontal' | 'vertical', viewport: IViewportState): IGuide {
    const worldPos = {
      x: (mousePos.x - viewport.x) / viewport.zoom,
      y: (mousePos.y - viewport.y) / viewport.zoom
    };

    const guide: IGuide = {
      id: `guide_${Date.now()}`,
      type,
      position: type === 'horizontal' ? worldPos.y : worldPos.x,
      color: this.config.guideColor
    };

    this.addGuide(guide);
    return guide;
  }

  /**
   * 命中测试辅助线
   */
  hitTest(point: { x: number; y: number }, viewport: IViewportState): IGuide | null {
    const worldPoint = {
      x: (point.x - viewport.x) / viewport.zoom,
      y: (point.y - viewport.y) / viewport.zoom
    };

    const tolerance = 3 / viewport.zoom; // 3像素容差

    for (const guide of this.guides.values()) {
      if (guide.temporary) continue; // 忽略临时辅助线

      if (guide.type === 'horizontal') {
        if (Math.abs(worldPoint.y - guide.position) <= tolerance) {
          return guide;
        }
      } else {
        if (Math.abs(worldPoint.x - guide.position) <= tolerance) {
          return guide;
        }
      }
    }

    return null;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<IGuideViewConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取配置
   */
  getConfig(): IGuideViewConfig {
    return { ...this.config };
  }

  /**
   * 销毁视图
   */
  dispose(): void {
    this.guides.clear();
  }
}