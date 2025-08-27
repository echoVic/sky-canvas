/**
 * 工具系统
 */

// TODO: 实现绘图工具系统
export interface ITool {
  name: string;
  activate(): void;
  deactivate(): void;
}