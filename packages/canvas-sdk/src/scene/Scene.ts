import { IShape } from './IShape';

/**
 * 简单场景类，用于导入导出管理
 */
export class Scene {
  private shapes: IShape[] = [];
  
  /**
   * 添加形状
   * @param shape 形状对象
   */
  addShape(shape: IShape): void {
    this.shapes.push(shape);
  }
  
  /**
   * 移除形状
   * @param shape 形状对象
   */
  removeShape(shape: IShape): void {
    const index = this.shapes.indexOf(shape);
    if (index !== -1) {
      this.shapes.splice(index, 1);
    }
  }
  
  /**
   * 获取所有形状
   */
  getShapes(): IShape[] {
    return [...this.shapes];
  }
  
  /**
   * 清空场景
   */
  clear(): void {
    this.shapes.length = 0;
  }
}