/**
 * 图形组件库
 * 提供常用的图形绘制组件，用于快速构建图形应用
 */

import { IEventBus } from '../events/EventBus';

export interface GraphicsComponentProps {
  id?: string;
  position?: { x: number; y: number };
  rotation?: number;
  scale?: { x: number; y: number };
  visible?: boolean;
  zIndex?: number;
  style?: {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    opacity?: number;
  };
}

export interface RectangleProps extends GraphicsComponentProps {
  width: number;
  height: number;
  borderRadius?: number;
}

export interface CircleProps extends GraphicsComponentProps {
  radius: number;
}

export interface TextProps extends GraphicsComponentProps {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold';
  textAlign?: 'left' | 'center' | 'right';
}

/**
 * 基础图形组件
 */
export abstract class GraphicsComponent<T extends GraphicsComponentProps = GraphicsComponentProps> {
  protected props: T;
  protected eventBus?: IEventBus;
  protected needsUpdate = true;

  constructor(props: T) {
    this.props = { ...props };
  }

  public abstract render(ctx: CanvasRenderingContext2D | WebGLRenderingContext): void;

  public updateProps(newProps: Partial<T>): void {
    this.props = { ...this.props, ...newProps };
    this.needsUpdate = true;
  }

  public getProps(): T {
    return { ...this.props };
  }

  public setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  protected applyTransform(ctx: CanvasRenderingContext2D): void {
    if (this.props.position) {
      ctx.translate(this.props.position.x, this.props.position.y);
    }

    if (this.props.rotation) {
      ctx.rotate(this.props.rotation);
    }

    if (this.props.scale) {
      ctx.scale(this.props.scale.x, this.props.scale.y);
    }
  }

  protected applyStyle(ctx: CanvasRenderingContext2D): void {
    const style = this.props.style;
    if (!style) return;

    if (style.fillColor) {
      ctx.fillStyle = style.fillColor;
    }

    if (style.strokeColor) {
      ctx.strokeStyle = style.strokeColor;
    }

    if (style.strokeWidth !== undefined) {
      ctx.lineWidth = style.strokeWidth;
    }

    if (style.opacity !== undefined) {
      ctx.globalAlpha = style.opacity;
    }
  }

  public getBoundingBox(): { x: number; y: number; width: number; height: number } {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  public hitTest(x: number, y: number): boolean {
    const bbox = this.getBoundingBox();
    return x >= bbox.x && x <= bbox.x + bbox.width &&
           y >= bbox.y && y <= bbox.y + bbox.height;
  }
}

/**
 * 矩形组件
 */
export class Rectangle extends GraphicsComponent<RectangleProps> {
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.props.visible) return;

    ctx.save();

    this.applyTransform(ctx);
    this.applyStyle(ctx);

    const { width, height, borderRadius } = this.props;

    if (borderRadius && borderRadius > 0) {
      this.drawRoundedRect(ctx, -width / 2, -height / 2, width, height, borderRadius);
    } else {
      ctx.rect(-width / 2, -height / 2, width, height);
    }

    if (this.props.style?.fillColor) {
      ctx.fill();
    }

    if (this.props.style?.strokeColor) {
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  public getBoundingBox(): { x: number; y: number; width: number; height: number } {
    const pos = this.props.position || { x: 0, y: 0 };
    return {
      x: pos.x - this.props.width / 2,
      y: pos.y - this.props.height / 2,
      width: this.props.width,
      height: this.props.height
    };
  }
}

/**
 * 圆形组件
 */
export class Circle extends GraphicsComponent<CircleProps> {
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.props.visible) return;

    ctx.save();

    this.applyTransform(ctx);
    this.applyStyle(ctx);

    ctx.beginPath();
    ctx.arc(0, 0, this.props.radius, 0, Math.PI * 2);

    if (this.props.style?.fillColor) {
      ctx.fill();
    }

    if (this.props.style?.strokeColor) {
      ctx.stroke();
    }

    ctx.restore();
  }

  public getBoundingBox(): { x: number; y: number; width: number; height: number } {
    const pos = this.props.position || { x: 0, y: 0 };
    const diameter = this.props.radius * 2;
    return {
      x: pos.x - this.props.radius,
      y: pos.y - this.props.radius,
      width: diameter,
      height: diameter
    };
  }

  public hitTest(x: number, y: number): boolean {
    const pos = this.props.position || { x: 0, y: 0 };
    const dx = x - pos.x;
    const dy = y - pos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= this.props.radius;
  }
}

/**
 * 文本组件
 */
export class Text extends GraphicsComponent<TextProps> {
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.props.visible) return;

    ctx.save();

    this.applyTransform(ctx);
    this.applyStyle(ctx);

    // 设置字体
    const fontSize = this.props.fontSize || 16;
    const fontFamily = this.props.fontFamily || 'Arial';
    const fontWeight = this.props.fontWeight || 'normal';
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;

    // 设置对齐方式
    ctx.textAlign = this.props.textAlign || 'center';
    ctx.textBaseline = 'middle';

    if (this.props.style?.fillColor) {
      ctx.fillText(this.props.text, 0, 0);
    }

    if (this.props.style?.strokeColor) {
      ctx.strokeText(this.props.text, 0, 0);
    }

    ctx.restore();
  }

  public getBoundingBox(): { x: number; y: number; width: number; height: number } {
    // 简化的边界框计算
    const fontSize = this.props.fontSize || 16;
    const textWidth = this.props.text.length * fontSize * 0.6; // 近似计算
    const pos = this.props.position || { x: 0, y: 0 };

    return {
      x: pos.x - textWidth / 2,
      y: pos.y - fontSize / 2,
      width: textWidth,
      height: fontSize
    };
  }
}

/**
 * 线条组件
 */
export interface LineProps extends GraphicsComponentProps {
  points: Array<{ x: number; y: number }>;
  closed?: boolean;
}

export class Line extends GraphicsComponent<LineProps> {
  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.props.visible || this.props.points.length < 2) return;

    ctx.save();

    this.applyTransform(ctx);
    this.applyStyle(ctx);

    ctx.beginPath();
    const firstPoint = this.props.points[0];
    ctx.moveTo(firstPoint.x, firstPoint.y);

    for (let i = 1; i < this.props.points.length; i++) {
      const point = this.props.points[i];
      ctx.lineTo(point.x, point.y);
    }

    if (this.props.closed) {
      ctx.closePath();
    }

    if (this.props.closed && this.props.style?.fillColor) {
      ctx.fill();
    }

    if (this.props.style?.strokeColor) {
      ctx.stroke();
    }

    ctx.restore();
  }

  public getBoundingBox(): { x: number; y: number; width: number; height: number } {
    if (this.props.points.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = this.props.points[0].x;
    let maxX = this.props.points[0].x;
    let minY = this.props.points[0].y;
    let maxY = this.props.points[0].y;

    for (const point of this.props.points) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }

    const pos = this.props.position || { x: 0, y: 0 };
    return {
      x: pos.x + minX,
      y: pos.y + minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }
}

/**
 * 图形组合容器
 */
export class GraphicsContainer extends GraphicsComponent {
  private children: GraphicsComponent[] = [];

  public addChild(child: GraphicsComponent): void {
    this.children.push(child);
    this.needsUpdate = true;
  }

  public removeChild(child: GraphicsComponent): boolean {
    const index = this.children.indexOf(child);
    if (index >= 0) {
      this.children.splice(index, 1);
      this.needsUpdate = true;
      return true;
    }
    return false;
  }

  public getChildren(): GraphicsComponent[] {
    return [...this.children];
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (!this.props.visible) return;

    ctx.save();
    this.applyTransform(ctx);

    // 按zIndex排序子组件
    const sortedChildren = [...this.children].sort((a, b) => {
      const aIndex = a.getProps().zIndex || 0;
      const bIndex = b.getProps().zIndex || 0;
      return aIndex - bIndex;
    });

    for (const child of sortedChildren) {
      child.render(ctx);
    }

    ctx.restore();
  }

  public getBoundingBox(): { x: number; y: number; width: number; height: number } {
    if (this.children.length === 0) {
      return { x: 0, y: 0, width: 0, height: 0 };
    }

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const child of this.children) {
      const bbox = child.getBoundingBox();
      minX = Math.min(minX, bbox.x);
      maxX = Math.max(maxX, bbox.x + bbox.width);
      minY = Math.min(minY, bbox.y);
      maxY = Math.max(maxY, bbox.y + bbox.height);
    }

    const pos = this.props.position || { x: 0, y: 0 };
    return {
      x: pos.x + minX,
      y: pos.y + minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  public hitTest(x: number, y: number): boolean {
    // 从前往后测试子组件（zIndex高的优先）
    const sortedChildren = [...this.children].sort((a, b) => {
      const aIndex = a.getProps().zIndex || 0;
      const bIndex = b.getProps().zIndex || 0;
      return bIndex - aIndex; // 降序排序
    });

    for (const child of sortedChildren) {
      if (child.hitTest(x, y)) {
        return true;
      }
    }

    return false;
  }
}

/**
 * 图形工厂类
 */
export class GraphicsFactory {
  /**
   * 创建矩形
   */
  static createRectangle(props: RectangleProps): Rectangle {
    return new Rectangle(props);
  }

  /**
   * 创建圆形
   */
  static createCircle(props: CircleProps): Circle {
    return new Circle(props);
  }

  /**
   * 创建文本
   */
  static createText(props: TextProps): Text {
    return new Text(props);
  }

  /**
   * 创建线条
   */
  static createLine(props: LineProps): Line {
    return new Line(props);
  }

  /**
   * 创建容器
   */
  static createContainer(props: GraphicsComponentProps = {}): GraphicsContainer {
    return new GraphicsContainer(props);
  }

  /**
   * 创建预设图形：箭头
   */
  static createArrow(props: {
    position?: { x: number; y: number };
    length?: number;
    width?: number;
    style?: GraphicsComponentProps['style'];
  }): GraphicsContainer {
    const length = props.length || 50;
    const width = props.width || 10;
    const headSize = width * 1.5;

    const container = new GraphicsContainer({
      position: props.position,
      style: props.style
    });

    // 箭身
    const shaft = new Rectangle({
      width: length - headSize,
      height: width * 0.5,
      position: { x: -(headSize / 2), y: 0 },
      style: props.style
    });

    // 箭头
    const head = new Line({
      points: [
        { x: length / 2 - headSize, y: -headSize / 2 },
        { x: length / 2, y: 0 },
        { x: length / 2 - headSize, y: headSize / 2 }
      ],
      closed: true,
      style: props.style
    });

    container.addChild(shaft);
    container.addChild(head);

    return container;
  }

  /**
   * 创建预设图形：星形
   */
  static createStar(props: {
    position?: { x: number; y: number };
    outerRadius?: number;
    innerRadius?: number;
    points?: number;
    style?: GraphicsComponentProps['style'];
  }): Line {
    const outerRadius = props.outerRadius || 25;
    const innerRadius = props.innerRadius || 12;
    const pointCount = props.points || 5;

    const points = [];
    const angleStep = (Math.PI * 2) / (pointCount * 2);

    for (let i = 0; i < pointCount * 2; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      });
    }

    return new Line({
      position: props.position,
      points,
      closed: true,
      style: props.style
    });
  }
}