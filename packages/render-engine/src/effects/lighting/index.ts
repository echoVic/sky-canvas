/**
 * 光照系统入口文件
 */

// 类型定义
export * from '../types/LightingTypes';

// 光源类
export { BaseLight } from './BaseLight';
export { DirectionalLight } from './DirectionalLight';
export { PointLight } from './PointLight';

// 阴影类
export { BaseShadow } from './BaseShadow';
export { DropShadow } from './DropShadow';

// 管理器
export { LightingManager } from './LightingManager';

// 导入具体实现类
import { DirectionalLight } from './DirectionalLight';
import { PointLight } from './PointLight';
import { DropShadow } from './DropShadow';

// 光源工厂函数
export function createLight(config: any) {
  switch (config.type) {
    case 'directional':
      return new DirectionalLight(config);
    case 'point':
      return new PointLight(config);
    default:
      throw new Error(`Unsupported light type: ${config.type}`);
  }
}

// 阴影工厂函数
export function createShadow(config: any) {
  switch (config.type) {
    case 'drop-shadow':
      return new DropShadow(config);
    default:
      throw new Error(`Unsupported shadow type: ${config.type}`);
  }
}