/**
 * 工具系统
 */

// 导入工具类
export { CircleTool } from './CircleTool';
export { LineTool } from './LineTool';
export { RectangleTool } from './RectangleTool';

// 从interaction/tools.ts导出更多工具
export { DiamondTool, TextTool } from '../interaction/tools';

// TODO: 实现更多工具系统
export interface ITool {
  name: string;
  activate(): void;
  deactivate(): void;
}