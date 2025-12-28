/**
 * 选择工具边界计算工具
 */

import {
  ICircleEntity,
  IRectangleEntity,
  IShapeEntity,
  ITextEntity,
  ShapeEntity
} from '../../../models/entities/Shape';
import { IBounds, HandlePosition } from './SelectToolTypes';

/**
 * 获取形状边界
 */
export function getShapeBounds(shape: IShapeEntity): IBounds {
  const { x, y } = shape.transform.position;

  if (shape.type === 'rectangle') {
    const rectShape = shape as IRectangleEntity;
    return { x, y, width: rectShape.size.width, height: rectShape.size.height };
  } else if (shape.type === 'circle') {
    const circleShape = shape as ICircleEntity;
    return {
      x: x - circleShape.radius,
      y: y - circleShape.radius,
      width: circleShape.radius * 2,
      height: circleShape.radius * 2
    };
  } else if (shape.type === 'text') {
    const textShape = shape as ITextEntity;
    const estimatedWidth = textShape.content.length * textShape.fontSize * 0.6;
    return { x, y, width: estimatedWidth, height: textShape.fontSize };
  }

  return { x, y, width: 100, height: 100 };
}

/**
 * 检测两个边界框是否相交
 */
export function boundsIntersect(a: IBounds, b: IBounds): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

/**
 * 获取选择区域边界
 */
export function getSelectionBounds(shapes: ShapeEntity[]): IBounds {
  if (shapes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  for (const shape of shapes) {
    const { x, y } = shape.transform.position;
    let width = 100,
      height = 100;

    if (shape.type === 'rectangle') {
      width = shape.size.width;
      height = shape.size.height;
    } else if (shape.type === 'circle') {
      width = height = shape.radius * 2;
    }

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/**
 * 获取控制手柄对应的光标样式
 */
export function getCursorForHandle(position: HandlePosition): string {
  const cursorMap: Record<string, string> = {
    nw: 'nw-resize',
    n: 'n-resize',
    ne: 'ne-resize',
    e: 'e-resize',
    se: 'se-resize',
    s: 's-resize',
    sw: 'sw-resize',
    w: 'w-resize',
    rotate: 'crosshair',
    center: 'move'
  };
  return cursorMap[position || ''] || 'default';
}

/**
 * 控制手柄命中测试
 */
export function hitTestControlHandle(
  x: number,
  y: number,
  selectedShapes: ShapeEntity[]
): { type: 'resize' | 'rotate'; position: HandlePosition } | null {
  if (selectedShapes.length === 0) return null;

  const bounds = getSelectionBounds(selectedShapes);
  const handleSize = 10;
  const halfSize = handleSize / 2;

  // 检查旋转手柄（在选择框上方）
  const rotateHandleX = bounds.x + bounds.width / 2;
  const rotateHandleY = bounds.y - 25;
  const rotateRadius = 6;

  const distToRotate = Math.sqrt(
    Math.pow(x - rotateHandleX, 2) + Math.pow(y - rotateHandleY, 2)
  );

  if (distToRotate <= rotateRadius) {
    return { type: 'rotate', position: 'rotate' };
  }

  // 检查缩放手柄（8个方向）
  const handles: Array<{ position: HandlePosition; hx: number; hy: number }> = [
    { position: 'nw', hx: bounds.x, hy: bounds.y },
    { position: 'n', hx: bounds.x + bounds.width / 2, hy: bounds.y },
    { position: 'ne', hx: bounds.x + bounds.width, hy: bounds.y },
    { position: 'e', hx: bounds.x + bounds.width, hy: bounds.y + bounds.height / 2 },
    { position: 'se', hx: bounds.x + bounds.width, hy: bounds.y + bounds.height },
    { position: 's', hx: bounds.x + bounds.width / 2, hy: bounds.y + bounds.height },
    { position: 'sw', hx: bounds.x, hy: bounds.y + bounds.height },
    { position: 'w', hx: bounds.x, hy: bounds.y + bounds.height / 2 }
  ];

  for (const handle of handles) {
    if (
      x >= handle.hx - halfSize &&
      x <= handle.hx + halfSize &&
      y >= handle.hy - halfSize &&
      y <= handle.hy + halfSize
    ) {
      return { type: 'resize', position: handle.position };
    }
  }

  return null;
}
