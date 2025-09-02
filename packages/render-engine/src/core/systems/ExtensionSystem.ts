/**
 * 扩展系统
 * 提供统一的扩展注册、管理和生命周期控制
 */

/**
 * 扩展类型枚举
 */
export enum ExtensionType {
  // 渲染器相关
  Renderer = 'renderer',
  RenderSystem = 'render-system',
  
  // 资源相关
  Loader = 'loader',
  Parser = 'parser',
  
  // 应用系统
  Application = 'application',
  
  // 插件系统
  Plugin = 'plugin',
  
  // 着色器相关
  Shader = 'shader',
  
  // 过滤器
  Filter = 'filter'
}

/**
 * 扩展元数据接口
 */
export interface ExtensionMetadata {
  type: ExtensionType | ExtensionType[];
  name: string;
  priority?: number;
  ref?: any;
}

/**
 * 扩展接口
 */
export interface IExtension {
  init?(): void | Promise<void>;
  destroy?(): void;
}

/**
 * 扩展构造函数接口
 */
export interface ExtensionConstructor<T extends IExtension = IExtension> {
  extension: ExtensionMetadata;
  new (...args: unknown[]): T;
  init?(): Promise<void> | void;
  destroy?(): void;
}

/**
 * 扩展注册表
 */
class ExtensionRegistry {
  private extensions = new Map<ExtensionType, Map<string, ExtensionConstructor>>();
  private initialized = new Set<string>();
  
  /**
   * 注册扩展
   */
  register(extension: ExtensionConstructor): void {
    const metadata = extension.extension as ExtensionMetadata;
    if (!metadata) {
      throw new Error('Extension must have static extension metadata');
    }
    
    const types = Array.isArray(metadata.type) ? metadata.type : [metadata.type];
    
    for (const type of types) {
      if (!this.extensions.has(type)) {
        this.extensions.set(type, new Map());
      }
      
      const typeMap = this.extensions.get(type)!;
      typeMap.set(metadata.name, extension);
      
      // 按优先级排序
      const sorted = Array.from(typeMap.entries())
        .sort(([, a], [, b]) => (b.extension.priority || 0) - (a.extension.priority || 0));
      
      typeMap.clear();
      sorted.forEach(([name, ext]) => typeMap.set(name, ext));
    }
  }
  
  /**
   * 获取指定类型的所有扩展
   */
  getExtensions(type: ExtensionType): ExtensionConstructor[] {
    const typeMap = this.extensions.get(type);
    return typeMap ? Array.from(typeMap.values()) : [];
  }
  
  /**
   * 获取指定名称的扩展
   */
  getExtension(type: ExtensionType, name: string): ExtensionConstructor | undefined {
    const typeMap = this.extensions.get(type);
    return typeMap?.get(name);
  }
  
  /**
   * 初始化扩展
   */
  async initializeExtension(extension: ExtensionConstructor): Promise<void> {
    const metadata = extension.extension as ExtensionMetadata;
    const key = `${metadata.type}-${metadata.name}`;
    
    if (this.initialized.has(key)) {
      return;
    }
    
    try {
      if (extension.init) {
        await extension.init();
      }
      this.initialized.add(key);
    } catch (error) {
      console.error(`Failed to initialize extension ${metadata.name}:`, error);
      throw error;
    }
  }
  
  /**
   * 销毁扩展
   */
  destroyExtension(extension: ExtensionConstructor): void {
    const metadata = extension.extension as ExtensionMetadata;
    const key = `${metadata.type}-${metadata.name}`;
    
    if (!this.initialized.has(key)) {
      return;
    }
    
    try {
      if (extension.destroy) {
        extension.destroy();
      }
      this.initialized.delete(key);
    } catch (error) {
      console.error(`Failed to destroy extension ${metadata.name}:`, error);
    }
  }
  
  /**
   * 移除扩展
   */
  unregister(type: ExtensionType, name: string): void {
    const typeMap = this.extensions.get(type);
    if (typeMap) {
      const extension = typeMap.get(name);
      if (extension) {
        this.destroyExtension(extension);
        typeMap.delete(name);
      }
    }
  }
  
  /**
   * 清空所有扩展
   */
  clear(): void {
    // 销毁所有已初始化的扩展
    for (const typeMap of this.extensions.values()) {
      for (const extension of typeMap.values()) {
        this.destroyExtension(extension);
      }
    }
    
    this.extensions.clear();
    this.initialized.clear();
  }
}

/**
 * 全局扩展注册表实例
 */
export const extensions = new ExtensionRegistry();

/**
 * 扩展装饰器
 */
export function Extension(metadata: ExtensionMetadata) {
  return function<T extends new (...args: unknown[]) => IExtension>(constructor: T) {
    const extensionConstructor = constructor as unknown as ExtensionConstructor;
    extensionConstructor.extension = metadata;
    extensions.register(extensionConstructor);
    return constructor;
  };
}

/**
 * 扩展管理器
 */
export class ExtensionManager {
  private registry: ExtensionRegistry;
  
  constructor(registry: ExtensionRegistry = extensions) {
    this.registry = registry;
  }
  
  /**
   * 安装扩展
   */
  async install(extension: ExtensionConstructor): Promise<void> {
    this.registry.register(extension);
    await this.registry.initializeExtension(extension);
  }
  
  /**
   * 卸载扩展
   */
  uninstall(type: ExtensionType, name: string): void {
    this.registry.unregister(type, name);
  }
  
  /**
   * 获取扩展
   */
  get(type: ExtensionType, name?: string): ExtensionConstructor | ExtensionConstructor[] {
    if (name) {
      const extension = this.registry.getExtension(type, name);
      return extension as ExtensionConstructor;
    }
    return this.registry.getExtensions(type);
  }
  
  /**
   * 初始化所有指定类型的扩展
   */
  async initializeType(type: ExtensionType): Promise<void> {
    const typeExtensions = this.registry.getExtensions(type);
    await Promise.all(typeExtensions.map(ext => this.registry.initializeExtension(ext)));
  }
}