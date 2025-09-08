/**
 * 配置服务实现
 */

import { injectable, inject } from '../di/ServiceIdentifier';
import { IConfigurationService, IEventBusService } from '../di/ServiceIdentifiers';

/**
 * 配置变更事件
 */
interface ConfigurationChangeEvent {
  key: string;
  newValue: any;
  oldValue: any;
}

/**
 * 配置服务实现
 */
@injectable
export class ConfigurationService implements IConfigurationService {
  private config: Map<string, any> = new Map();
  private readonly defaultValues: Map<string, any> = new Map();
  
  constructor(
    @inject(IEventBusService) private eventBus: IEventBusService
  ) {
    this.initializeDefaults();
  }
  
  /**
   * 初始化默认配置
   */
  private initializeDefaults(): void {
    // 渲染相关配置
    this.setDefault('renderEngine', 'webgl');
    this.setDefault('targetFPS', 60);
    this.setDefault('enableVSync', true);
    this.setDefault('enableCulling', true);
    
    // 交互相关配置
    this.setDefault('enableInteraction', true);
    this.setDefault('enableAnimation', true);
    this.setDefault('doubleClickDelay', 300);
    this.setDefault('longPressDelay', 500);
    
    // 视口相关配置
    this.setDefault('viewport.x', 0);
    this.setDefault('viewport.y', 0);
    this.setDefault('viewport.zoom', 1);
    this.setDefault('minZoom', 0.1);
    this.setDefault('maxZoom', 10);
    
    // 调试和日志配置
    this.setDefault('logLevel', 'info');
    this.setDefault('debugMode', false);
    this.setDefault('enablePerformanceMonitoring', false);
    
    // 缓存配置
    this.setDefault('cache.enabled', true);
    this.setDefault('cache.maxSize', 100); // MB
    this.setDefault('cache.ttl', 3600000); // 1 hour in ms
    
    // 主题配置
    this.setDefault('theme.primaryColor', '#007ACC');
    this.setDefault('theme.backgroundColor', '#FFFFFF');
    this.setDefault('theme.selectionColor', '#007ACC');
    this.setDefault('theme.gridColor', '#E0E0E0');
  }
  
  /**
   * 设置默认值
   */
  private setDefault(key: string, value: any): void {
    this.defaultValues.set(key, value);
    
    // 如果当前没有设置该键，则使用默认值
    if (!this.config.has(key)) {
      this.config.set(key, value);
    }
  }
  
  /**
   * 获取配置值
   */
  get<T>(key: string): T | undefined {
    if (this.config.has(key)) {
      return this.config.get(key) as T;
    }
    
    // 尝试获取嵌套键值 (如 'viewport.x')
    if (key.includes('.')) {
      return this.getNestedValue<T>(key);
    }
    
    return this.defaultValues.get(key) as T;
  }
  
  /**
   * 设置配置值
   */
  set<T>(key: string, value: T): void {
    const oldValue = this.get(key);
    
    if (key.includes('.')) {
      this.setNestedValue(key, value);
    } else {
      this.config.set(key, value);
    }
    
    // 发出配置变更事件
    if (oldValue !== value) {
      this.eventBus.emit('config:changed', {
        key,
        newValue: value,
        oldValue
      } as ConfigurationChangeEvent);
    }
  }
  
  /**
   * 检查是否包含配置键
   */
  has(key: string): boolean {
    if (this.config.has(key)) {
      return true;
    }
    
    if (key.includes('.')) {
      return this.getNestedValue(key) !== undefined;
    }
    
    return this.defaultValues.has(key);
  }
  
  /**
   * 移除配置键
   */
  remove(key: string): boolean {
    const oldValue = this.get(key);
    const hasKey = this.has(key);
    
    if (key.includes('.')) {
      this.removeNestedValue(key);
    } else {
      this.config.delete(key);
    }
    
    if (hasKey) {
      this.eventBus.emit('config:changed', {
        key,
        newValue: undefined,
        oldValue
      } as ConfigurationChangeEvent);
    }
    
    return hasKey;
  }
  
  /**
   * 获取所有配置
   */
  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    
    // 添加默认值
    for (const [key, value] of this.defaultValues) {
      result[key] = value;
    }
    
    // 添加当前配置值
    for (const [key, value] of this.config) {
      result[key] = value;
    }
    
    return result;
  }
  
  /**
   * 重置配置到默认值
   */
  reset(): void {
    const oldConfig = this.getAll();
    this.config.clear();
    
    // 重新设置默认值
    for (const [key, value] of this.defaultValues) {
      this.config.set(key, value);
    }
    
    this.eventBus.emit('config:reset', { oldConfig });
  }
  
  /**
   * 批量设置配置
   */
  setMultiple(configs: Record<string, any>): void {
    const changes: ConfigurationChangeEvent[] = [];
    
    for (const [key, value] of Object.entries(configs)) {
      const oldValue = this.get(key);
      if (oldValue !== value) {
        changes.push({ key, newValue: value, oldValue });
        
        if (key.includes('.')) {
          this.setNestedValue(key, value);
        } else {
          this.config.set(key, value);
        }
      }
    }
    
    // 批量发送变更事件
    if (changes.length > 0) {
      this.eventBus.emit('config:batch-changed', { changes });
    }
  }
  
  /**
   * 获取嵌套值
   */
  private getNestedValue<T>(key: string): T | undefined {
    const parts = key.split('.');
    let current: any = this.getNestedObject();
    
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current as T;
  }
  
  /**
   * 设置嵌套值
   */
  private setNestedValue(key: string, value: any): void {
    const parts = key.split('.');
    const lastKey = parts.pop()!;
    let current = this.getOrCreateNestedObject(parts);
    
    current[lastKey] = value;
  }
  
  /**
   * 移除嵌套值
   */
  private removeNestedValue(key: string): void {
    const parts = key.split('.');
    const lastKey = parts.pop()!;
    let current = this.getNestedObject();
    
    // 导航到父对象
    for (let i = 0; i < parts.length; i++) {
      if (current && typeof current === 'object' && parts[i] in current) {
        current = current[parts[i]];
      } else {
        return; // 路径不存在
      }
    }
    
    if (current && typeof current === 'object') {
      delete current[lastKey];
    }
  }
  
  /**
   * 获取嵌套对象
   */
  private getNestedObject(): any {
    const result: any = {};
    
    // 合并所有配置到嵌套对象中
    const allConfigs = new Map([...this.defaultValues, ...this.config]);
    
    for (const [key, value] of allConfigs) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let current = result;
        
        for (let i = 0; i < parts.length - 1; i++) {
          if (!current[parts[i]]) {
            current[parts[i]] = {};
          }
          current = current[parts[i]];
        }
        
        current[parts[parts.length - 1]] = value;
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  /**
   * 获取或创建嵌套对象
   */
  private getOrCreateNestedObject(parts: string[]): any {
    const fullObject = this.getNestedObject();
    let current = fullObject;
    
    for (const part of parts) {
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    // 更新配置存储
    this.updateFromNestedObject(fullObject);
    
    return current;
  }
  
  /**
   * 从嵌套对象更新配置存储
   */
  private updateFromNestedObject(obj: any, prefix: string = ''): void {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this.updateFromNestedObject(value, fullKey);
      } else {
        this.config.set(fullKey, value);
      }
    }
  }
  
  /**
   * 监听配置变更
   */
  onChanged(handler: (event: ConfigurationChangeEvent) => void): void {
    this.eventBus.on('config:changed', handler);
  }
  
  /**
   * 取消监听配置变更
   */
  offChanged(handler?: (event: ConfigurationChangeEvent) => void): void {
    this.eventBus.off('config:changed', handler);
  }
}
