/**
 * 工具系统
 */

// 导入工具类
export { CircleTool } from './CircleTool';
export { LineTool } from './LineTool';
export { RectangleTool } from './RectangleTool';

// 工具接口 - 与服务中的接口保持一致
export interface ITool {
  name: string;
  activate(): void;
  deactivate(): void;
  handleMouseDown?(event: MouseEvent): void;
  handleMouseMove?(event: MouseEvent): void;
  handleMouseUp?(event: MouseEvent): void;
  handleKeyDown?(event: KeyboardEvent): void;
  handleKeyUp?(event: KeyboardEvent): void;
}