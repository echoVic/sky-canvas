import { 
  RenderEngine, 
  Canvas2DContextFactory
} from '../src'
import { ParticleSystem } from '../src/animation/particles/ParticleSystem'

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

const particleSystem = new ParticleSystem({
  emission: {
    position: { min: { x: 400, y: 100 }, max: { x: 400, y: 100 } },
    velocity: { min: { x: -50, y: -50 }, max: { x: 50, y: 50 } },
    size: { min: 2, max: 8 },
    alpha: { min: 1, max: 1 },
    color: ['#e74c3c'],
    life: { min: 2000, max: 4000 },
    rate: 50
  },
  maxParticles: 1000,
  gravity: { x: 0, y: 100 },
  autoStart: true
})

const renderable = {
  id: 'particle-system',
  get bounds() {
    return { x: 0, y: 0, width: canvas.width, height: canvas.height }
  },
  visible: true,
  zIndex: 0,
  render(context: any) {
    const particles = particleSystem.particles
    
    particles.forEach(particle => {
      if (!particle.isAlive()) return
      
      context.save()
      context.globalAlpha = particle.alpha
      context.fillStyle = particle.color
      context.beginPath()
      context.arc(particle.position.x, particle.position.y, particle.size, 0, Math.PI * 2)
      context.fill()
      context.restore()
    })
  },
  hitTest: () => false,
  getBounds: () => ({ x: 0, y: 0, width: canvas.width, height: canvas.height }),
  dispose: () => {}
}

layer.addRenderable(renderable)
engine.start()

let lastTime = 0
const animate = (time: number) => {
  const deltaTime = time - lastTime
  lastTime = time
  
  particleSystem.update(deltaTime)
  engine.render()
  
  requestAnimationFrame(animate)
}

requestAnimationFrame(animate)

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  
  particleSystem.updateConfig({
    emission: {
      ...particleSystem.config.emission,
      position: { min: { x, y }, max: { x, y } }
    }
  })
})
