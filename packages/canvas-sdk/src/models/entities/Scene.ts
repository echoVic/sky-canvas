/**
 * 场景实体模型
 * MVVM架构中的Model层 - 场景数据实体
 */

import type { IViewportState } from '../../viewmodels/interfaces/IViewModel'
import type { ShapeEntity } from './Shape'

/**
 * 场景配置
 */
export interface ISceneConfig {
  backgroundColor?: string
  gridColor?: string
  gridSize?: number
  showGrid?: boolean
  snapToGrid?: boolean
  allowZoom?: boolean
  allowPan?: boolean
  minZoom?: number
  maxZoom?: number
}

/**
 * 场景元数据
 */
export interface ISceneMetadata {
  name: string
  description?: string
  author?: string
  version: string
  tags?: string[]
  createdAt: Date
  updatedAt: Date
  lastAccessedAt?: Date
}

/**
 * 场景实体
 */
export interface ISceneEntity {
  id: string
  metadata: ISceneMetadata
  config: ISceneConfig
  shapes: ShapeEntity[]
  viewport: IViewportState
  isModified: boolean
  shapeCount: number
  selectedShapeIds: string[]
}

type SceneJSON = Omit<ISceneEntity, 'metadata' | 'shapes'> & {
  metadata: Omit<ISceneMetadata, 'createdAt' | 'updatedAt' | 'lastAccessedAt'> & {
    createdAt: string
    updatedAt: string
    lastAccessedAt?: string
  }
  shapes: Array<ShapeEntity & { createdAt: string; updatedAt: string }>
}

/**
 * 场景工厂类
 */
export class SceneEntityFactory {
  private static generateId(): string {
    return `scene_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * 创建新场景
   */
  static createScene(name: string = '新场景', config: Partial<ISceneConfig> = {}): ISceneEntity {
    const now = new Date()

    return {
      id: SceneEntityFactory.generateId(),
      metadata: {
        name,
        version: '1.0.0',
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: now,
      },
      config: {
        backgroundColor: '#FFFFFF',
        gridColor: '#E0E0E0',
        gridSize: 20,
        showGrid: true,
        snapToGrid: false,
        allowZoom: true,
        allowPan: true,
        minZoom: 0.1,
        maxZoom: 10,
        ...config,
      },
      shapes: [],
      viewport: {
        x: 0,
        y: 0,
        width: 800,
        height: 600,
        zoom: 1,
      },
      isModified: false,
      shapeCount: 0,
      selectedShapeIds: [],
    }
  }

  /**
   * 从 JSON 数据创建场景
   */
  static fromJSON(jsonData: SceneJSON): ISceneEntity {
    return {
      ...jsonData,
      metadata: {
        ...jsonData.metadata,
        createdAt: new Date(jsonData.metadata.createdAt),
        updatedAt: new Date(jsonData.metadata.updatedAt),
        lastAccessedAt: jsonData.metadata.lastAccessedAt
          ? new Date(jsonData.metadata.lastAccessedAt)
          : undefined,
      },
    }
  }

  /**
   * 场景转 JSON
   */
  static toJSON(scene: ISceneEntity): SceneJSON {
    return {
      ...scene,
      shapes: scene.shapes.map((shape) => ({
        ...shape,
        createdAt: shape.createdAt.toISOString(),
        updatedAt: shape.updatedAt.toISOString(),
      })),
      metadata: {
        ...scene.metadata,
        createdAt: scene.metadata.createdAt.toISOString(),
        updatedAt: scene.metadata.updatedAt.toISOString(),
        lastAccessedAt: scene.metadata.lastAccessedAt?.toISOString(),
      },
    }
  }

  /**
   * 克隆场景
   */
  static clone(scene: ISceneEntity, newName?: string): ISceneEntity {
    const cloned = {
      ...scene,
      id: SceneEntityFactory.generateId(),
      metadata: {
        ...scene.metadata,
        name: newName || `${scene.metadata.name} (副本)`,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastAccessedAt: new Date(),
      },
      shapes: [...scene.shapes], // 浅复制，如果需要深复制形状需要另外处理
      selectedShapeIds: [],
      isModified: false,
    }

    return cloned
  }
}
