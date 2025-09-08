/**
 * 事件总线系统 - 基于VSCode的事件机制设计
 * 提供统一的事件发布订阅机制
 */

export interface IDisposable {
  dispose(): void;
}

export interface IEvent<T> {
  (listener: (e: T) => any, thisArg?: any, disposables?: IDisposable[]): IDisposable;
}

interface Listener<T> {
  listener: (e: T) => any;
  thisArg?: any;
}

class LinkedList<T> {
  private _first: Node<T> | undefined;
  private _last: Node<T> | undefined;
  private _size = 0;

  get size(): number {
    return this._size;
  }

  push(element: T): () => void {
    const node = new Node(element);
    if (!this._first) {
      this._first = node;
      this._last = node;
    } else {
      this._last!.next = node;
      node.prev = this._last;
      this._last = node;
    }
    this._size++;

    return () => {
      this._remove(node);
    };
  }

  private _remove(node: Node<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this._first = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this._last = node.prev;
    }

    this._size--;
  }

  *[Symbol.iterator](): Iterator<T> {
    let node = this._first;
    while (node) {
      yield node.element;
      node = node.next;
    }
  }

  clear(): void {
    this._first = undefined;
    this._last = undefined;
    this._size = 0;
  }
}

class Node<T> {
  element: T;
  next: Node<T> | undefined;
  prev: Node<T> | undefined;

  constructor(element: T) {
    this.element = element;
  }
}

export class Emitter<T> {
  private _event?: IEvent<T>;
  private _listeners?: LinkedList<Listener<T>>;
  private _disposed = false;

  get event(): IEvent<T> {
    if (!this._event) {
      this._event = (listener, thisArg, disposables) => {
        if (this._disposed) {
          return { dispose: () => {} };
        }

        if (!this._listeners) {
          this._listeners = new LinkedList();
        }

        const remove = this._listeners.push({
          listener,
          thisArg
        });

        const result = {
          dispose: () => {
            if (!this._disposed) {
              remove();
            }
          }
        };

        if (disposables) {
          disposables.push(result);
        }

        return result;
      };
    }
    return this._event;
  }

  fire(event: T): void {
    if (this._disposed || !this._listeners) {
      return;
    }

    for (const listener of this._listeners) {
      try {
        listener.listener.call(listener.thisArg, event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    }
  }

  dispose(): void {
    if (this._listeners) {
      this._listeners.clear();
    }
    this._disposed = true;
  }
}

export class DisposableStore implements IDisposable {
  private _disposables = new Set<IDisposable>();
  private _isDisposed = false;

  add<T extends IDisposable>(disposable: T): T {
    if (this._isDisposed) {
      disposable.dispose();
    } else {
      this._disposables.add(disposable);
    }
    return disposable;
  }

  dispose(): void {
    if (this._isDisposed) {
      return;
    }

    this._isDisposed = true;
    this._disposables.forEach(d => d.dispose());
    this._disposables.clear();
  }
}

/**
 * 全局事件总线
 */
export class EventBus {
  private _emitters = new Map<string, Emitter<any>>();
  private _disposed = false;

  getEvent<T>(eventName: string): IEvent<T> {
    if (this._disposed) {
      throw new Error('EventBus is disposed');
    }

    if (!this._emitters.has(eventName)) {
      this._emitters.set(eventName, new Emitter<T>());
    }
    return this._emitters.get(eventName)!.event;
  }

  fire<T>(eventName: string, event: T): void {
    if (this._disposed) {
      return;
    }

    const emitter = this._emitters.get(eventName);
    if (emitter) {
      emitter.fire(event);
    }
  }

  // 实现IEventBusService接口
  emit<T>(eventName: string, data: T): void {
    this.fire(eventName, data);
  }

  on<T>(eventName: string, listener: (data: T) => void): IDisposable {
    return this.getEvent<T>(eventName)(listener);
  }

  once<T>(eventName: string, listener: (data: T) => void): IDisposable {
    const disposable = this.on<T>(eventName, (data) => {
      listener(data);
      disposable.dispose();
    });
    return disposable;
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._disposed = true;
    this._emitters.forEach(emitter => emitter.dispose());
    this._emitters.clear();
  }
}

/**
 * 消息接口定义
 */
export interface IMessage {
  readonly id: string;
  readonly type: string;
  readonly source: string;
  readonly target?: string;
  readonly data: any;
  readonly timestamp: number;
}

export interface IMessageHandler {
  handle(message: IMessage): Promise<any>;
}

export interface IMessageMiddleware {
  process(message: IMessage): Promise<IMessage>;
}

/**
 * 消息路由器
 */
export class MessageRouter {
  private _routes = new Map<string, IMessageHandler[]>();
  private _middleware: IMessageMiddleware[] = [];
  private _disposed = false;

  register(messageType: string, handler: IMessageHandler): IDisposable {
    if (this._disposed) {
      throw new Error('MessageRouter is disposed');
    }

    if (!this._routes.has(messageType)) {
      this._routes.set(messageType, []);
    }

    const handlers = this._routes.get(messageType)!;
    handlers.push(handler);

    return {
      dispose: () => {
        const index = handlers.indexOf(handler);
        if (index >= 0) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  async send(message: IMessage): Promise<any> {
    if (this._disposed) {
      throw new Error('MessageRouter is disposed');
    }

    // 应用中间件
    let processedMessage = message;
    for (const middleware of this._middleware) {
      processedMessage = await middleware.process(processedMessage);
    }

    // 路由消息
    const handlers = this._routes.get(processedMessage.type) || [];
    const results = await Promise.all(
      handlers.map(handler => handler.handle(processedMessage))
    );

    return results.length === 1 ? results[0] : results;
  }

  use(middleware: IMessageMiddleware): void {
    if (this._disposed) {
      throw new Error('MessageRouter is disposed');
    }
    this._middleware.push(middleware);
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._disposed = true;
    this._routes.clear();
    this._middleware = [];
  }
}

/**
 * 状态同步事件
 */
export interface IStateChangeEvent {
  readonly key: string;
  readonly oldValue: any;
  readonly newValue: any;
  readonly source?: string;
}

export interface IStateSubscriber {
  onStateChanged(event: IStateChangeEvent): void;
}

/**
 * 状态同步服务
 */
export class StateSynchronizationService {
  private _stateStore = new Map<string, any>();
  private _subscribers = new Map<string, Set<IStateSubscriber>>();
  private _eventBus: EventBus;
  private _disposed = false;

  constructor(eventBus: EventBus) {
    this._eventBus = eventBus;
  }

  setState(key: string, value: any, source?: string): void {
    if (this._disposed) {
      return;
    }

    const oldValue = this._stateStore.get(key);
    this._stateStore.set(key, value);

    // 通知订阅者
    const subscribers = this._subscribers.get(key);
    if (subscribers) {
      const event: IStateChangeEvent = {
        key,
        oldValue,
        newValue: value,
        ...(source && { source })
      };

      subscribers.forEach(subscriber => {
        try {
          subscriber.onStateChanged(event);
        } catch (error) {
          console.error('State subscriber error:', error);
        }
      });
    }

    // 发送全局事件
    this._eventBus.fire('stateChanged', { key, oldValue, newValue: value, source });
  }

  getState<T>(key: string): T | undefined {
    return this._stateStore.get(key);
  }

  subscribe(key: string, subscriber: IStateSubscriber): IDisposable {
    if (this._disposed) {
      return { dispose: () => {} };
    }

    if (!this._subscribers.has(key)) {
      this._subscribers.set(key, new Set());
    }

    this._subscribers.get(key)!.add(subscriber);

    return {
      dispose: () => {
        this._subscribers.get(key)?.delete(subscriber);
      }
    };
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._disposed = true;
    this._stateStore.clear();
    this._subscribers.clear();
  }
}
