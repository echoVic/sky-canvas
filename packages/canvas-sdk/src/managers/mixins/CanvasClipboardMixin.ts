/**
 * Canvas 剪贴板操作混入
 * 处理复制、剪切、粘贴操作
 */

import type { ShapeEntity } from '../../models/entities/Shape'
import type { IClipboardService } from '../../services'

export interface IClipboardDeps {
  clipboardService: IClipboardService
  logService: {
    debug(message: string): void
  }
  getSelectedShapes: () => ShapeEntity[]
  removeShape: (id: string) => void
  addShape: (shape: ShapeEntity) => void
  clearSelection: () => void
  selectShape: (id: string) => void
}

export function copySelectedShapes(deps: IClipboardDeps): void {
  const selectedShapes = deps.getSelectedShapes()
  if (selectedShapes.length === 0) return

  deps.clipboardService.copy(selectedShapes)
  deps.logService.debug(`Copied ${selectedShapes.length} shapes`)
}

export function cutSelectedShapes(deps: IClipboardDeps): void {
  const selectedShapes = deps.getSelectedShapes()
  if (selectedShapes.length === 0) return

  deps.clipboardService.cut(selectedShapes)

  selectedShapes.forEach((shape) => {
    deps.removeShape(shape.id)
  })

  deps.logService.debug(`Cut ${selectedShapes.length} shapes`)
}

export async function paste(deps: IClipboardDeps): Promise<ShapeEntity[]> {
  const pastedShapes = (await deps.clipboardService.paste()) as ShapeEntity[]
  if (!pastedShapes || pastedShapes.length === 0) return []

  pastedShapes.forEach((shape) => {
    deps.addShape(shape)
  })

  deps.clearSelection()
  pastedShapes.forEach((shape) => {
    deps.selectShape(shape.id)
  })

  deps.logService.debug(`Pasted ${pastedShapes.length} shapes`)

  return pastedShapes
}
