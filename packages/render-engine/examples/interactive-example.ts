import { RenderEngine, Canvas2DContextFactory } from '../src'

const canvas = document.createElement('canvas')
canvas.width = 800
canvas.height = 600
document.body.appendChild(canvas)

const engine = new RenderEngine({
  targetFPS: 60
})

const factory = new Canvas2DContextFactory()
await engine.initialize(factory, canvas)

const layer = engine.createLayer('main', 0)

interface DraggableShape {
  id: string
  x: number
  y: number
  width: number
  height: number
  color: string
  isDragging: boolean
  dragOffset: { x: number; y: number }
}

const shapes: DraggableShape[] = [
  { id: 'rect1', x: 100, y: 100, width: 100, height: 80, color: '#e74c3c', isDragging: false, dragOffset: { x: 0, y: 0 } },
  { id: 'rect2', x: 250, y: 150, width: 120, height: 100, color: '#3498db', isDragging: false, dragOffset: { x: 0, y: 0 } },
  { id: 'rect3', x: 420, y: 120, width: 90, height: 90, color: '#2ecc71', isDragging: false, dragOffset: { x: 0, y: 0 } }
]

let selectedShape: DraggableShape | null = null

const renderable = {
  id: 'interactive-shapes',
  get bounds() {
    return { x: 0, y: 0, width: canvas.width, height: canvas.height }
  },
  visible: true,
  zIndex: 0,
  render(context: any) {
    shapes.forEach(shape => {
      context.fillStyle = shape.color
      context.strokeStyle = shape === selectedShape ? '#f39c12' : '#34495e'
      context.lineWidth = shape === selectedShape ? 3 : 1
      
      context.fillRect(shape.x, shape.y, shape.width, shape.height)
      context.strokeRect(shape.x, shape.y, shape.width, shape.height)
      
      if (shape === selectedShape) {
        context.fillStyle = '#fff'
        context.font = '12px Arial'
        context.fillText(shape.id, shape.x + 5, shape.y + 15)
      }
    })
  },
  hitTest: (point: { x: number; y: number }) => {
    return shapes.some(shape =>
      point.x >= shape.x &&
      point.x <= shape.x + shape.width &&
      point.y >= shape.y &&
      point.y <= shape.y + shape.height
    )
  },
  getBounds: () => ({ x: 0, y: 0, width: canvas.width, height: canvas.height }),
  dispose: () => {}
}

layer.addRenderable(renderable)
engine.start()

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i]
    if (
      x >= shape.x &&
      x <= shape.x + shape.width &&
      y >= shape.y &&
      y <= shape.y + shape.height
    ) {
      selectedShape = shape
      shape.isDragging = true
      shape.dragOffset = { x: x - shape.x, y: y - shape.y }
      
      shapes.splice(i, 1)
      shapes.push(shape)
      break
    }
  }
})

canvas.addEventListener('mousemove', (e) => {
  if (!selectedShape || !selectedShape.isDragging) return
  
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  selectedShape.x = x - selectedShape.dragOffset.x
  selectedShape.y = y - selectedShape.dragOffset.y
  
  selectedShape.x = Math.max(0, Math.min(canvas.width - selectedShape.width, selectedShape.x))
  selectedShape.y = Math.max(0, Math.min(canvas.height - selectedShape.height, selectedShape.y))
  
  engine.render()
})

canvas.addEventListener('mouseup', () => {
  if (selectedShape) {
    selectedShape.isDragging = false
  }
})

canvas.addEventListener('mouseleave', () => {
  if (selectedShape) {
    selectedShape.isDragging = false
  }
})

const animate = () => {
  engine.render()
  requestAnimationFrame(animate)
}

requestAnimationFrame(animate)

console.log('Drag shapes to move them around')
