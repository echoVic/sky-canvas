import { 
  RenderEngine, 
  Canvas2DContextFactory
} from '../src'

const canvas = document.createElement('canvas')
canvas.width = 800
canvas.height = 600
document.body.appendChild(canvas)

const engine = new RenderEngine({
  targetFPS: 60,
  enableCulling: true
})

const factory = new Canvas2DContextFactory()
await engine.initialize(factory, canvas)

const layer = engine.createLayer('main', 0)

const sprites: any[] = []
const spriteCount = 10000

for (let i = 0; i < spriteCount; i++) {
  sprites.push({
    id: `sprite-${i}`,
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    width: 10,
    height: 10,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    visible: true,
    zIndex: 0
  })
}

const renderable = {
  id: 'batch-sprites',
  get bounds() {
    return { x: 0, y: 0, width: canvas.width, height: canvas.height }
  },
  visible: true,
  zIndex: 0,
  render(context: any) {
    sprites.forEach(sprite => {
      sprite.x += sprite.vx
      sprite.y += sprite.vy
      
      if (sprite.x < 0 || sprite.x > canvas.width) sprite.vx *= -1
      if (sprite.y < 0 || sprite.y > canvas.height) sprite.vy *= -1
      
      context.fillStyle = sprite.color
      context.fillRect(sprite.x, sprite.y, sprite.width, sprite.height)
    })
  },
  hitTest: () => false,
  getBounds: () => ({ x: 0, y: 0, width: canvas.width, height: canvas.height }),
  dispose: () => {}
}

layer.addRenderable(renderable)
engine.start()

let frameCount = 0
let lastFpsUpdate = Date.now()

const animate = () => {
  engine.render()
  
  frameCount++
  const now = Date.now()
  if (now - lastFpsUpdate >= 1000) {
    console.log(`FPS: ${frameCount}, Sprites: ${spriteCount}`)
    frameCount = 0
    lastFpsUpdate = now
  }
  
  requestAnimationFrame(animate)
}

requestAnimationFrame(animate)
