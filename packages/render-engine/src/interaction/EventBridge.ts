/**
 * 事件桥接器 - 优化Canvas SDK与Render Engine之间的事件通信
 * 提供高效的事件批处理、优先级队列和智能过滤机制
 */

import { IPoint } from '../graphics/IGraphicsContext';
import { BridgeEventType, EventPriority, EVENT_CONSTANTS } from './EventTypes';

// 重新导出类型
export { BridgeEventType, EventPriority } from './EventTypes';


/**
 * 桥接事件接口
 */
export interface BridgeEvent {
  type: BridgeEventType;
  priority: EventPriority;
  data: any;
  timestamp: number;
  source: 'canvas-sdk' | 'render-engine';
  propagationStopped?: boolean;
  defaultPrevented?: boolean;
  id?: string;
}

/**
 * 事件监听器接口
 */
export interface BridgeEventListener {
  (event: BridgeEvent): void | Promise<void>;
  priority?: EventPriority;
  once?: boolean;
  passive?: boolean;
}

/**
 * 事件过滤器接口
 */
export interface EventFilter {
  (event: BridgeEvent): boolean;
}

/**
 * 事件转换器接口
 */
export interface EventTransformer {
  (event: BridgeEvent): BridgeEvent | null;
}

/**
 * 事件统计信息
 */
interface EventStats {
  type: BridgeEventType;
  count: number;
  averageProcessingTime: number;
  lastProcessTime: number;
  totalProcessingTime: number;
  errors: number;
}

/**
 * 事件队列管理器
 */
class EventQueueManager {
  private queues = new Map<EventPriority, BridgeEvent[]>();
  private processing = false;
  private maxQueueSize = 1000;
  private frameScheduled = false;
  
  constructor() {
    // 初始化所有优先级队列
    this.queues.set(EventPriority.IMMEDIATE, []);
    this.queues.set(EventPriority.HIGH, []);
    this.queues.set(EventPriority.NORMAL, []);
    this.queues.set(EventPriority.LOW, []);
    this.queues.set(EventPriority.IDLE, []);
  }
  
  /**
   * 添加事件到队列
   */
  enqueue(event: BridgeEvent): boolean {
    const queue = this.queues.get(event.priority);
    if (!queue) return false;
    
    // 检查队列大小限制
    if (queue.length >= this.maxQueueSize) {
      console.warn(`Event queue full for priority ${event.priority}, dropping event`);
      return false;
    }
    
    queue.push(event);
    this.scheduleProcessing();
    return true;
  }
  
  /**
   * 从队列中取出下一个事件
   */
  dequeue(): BridgeEvent | null {
    // 按优先级顺序处理
    for (const priority of [EventPriority.IMMEDIATE, EventPriority.HIGH, EventPriority.NORMAL, EventPriority.LOW, EventPriority.IDLE]) {
      const queue = this.queues.get(priority);
      if (queue && queue.length > 0) {
        return queue.shift()!;
      }
    }
    return null;
  }
  
  /**
   * 获取队列统计
   */
  getStats() {
    const stats: Record<string, number> = {};
    for (const [priority, queue] of this.queues) {
      stats[`priority_${priority}`] = queue.length;
    }
    return stats;
  }
  
  /**
   * 调度事件处理
   */
  private scheduleProcessing(): void {
    if (this.processing || this.frameScheduled) return;
    
    // 立即处理紧急事件
    const immediateQueue = this.queues.get(EventPriority.IMMEDIATE);
    if (immediateQueue && immediateQueue.length > 0) {
      this.processEvents(true);
      return;
    }
    
    // 其他事件在下一帧处理
    this.frameScheduled = true;
    requestAnimationFrame(() => {
      this.frameScheduled = false;
      this.processEvents();
    });
  }
  
  /**
   * 处理队列中的事件
   */
  async processEvents(immediate = false): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    
    const startTime = performance.now();
    const timeSlice = immediate ? Infinity : 5; // 5ms时间片
    
    try {
      while (performance.now() - startTime < timeSlice) {
        const event = this.dequeue();
        if (!event) break;
        
        // 触发事件处理
        this.onEventReady?.(event);
      }
    } finally {
      this.processing = false;
      
      // 如果还有事件，继续调度
      if (this.hasEvents()) {
        this.scheduleProcessing();
      }
    }
  }
  
  /**
   * 检查是否还有待处理事件
   */
  private hasEvents(): boolean {
    for (const queue of this.queues.values()) {
      if (queue.length > 0) return true;
    }
    return false;
  }
  
  /**
   * 事件就绪回调
   */
  onEventReady?: (event: BridgeEvent) => void;
  
  /**
   * 清空所有队列
   */
  clear(): void {
    for (const queue of this.queues.values()) {
      queue.length = 0;
    }
  }
  
  dispose(): void {
    this.clear();
    this.processing = false;
    this.frameScheduled = false;
    this.onEventReady = undefined;
  }
}

/**
 * 事件去重器
 */
class EventDeduplicator {
  private recentEvents = new Map<string, number>();
  private deduplicationWindow = EVENT_CONSTANTS.DEDUPLICATION_WINDOW;
  
  /**
   * 检查事件是否重复
   */
  isDuplicate(event: BridgeEvent): boolean {
    const key = this.generateEventKey(event);
    const now = performance.now();
    const lastTime = this.recentEvents.get(key);
    
    if (lastTime && now - lastTime < this.deduplicationWindow) {
      return true;
    }
    
    this.recentEvents.set(key, now);
    this.cleanupOldEntries(now);
    return false;
  }
  
  private generateEventKey(event: BridgeEvent): string {
    switch (event.type) {
      case BridgeEventType.MOUSE_MOVE:
        const mouseData = event.data as { x: number; y: number };
        return `${event.type}_${Math.round(mouseData.x / 5) * 5}_${Math.round(mouseData.y / 5) * 5}`;
      
      case BridgeEventType.TOUCH_MOVE:
        const touchData = event.data as { touches: IPoint[] };
        if (touchData.touches.length > 0) {
          const t = touchData.touches[0];
          return `${event.type}_${Math.round(t.x / 5) * 5}_${Math.round(t.y / 5) * 5}`;
        }
        break;
      
      default:
        return `${event.type}_${event.timestamp}`;
    }
    
    return `${event.type}_${event.timestamp}`;
  }
  
  private cleanupOldEntries(now: number): void {
    const cutoff = now - this.deduplicationWindow * 2;
    
    for (const [key, time] of this.recentEvents) {
      if (time < cutoff) {
        this.recentEvents.delete(key);
      }
    }
  }
  
  dispose(): void {
    this.recentEvents.clear();
  }
}

/**
 * 事件桥接器主类
 */
export class EventBridge {
  private listeners = new Map<BridgeEventType, Set<BridgeEventListener>>();
  private globalListeners = new Set<BridgeEventListener>();
  private filters = new Map<BridgeEventType, Set<EventFilter>>();
  private transformers = new Map<BridgeEventType, Set<EventTransformer>>();
  
  private queueManager = new EventQueueManager();
  private deduplicator = new EventDeduplicator();
  
  private stats = new Map<BridgeEventType, EventStats>();
  private totalEventsProcessed = 0;
  private isEnabled = true;
  
  // 配置
  private config = {
    enableBatching: true,
    enableDeduplication: true,
    enableStats: true,
    enableFiltering: true,
    maxListenersPerEvent: EVENT_CONSTANTS.MAX_LISTENERS_PER_EVENT,
    eventTimeout: EVENT_CONSTANTS.EVENT_TIMEOUT
  };
  
  constructor() {
    this.queueManager.onEventReady = (event) => this.dispatchEvent(event);
    this.initializeStats();
  }
  
  /**
   * 添加事件监听器
   */
  addEventListener(type: BridgeEventType | '*', listener: BridgeEventListener): void {
    if (type === '*') {
      this.globalListeners.add(listener);
    } else {
      if (!this.listeners.has(type)) {
        this.listeners.set(type, new Set());
      }
      
      const listeners = this.listeners.get(type)!;
      
      if (listeners.size >= this.config.maxListenersPerEvent) {
        console.warn(`Too many listeners for event ${type}, limit is ${this.config.maxListenersPerEvent}`);
        return;
      }
      
      listeners.add(listener);
    }
  }
  
  /**
   * 移除事件监听器
   */
  removeEventListener(type: BridgeEventType | '*', listener: BridgeEventListener): void {
    if (type === '*') {
      this.globalListeners.delete(listener);
    } else {
      const listeners = this.listeners.get(type);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(type);
        }
      }
    }
  }
  
  /**
   * 添加事件过滤器
   */
  addFilter(type: BridgeEventType, filter: EventFilter): void {
    if (!this.filters.has(type)) {
      this.filters.set(type, new Set());
    }
    this.filters.get(type)!.add(filter);
  }
  
  /**
   * 移除事件过滤器
   */
  removeFilter(type: BridgeEventType, filter: EventFilter): void {
    const filters = this.filters.get(type);
    if (filters) {
      filters.delete(filter);
      if (filters.size === 0) {
        this.filters.delete(type);
      }
    }
  }
  
  /**
   * 添加事件转换器
   */
  addTransformer(type: BridgeEventType, transformer: EventTransformer): void {
    if (!this.transformers.has(type)) {
      this.transformers.set(type, new Set());
    }
    this.transformers.get(type)!.add(transformer);
  }
  
  /**
   * 发射事件
   */
  emit(type: BridgeEventType, data: any, priority = EventPriority.NORMAL, source: 'canvas-sdk' | 'render-engine' = 'canvas-sdk'): void {
    if (!this.isEnabled) return;
    
    const event: BridgeEvent = {
      type,
      priority,
      data,
      timestamp: performance.now(),
      source,
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    // 去重检查
    if (this.config.enableDeduplication && this.deduplicator.isDuplicate(event)) {
      return;
    }
    
    // 应用转换器
    let transformedEvent = this.applyTransformers(event);
    if (!transformedEvent) return;
    
    // 应用过滤器
    if (this.config.enableFiltering && !this.applyFilters(transformedEvent)) {
      return;
    }
    
    // 加入队列或立即处理
    if (this.config.enableBatching && priority !== EventPriority.IMMEDIATE) {
      this.queueManager.enqueue(transformedEvent);
    } else {
      this.dispatchEvent(transformedEvent);
    }
  }
  
  /**
   * 批量发射事件
   */
  emitBatch(events: Array<{
    type: BridgeEventType;
    data: any;
    priority?: EventPriority;
    source?: 'canvas-sdk' | 'render-engine';
  }>): void {
    // 简化实现：直接处理事件批次，不依赖外部优化器
    for (const eventData of events) {
      this.emit(
        eventData.type,
        eventData.data,
        eventData.priority || EventPriority.NORMAL,
        eventData.source || 'canvas-sdk'
      );
    }
  }
  
  /**
   * 分发事件到监听器
   */
  private async dispatchEvent(event: BridgeEvent): Promise<void> {
    if (!this.isEnabled || event.propagationStopped) return;
    
    const startTime = performance.now();
    let listenersNotified = 0;
    
    try {
      // 通知类型特定的监听器
      const typeListeners = this.listeners.get(event.type);
      if (typeListeners) {
        for (const listener of typeListeners) {
          if (event.propagationStopped) break;
          
          try {
            await this.callListener(listener, event);
            listenersNotified++;
            
            // 检查once标记
            if (listener.once) {
              typeListeners.delete(listener);
            }
          } catch (error) {
            console.error(`Error in event listener for ${event.type}:`, error);
            this.updateStats(event.type, 0, true);
          }
        }
      }
      
      // 通知全局监听器
      if (!event.propagationStopped) {
        for (const listener of this.globalListeners) {
          if (event.propagationStopped) break;
          
          try {
            await this.callListener(listener, event);
            listenersNotified++;
            
            // 检查once标记
            if (listener.once) {
              this.globalListeners.delete(listener);
            }
          } catch (error) {
            console.error(`Error in global event listener:`, error);
          }
        }
      }
      
      // 更新统计
      const processingTime = performance.now() - startTime;
      this.updateStats(event.type, processingTime);
      this.totalEventsProcessed++;
      
      // 性能警告
      if (processingTime > 16) {
        console.warn(`Slow event processing: ${event.type} took ${processingTime.toFixed(2)}ms with ${listenersNotified} listeners`);
      }
      
    } catch (error) {
      console.error(`Error dispatching event ${event.type}:`, error);
    }
  }
  
  /**
   * 调用监听器
   */
  private async callListener(listener: BridgeEventListener, event: BridgeEvent): Promise<void> {
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Event listener timeout')), this.config.eventTimeout);
    });
    
    const listenerCall = Promise.resolve(listener(event));
    
    await Promise.race([listenerCall, timeout]);
  }
  
  /**
   * 应用事件转换器
   */
  private applyTransformers(event: BridgeEvent): BridgeEvent | null {
    const transformers = this.transformers.get(event.type);
    if (!transformers) return event;
    
    let transformed = event;
    
    for (const transformer of transformers) {
      try {
        const result = transformer(transformed);
        if (result === null) return null; // 转换器可以取消事件
        transformed = result;
      } catch (error) {
        console.error(`Error in event transformer for ${event.type}:`, error);
      }
    }
    
    return transformed;
  }
  
  /**
   * 应用事件过滤器
   */
  private applyFilters(event: BridgeEvent): boolean {
    const filters = this.filters.get(event.type);
    if (!filters) return true;
    
    for (const filter of filters) {
      try {
        if (!filter(event)) {
          return false;
        }
      } catch (error) {
        console.error(`Error in event filter for ${event.type}:`, error);
      }
    }
    
    return true;
  }
  
  /**
   * 初始化统计
   */
  private initializeStats(): void {
    Object.values(BridgeEventType).forEach(type => {
      if (typeof type === 'string') {
        this.stats.set(type as BridgeEventType, {
          type: type as BridgeEventType,
          count: 0,
          averageProcessingTime: 0,
          lastProcessTime: 0,
          totalProcessingTime: 0,
          errors: 0
        });
      }
    });
  }
  
  /**
   * 更新事件统计
   */
  private updateStats(type: BridgeEventType, processingTime: number, isError = false): void {
    if (!this.config.enableStats) return;
    
    const stat = this.stats.get(type);
    if (stat) {
      stat.count++;
      stat.lastProcessTime = processingTime;
      
      if (isError) {
        stat.errors++;
      } else {
        stat.totalProcessingTime += processingTime;
        stat.averageProcessingTime = stat.totalProcessingTime / (stat.count - stat.errors);
      }
    }
  }
  
  /**
   * 获取事件统计
   */
  getStats() {
    return {
      totalEventsProcessed: this.totalEventsProcessed,
      eventStats: Object.fromEntries(this.stats),
      queueStats: this.queueManager.getStats(),
      listenerStats: {
        totalTypeListeners: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0),
        globalListeners: this.globalListeners.size
      }
    };
  }
  
  /**
   * 配置事件桥接器
   */
  configure(options: Partial<typeof this.config>): void {
    Object.assign(this.config, options);
  }
  
  /**
   * 启用/禁用事件桥接器
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.queueManager.clear();
    }
  }
  
  /**
   * 清空所有监听器和队列
   */
  clear(): void {
    this.listeners.clear();
    this.globalListeners.clear();
    this.filters.clear();
    this.transformers.clear();
    this.queueManager.clear();
  }
  
  /**
   * 销毁事件桥接器
   */
  dispose(): void {
    this.clear();
    this.queueManager.dispose();
    this.deduplicator.dispose();
    this.isEnabled = false;
  }
}

// 创建全局事件桥接器实例
export const globalEventBridge = new EventBridge();

// 暴露到全局对象（方便调试）
if (typeof window !== 'undefined') {
  (window as any).eventBridge = globalEventBridge;
}