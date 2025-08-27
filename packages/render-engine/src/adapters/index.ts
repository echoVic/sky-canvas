/**
 * 图形适配器系统
 * 提供不同渲染后端的统一接口
 */

// TODO: 实现适配器
export interface IGraphicsAdapter {
  name: string;
  initialize(): Promise<void>;
  dispose(): void;
}