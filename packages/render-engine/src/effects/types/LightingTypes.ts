/**
 * 阴影和光照效果类型定义
 */

import { Point2D, Vector2D } from '../../animation/types/PathTypes';

/**
 * 光源类型
 */
export enum LightType {
  AMBIENT = 'ambient',       // 环境光
  DIRECTIONAL = 'directional', // 方向光
  POINT = 'point',          // 点光源
  SPOT = 'spot',            // 聚光灯
  AREA = 'area'             // 面光源
}

/**
 * 阴影类型
 */
export enum ShadowType {
  DROP_SHADOW = 'drop-shadow',   // 投影
  INNER_SHADOW = 'inner-shadow', // 内阴影
  BOX_SHADOW = 'box-shadow',     // 盒阴影
  TEXT_SHADOW = 'text-shadow',   // 文字阴影
  CAST_SHADOW = 'cast-shadow'    // 投射阴影
}

/**
 * 光照模型
 */
export enum LightingModel {
  PHONG = 'phong',           // Phong光照模型
  BLINN_PHONG = 'blinn-phong', // Blinn-Phong光照模型
  LAMBERT = 'lambert',       // Lambert漫反射
  FLAT = 'flat',            // 平面着色
  TOON = 'toon'             // 卡通着色
}

/**
 * 阴影质量
 */
export enum ShadowQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra'
}

/**
 * 基础光源配置
 */
export interface LightConfig {
  type: LightType;
  enabled: boolean;
  color: string;          // 光源颜色
  intensity: number;      // 光源强度 0-1
  position?: Point2D;     // 光源位置（点光源、聚光灯）
  direction?: Vector2D;   // 光源方向（方向光、聚光灯）
  castShadows: boolean;   // 是否产生阴影
}

/**
 * 环境光配置
 */
export interface AmbientLightConfig extends LightConfig {
  type: LightType.AMBIENT;
}

/**
 * 方向光配置
 */
export interface DirectionalLightConfig extends LightConfig {
  type: LightType.DIRECTIONAL;
  direction: Vector2D;
  shadowDistance: number; // 阴影距离
}

/**
 * 点光源配置
 */
export interface PointLightConfig extends LightConfig {
  type: LightType.POINT;
  position: Point2D;
  radius: number;         // 光源半径
  falloff: number;        // 衰减系数
}

/**
 * 聚光灯配置
 */
export interface SpotLightConfig extends LightConfig {
  type: LightType.SPOT;
  position: Point2D;
  direction: Vector2D;
  angle: number;          // 光锥角度
  penumbra: number;       // 半影角度
  radius: number;         // 光源半径
  falloff: number;        // 衰减系数
}

/**
 * 面光源配置
 */
export interface AreaLightConfig extends LightConfig {
  type: LightType.AREA;
  position: Point2D;
  width: number;          // 面光源宽度
  height: number;         // 面光源高度
  rotation: number;       // 旋转角度
}

/**
 * 光源配置联合类型
 */
export type AnyLightConfig = 
  | AmbientLightConfig
  | DirectionalLightConfig
  | PointLightConfig
  | SpotLightConfig
  | AreaLightConfig;

/**
 * 阴影配置
 */
export interface ShadowConfig {
  type: ShadowType;
  enabled: boolean;
  color: string;          // 阴影颜色
  opacity: number;        // 阴影透明度 0-1
  blur: number;           // 阴影模糊半径
  spread: number;         // 阴影扩散距离
  quality: ShadowQuality; // 阴影质量
}

/**
 * 投影配置
 */
export interface DropShadowConfig extends ShadowConfig {
  type: ShadowType.DROP_SHADOW;
  offsetX: number;        // X偏移
  offsetY: number;        // Y偏移
}

/**
 * 内阴影配置
 */
export interface InnerShadowConfig extends ShadowConfig {
  type: ShadowType.INNER_SHADOW;
  offsetX: number;        // X偏移
  offsetY: number;        // Y偏移
  inset: boolean;         // 是否内嵌
}

/**
 * 盒阴影配置
 */
export interface BoxShadowConfig extends ShadowConfig {
  type: ShadowType.BOX_SHADOW;
  offsetX: number;        // X偏移
  offsetY: number;        // Y偏移
  inset?: boolean;        // 是否内嵌
}

/**
 * 文字阴影配置
 */
export interface TextShadowConfig extends ShadowConfig {
  type: ShadowType.TEXT_SHADOW;
  offsetX: number;        // X偏移
  offsetY: number;        // Y偏移
}

/**
 * 投射阴影配置
 */
export interface CastShadowConfig extends ShadowConfig {
  type: ShadowType.CAST_SHADOW;
  lightSource: string;    // 光源ID
  receiver: string;       // 阴影接收者ID
  bias: number;           // 阴影偏移
}

/**
 * 阴影配置联合类型
 */
export type AnyShadowConfig = 
  | DropShadowConfig
  | InnerShadowConfig
  | BoxShadowConfig
  | TextShadowConfig
  | CastShadowConfig;

/**
 * 材质属性
 */
export interface MaterialProperties {
  ambient: number;        // 环境反射系数
  diffuse: number;        // 漫反射系数
  specular: number;       // 镜面反射系数
  shininess: number;      // 光泽度
  roughness: number;      // 粗糙度
  metallic: number;       // 金属度
  emissive: string;       // 自发光颜色
  emissiveIntensity: number; // 自发光强度
}

/**
 * 光照计算结果
 */
export interface LightingResult {
  ambient: { r: number; g: number; b: number };
  diffuse: { r: number; g: number; b: number };
  specular: { r: number; g: number; b: number };
  final: { r: number; g: number; b: number };
  intensity: number;
}

/**
 * 光源接口
 */
export interface ILight {
  readonly id: string;
  readonly type: LightType;
  readonly config: AnyLightConfig;
  enabled: boolean;
  
  // 更新配置
  updateConfig(config: Partial<AnyLightConfig>): void;
  
  // 计算光照
  calculateLighting(
    position: Point2D,
    normal: Vector2D,
    viewDirection: Vector2D,
    material: MaterialProperties
  ): LightingResult;
  
  // 检查点是否在光照范围内
  isPointLit(position: Point2D): boolean;
  
  // 获取光源在指定点的强度
  getIntensityAtPoint(position: Point2D): number;
  
  // 获取光源方向（对于方向光和点光源）
  getDirectionAtPoint(position: Point2D): Vector2D;
  
  // 克隆光源
  clone(): ILight;
  
  // 销毁光源
  dispose(): void;
}

/**
 * 阴影接口
 */
export interface IShadow {
  readonly id: string;
  readonly type: ShadowType;
  readonly config: AnyShadowConfig;
  enabled: boolean;
  
  // 更新配置
  updateConfig(config: Partial<AnyShadowConfig>): void;
  
  // 渲染阴影
  render(
    ctx: CanvasRenderingContext2D,
    target: HTMLCanvasElement | ImageData
  ): void;
  
  // 计算阴影偏移
  calculateOffset(lightPosition: Point2D, objectPosition: Point2D): Point2D;
  
  // 克隆阴影
  clone(): IShadow;
  
  // 销毁阴影
  dispose(): void;
}

/**
 * 光照管理器接口
 */
export interface ILightingManager {
  // 光源管理
  addLight(light: ILight): void;
  removeLight(lightId: string): boolean;
  getLight(lightId: string): ILight | undefined;
  getAllLights(): ILight[];
  
  // 阴影管理
  addShadow(shadow: IShadow): void;
  removeShadow(shadowId: string): boolean;
  getShadow(shadowId: string): IShadow | undefined;
  getAllShadows(): IShadow[];
  
  // 光照计算
  calculateSceneLighting(
    position: Point2D,
    normal: Vector2D,
    viewDirection: Vector2D,
    material: MaterialProperties
  ): LightingResult;
  
  // 渲染阴影
  renderAllShadows(ctx: CanvasRenderingContext2D): void;
  
  // 更新光照
  update(deltaTime: number): void;
  
  // 清除所有光源和阴影
  clear(): void;
  
  // 获取统计信息
  getStats(): {
    totalLights: number;
    activeLights: number;
    totalShadows: number;
    activeShadows: number;
  };
}

/**
 * 光照渲染器接口
 */
export interface ILightingRenderer {
  // 设置光照模型
  setLightingModel(model: LightingModel): void;
  
  // 渲染光照
  renderLighting(
    lights: ILight[],
    material: MaterialProperties,
    ctx: CanvasRenderingContext2D
  ): void;
  
  // 渲染阴影
  renderShadows(
    shadows: IShadow[],
    ctx: CanvasRenderingContext2D
  ): void;
  
  // 是否支持硬件加速
  supportsHardwareAcceleration(): boolean;
}

/**
 * 光照事件
 */
export interface LightingEvents {
  lightAdded: (light: ILight) => void;
  lightRemoved: (lightId: string) => void;
  lightUpdated: (light: ILight) => void;
  shadowAdded: (shadow: IShadow) => void;
  shadowRemoved: (shadowId: string) => void;
  shadowUpdated: (shadow: IShadow) => void;
}

/**
 * 光照工厂接口
 */
export interface ILightingFactory {
  createAmbientLight(config: Omit<AmbientLightConfig, 'type'>): ILight;
  createDirectionalLight(config: Omit<DirectionalLightConfig, 'type'>): ILight;
  createPointLight(config: Omit<PointLightConfig, 'type'>): ILight;
  createSpotLight(config: Omit<SpotLightConfig, 'type'>): ILight;
  createAreaLight(config: Omit<AreaLightConfig, 'type'>): ILight;
  
  createDropShadow(config: Omit<DropShadowConfig, 'type'>): IShadow;
  createInnerShadow(config: Omit<InnerShadowConfig, 'type'>): IShadow;
  createBoxShadow(config: Omit<BoxShadowConfig, 'type'>): IShadow;
  createTextShadow(config: Omit<TextShadowConfig, 'type'>): IShadow;
}

/**
 * 光照预设
 */
export interface LightingPresets {
  // 自然光照
  createDaylight(): ILight[];
  createSunset(): ILight[];
  createNighttime(): ILight[];
  
  // 室内光照
  createOfficeLight(): ILight[];
  createWarmLight(): ILight[];
  createStudioLight(): ILight[];
  
  // 艺术光照
  createDramaticLight(): ILight[];
  createSoftLight(): ILight[];
  createRimLight(): ILight[];
  
  // 常用阴影
  createSoftShadow(): IShadow;
  createHardShadow(): IShadow;
  createLongShadow(): IShadow;
}