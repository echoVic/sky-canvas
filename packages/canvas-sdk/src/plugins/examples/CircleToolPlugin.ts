/**
 * 圆形工具插件示例
 */

import { createTool, ToolPlugin } from '../sdk/PluginSDK'
import type { Tool } from '../types/PluginTypes'

export default class CircleToolPlugin extends ToolPlugin {
  private isDrawing = false
  private startPoint: { x: number; y: number } | null = null
  private currentCircle: any = null

  protected createTool(): Tool {
    return createTool()
      .id('circle-tool')
      .name('圆形工具')
      .icon('circle')
      .cursor('crosshair')
      .shortcut('C')
      .onActivate(() => {
        this.log('info', 'Circle tool activated')
        this.context.api.ui.showNotification({
          type: 'info',
          title: '圆形工具',
          message: '点击并拖拽绘制圆形',
        })
      })
      .onMouseDown((event: MouseEvent) => {
        this.startDrawing(event)
      })
      .onMouseMove((event: MouseEvent) => {
        this.updateDrawing(event)
      })
      .onMouseUp((event: MouseEvent) => {
        this.finishDrawing(event)
      })
      .build()
  }

  private startDrawing(event: MouseEvent): void {
    this.isDrawing = true
    this.startPoint = { x: event.clientX, y: event.clientY }

    // 创建临时圆形
    this.currentCircle = {
      id: `circle-${Date.now()}`,
      type: 'circle',
      x: this.startPoint.x,
      y: this.startPoint.y,
      radius: 0,
      fill: this.getConfig('fillColor', '#3b82f6'),
      stroke: this.getConfig('strokeColor', '#1e40af'),
      strokeWidth: this.getConfig('strokeWidth', 2),
    }

    this.context.api.canvas.addShape(this.currentCircle)
  }

  private updateDrawing(event: MouseEvent): void {
    if (!this.isDrawing || !this.startPoint || !this.currentCircle) {
      return
    }

    const dx = event.clientX - this.startPoint.x
    const dy = event.clientY - this.startPoint.y
    const radius = Math.sqrt(dx * dx + dy * dy)

    this.context.api.canvas.updateShape(this.currentCircle.id, {
      radius,
    })
  }

  private finishDrawing(event: MouseEvent): void {
    if (!this.isDrawing) {
      return
    }

    this.isDrawing = false
    this.startPoint = null
    this.currentCircle = null

    this.log('info', 'Circle drawing completed')
  }
}
