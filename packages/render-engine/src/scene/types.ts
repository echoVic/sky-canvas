/**
 * 声明式场景 schema
 *
 * agent/LLM 用一份 JSON 描述画布,SceneRenderer 负责渲染。
 * 设计原则(agent 友好):type 判别式 + 扁平字段 + 颜色用 hex 字符串。
 */

/** 场景节点:用 type 区分,字段贴近直觉 */
export type SceneNode =
  | { type: 'rect'; x: number; y: number; width: number; height: number; color?: string }
  | { type: 'circle'; cx: number; cy: number; radius: number; color?: string }
  | { type: 'line'; x1: number; y1: number; x2: number; y2: number; width?: number; color?: string }
  | { type: 'text'; x: number; y: number; size: number; text: string; color?: string }

/** 视口:世界中心点 + 缩放 */
export interface SceneViewport {
  x: number
  y: number
  zoom: number
}

/** 一份完整场景 = 视口 + 节点数组 */
export interface Scene {
  viewport?: SceneViewport
  nodes: SceneNode[]
}
