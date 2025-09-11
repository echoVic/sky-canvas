/**
 * EventBus 单元测试
 * 验证基于 EventEmitter3 的实现
 */

import { describe, it, expect, vi } from 'vitest';
import { EventBus, EventEmitter } from '../EventBus';

describe('EventBus with EventEmitter3', () => {
  it('应该正确发射和监听事件', () => {
    const bus = new EventBus();
    const listener = vi.fn();

    bus.on('test', listener);
    bus.emit('test', { data: 'hello' });

    expect(listener).toHaveBeenCalledWith({ data: 'hello' });
  });

  it('应该支持一次性监听器', () => {
    const bus = new EventBus();
    const listener = vi.fn();

    bus.once('test', listener);
    bus.emit('test', { data: 'hello' });
    bus.emit('test', { data: 'world' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ data: 'hello' });
  });

  it('应该正确移除监听器', () => {
    const bus = new EventBus();
    const listener = vi.fn();

    bus.on('test', listener);
    bus.emit('test', { data: 'hello' });
    bus.off('test', listener);
    bus.emit('test', { data: 'world' });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('应该支持dispose模式', () => {
    const bus = new EventBus();
    const listener = vi.fn();

    const disposable = bus.on('test', listener);
    bus.emit('test', { data: 'hello' });
    disposable.dispose();
    bus.emit('test', { data: 'world' });

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('应该正确获取监听器统计信息', () => {
    const bus = new EventBus();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    bus.on('test1', listener1);
    bus.on('test2', listener2);

    expect(bus.getListenerCount('test1')).toBe(1);
    expect(bus.getEventTypes()).toEqual(['test1', 'test2']);
  });
});

describe('EventEmitter with EventEmitter3', () => {
  interface TestEvents {
    message: { text: string };
    data: { value: number };
  }

  it('应该支持类型安全的事件处理', () => {
    const emitter = new EventEmitter<TestEvents>();
    const messageListener = vi.fn();

    emitter.on('message', messageListener);
    emitter.emit('message', { text: 'hello' });

    expect(messageListener).toHaveBeenCalledWith({ text: 'hello' });
  });

  it('应该支持类型安全的一次性监听器', () => {
    const emitter = new EventEmitter<TestEvents>();
    const dataListener = vi.fn();

    emitter.once('data', dataListener);
    emitter.emit('data', { value: 42 });
    emitter.emit('data', { value: 100 });

    expect(dataListener).toHaveBeenCalledTimes(1);
    expect(dataListener).toHaveBeenCalledWith({ value: 42 });
  });

  it('应该正确获取类型安全的统计信息', () => {
    const emitter = new EventEmitter<TestEvents>();
    const listener1 = vi.fn();
    const listener2 = vi.fn();

    emitter.on('message', listener1);
    emitter.on('data', listener2);

    expect(emitter.listenerCount('message')).toBe(1);
    expect(emitter.eventNames()).toEqual(['message', 'data']);
  });
});