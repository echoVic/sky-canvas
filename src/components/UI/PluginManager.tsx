/**
 * 插件管理器UI组件
 */

import React, { useState, useEffect } from 'react';
import { 
  PluginInstance, 
  PluginStatus, 
  MarketplacePlugin,
  SearchFilters 
} from '../../engine/plugins/types/PluginTypes';
import { getGlobalPluginSystem } from '../../engine/plugins';
import { PluginMarketplace, LocalPluginStore } from '../../engine/plugins/marketplace/PluginMarketplace';

interface PluginManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PluginManager: React.FC<PluginManagerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
  const [installedPlugins, setInstalledPlugins] = useState<PluginInstance[]>([]);
  const [marketplacePlugins, setMarketplacePlugins] = useState<MarketplacePlugin[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const pluginSystem = getGlobalPluginSystem();
  const marketplace = new PluginMarketplace();
  const localStore = new LocalPluginStore();

  useEffect(() => {
    if (isOpen) {
      loadInstalledPlugins();
      if (activeTab === 'marketplace') {
        loadMarketplacePlugins();
      }
    }
  }, [isOpen, activeTab]);

  const loadInstalledPlugins = () => {
    const plugins = pluginSystem.getAllPlugins();
    setInstalledPlugins(plugins);
  };

  const loadMarketplacePlugins = async () => {
    setLoading(true);
    try {
      const filters: SearchFilters = searchQuery ? { query: searchQuery } : {};
      const result = await marketplace.searchPlugins(filters);
      setMarketplacePlugins(result.plugins);
    } catch (error) {
      console.error('Failed to load marketplace plugins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePluginToggle = async (pluginId: string, currentStatus: PluginStatus) => {
    try {
      if (currentStatus === PluginStatus.ACTIVE) {
        await pluginSystem.deactivatePlugin(pluginId);
      } else if (currentStatus === PluginStatus.INACTIVE) {
        await pluginSystem.activatePlugin(pluginId);
      }
      loadInstalledPlugins();
    } catch (error) {
      console.error(`Failed to toggle plugin ${pluginId}:`, error);
    }
  };

  const handlePluginUninstall = async (pluginId: string) => {
    try {
      await pluginSystem.unloadPlugin(pluginId);
      localStore.removeInstalledPlugin(pluginId);
      loadInstalledPlugins();
    } catch (error) {
      console.error(`Failed to uninstall plugin ${pluginId}:`, error);
    }
  };

  const handlePluginInstall = async (plugin: MarketplacePlugin) => {
    setLoading(true);
    try {
      // 下载插件
      const blob = await marketplace.downloadPlugin(plugin.manifest.id);
      
      // 这里应该解析插件包并加载，现在简化处理
      console.log(`Installing plugin: ${plugin.manifest.name}`);
      
      // 标记为已安装
      localStore.addInstalledPlugin(plugin.manifest.id, plugin.manifest.version);
      
      // 刷新列表
      loadInstalledPlugins();
    } catch (error) {
      console.error(`Failed to install plugin ${plugin.manifest.id}:`, error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-4/5 h-4/5 max-w-6xl max-h-4xl flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">插件管理器</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* 标签页 */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('installed')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'installed'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            已安装插件
          </button>
          <button
            onClick={() => setActiveTab('marketplace')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'marketplace'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            插件市场
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'installed' ? (
            <InstalledPluginsTab
              plugins={installedPlugins}
              onToggle={handlePluginToggle}
              onUninstall={handlePluginUninstall}
            />
          ) : (
            <MarketplaceTab
              plugins={marketplacePlugins}
              loading={loading}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onSearch={loadMarketplacePlugins}
              onInstall={handlePluginInstall}
              localStore={localStore}
            />
          )}
        </div>
      </div>
    </div>
  );
};

// 已安装插件标签页
interface InstalledPluginsTabProps {
  plugins: PluginInstance[];
  onToggle: (pluginId: string, status: PluginStatus) => void;
  onUninstall: (pluginId: string) => void;
}

const InstalledPluginsTab: React.FC<InstalledPluginsTabProps> = ({
  plugins,
  onToggle,
  onUninstall
}) => {
  return (
    <div className="p-4 h-full overflow-auto">
      {plugins.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          暂无已安装的插件
        </div>
      ) : (
        <div className="grid gap-4">
          {plugins.map(plugin => (
            <PluginCard
              key={plugin.manifest.id}
              plugin={plugin}
              onToggle={onToggle}
              onUninstall={onUninstall}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// 插件市场标签页
interface MarketplaceTabProps {
  plugins: MarketplacePlugin[];
  loading: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearch: () => void;
  onInstall: (plugin: MarketplacePlugin) => void;
  localStore: LocalPluginStore;
}

const MarketplaceTab: React.FC<MarketplaceTabProps> = ({
  plugins,
  loading,
  searchQuery,
  onSearchChange,
  onSearch,
  onInstall,
  localStore
}) => {
  return (
    <div className="p-4 h-full flex flex-col">
      {/* 搜索栏 */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="搜索插件..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
        />
        <button
          onClick={onSearch}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          搜索
        </button>
      </div>

      {/* 插件列表 */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        ) : plugins.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            未找到插件
          </div>
        ) : (
          <div className="grid gap-4">
            {plugins.map(plugin => (
              <MarketplacePluginCard
                key={plugin.manifest.id}
                plugin={plugin}
                isInstalled={localStore.isPluginInstalled(plugin.manifest.id)}
                onInstall={() => onInstall(plugin)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// 已安装插件卡片
interface PluginCardProps {
  plugin: PluginInstance;
  onToggle: (pluginId: string, status: PluginStatus) => void;
  onUninstall: (pluginId: string) => void;
}

const PluginCard: React.FC<PluginCardProps> = ({ plugin, onToggle, onUninstall }) => {
  const getStatusColor = (status: PluginStatus) => {
    switch (status) {
      case PluginStatus.ACTIVE:
        return 'text-green-600 bg-green-100';
      case PluginStatus.INACTIVE:
        return 'text-gray-600 bg-gray-100';
      case PluginStatus.ERROR:
        return 'text-red-600 bg-red-100';
      case PluginStatus.DISABLED:
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: PluginStatus) => {
    switch (status) {
      case PluginStatus.ACTIVE:
        return '已激活';
      case PluginStatus.INACTIVE:
        return '未激活';
      case PluginStatus.ERROR:
        return '错误';
      case PluginStatus.DISABLED:
        return '已禁用';
      default:
        return '未知';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">{plugin.manifest.name}</h3>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plugin.status)}`}>
              {getStatusText(plugin.status)}
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-2">{plugin.manifest.description}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>版本: {plugin.manifest.version}</span>
            <span>作者: {plugin.manifest.author}</span>
            {plugin.loadTime && <span>加载时间: {plugin.loadTime.toFixed(2)}ms</span>}
          </div>
          {plugin.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              错误: {plugin.error.message}
            </div>
          )}
        </div>
        <div className="flex gap-2 ml-4">
          <button
            onClick={() => onToggle(plugin.manifest.id, plugin.status)}
            disabled={plugin.status === PluginStatus.ERROR}
            className={`px-3 py-1 rounded text-sm font-medium ${
              plugin.status === PluginStatus.ACTIVE
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {plugin.status === PluginStatus.ACTIVE ? '停用' : '启用'}
          </button>
          <button
            onClick={() => onUninstall(plugin.manifest.id)}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm font-medium hover:bg-gray-600"
          >
            卸载
          </button>
        </div>
      </div>
    </div>
  );
};

// 市场插件卡片
interface MarketplacePluginCardProps {
  plugin: MarketplacePlugin;
  isInstalled: boolean;
  onInstall: () => void;
}

const MarketplacePluginCard: React.FC<MarketplacePluginCardProps> = ({
  plugin,
  isInstalled,
  onInstall
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold">{plugin.manifest.name}</h3>
            {plugin.verified && (
              <span className="px-2 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">
                已验证
              </span>
            )}
          </div>
          <p className="text-gray-600 text-sm mb-2">{plugin.manifest.description}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
            <span>版本: {plugin.manifest.version}</span>
            <span>作者: {plugin.manifest.author}</span>
            <span>下载: {plugin.downloads.toLocaleString()}</span>
            <div className="flex items-center gap-1">
              <span>⭐</span>
              <span>{plugin.rating.toFixed(1)}</span>
            </div>
          </div>
          <div className="flex gap-1">
            {plugin.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="ml-4">
          <button
            onClick={onInstall}
            disabled={isInstalled}
            className={`px-4 py-2 rounded font-medium ${
              isInstalled
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
          >
            {isInstalled ? '已安装' : '安装'}
          </button>
        </div>
      </div>
    </div>
  );
};
