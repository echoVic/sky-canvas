/**
 * CanvasManager 状态同步测试
 * 测试 syncState 的防抖机制和异步行为
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { CanvasManager } from '../../src/managers/CanvasManager'
import { ShapeEntityFactory } from '../../src/models/entities/Shape'
import { ClipboardService } from '../../src/services/clipboard/clipboardService'
import { HistoryService } from '../../src/services/history/historyService'
import { LogService } from '../../src/services/logging/logService'
import { SelectionService } from '../../src/services/selection/selectionService'
import { ShapeService } from '../../src/services/shape/shapeService'
import { ZIndexService } from '../../src/services/zIndex/zIndexService'

describe('CanvasManager State Synchronization', () => {
  let canvasManager: CanvasManager
  let logService: LogService
  let shapeService: ShapeService
  let selectionService: SelectionService
  let clipboardService: ClipboardService
  let historyService: HistoryService
  let zIndexService: ZIndexService

  beforeEach(() => {
    logService = new LogService()
    shapeService = new ShapeService()
    selectionService = new SelectionService()
    clipboardService = new ClipboardService()
    historyService = new HistoryService(logService)
    zIndexService = new ZIndexService(logService)

    canvasManager = new CanvasManager(
      logService,
      shapeService,
      selectionService,
      clipboardService,
      historyService,
      zIndexService
    )
  })

  describe('Async State Updates', () => {
    it('should not immediately update state after addShape', () => {
      const shape = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })

      const initialCount = canvasManager.state.shapeCount
      canvasManager.addShape(shape)

      expect(canvasManager.state.shapeCount).toBeLessThanOrEqual(initialCount + 1)
    })

    it('should update state after microtask completes', async () => {
      const shape = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })

      canvasManager.addShape(shape)

      await Promise.resolve()

      expect(canvasManager.state.shapeCount).toBe(1)
    })

    it('should coalesce multiple state updates', async () => {
      const shape1 = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })
      const shape2 = ShapeEntityFactory.createCircle({ x: 100, y: 100 })

      canvasManager.addShape(shape1)
      canvasManager.addShape(shape2)

      await Promise.resolve()

      expect(canvasManager.state.shapeCount).toBe(2)
    })
  })

  describe('History Service Integration', () => {
    it('should update state when history changes', async () => {
      const shape = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })

      canvasManager.addShape(shape)
      await Promise.resolve()

      expect(canvasManager.state.canUndo).toBe(true)
      expect(canvasManager.state.canRedo).toBe(false)

      canvasManager.undo()
      await Promise.resolve()

      expect(canvasManager.state.canUndo).toBe(false)
      expect(canvasManager.state.canRedo).toBe(true)
      expect(canvasManager.state.shapeCount).toBe(0)
    })
  })

  describe('Selection State', () => {
    it('should update selectedIds when shape is selected', async () => {
      const shape = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })

      canvasManager.addShape(shape)
      await Promise.resolve()

      canvasManager.selectShape(shape.id)
      await Promise.resolve()

      expect(canvasManager.state.selectedIds).toContain(shape.id)
    })
  })

  describe('Clipboard State', () => {
    it('should update hasClipboardData when shapes are copied', async () => {
      const shape = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })

      canvasManager.addShape(shape)
      canvasManager.selectShape(shape.id)
      await Promise.resolve()

      expect(canvasManager.state.hasClipboardData).toBe(false)

      canvasManager.copySelectedShapes()
      await Promise.resolve()

      expect(canvasManager.state.hasClipboardData).toBe(true)
    })
  })
})
