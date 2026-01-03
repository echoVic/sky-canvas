import { 
  RenderEngine,
  FilterManager,
  GaussianBlurFilter,
  BrightnessFilter,
  DropShadowFilter
} from '../src'

const canvas = document.createElement('canvas')
canvas.width = 800
canvas.height = 600
document.body.appendChild(canvas)

const engine = new RenderEngine(canvas, {
  renderer: 'canvas2d',
  targetFPS: 60
})

const filterManager = new FilterManager()

filterManager.addFilter(new GaussianBlurFilter({ radius: 5 }))
filterManager.addFilter(new BrightnessFilter({ brightness: 1.2 }))
filterManager.addFilter(new DropShadowFilter({
  offsetX: 5,
  offsetY: 5,
  blur: 10,
  color: 'rgba(0, 0, 0, 0.5)'
}))

const shapes = [
  { x: 100, y: 100, width: 150, height: 100, color: '#e74c3c' },
  { x: 300, y: 150, width: 100, height: 150, color: '#3498db' },
  { x: 500, y: 100, width: 120, height: 120, color: '#2ecc71' }
]

const renderable = {
  id: 'filtered-shapes',
  visible: true,
  zIndex: 0,
  render(context: any) {
    const ctx = context as CanvasRenderingContext2D
    
    const offscreenCanvas = document.createElement('canvas')
    offscreenCanvas.width = canvas.width
    offscreenCanvas.height = canvas.height
    const offscreenCtx = offscreenCanvas.getContext('2d')!
    
    shapes.forEach(shape => {
      offscreenCtx.fillStyle = shape.color
      offscreenCtx.fillRect(shape.x, shape.y, shape.width, shape.height)
    })
    
    const imageData = offscreenCtx.getImageData(0, 0, canvas.width, canvas.height)
    const filteredData = filterManager.applyFilters(imageData, ctx)
    
    ctx.putImageData(filteredData, 0, 0)
  },
  hitTest: () => false,
  getBounds: () => ({ x: 0, y: 0, width: canvas.width, height: canvas.height })
}

engine.addRenderable(renderable)
engine.start()

let filterIndex = 0
const filters = [
  new GaussianBlurFilter({ radius: 5 }),
  new BrightnessFilter({ brightness: 1.5 }),
  new DropShadowFilter({ offsetX: 10, offsetY: 10, blur: 15, color: 'rgba(0, 0, 0, 0.7)' })
]

canvas.addEventListener('click', () => {
  filterManager.clearFilters()
  filterManager.addFilter(filters[filterIndex])
  filterIndex = (filterIndex + 1) % filters.length
  console.log(`Applied filter: ${filters[filterIndex].constructor.name}`)
})

console.log('Click canvas to cycle through filters')
