/**
 * 导出服务 - 单一职责：处理各种格式的导出功能
 */

import { createDecorator } from '../../di'
import type { ShapeEntity } from '../../models/entities/Shape'

/**
 * 导出选项接口
 */
export interface IExportOptions {
  width?: number
  height?: number
  backgroundColor?: string
  quality?: number // 0-1，用于PNG/JPEG
  scale?: number // 缩放因子
}

/**
 * 导出服务接口
 */
export interface IExportService {
  readonly _serviceBrand: undefined

  // SVG 导出
  exportToSVG(shapes: ShapeEntity[], options?: { width?: number; height?: number }): string

  // 图片导出
  exportToPNG(canvas: HTMLCanvasElement, options?: IExportOptions): Promise<Blob>
  exportToJPEG(canvas: HTMLCanvasElement, options?: IExportOptions): Promise<Blob>

  // JSON 导出
  exportToJSON(shapes: ShapeEntity[]): string

  // 下载文件
  downloadFile(content: string | Blob, filename: string, mimeType?: string): void

  dispose(): void
}

export const IExportService = createDecorator<IExportService>('ExportService')

/**
 * 导出服务实现
 */
export class ExportService implements IExportService {
  readonly _serviceBrand: undefined

  /**
   * 导出到SVG
   */
  exportToSVG(shapes: ShapeEntity[], options?: { width?: number; height?: number }): string {
    const width = options?.width || 800
    const height = options?.height || 600

    let svg = `<?xml version="1.0" encoding="UTF-8"?>\n`
    svg += `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">\n`

    // 添加背景
    svg += `  <rect width="100%" height="100%" fill="white"/>\n`

    // 导出每个形状
    shapes.forEach((shape) => {
      if (shape.visible) {
        const shapeSVG = this.shapeToSVG(shape)
        if (shapeSVG) {
          svg += `  ${shapeSVG}\n`
        }
      }
    })

    svg += `</svg>`
    return svg
  }

  /**
   * 导出到PNG
   */
  exportToPNG(canvas: HTMLCanvasElement, options?: IExportOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const exportCanvas = this.createExportCanvas(canvas, options)
        exportCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create PNG blob'))
            }
          },
          'image/png',
          options?.quality || 0.92
        )
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 导出到JPEG
   */
  exportToJPEG(canvas: HTMLCanvasElement, options?: IExportOptions): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const exportCanvas = this.createExportCanvas(canvas, options)
        exportCanvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Failed to create JPEG blob'))
            }
          },
          'image/jpeg',
          options?.quality || 0.8
        )
      } catch (error) {
        reject(error)
      }
    })
  }

  /**
   * 导出到JSON
   */
  exportToJSON(shapes: ShapeEntity[]): string {
    const exportData = {
      version: '1.0',
      shapes: shapes.filter((shape) => shape.visible).map((shape) => this.serializeShape(shape)),
      timestamp: new Date().toISOString(),
    }

    return JSON.stringify(exportData, null, 2)
  }

  /**
   * 下载文件
   */
  downloadFile(content: string | Blob, filename: string, mimeType?: string): void {
    let blob: Blob

    if (content instanceof Blob) {
      blob = content
    } else {
      blob = new Blob([content], { type: mimeType || 'text/plain' })
    }

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // 清理URL对象
    URL.revokeObjectURL(url)
  }

  dispose(): void {}

  // === 私有方法 ===

  /**
   * 形状转SVG
   */
  private shapeToSVG(shape: ShapeEntity): string | null {
    const { transform, style } = shape
    const fill = style.fillColor || 'black'
    const stroke = style.strokeColor || 'none'
    const strokeWidth = style.strokeWidth || 0

    switch (shape.type) {
      case 'rectangle': {
        const rectShape = shape as any
        return `<rect x="${transform.position.x}" y="${transform.position.y}" width="${rectShape.size?.width || 100}" height="${rectShape.size?.height || 100}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
      }

      case 'circle': {
        const circleShape = shape as any
        const cx = transform.position.x
        const cy = transform.position.y
        return `<circle cx="${cx}" cy="${cy}" r="${circleShape.radius || 50}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
      }

      case 'ellipse': {
        const ellipseShape = shape as any
        return `<ellipse cx="${transform.position.x}" cy="${transform.position.y}" rx="${ellipseShape.radiusX || 50}" ry="${ellipseShape.radiusY || 30}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
      }

      case 'polygon': {
        const polygonShape = shape as any
        const polygonPoints = (polygonShape.points || [])
          .map((p: any) => `${p.x + transform.position.x},${p.y + transform.position.y}`)
          .join(' ')
        return `<polygon points="${polygonPoints}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
      }

      case 'star': {
        const starShape = shape as any
        const starPoints = this.buildStarPoints(starShape)
          .map((p: any) => `${p.x + transform.position.x},${p.y + transform.position.y}`)
          .join(' ')
        return `<polygon points="${starPoints}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
      }

      case 'path': {
        const pathShape = shape as any
        return `<path d="${pathShape.pathData || 'M 0 0'}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
      }

      case 'text': {
        const textShape = shape as any
        return `<text x="${transform.position.x}" y="${transform.position.y + (textShape.fontSize || 16)}" font-family="${textShape.fontFamily || 'Arial'}" font-size="${textShape.fontSize || 16}" fill="${fill}">${textShape.content || ''}</text>`
      }

      case 'image': {
        const imageShape = shape as any
        return `<image x="${transform.position.x}" y="${transform.position.y}" width="${imageShape.size?.width || 100}" height="${imageShape.size?.height || 100}" href="${imageShape.src || ''}"/>`
      }

      case 'group':
        return null

      default:
        // 默认矩形
        return `<rect x="${transform.position.x}" y="${transform.position.y}" width="100" height="100" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
    }
  }

  private serializeShape(shape: ShapeEntity): ShapeEntity {
    const cloned = JSON.parse(JSON.stringify(shape)) as ShapeEntity
    if (cloned.type === 'image') {
      delete (cloned as any).imageData
    }
    return cloned
  }

  private buildStarPoints(starShape: any): Array<{ x: number; y: number }> {
    const points: Array<{ x: number; y: number }> = []
    const count = Math.max(2, Math.floor(starShape.points || 5))
    const outer = starShape.outerRadius || 50
    const inner = starShape.innerRadius || outer * 0.5
    const start = starShape.startAngle || -Math.PI / 2
    for (let i = 0; i < count * 2; i++) {
      const radius = i % 2 === 0 ? outer : inner
      const angle = start + (Math.PI / count) * i
      points.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
    }
    return points
  }

  /**
   * 创建导出画布
   */
  private createExportCanvas(
    canvas: HTMLCanvasElement,
    options?: IExportOptions
  ): HTMLCanvasElement {
    const scale = options?.scale || 1
    const width = (options?.width || canvas.width) * scale
    const height = (options?.height || canvas.height) * scale

    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = width
    exportCanvas.height = height

    const ctx = exportCanvas.getContext('2d')
    if (!ctx) {
      throw new Error('Failed to get 2D context')
    }

    // 设置背景色
    if (options?.backgroundColor) {
      ctx.fillStyle = options.backgroundColor
      ctx.fillRect(0, 0, width, height)
    }

    // 绘制原画布内容
    ctx.scale(scale, scale)
    ctx.drawImage(canvas, 0, 0)

    return exportCanvas
  }
}
