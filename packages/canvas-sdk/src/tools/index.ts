/**
 * 工具系统
 */

// 导入工具类
export { RectangleTool } from './RectangleTool';
export { CircleTool } from './CircleTool';
export { LineTool } from './LineTool';

// TODO: 实现更多工具系统
export interface ITool {
  name: string;
  activate(): void;
  deactivate(): void;
}