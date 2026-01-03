import { AnimationManager, Canvas2DContextFactory, EasingFunctions, EasingType, PropertyAnimation, RenderEngine } from '../src'

const canvas = document.createElement('canvas')
canvas.width = 800
canvas.height = 600
document.body.appendChild(canvas)

const engine = new RenderEngine({
  targetFPS: 60
})

const factory = new Canvas2DContextFactory()
await engine.initialize(factory, canvas)

const animationManager = new AnimationManager()

const box = {
  x: 50,
  y: 300,
  width: 50,
  height: 50,
  rotation: 0,
  opacity: 1
}

const moveAnimation = new PropertyAnimation({
  target: box,
  property: 'x',
  from: 50,
  to: 700,
  duration: 2000,
  easing: EasingFunctions.get(EasingType.EASE_IN_OUT_CUBIC),
  loop: true,
  yoyo: true
})

const rotateAnimation = new PropertyAnimation({
  target: box,
  property: 'rotation',
  from: 0,
  to: Math.PI * 2,
  duration: 2000,
  easing: EasingFunctions.get(EasingType.LINEAR),
  loop: true
})

animationManager.registerAnimation(moveAnimation)
animationManager.registerAnimation(rotateAnimation)
animationManager.start()

const layer = engine.createLayer('main', 0)

const renderable = {
  id: 'animated-box',
  get bounds() {
    return { x: box.x, y: box.y, width: box.width, height: box.height }
  },
  visible: true,
  zIndex: 0,
  render(context: any) {
    context.save()
    context.translate(box.x + box.width / 2, box.y + box.height / 2)
    context.rotate(box.rotation)
    context.globalAlpha = box.opacity
    context.fillStyle = '#3498db'
    context.fillRect(-box.width / 2, -box.height / 2, box.width, box.height)
    context.restore()
  },
  hitTest: () => false,
  getBounds: () => ({ x: box.x, y: box.y, width: box.width, height: box.height }),
  dispose: () => {}
}

layer.addRenderable(renderable)

moveAnimation.start()
rotateAnimation.start()
engine.start()

let lastTime = 0
const animate = (time: number) => {
  const deltaTime = time - lastTime
  lastTime = time
  
  engine.render()
  
  requestAnimationFrame(animate)
}

requestAnimationFrame(animate)
