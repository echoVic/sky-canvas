import { EventEmitter } from 'eventemitter3'
import type { IPoint } from '../graphics/IGraphicsContext'
import { GestureRecognizer, GestureState, GestureType } from './GestureRecognizer'
import {
  BaseEvent,
  type IGestureEvent as IInternalGestureEvent,
  type ITouchEvent as IInternalTouchEvent,
  InputState,
  type ITouch,
} from './InputEvents'

export interface IMouseEvent {
  type: 'mousedown' | 'mouseup' | 'mousemove' | 'click' | 'dblclick' | 'wheel'
  x: number
  y: number
  button: number
  buttons: number
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  deltaX?: number
  deltaY?: number
  timestamp: number
}

export interface IKeyboardEvent {
  type: 'keydown' | 'keyup' | 'keypress'
  key: string
  code: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  repeat: boolean
  timestamp: number
}

export interface ITouchEvent {
  type: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel'
  touches: ITouchPoint[]
  changedTouches: ITouchPoint[]
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
  timestamp: number
}

export interface ITouchPoint {
  identifier: number
  x: number
  y: number
  force?: number
  radiusX?: number
  radiusY?: number
}

export interface IGestureEvent {
  type: GestureType
  state: GestureState
  position: IPoint
  scale?: number
  rotation?: number
  velocity?: IPoint
  timestamp: number
}

export interface InputManagerEvents {
  mousedown: IMouseEvent
  mouseup: IMouseEvent
  mousemove: IMouseEvent
  click: IMouseEvent
  dblclick: IMouseEvent
  wheel: IMouseEvent
  keydown: IKeyboardEvent
  keyup: IKeyboardEvent
  keypress: IKeyboardEvent
  touchstart: ITouchEvent
  touchmove: ITouchEvent
  touchend: ITouchEvent
  touchcancel: ITouchEvent
  gesture: IGestureEvent
  tap: IGestureEvent
  doubletap: IGestureEvent
  longpress: IGestureEvent
  pinch: IGestureEvent
  rotate: IGestureEvent
  pan: IGestureEvent
}

export interface InputManagerConfig {
  enableMouse?: boolean
  enableKeyboard?: boolean
  enableTouch?: boolean
  enableGestures?: boolean
  preventDefaultEvents?: boolean
  capturePointer?: boolean
}

export class InputManager extends EventEmitter<InputManagerEvents> {
  private _element: HTMLElement | null = null
  private _inputState: InputState
  private _gestureRecognizer: GestureRecognizer
  private _config: Required<InputManagerConfig>
  private _isEnabled: boolean = true
  private _boundHandlers: Map<string, EventListener> = new Map()

  constructor(config: InputManagerConfig = {}) {
    super()
    this._config = {
      enableMouse: config.enableMouse ?? true,
      enableKeyboard: config.enableKeyboard ?? true,
      enableTouch: config.enableTouch ?? true,
      enableGestures: config.enableGestures ?? true,
      preventDefaultEvents: config.preventDefaultEvents ?? false,
      capturePointer: config.capturePointer ?? false,
    }

    this._inputState = new InputState()
    this._gestureRecognizer = new GestureRecognizer()

    this._setupGestureListeners()
  }

  attach(element: HTMLElement): void {
    if (this._element) {
      this.detach()
    }

    this._element = element
    this._bindEventListeners()
  }

  detach(): void {
    if (!this._element) return

    this._unbindEventListeners()
    this._element = null
  }

  enable(): void {
    this._isEnabled = true
  }

  disable(): void {
    this._isEnabled = false
  }

  get isEnabled(): boolean {
    return this._isEnabled
  }

  get inputState(): InputState {
    return this._inputState
  }

  get mousePosition(): IPoint {
    return this._inputState.mousePosition
  }

  isKeyPressed(key: string): boolean {
    return this._inputState.isKeyDown(key)
  }

  isMouseButtonPressed(button: number): boolean {
    return this._inputState.isMouseButtonDown(button)
  }

  private _bindEventListeners(): void {
    if (!this._element) return

    if (this._config.enableMouse) {
      this._bindHandler('mousedown', this._handleMouseDown.bind(this))
      this._bindHandler('mouseup', this._handleMouseUp.bind(this))
      this._bindHandler('mousemove', this._handleMouseMove.bind(this))
      this._bindHandler('click', this._handleClick.bind(this))
      this._bindHandler('dblclick', this._handleDblClick.bind(this))
      this._bindHandler('wheel', this._handleWheel.bind(this))
      this._bindHandler('contextmenu', this._handleContextMenu.bind(this))
    }

    if (this._config.enableKeyboard) {
      this._bindHandler('keydown', this._handleKeyDown.bind(this), window)
      this._bindHandler('keyup', this._handleKeyUp.bind(this), window)
    }

    if (this._config.enableTouch) {
      this._bindHandler('touchstart', this._handleTouchStart.bind(this))
      this._bindHandler('touchmove', this._handleTouchMove.bind(this))
      this._bindHandler('touchend', this._handleTouchEnd.bind(this))
      this._bindHandler('touchcancel', this._handleTouchCancel.bind(this))
    }
  }

  private _bindHandler(
    event: string,
    handler: EventListener,
    target: EventTarget = this._element!
  ): void {
    target.addEventListener(event, handler, { passive: !this._config.preventDefaultEvents })
    this._boundHandlers.set(`${event}-${target === window ? 'window' : 'element'}`, handler)
  }

  private _unbindEventListeners(): void {
    if (!this._element) return

    this._boundHandlers.forEach((handler, key) => {
      const [event, targetType] = key.split('-')
      const target = targetType === 'window' ? window : this._element!
      target.removeEventListener(event, handler)
    })

    this._boundHandlers.clear()
  }

  private _setupGestureListeners(): void {
    this._gestureRecognizer.addEventListener<IInternalGestureEvent>('gesture', (event) => {
      if (!this._isEnabled) return

      const gestureEvent: IGestureEvent = {
        type: GestureType.TAP,
        state: GestureState.ENDED,
        position: event.center || { x: 0, y: 0 },
        scale: event.scale,
        rotation: event.rotation,
        velocity: event.velocity ? { x: event.velocity.x, y: event.velocity.y } : undefined,
        timestamp: event.timestamp || Date.now(),
      }

      this.emit('gesture', gestureEvent)

      switch (gestureEvent.type) {
        case GestureType.TAP:
          this.emit('tap', gestureEvent)
          break
        case GestureType.DOUBLE_TAP:
          this.emit('doubletap', gestureEvent)
          break
        case GestureType.LONG_PRESS:
          this.emit('longpress', gestureEvent)
          break
        case GestureType.PINCH:
          this.emit('pinch', gestureEvent)
          break
        case GestureType.ROTATE:
          this.emit('rotate', gestureEvent)
          break
        case GestureType.PAN:
          this.emit('pan', gestureEvent)
          break
      }
    })
  }

  private _createMouseEvent(e: MouseEvent, type: IMouseEvent['type']): IMouseEvent {
    const rect = this._element?.getBoundingClientRect()
    return {
      type,
      x: rect ? e.clientX - rect.left : e.clientX,
      y: rect ? e.clientY - rect.top : e.clientY,
      button: e.button,
      buttons: e.buttons,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      timestamp: e.timeStamp,
    }
  }

  private _handleMouseDown(e: Event): void {
    if (!this._isEnabled) return
    const mouseEvent = e as MouseEvent
    if (this._config.preventDefaultEvents) e.preventDefault()

    this._inputState.setMouseButtonDown(mouseEvent.button)
    this._inputState.setMousePosition({ x: mouseEvent.clientX, y: mouseEvent.clientY })

    const event = this._createMouseEvent(mouseEvent, 'mousedown')
    this.emit('mousedown', event)
  }

  private _handleMouseUp(e: Event): void {
    if (!this._isEnabled) return
    const mouseEvent = e as MouseEvent
    if (this._config.preventDefaultEvents) e.preventDefault()

    this._inputState.setMouseButtonUp(mouseEvent.button)

    const event = this._createMouseEvent(mouseEvent, 'mouseup')
    this.emit('mouseup', event)
  }

  private _handleMouseMove(e: Event): void {
    if (!this._isEnabled) return
    const mouseEvent = e as MouseEvent
    if (this._config.preventDefaultEvents) e.preventDefault()

    this._inputState.setMousePosition({ x: mouseEvent.clientX, y: mouseEvent.clientY })

    const event = this._createMouseEvent(mouseEvent, 'mousemove')
    this.emit('mousemove', event)
  }

  private _handleClick(e: Event): void {
    if (!this._isEnabled) return
    const mouseEvent = e as MouseEvent
    if (this._config.preventDefaultEvents) e.preventDefault()

    const event = this._createMouseEvent(mouseEvent, 'click')
    this.emit('click', event)
  }

  private _handleDblClick(e: Event): void {
    if (!this._isEnabled) return
    const mouseEvent = e as MouseEvent
    if (this._config.preventDefaultEvents) e.preventDefault()

    const event = this._createMouseEvent(mouseEvent, 'dblclick')
    this.emit('dblclick', event)
  }

  private _handleWheel(e: Event): void {
    if (!this._isEnabled) return
    const wheelEvent = e as WheelEvent
    if (this._config.preventDefaultEvents) e.preventDefault()

    const event = this._createMouseEvent(wheelEvent, 'wheel')
    event.deltaX = wheelEvent.deltaX
    event.deltaY = wheelEvent.deltaY
    this.emit('wheel', event)
  }

  private _handleContextMenu(e: Event): void {
    if (this._config.preventDefaultEvents) {
      e.preventDefault()
    }
  }

  private _handleKeyDown(e: Event): void {
    if (!this._isEnabled) return
    const keyEvent = e as KeyboardEvent

    this._inputState.setKeyDown(keyEvent.code)
    this._inputState.setModifiers({
      ctrl: keyEvent.ctrlKey,
      shift: keyEvent.shiftKey,
      alt: keyEvent.altKey,
      meta: keyEvent.metaKey,
    })

    const event: IKeyboardEvent = {
      type: 'keydown',
      key: keyEvent.key,
      code: keyEvent.code,
      ctrlKey: keyEvent.ctrlKey,
      shiftKey: keyEvent.shiftKey,
      altKey: keyEvent.altKey,
      metaKey: keyEvent.metaKey,
      repeat: keyEvent.repeat,
      timestamp: keyEvent.timeStamp,
    }

    this.emit('keydown', event)
  }

  private _handleKeyUp(e: Event): void {
    if (!this._isEnabled) return
    const keyEvent = e as KeyboardEvent

    this._inputState.setKeyUp(keyEvent.code)
    this._inputState.setModifiers({
      ctrl: keyEvent.ctrlKey,
      shift: keyEvent.shiftKey,
      alt: keyEvent.altKey,
      meta: keyEvent.metaKey,
    })

    const event: IKeyboardEvent = {
      type: 'keyup',
      key: keyEvent.key,
      code: keyEvent.code,
      ctrlKey: keyEvent.ctrlKey,
      shiftKey: keyEvent.shiftKey,
      altKey: keyEvent.altKey,
      metaKey: keyEvent.metaKey,
      repeat: keyEvent.repeat,
      timestamp: keyEvent.timeStamp,
    }

    this.emit('keyup', event)
  }

  private _createTouchEvent(e: globalThis.TouchEvent, type: ITouchEvent['type']): ITouchEvent {
    const rect = this._element?.getBoundingClientRect()
    const mapTouch = (touch: Touch): ITouchPoint => ({
      identifier: touch.identifier,
      x: rect ? touch.clientX - rect.left : touch.clientX,
      y: rect ? touch.clientY - rect.top : touch.clientY,
      force: touch.force,
      radiusX: touch.radiusX,
      radiusY: touch.radiusY,
    })

    return {
      type,
      touches: Array.from(e.touches).map(mapTouch),
      changedTouches: Array.from(e.changedTouches).map(mapTouch),
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey,
      timestamp: e.timeStamp,
    }
  }

  private _convertToInternalTouchEvent(
    e: globalThis.TouchEvent,
    type: string
  ): IInternalTouchEvent {
    const rect = this._element?.getBoundingClientRect()
    const mapTouch = (touch: Touch): ITouch => ({
      identifier: touch.identifier,
      screenPosition: { x: touch.clientX, y: touch.clientY },
      worldPosition: {
        x: rect ? touch.clientX - rect.left : touch.clientX,
        y: rect ? touch.clientY - rect.top : touch.clientY,
      },
      force: touch.force,
      radiusX: touch.radiusX,
      radiusY: touch.radiusY,
    })

    const baseEvent = new BaseEvent(type)
    return {
      type: baseEvent.type,
      timestamp: baseEvent.timestamp,
      preventDefault: () => baseEvent.preventDefault(),
      stopPropagation: () => baseEvent.stopPropagation(),
      isDefaultPrevented: () => baseEvent.isDefaultPrevented(),
      isPropagationStopped: () => baseEvent.isPropagationStopped(),
      touches: Array.from(e.touches).map(mapTouch),
      changedTouches: Array.from(e.changedTouches).map(mapTouch),
      targetTouches: Array.from(e.targetTouches).map(mapTouch),
    }
  }

  private _handleTouchStart(e: Event): void {
    if (!this._isEnabled) return
    const touchEvent = e as globalThis.TouchEvent
    if (this._config.preventDefaultEvents) e.preventDefault()

    if (this._config.enableGestures) {
      const internalEvent = this._convertToInternalTouchEvent(touchEvent, 'touchstart')
      this._gestureRecognizer.handleTouchStart(internalEvent)
    }

    const event = this._createTouchEvent(touchEvent, 'touchstart')
    this.emit('touchstart', event)
  }

  private _handleTouchMove(e: Event): void {
    if (!this._isEnabled) return
    const touchEvent = e as globalThis.TouchEvent
    if (this._config.preventDefaultEvents) e.preventDefault()

    if (this._config.enableGestures) {
      const internalEvent = this._convertToInternalTouchEvent(touchEvent, 'touchmove')
      this._gestureRecognizer.handleTouchMove(internalEvent)
    }

    const event = this._createTouchEvent(touchEvent, 'touchmove')
    this.emit('touchmove', event)
  }

  private _handleTouchEnd(e: Event): void {
    if (!this._isEnabled) return
    const touchEvent = e as globalThis.TouchEvent
    if (this._config.preventDefaultEvents) e.preventDefault()

    if (this._config.enableGestures) {
      const internalEvent = this._convertToInternalTouchEvent(touchEvent, 'touchend')
      this._gestureRecognizer.handleTouchEnd(internalEvent)
    }

    const event = this._createTouchEvent(touchEvent, 'touchend')
    this.emit('touchend', event)
  }

  private _handleTouchCancel(e: Event): void {
    if (!this._isEnabled) return
    const touchEvent = e as globalThis.TouchEvent

    if (this._config.enableGestures) {
      const internalEvent = this._convertToInternalTouchEvent(touchEvent, 'touchcancel')
      this._gestureRecognizer.handleTouchCancel(internalEvent)
    }

    const event = this._createTouchEvent(touchEvent, 'touchcancel')
    this.emit('touchcancel', event)
  }

  onMouseDown(handler: (event: IMouseEvent) => void): () => void {
    this.on('mousedown', handler)
    return () => this.off('mousedown', handler)
  }

  onMouseUp(handler: (event: IMouseEvent) => void): () => void {
    this.on('mouseup', handler)
    return () => this.off('mouseup', handler)
  }

  onMouseMove(handler: (event: IMouseEvent) => void): () => void {
    this.on('mousemove', handler)
    return () => this.off('mousemove', handler)
  }

  onClick(handler: (event: IMouseEvent) => void): () => void {
    this.on('click', handler)
    return () => this.off('click', handler)
  }

  onWheel(handler: (event: IMouseEvent) => void): () => void {
    this.on('wheel', handler)
    return () => this.off('wheel', handler)
  }

  onKeyDown(handler: (event: IKeyboardEvent) => void): () => void {
    this.on('keydown', handler)
    return () => this.off('keydown', handler)
  }

  onKeyUp(handler: (event: IKeyboardEvent) => void): () => void {
    this.on('keyup', handler)
    return () => this.off('keyup', handler)
  }

  onTouchStart(handler: (event: ITouchEvent) => void): () => void {
    this.on('touchstart', handler)
    return () => this.off('touchstart', handler)
  }

  onTouchMove(handler: (event: ITouchEvent) => void): () => void {
    this.on('touchmove', handler)
    return () => this.off('touchmove', handler)
  }

  onTouchEnd(handler: (event: ITouchEvent) => void): () => void {
    this.on('touchend', handler)
    return () => this.off('touchend', handler)
  }

  onGesture(handler: (event: IGestureEvent) => void): () => void {
    this.on('gesture', handler)
    return () => this.off('gesture', handler)
  }

  onTap(handler: (event: IGestureEvent) => void): () => void {
    this.on('tap', handler)
    return () => this.off('tap', handler)
  }

  onDoubleTap(handler: (event: IGestureEvent) => void): () => void {
    this.on('doubletap', handler)
    return () => this.off('doubletap', handler)
  }

  onLongPress(handler: (event: IGestureEvent) => void): () => void {
    this.on('longpress', handler)
    return () => this.off('longpress', handler)
  }

  onPinch(handler: (event: IGestureEvent) => void): () => void {
    this.on('pinch', handler)
    return () => this.off('pinch', handler)
  }

  onRotate(handler: (event: IGestureEvent) => void): () => void {
    this.on('rotate', handler)
    return () => this.off('rotate', handler)
  }

  onPan(handler: (event: IGestureEvent) => void): () => void {
    this.on('pan', handler)
    return () => this.off('pan', handler)
  }

  dispose(): void {
    this.detach()
    this.removeAllListeners()
    this._gestureRecognizer.dispose()
  }
}

export function createInputManager(
  element: HTMLElement,
  config?: InputManagerConfig
): InputManager {
  const manager = new InputManager(config)
  manager.attach(element)
  return manager
}
