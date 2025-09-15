/**
 * 资源管理相关类型定义
 */

// GPU资源基础接口
export interface GPUResource {
  id: string;
  type: string;
  size: number;
  usage: number;
  dispose(): void;
}