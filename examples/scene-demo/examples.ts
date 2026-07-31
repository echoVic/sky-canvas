/**
 * 预置示例场景:模拟 agent/LLM 会产出的声明式 JSON,证明该 schema 是 LLM 能生成的形态。
 * 每个示例是"给一句自然语言 prompt,LLM 可能吐出的场景 JSON"。
 */
import type { Scene } from '@sky-canvas/render-engine/scene'

export interface Example {
  label: string
  /** 对应的自然语言意图(相当于 prompt) */
  prompt: string
  scene: Scene
}

export const EXAMPLES: Example[] = [
  {
    label: '① 一张登录卡片',
    prompt: '画一张登录卡片:标题、两个输入框、一个蓝色登录按钮',
    scene: {
      viewport: { x: 300, y: 220, zoom: 1 },
      nodes: [
        { type: 'rect', x: 120, y: 60, width: 360, height: 320, color: '#161b22' },
        { type: 'text', x: 150, y: 110, size: 26, text: 'Sign In', color: '#e6edf3' },
        { type: 'rect', x: 150, y: 150, width: 300, height: 44, color: '#0d1117' },
        { type: 'text', x: 162, y: 178, size: 15, text: 'email', color: '#8b949e' },
        { type: 'rect', x: 150, y: 210, width: 300, height: 44, color: '#0d1117' },
        { type: 'text', x: 162, y: 238, size: 15, text: 'password', color: '#8b949e' },
        { type: 'rect', x: 150, y: 285, width: 300, height: 46, color: '#2f81f7' },
        { type: 'text', x: 258, y: 314, size: 16, text: 'Log In', color: '#ffffff' },
      ],
    },
  },
  {
    label: '② 柱状图',
    prompt: '画一个 5 根柱子的柱状图,配坐标轴和标题',
    scene: {
      viewport: { x: 300, y: 200, zoom: 1 },
      nodes: [
        { type: 'text', x: 90, y: 50, size: 20, text: 'Weekly Sales', color: '#e6edf3' },
        { type: 'line', x1: 90, y1: 320, x2: 520, y2: 320, width: 2, color: '#8b949e' },
        { type: 'line', x1: 90, y1: 80, x2: 90, y2: 320, width: 2, color: '#8b949e' },
        { type: 'rect', x: 120, y: 220, width: 50, height: 100, color: '#3fb950' },
        { type: 'rect', x: 190, y: 170, width: 50, height: 150, color: '#3fb950' },
        { type: 'rect', x: 260, y: 120, width: 50, height: 200, color: '#3fb950' },
        { type: 'rect', x: 330, y: 190, width: 50, height: 130, color: '#3fb950' },
        { type: 'rect', x: 400, y: 150, width: 50, height: 170, color: '#3fb950' },
        { type: 'text', x: 130, y: 340, size: 13, text: 'Mon', color: '#8b949e' },
        { type: 'text', x: 200, y: 340, size: 13, text: 'Tue', color: '#8b949e' },
        { type: 'text', x: 270, y: 340, size: 13, text: 'Wed', color: '#8b949e' },
        { type: 'text', x: 340, y: 340, size: 13, text: 'Thu', color: '#8b949e' },
        { type: 'text', x: 410, y: 340, size: 13, text: 'Fri', color: '#8b949e' },
      ],
    },
  },
  {
    label: '③ 节点连线图',
    prompt: '画三个圆节点用线连起来,标上名字',
    scene: {
      viewport: { x: 300, y: 200, zoom: 1 },
      nodes: [
        { type: 'line', x1: 150, y1: 120, x2: 350, y2: 120, width: 2, color: '#58a6ff' },
        { type: 'line', x1: 350, y1: 120, x2: 250, y2: 300, width: 2, color: '#58a6ff' },
        { type: 'line', x1: 150, y1: 120, x2: 250, y2: 300, width: 2, color: '#58a6ff' },
        { type: 'circle', cx: 150, cy: 120, radius: 34, color: '#f778ba' },
        { type: 'circle', cx: 350, cy: 120, radius: 34, color: '#ffa657' },
        { type: 'circle', cx: 250, cy: 300, radius: 34, color: '#3fb950' },
        { type: 'text', x: 128, y: 126, size: 15, text: 'A', color: '#0d1117' },
        { type: 'text', x: 340, y: 126, size: 15, text: 'B', color: '#0d1117' },
        { type: 'text', x: 240, y: 306, size: 15, text: 'C', color: '#0d1117' },
      ],
    },
  },
]
