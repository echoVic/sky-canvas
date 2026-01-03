/**
 * 插件市场基础框架
 */

import { PluginManifest } from '../types/PluginTypes';

export interface MarketplacePlugin {
  manifest: PluginManifest;
  downloadUrl: string;
  screenshots: string[];
  rating: number;
  downloads: number;
  reviews: PluginReview[];
  tags: string[];
  category: string;
  publishedAt: string;
  updatedAt: string;
  verified: boolean;
  size: number;
}

export interface PluginReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  helpful: number;
}

export interface PluginCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  pluginCount: number;
}

export interface SearchFilters {
  query?: string;
  category?: string;
  tags?: string[];
  minRating?: number;
  verified?: boolean;
  sortBy?: 'popularity' | 'rating' | 'recent' | 'name';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
  plugins: MarketplacePlugin[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export class PluginMarketplace {
  private baseUrl: string;
  private cache = new Map<string, any>();
  private cacheExpiry = new Map<string, number>();

  constructor(baseUrl: string = '/api/plugins') {
    this.baseUrl = baseUrl;
  }

  /**
   * 搜索插件
   */
  async searchPlugins(filters: SearchFilters = {}, page = 1, pageSize = 20): Promise<SearchResult> {
    const cacheKey = `search:${JSON.stringify(filters)}:${page}:${pageSize}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...this.filtersToParams(filters)
      });

      const response = await fetch(`${this.baseUrl}/search?${params}`);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const result = await response.json();
      this.setCache(cacheKey, result, 5 * 60 * 1000); // 5分钟缓存
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取插件详情
   */
  async getPlugin(pluginId: string): Promise<MarketplacePlugin | null> {
    const cacheKey = `plugin:${pluginId}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.baseUrl}/${pluginId}`);
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get plugin: ${response.statusText}`);
      }

      const plugin = await response.json();
      this.setCache(cacheKey, plugin, 10 * 60 * 1000); // 10分钟缓存
      
      return plugin;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取热门插件
   */
  async getFeaturedPlugins(limit = 10): Promise<MarketplacePlugin[]> {
    const cacheKey = `featured:${limit}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.baseUrl}/featured?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Failed to get featured plugins: ${response.statusText}`);
      }

      const plugins = await response.json();
      this.setCache(cacheKey, plugins, 15 * 60 * 1000); // 15分钟缓存
      
      return plugins;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取插件分类
   */
  async getCategories(): Promise<PluginCategory[]> {
    const cacheKey = 'categories';
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(`${this.baseUrl}/categories`);
      if (!response.ok) {
        throw new Error(`Failed to get categories: ${response.statusText}`);
      }

      const categories = await response.json();
      this.setCache(cacheKey, categories, 30 * 60 * 1000); // 30分钟缓存
      
      return categories;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 下载插件
   */
  async downloadPlugin(pluginId: string): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/${pluginId}/download`);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      return await response.blob();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取插件评论
   */
  async getPluginReviews(pluginId: string, page = 1, pageSize = 10): Promise<{
    reviews: PluginReview[];
    total: number;
    averageRating: number;
  }> {
    const cacheKey = `reviews:${pluginId}:${page}:${pageSize}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString()
      });

      const response = await fetch(`${this.baseUrl}/${pluginId}/reviews?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to get reviews: ${response.statusText}`);
      }

      const result = await response.json();
      this.setCache(cacheKey, result, 5 * 60 * 1000); // 5分钟缓存
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 提交插件评论
   */
  async submitReview(pluginId: string, rating: number, comment: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/${pluginId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ rating, comment })
      });

      if (!response.ok) {
        throw new Error(`Failed to submit review: ${response.statusText}`);
      }

      // 清除相关缓存
      this.clearCacheByPrefix(`reviews:${pluginId}`);
      this.clearCacheByPrefix(`plugin:${pluginId}`);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取推荐插件
   */
  async getRecommendations(pluginId?: string, limit = 5): Promise<MarketplacePlugin[]> {
    const cacheKey = `recommendations:${pluginId || 'general'}:${limit}`;
    
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (pluginId) {
        params.append('basedOn', pluginId);
      }

      const response = await fetch(`${this.baseUrl}/recommendations?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to get recommendations: ${response.statusText}`);
      }

      const plugins = await response.json();
      this.setCache(cacheKey, plugins, 10 * 60 * 1000); // 10分钟缓存
      
      return plugins;
    } catch (error) {
      throw error;
    }
  }

  /**
   * 检查插件更新
   */
  async checkUpdates(installedPlugins: { id: string; version: string }[]): Promise<{
    id: string;
    currentVersion: string;
    latestVersion: string;
    updateAvailable: boolean;
  }[]> {
    try {
      const response = await fetch(`${this.baseUrl}/check-updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ plugins: installedPlugins })
      });

      if (!response.ok) {
        throw new Error(`Failed to check updates: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  /**
   * 将过滤器转换为URL参数
   */
  private filtersToParams(filters: SearchFilters): Record<string, string> {
    const params: Record<string, string> = {};

    if (filters.query) params.query = filters.query;
    if (filters.category) params.category = filters.category;
    if (filters.tags?.length) params.tags = filters.tags.join(',');
    if (filters.minRating) params.minRating = filters.minRating.toString();
    if (filters.verified !== undefined) params.verified = filters.verified.toString();
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    return params;
  }

  /**
   * 设置缓存
   */
  private setCache(key: string, value: any, ttl: number): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + ttl);
  }

  /**
   * 检查缓存是否有效
   */
  private isCacheValid(key: string): boolean {
    if (!this.cache.has(key)) return false;
    
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 按前缀清除缓存
   */
  private clearCacheByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        this.cacheExpiry.delete(key);
      }
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
  }
}

/**
 * 本地插件存储
 */
export class LocalPluginStore {
  private storageKey = 'installed_plugins';

  /**
   * 获取已安装插件列表
   */
  getInstalledPlugins(): { id: string; version: string; installDate: string }[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * 添加已安装插件
   */
  addInstalledPlugin(id: string, version: string): void {
    const plugins = this.getInstalledPlugins();
    const existing = plugins.find(p => p.id === id);
    
    if (existing) {
      existing.version = version;
      existing.installDate = new Date().toISOString();
    } else {
      plugins.push({
        id,
        version,
        installDate: new Date().toISOString()
      });
    }

    this.saveInstalledPlugins(plugins);
  }

  /**
   * 移除已安装插件
   */
  removeInstalledPlugin(id: string): void {
    const plugins = this.getInstalledPlugins().filter(p => p.id !== id);
    this.saveInstalledPlugins(plugins);
  }

  /**
   * 检查插件是否已安装
   */
  isPluginInstalled(id: string): boolean {
    return this.getInstalledPlugins().some(p => p.id === id);
  }

  /**
   * 获取插件安装信息
   */
  getPluginInfo(id: string): { id: string; version: string; installDate: string } | null {
    return this.getInstalledPlugins().find(p => p.id === id) || null;
  }

  /**
   * 保存已安装插件列表
   */
  private saveInstalledPlugins(plugins: { id: string; version: string; installDate: string }[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(plugins));
    } catch {
    }
  }
}
