/**
 * 文本工具插件示例
 */

import { createTool, ToolPlugin } from '../sdk/PluginSDK'
import type { Tool } from '../types/PluginTypes'

export default class TextToolPlugin extends ToolPlugin {
  private textInput: HTMLInputElement | null = null

  protected createTool(): Tool {
    return createTool()
      .id('text-tool')
      .name('文本工具')
      .icon('text')
      .cursor('text')
      .shortcut('T')
      .onActivate(() => {
        this.log('info', '文本工具已激活')
      })
      .onDeactivate(() => {
        this.cleanupInput()
        this.log('info', '文本工具已停用')
      })
      .onMouseDown((event: MouseEvent) => this.addText(event))
      .build()
  }

  private addText(event: MouseEvent): void {
    const x = event.clientX
    const y = event.clientY

    // 创建临时输入框
    this.textInput = document.createElement('input')
    this.textInput.type = 'text'
    this.textInput.style.position = 'absolute'
    this.textInput.style.left = `${x}px`
    this.textInput.style.top = `${y}px`
    this.textInput.style.border = '1px solid #ccc'
    this.textInput.style.padding = '4px'
    this.textInput.style.fontSize = this.getConfig('fontSize', '16') + 'px'
    this.textInput.style.fontFamily = this.getConfig('fontFamily', 'Arial')
    this.textInput.style.color = this.getConfig('textColor', '#000000')
    this.textInput.style.backgroundColor = 'white'
    this.textInput.style.zIndex = '1000'

    document.body.appendChild(this.textInput)
    this.textInput.focus()

    // 监听回车和失焦事件
    this.textInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.confirmText(x, y)
      } else if (e.key === 'Escape') {
        this.cancelText()
      }
    })

    this.textInput.addEventListener('blur', () => {
      this.confirmText(x, y)
    })
  }

  private confirmText(x: number, y: number): void {
    if (!this.textInput) return

    const text = this.textInput.value.trim()
    if (text) {
      const textShape = {
        id: `text-${Date.now()}`,
        type: 'text',
        x,
        y,
        text,
        fontSize: this.getConfig('fontSize', 16),
        fontFamily: this.getConfig('fontFamily', 'Arial'),
        fill: this.getConfig('textColor', '#000000'),
      }

      this.context.api.canvas.addShape(textShape)
      this.log('info', `Text added: "${text}"`)
    }

    this.cleanupInput()
  }

  private cancelText(): void {
    this.cleanupInput()
  }

  private cleanupInput(): void {
    if (this.textInput) {
      document.body.removeChild(this.textInput)
      this.textInput = null
    }
  }
}
