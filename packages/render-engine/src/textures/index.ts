/**
 * 纹理系统模块导出
 */

// 纹理管理器
export {
  globalTextureManager,
  type ManagerEvents,
  type TextureConfig,
  TextureManager,
} from './EnhancedTextureManager'
// 纹理图集
export {
  type AtlasConfig,
  type AtlasEntry,
  type AtlasEvents,
  type AtlasRegion,
  globalTextureAtlas,
  TextureAtlas,
  type TextureInfo,
} from './TextureAtlas'
// 纹理加载器
export {
  globalTextureLoader,
  type LoaderEvents,
  type LoadOptions,
  TextureLoader,
  TextureLoadState,
  type TextureLoadTask,
} from './TextureLoader'

// 重新导出现有的纹理管理器（向后兼容）
export * from './TextureManager'
