/**
 * 纹理系统模块导出
 */

// 纹理图集
export {
  TextureAtlas,
  globalTextureAtlas,
  type TextureInfo,
  type AtlasEntry,
  type AtlasRegion,
  type AtlasConfig,
  type AtlasEvents
} from './TextureAtlas';

// 纹理加载器
export {
  TextureLoader,
  globalTextureLoader,
  TextureLoadState,
  type TextureLoadTask,
  type LoadOptions,
  type LoaderEvents
} from './TextureLoader';

// 纹理管理器
export {
  TextureManager,
  globalTextureManager,
  type TextureConfig,
  type ManagerEvents
} from './EnhancedTextureManager';

// 重新导出现有的纹理管理器（向后兼容）
export * from './TextureManager';