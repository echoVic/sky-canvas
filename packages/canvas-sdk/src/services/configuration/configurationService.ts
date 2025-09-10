/**
 * 配置服务
 */

import { createServiceIdentifier, injectable } from '../../di/ServiceIdentifier';

/**
 * 配置服务接口
 */
export interface IConfigurationService {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
  has(key: string): boolean;
  remove(key: string): void;
  getAll(): Record<string, any>;
  clear(): void;
}

/**
 * 配置服务标识符
 */
export const IConfigurationService = createServiceIdentifier<IConfigurationService>('ConfigurationService');

/**
 * 配置服务实现
 */
@injectable
export class ConfigurationService implements IConfigurationService {
  private config = new Map<string, any>();

  get<T>(key: string): T | undefined {
    return this.config.get(key);
  }

  set<T>(key: string, value: T): void {
    this.config.set(key, value);
  }

  has(key: string): boolean {
    return this.config.has(key);
  }

  remove(key: string): void {
    this.config.delete(key);
  }

  getAll(): Record<string, any> {
    return Object.fromEntries(this.config);
  }

  clear(): void {
    this.config.clear();
  }
}