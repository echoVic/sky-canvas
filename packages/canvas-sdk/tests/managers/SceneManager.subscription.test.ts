import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CanvasManager } from '../../src/managers/CanvasManager'
import { SceneManager } from '../../src/managers/SceneManager'
import type { IShapeEntity } from '../../src/models/entities/Shape'
import { ShapeEntityFactory } from '../../src/models/entities/Shape'
import { ClipboardService } from '../../src/services/clipboard/clipboardService'
import { ConfigurationService } from '../../src/services/configuration/configurationService'
import { HistoryService } from '../../src/services/history/historyService'
import { LogService } from '../../src/services/logging/logService'
import { CanvasRenderingService } from '../../src/services/rendering/renderingService'
import { SelectionService } from '../../src/services/selection/selectionService'
import { ShapeService } from '../../src/services/shape/shapeService'
import { ZIndexService } from '../../src/services/zIndex/zIndexService'

describe('SceneManager Subscription', () => {
  let sceneManager: SceneManager
  let canvasManager: CanvasManager
  let renderingService: CanvasRenderingService
  let logService: LogService
  let configService: ConfigurationService

  beforeEach(() => {
    logService = new LogService()
    const shapeService = new ShapeService()
    const selectionService = new SelectionService()
    const clipboardService = new ClipboardService()
    const historyService = new HistoryService(logService)
    const zIndexService = new ZIndexService(logService)
    configService = new ConfigurationService()
    renderingService = new CanvasRenderingService(logService)

    canvasManager = new CanvasManager(
      logService,
      shapeService,
      selectionService,
      clipboardService,
      historyService,
      zIndexService
    )

    sceneManager = new SceneManager(canvasManager, renderingService, logService, configService)
  })

  describe('Initial Sync', () => {
    it('should sync shapes on initialization', async () => {
      const shape: IShapeEntity = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })

      canvasManager.addShape(shape)
      await Promise.resolve()

      const newSceneManager = new SceneManager(
        canvasManager,
        renderingService,
        logService,
        configService
      )

      const activeLayer = newSceneManager.getActiveLayer()
      expect(activeLayer).not.toBeNull()
      expect(activeLayer?.shapes).toContain(shape.id)
    })
  })

  describe('Shape Addition', () => {
    it('should add shape to active layer when shape is added', async () => {
      const shape: IShapeEntity = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })

      canvasManager.addShape(shape)

      await Promise.resolve()
      await Promise.resolve()

      const activeLayer = sceneManager.getActiveLayer()

      expect(activeLayer).not.toBeNull()
      expect(activeLayer?.shapes).toContain(shape.id)
    })

    it('should add multiple shapes to layer', async () => {
      const shape1: IShapeEntity = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })
      const shape2: IShapeEntity = ShapeEntityFactory.createCircle({ x: 100, y: 100 })

      canvasManager.addShape(shape1)
      canvasManager.addShape(shape2)

      await Promise.resolve()
      await Promise.resolve()

      const activeLayer = sceneManager.getActiveLayer()
      expect(activeLayer?.shapes).toContain(shape1.id)
      expect(activeLayer?.shapes).toContain(shape2.id)
    })
  })

  describe('Shape Removal', () => {
    it('should remove shape from layer when shape is removed', async () => {
      const shape: IShapeEntity = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })

      canvasManager.addShape(shape)
      await Promise.resolve()
      await Promise.resolve()

      let activeLayer = sceneManager.getActiveLayer()
      expect(activeLayer?.shapes).toContain(shape.id)

      canvasManager.removeShape(shape.id)
      await Promise.resolve()
      await Promise.resolve()

      activeLayer = sceneManager.getActiveLayer()
      expect(activeLayer?.shapes).not.toContain(shape.id)
    })
  })

  describe('Rendering Service Integration', () => {
    it('should call renderingService.addRenderable when shape is added', async () => {
      const addRenderableSpy = vi.spyOn(renderingService, 'addRenderable')

      const shape: IShapeEntity = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })

      canvasManager.addShape(shape)
      await Promise.resolve()
      await Promise.resolve()

      expect(addRenderableSpy).toHaveBeenCalled()
    })

    it('should call renderingService.removeRenderable when shape is removed', async () => {
      const removeRenderableSpy = vi.spyOn(renderingService, 'removeRenderable')

      const shape: IShapeEntity = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })

      canvasManager.addShape(shape)
      await Promise.resolve()
      await Promise.resolve()

      canvasManager.removeShape(shape.id)
      await Promise.resolve()
      await Promise.resolve()

      expect(removeRenderableSpy).toHaveBeenCalledWith(shape.id)
    })
  })

  describe('Disposal', () => {
    it('should clean up subscriptions on dispose', async () => {
      const shape1: IShapeEntity = ShapeEntityFactory.createRectangle({ x: 0, y: 0 })

      canvasManager.addShape(shape1)
      await Promise.resolve()
      await Promise.resolve()

      sceneManager.dispose()

      const shape2: IShapeEntity = ShapeEntityFactory.createCircle({ x: 100, y: 100 })

      canvasManager.addShape(shape2)
      await Promise.resolve()
      await Promise.resolve()

      const activeLayer = sceneManager.getActiveLayer()
      expect(activeLayer?.shapes).not.toContain(shape2.id)
    })
  })
})
