/**
 * 交互工具实现
 */
import { IPoint } from '@sky-canvas/render-engine';
import { IInteractionTool, InteractionMode, IMouseEvent, IGestureEvent, SelectionMode } from './types';
import { PathShape, RectangleShape, CircleShape, DiamondShape } from '../scene';

/**
 * 基础交互工具抽象类
 */
export abstract class BaseInteractionTool implements IInteractionTool {
  abstract readonly name: string;
  abstract readonly mode: InteractionMode;
  abstract readonly cursor: string;
  public enabled = true;

  abstract onActivate(): void;
  abstract onDeactivate(): void;
  
  onMouseDown(event: IMouseEvent): boolean { return false; }
  onMouseMove(event: IMouseEvent): boolean { return false; }
  onMouseUp(event: IMouseEvent): boolean { return false; }
  onGesture(event: IGestureEvent): boolean { return false; }
  onKeyDown(key: string): boolean { return false; }
  onKeyUp(key: string): boolean { return false; }
}

/**
 * 选择工具
 */
export class SelectTool extends BaseInteractionTool {
  readonly name = 'select';
  readonly mode = InteractionMode.SELECT;
  readonly cursor = 'default';

  private isDragging = false;
  private dragStart: IPoint | null = null;
  private selectionRect: { x: number; y: number; width: number; height: number } | null = null;

  constructor(
    private manager: any, // 实际类型应该是IInteractionManager
    private onSetCursor: (cursor: string) => void
  ) {
    super();
  }

  onActivate(): void {
    this.onSetCursor(this.cursor);
  }

  onDeactivate(): void {
    this.isDragging = false;
    this.dragStart = null;
    this.selectionRect = null;
  }

  onMouseDown(event: IMouseEvent): boolean {
    const hitItem = this.manager.hitTest(event.worldPosition);

    if (hitItem) {
      // 选择项目
      const mode = event.ctrlKey ? SelectionMode.TOGGLE : 
                   event.shiftKey ? SelectionMode.ADDITIVE : 
                   SelectionMode.SINGLE;
      this.manager.select(hitItem, mode);
    } else {
      // 开始框选
      this.isDragging = true;
      this.dragStart = event.worldPosition;
      
      if (!event.shiftKey && !event.ctrlKey) {
        this.manager.clearSelection();
      }
    }

    return true;
  }

  onMouseMove(event: IMouseEvent): boolean {
    if (this.isDragging && this.dragStart) {
      const worldPos = event.worldPosition;
      
      // 更新选择框
      this.selectionRect = {
        x: Math.min(this.dragStart.x, worldPos.x),
        y: Math.min(this.dragStart.y, worldPos.y),
        width: Math.abs(worldPos.x - this.dragStart.x),
        height: Math.abs(worldPos.y - this.dragStart.y)
      };

      return true;
    }

    return false;
  }

  onMouseUp(event: IMouseEvent): boolean {
    if (this.isDragging && this.selectionRect) {
      // 框选
      const mode = event.shiftKey ? SelectionMode.ADDITIVE : SelectionMode.MULTIPLE;
      this.manager.selectInBounds(this.selectionRect, mode);
      
      this.isDragging = false;
      this.dragStart = null;
      this.selectionRect = null;
      return true;
    }

    return false;
  }

  onKeyDown(key: string): boolean {
    if (key === 'Delete' || key === 'Backspace') {
      // 删除选中的项目
      const selected = this.manager.getSelectedItems();
      for (const item of selected) {
        // 这里应该有删除逻辑
        if (item.remove) {
          item.remove();
        }
      }
      this.manager.clearSelection();
      return true;
    }

    return false;
  }

  getSelectionRect() {
    return this.selectionRect;
  }
}

/**
 * 平移工具
 */
export class PanTool extends BaseInteractionTool {
  readonly name = 'pan';
  readonly mode = InteractionMode.PAN;
  readonly cursor = 'grab';

  private isPanning = false;
  private lastPosition: IPoint | null = null;

  constructor(
    private manager: any,
    private onSetCursor: (cursor: string) => void,
    private onPanViewport: (delta: IPoint) => void
  ) {
    super();
  }

  onActivate(): void {
    this.onSetCursor(this.cursor);
  }

  onDeactivate(): void {
    this.isPanning = false;
    this.lastPosition = null;
  }

  onMouseDown(event: IMouseEvent): boolean {
    this.isPanning = true;
    this.lastPosition = event.screenPosition;
    this.onSetCursor('grabbing');
    return true;
  }

  onMouseMove(event: IMouseEvent): boolean {
    if (this.isPanning && this.lastPosition) {
      const delta = {
        x: event.screenPosition.x - this.lastPosition.x,
        y: event.screenPosition.y - this.lastPosition.y
      };

      this.onPanViewport(delta);
      this.lastPosition = event.screenPosition;
      return true;
    }

    return false;
  }

  onMouseUp(event: IMouseEvent): boolean {
    if (this.isPanning) {
      this.isPanning = false;
      this.lastPosition = null;
      this.onSetCursor(this.cursor);
      return true;
    }

    return false;
  }

  onGesture(event: IGestureEvent): boolean {
    if (event.type === 'gesturechange') {
      // 处理触摸平移
      this.onPanViewport(event.deltaTranslation);
      return true;
    }

    return false;
  }
}

/**
 * 缩放工具
 */
export class ZoomTool extends BaseInteractionTool {
  readonly name = 'zoom';
  readonly mode = InteractionMode.ZOOM;
  readonly cursor = 'zoom-in';

  constructor(
    private manager: any,
    private onSetCursor: (cursor: string) => void,
    private onZoomViewport: (factor: number, center?: IPoint) => void
  ) {
    super();
  }

  onActivate(): void {
    this.onSetCursor(this.cursor);
  }

  onDeactivate(): void {
    // 无需清理
  }

  onMouseDown(event: IMouseEvent): boolean {
    const worldPos = event.worldPosition;
    const zoomFactor = event.button === 0 ? 1.2 : 0.8; // 左键放大，右键缩小
    
    this.onZoomViewport(zoomFactor, worldPos);
    return true;
  }

  onGesture(event: IGestureEvent): boolean {
    if (event.type === 'gesturechange' && event.deltaScale !== 0) {
      const zoomFactor = 1 + event.deltaScale * 0.01;
      this.onZoomViewport(zoomFactor, event.center);
      return true;
    }

    return false;
  }
}

/**
 * 绘制工具
 */
export class DrawTool extends BaseInteractionTool {
  readonly name = 'draw';
  readonly mode = InteractionMode.DRAW;
  readonly cursor = 'crosshair';

  private isDrawing = false;
  private currentPath: IPoint[] = [];
  private currentPathShape: PathShape | null = null;
  private hasAddedToScene = false;

  constructor(
    private manager: any,
    private onSetCursor: (cursor: string) => void,
    private onAddShape: (shape: any) => void
  ) {
    super();
  }

  onActivate(): void {
    this.onSetCursor(this.cursor);
  }

  onDeactivate(): void {
    this.finishCurrentStroke();
  }

  onMouseDown(event: IMouseEvent): boolean {
    if (event.button === 0) { // 只响应左键
      this.isDrawing = true;
      this.currentPath = [event.worldPosition];
      
      // 创建新的PathShape对象
      const shapeId = `stroke_${Date.now()}_${Math.random()}`;
      this.currentPathShape = new PathShape(
        shapeId,
        this.currentPath,
        '#000000', // 黑色描边
        2,         // 2px线宽
        false      // 不填充
      );
      
      return true;
    }
    return false;
  }

  onMouseMove(event: IMouseEvent): boolean {
    if (this.isDrawing && this.currentPath.length > 0 && this.currentPathShape) {
      // 添加新点到路径
      this.currentPath.push(event.worldPosition);
      
      // 更新PathShape的路径点
      this.currentPathShape.updatePoints(this.currentPath);
      
      // 不在这里重复添加，只在完成时添加一次
      
      return true;
    }
    return false;
  }

  onMouseUp(event: IMouseEvent): boolean {
    if (this.isDrawing) {
      this.finishCurrentStroke();
      return true;
    }
    return false;
  }

  private finishCurrentStroke(): void {
    if (this.isDrawing && this.currentPathShape && this.currentPath.length > 1) {
      // 完成路径，添加到场景
      this.onAddShape(this.currentPathShape);
    }

    // 重置状态
    this.isDrawing = false;
    this.currentPath = [];
    this.currentPathShape = null;
  }

  getCurrentStroke() {
    return this.currentPathShape;
  }

  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }
}

/**
 * 矩形工具
 */
export class RectangleTool extends BaseInteractionTool {
  readonly name = 'rectangle';
  readonly mode = InteractionMode.DRAW;
  readonly cursor = 'crosshair';

  private isDrawing = false;
  private startPoint: IPoint | null = null;
  private currentRectangle: RectangleShape | null = null;

  constructor(
    private manager: any,
    private onSetCursor: (cursor: string) => void,
    private onAddShape: (shape: any) => void
  ) {
    super();
  }

  onActivate(): void {
    this.onSetCursor(this.cursor);
  }

  onDeactivate(): void {
    this.finishCurrentRectangle();
  }

  onMouseDown(event: IMouseEvent): boolean {
    if (event.button === 0) {
      this.isDrawing = true;
      this.startPoint = event.worldPosition;
      return true;
    }
    return false;
  }

  onMouseMove(event: IMouseEvent): boolean {
    if (this.isDrawing && this.startPoint) {
      const currentPoint = event.worldPosition;
      
      // 计算矩形的位置和尺寸
      const x = Math.min(this.startPoint.x, currentPoint.x);
      const y = Math.min(this.startPoint.y, currentPoint.y);
      const width = Math.abs(currentPoint.x - this.startPoint.x);
      const height = Math.abs(currentPoint.y - this.startPoint.y);
      
      // 创建或更新矩形
      const rectangleId = this.currentRectangle?.id || `rectangle_${Date.now()}_${Math.random()}`;
      this.currentRectangle = new RectangleShape(
        rectangleId,
        { x, y },
        { width, height },
        '#000000',
        2,
        false
      );
      
      return true;
    }
    return false;
  }

  onMouseUp(event: IMouseEvent): boolean {
    if (this.isDrawing) {
      this.finishCurrentRectangle();
      return true;
    }
    return false;
  }

  private finishCurrentRectangle(): void {
    if (this.isDrawing && this.currentRectangle && this.startPoint) {
      // 只有当矩形有一定大小时才添加
      if (this.currentRectangle.size.width > 5 && this.currentRectangle.size.height > 5) {
        this.onAddShape(this.currentRectangle);
      }
    }

    // 重置状态
    this.isDrawing = false;
    this.startPoint = null;
    this.currentRectangle = null;
  }

  getCurrentShape() {
    return this.currentRectangle;
  }

  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }
}

/**
 * 圆形工具
 */
export class CircleTool extends BaseInteractionTool {
  readonly name = 'circle';
  readonly mode = InteractionMode.DRAW;
  readonly cursor = 'crosshair';

  private isDrawing = false;
  private centerPoint: IPoint | null = null;
  private currentCircle: CircleShape | null = null;

  constructor(
    private manager: any,
    private onSetCursor: (cursor: string) => void,
    private onAddShape: (shape: any) => void
  ) {
    super();
  }

  onActivate(): void {
    this.onSetCursor(this.cursor);
  }

  onDeactivate(): void {
    this.finishCurrentCircle();
  }

  onMouseDown(event: IMouseEvent): boolean {
    if (event.button === 0) {
      this.isDrawing = true;
      this.centerPoint = event.worldPosition;
      return true;
    }
    return false;
  }

  onMouseMove(event: IMouseEvent): boolean {
    if (this.isDrawing && this.centerPoint) {
      const currentPoint = event.worldPosition;
      
      // 计算半径
      const radius = Math.sqrt(
        Math.pow(currentPoint.x - this.centerPoint.x, 2) + 
        Math.pow(currentPoint.y - this.centerPoint.y, 2)
      );
      
      // 创建或更新圆形
      const circleId = this.currentCircle?.id || `circle_${Date.now()}_${Math.random()}`;
      this.currentCircle = new CircleShape(
        circleId,
        this.centerPoint,
        radius,
        '#000000',
        2,
        false
      );
      
      return true;
    }
    return false;
  }

  onMouseUp(event: IMouseEvent): boolean {
    if (this.isDrawing) {
      this.finishCurrentCircle();
      return true;
    }
    return false;
  }

  private finishCurrentCircle(): void {
    if (this.isDrawing && this.currentCircle && this.centerPoint) {
      // 只有当圆形有一定大小时才添加
      if (this.currentCircle.radius > 5) {
        this.onAddShape(this.currentCircle);
      }
    }

    // 重置状态
    this.isDrawing = false;
    this.centerPoint = null;
    this.currentCircle = null;
  }

  getCurrentShape() {
    return this.currentCircle;
  }

  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }
}

/**
 * 菱形工具
 */
export class DiamondTool extends BaseInteractionTool {
  readonly name = 'diamond';
  readonly mode = InteractionMode.DRAW;
  readonly cursor = 'crosshair';

  private isDrawing = false;
  private startPoint: IPoint | null = null;
  private currentDiamond: DiamondShape | null = null;

  constructor(
    private manager: any,
    private onSetCursor: (cursor: string) => void,
    private onAddShape: (shape: any) => void
  ) {
    super();
  }

  onActivate(): void {
    this.onSetCursor(this.cursor);
  }

  onDeactivate(): void {
    this.finishCurrentDiamond();
  }

  onMouseDown(event: IMouseEvent): boolean {
    if (event.button === 0) {
      this.isDrawing = true;
      this.startPoint = event.worldPosition;
      return true;
    }
    return false;
  }

  onMouseMove(event: IMouseEvent): boolean {
    if (this.isDrawing && this.startPoint) {
      const currentPoint = event.worldPosition;
      
      // 计算菱形的位置和尺寸
      const x = Math.min(this.startPoint.x, currentPoint.x);
      const y = Math.min(this.startPoint.y, currentPoint.y);
      const width = Math.abs(currentPoint.x - this.startPoint.x);
      const height = Math.abs(currentPoint.y - this.startPoint.y);
      
      // 创建或更新菱形
      const diamondId = this.currentDiamond?.id || `diamond_${Date.now()}_${Math.random()}`;
      this.currentDiamond = new DiamondShape(
        diamondId,
        { x, y },
        { width, height },
        '#000000',
        2,
        false
      );
      
      return true;
    }
    return false;
  }

  onMouseUp(event: IMouseEvent): boolean {
    if (this.isDrawing) {
      this.finishCurrentDiamond();
      return true;
    }
    return false;
  }

  private finishCurrentDiamond(): void {
    if (this.isDrawing && this.currentDiamond && this.startPoint) {
      // 只有当菱形有一定大小时才添加
      if (this.currentDiamond.size.width > 5 && this.currentDiamond.size.height > 5) {
        this.onAddShape(this.currentDiamond);
      }
    }

    // 重置状态
    this.isDrawing = false;
    this.startPoint = null;
    this.currentDiamond = null;
  }

  getCurrentShape() {
    return this.currentDiamond;
  }

  isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }
}
