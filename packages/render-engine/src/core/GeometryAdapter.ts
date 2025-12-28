/**
 * 几何数据适配器
 * 将可渲染对象转换为批处理系统所需的几何数据
 */

import { IRenderable as IBatchRenderable } from '../batch';
import { IRenderable } from './IRenderEngine';

/**
 * 几何数据类型
 */
export interface IGeometryData {
  vertices: Float32Array;
  indices: Uint16Array;
}

/**
 * 边界框类型
 */
export interface IBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 颜色类型 [r, g, b, a]
 */
export type Color4 = [number, number, number, number];

/**
 * 几何适配器类
 */
export class GeometryAdapter {
  /**
   * 将可渲染对象适配为批处理系统的格式
   */
  adaptRenderable(renderable: IRenderable): IBatchRenderable {
    const geometryData = this.extractGeometryFromRenderable(renderable);

    return {
      getVertices: () => geometryData.vertices,
      getIndices: () => geometryData.indices,
      getShader: () => this.determineShaderType(renderable),
      getBlendMode: () => this.determineBlendMode(renderable),
      getZIndex: () => renderable.zIndex || 0
    };
  }

  /**
   * 从可渲染对象中提取几何数据
   */
  extractGeometryFromRenderable(renderable: IRenderable): IGeometryData {
    // 如果是 RenderableShapeView 类型，可以直接访问其实体数据
    const renderableWithEntity = renderable as { getEntity?: () => unknown };
    if (renderableWithEntity.getEntity) {
      const entity = renderableWithEntity.getEntity();
      return this.createGeometryFromEntity(entity);
    }

    // 对于其他类型的可渲染对象，从边界框生成基本几何体
    const bounds = renderable.getBounds();
    return this.createRectangleGeometry(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  /**
   * 从形状实体创建几何数据
   */
  createGeometryFromEntity(entity: unknown): IGeometryData {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GeometryGenerator } = require('../adapters/GeometryGenerator');
    const typedEntity = entity as EntityType;

    const color = this.parseEntityColor(typedEntity);
    const { position, scale } = typedEntity.transform;

    switch (typedEntity.type) {
      case 'rectangle':
        return this.createRectangleEntityGeometry(typedEntity as RectangleEntity, position, scale, color, GeometryGenerator);

      case 'circle':
        return this.createCircleEntityGeometry(typedEntity as CircleEntity, position, scale, color, GeometryGenerator);

      case 'path':
      case 'text':
      default: {
        const bounds = this.calculateEntityBounds(typedEntity);
        return this.createRectangleGeometry(bounds.x, bounds.y, bounds.width, bounds.height, color);
      }
    }
  }

  private createRectangleEntityGeometry(
    entity: RectangleEntity,
    position: { x: number; y: number },
    scale: { x: number; y: number },
    color: Color4,
    GeometryGenerator: GeometryGeneratorType
  ): IGeometryData {
    const { size, borderRadius } = entity;
    if (borderRadius && borderRadius > 0) {
      const points = this.generateRoundedRectPoints(
        position.x,
        position.y,
        size.width * scale.x,
        size.height * scale.y,
        borderRadius
      );
      const geometryData = GeometryGenerator.createPolygon(points, color);
      return { vertices: geometryData.vertices, indices: geometryData.indices };
    } else {
      const geometryData = GeometryGenerator.createRectangle(
        position.x,
        position.y,
        size.width * scale.x,
        size.height * scale.y,
        color
      );
      return { vertices: geometryData.vertices, indices: geometryData.indices };
    }
  }

  private createCircleEntityGeometry(
    entity: CircleEntity,
    position: { x: number; y: number },
    scale: { x: number; y: number },
    color: Color4,
    GeometryGenerator: GeometryGeneratorType
  ): IGeometryData {
    const { radius } = entity;
    const geometryData = GeometryGenerator.createCircle(
      position.x,
      position.y,
      radius * Math.max(scale.x, scale.y),
      32, // segments
      color
    );
    return { vertices: geometryData.vertices, indices: geometryData.indices };
  }

  /**
   * 创建矩形几何体
   */
  createRectangleGeometry(
    x: number,
    y: number,
    width: number,
    height: number,
    color: Color4 = [1, 1, 1, 1]
  ): IGeometryData {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GeometryGenerator } = require('../adapters/GeometryGenerator');
    const geometryData = GeometryGenerator.createRectangle(x, y, width, height, color);
    return { vertices: geometryData.vertices, indices: geometryData.indices };
  }

  /**
   * 解析实体颜色
   */
  parseEntityColor(entity: EntityType): Color4 {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GeometryGenerator } = require('../adapters/GeometryGenerator');

    if (entity.style.fillColor) {
      return GeometryGenerator.parseColor(entity.style.fillColor);
    } else if (entity.style.strokeColor) {
      return GeometryGenerator.parseColor(entity.style.strokeColor);
    }

    return [1, 1, 1, 1]; // 默认白色
  }

  /**
   * 生成圆角矩形顶点
   */
  generateRoundedRectPoints(
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): { x: number; y: number }[] {
    const points: { x: number; y: number }[] = [];
    const segments = 8;
    const maxRadius = Math.min(width, height) / 2;
    const r = Math.min(radius, maxRadius);

    // 右上角
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * (Math.PI / 2);
      points.push({
        x: x + width - r + Math.cos(angle) * r,
        y: y + r - Math.sin(angle) * r
      });
    }

    // 右下角
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * (Math.PI / 2) + Math.PI / 2;
      points.push({
        x: x + width - r + Math.cos(angle) * r,
        y: y + height - r - Math.sin(angle) * r
      });
    }

    // 左下角
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * (Math.PI / 2) + Math.PI;
      points.push({
        x: x + r + Math.cos(angle) * r,
        y: y + height - r - Math.sin(angle) * r
      });
    }

    // 左上角
    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * (Math.PI / 2) + (3 * Math.PI) / 2;
      points.push({
        x: x + r + Math.cos(angle) * r,
        y: y + r - Math.sin(angle) * r
      });
    }

    return points;
  }

  /**
   * 计算实体包围盒
   */
  calculateEntityBounds(entity: EntityType): IBounds {
    const { position, scale } = entity.transform;

    switch (entity.type) {
      case 'rectangle': {
        const rectEntity = entity as RectangleEntity;
        return {
          x: position.x,
          y: position.y,
          width: rectEntity.size.width * scale.x,
          height: rectEntity.size.height * scale.y
        };
      }
      case 'circle': {
        const circleEntity = entity as CircleEntity;
        const radius = circleEntity.radius * Math.max(scale.x, scale.y);
        return {
          x: position.x - radius,
          y: position.y - radius,
          width: radius * 2,
          height: radius * 2
        };
      }
      case 'text':
        return this.calculateTextBounds(entity as TextEntity);
      default:
        return { x: position.x, y: position.y, width: 100, height: 100 };
    }
  }

  /**
   * 计算文本包围盒
   */
  calculateTextBounds(entity: TextEntity): IBounds {
    const { position, scale } = entity.transform;
    const { content, fontSize } = entity;

    const estimatedWidth = content.length * fontSize * 0.6 * scale.x;
    const estimatedHeight = fontSize * scale.y;

    return {
      x: position.x,
      y: position.y - estimatedHeight,
      width: estimatedWidth,
      height: estimatedHeight
    };
  }

  /**
   * 确定着色器类型
   */
  determineShaderType(renderable: IRenderable): string {
    const renderableWithEntity = renderable as { getEntity?: () => EntityType };
    if (renderableWithEntity.getEntity) {
      const entity = renderableWithEntity.getEntity();
      switch (entity.type) {
        case 'text':
          return 'text';
        case 'circle':
          return 'circle';
        default:
          return 'basic';
      }
    }
    return 'basic';
  }

  /**
   * 确定混合模式
   */
  determineBlendMode(renderable: IRenderable): number {
    const renderableWithEntity = renderable as { getEntity?: () => EntityType };
    if (renderableWithEntity.getEntity) {
      const entity = renderableWithEntity.getEntity();
      const opacity = entity.style.opacity || 1;
      if (opacity < 1) {
        return 1; // Alpha blending
      }
    }
    return 0; // 默认混合模式
  }
}

// 内部类型定义
interface EntityTransform {
  position: { x: number; y: number };
  scale: { x: number; y: number };
}

interface EntityStyle {
  fillColor?: string;
  strokeColor?: string;
  opacity?: number;
}

interface BaseEntity {
  type: string;
  transform: EntityTransform;
  style: EntityStyle;
}

interface RectangleEntity extends BaseEntity {
  type: 'rectangle';
  size: { width: number; height: number };
  borderRadius?: number;
}

interface CircleEntity extends BaseEntity {
  type: 'circle';
  radius: number;
}

interface TextEntity extends BaseEntity {
  type: 'text';
  content: string;
  fontSize: number;
}

type EntityType = RectangleEntity | CircleEntity | TextEntity | BaseEntity;

interface GeometryGeneratorType {
  createRectangle(
    x: number,
    y: number,
    width: number,
    height: number,
    color: Color4
  ): IGeometryData;
  createCircle(
    x: number,
    y: number,
    radius: number,
    segments: number,
    color: Color4
  ): IGeometryData;
  createPolygon(points: { x: number; y: number }[], color: Color4): IGeometryData;
  parseColor(color: string): Color4;
}
