/**
 * 变换栈
 * 管理嵌套的坐标变换
 */

import { Matrix2D } from './Matrix2D';

export class TransformStack {
  private stack: Matrix2D[] = [Matrix2D.identity()];

  /** 获取当前变换矩阵 */
  get current(): Matrix2D {
    return this.stack[this.stack.length - 1].clone();
  }

  /** 保存当前变换 */
  push(): void {
    this.stack.push(this.current);
  }

  /** 恢复上一个变换 */
  pop(): Matrix2D | null {
    if (this.stack.length <= 1) {
      console.warn('TransformStack: Cannot pop from empty stack');
      return null;
    }
    return this.stack.pop()!;
  }

  /** 重置到单位矩阵 */
  reset(): void {
    this.stack = [Matrix2D.identity()];
  }

  /** 应用平移 */
  translate(x: number, y: number): void {
    const current = this.stack[this.stack.length - 1];
    this.stack[this.stack.length - 1] = current.translate(x, y);
  }

  /** 应用旋转 */
  rotate(angle: number): void {
    const current = this.stack[this.stack.length - 1];
    this.stack[this.stack.length - 1] = current.rotate(angle);
  }

  /** 应用缩放 */
  scale(scaleX: number, scaleY: number): void {
    const current = this.stack[this.stack.length - 1];
    this.stack[this.stack.length - 1] = current.scale(scaleX, scaleY);
  }

  /** 设置变换矩阵 */
  setMatrix(matrix: Matrix2D): void {
    this.stack[this.stack.length - 1] = matrix.clone();
  }

  /** 乘以变换矩阵 */
  multiply(matrix: Matrix2D): void {
    const current = this.stack[this.stack.length - 1];
    this.stack[this.stack.length - 1] = current.multiply(matrix);
  }

  /** 变换点 */
  transformPoint(point: { x: number; y: number }): { x: number; y: number } {
    return this.current.transformPoint(point);
  }

  /** 逆变换点 */
  inverseTransformPoint(point: { x: number; y: number }): { x: number; y: number } | null {
    const inverse = this.current.inverse();
    return inverse ? inverse.transformPoint(point) : null;
  }
}
