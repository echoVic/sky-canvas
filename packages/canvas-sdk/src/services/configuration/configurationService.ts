/**
 * 配置服务
 */

import { createDecorator } from '../../di'

/**
 * 配置服务接口
 */
export interface IConfigurationService {
  readonly _serviceBrand: undefined
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T): void
  has(key: string): boolean
  remove(key: string): void
  getAll(): Record<string, any>
  clear(): void
  dispose(): void
}

/**
 * 配置服务标识符
 */
export const IConfigurationService = createDecorator<IConfigurationService>('ConfigurationService')

/**
 * 配置服务实现
 */
export class ConfigurationService implements IConfigurationService {
  readonly _serviceBrand: undefined
  private config = new Map<string, any>()

  get<T>(key: string): T | undefined {
    return this.config.get(key)
  }

  set<T>(key: string, value: T): void {
    this.config.set(key, value)
  }

  has(key: string): boolean {
    return this.config.has(key)
  }

  remove(key: string): void {
    this.config.delete(key)
  }

  getAll(): Record<string, any> {
    return Object.fromEntries(this.config)
  }

  clear(): void {
    this.config.clear()
  }

  dispose(): void {
    this.config.clear()
  }
}
