/**
 * 高级功能演示组件
 * 展示第5阶段实现的批量操作、异步操作、文件导入导出、插件系统等功能
 */

import { type Action } from '@sky-canvas/canvas-sdk';
import React, { useCallback, useState } from 'react';
import { useCanvasSDK } from '../hooks/useCanvasSDK';

interface AdvancedFeaturesDemoProps {
  containerRef: React.RefObject<HTMLDivElement>;
}

export const AdvancedFeaturesDemo: React.FC<AdvancedFeaturesDemoProps> = ({ containerRef }) => {
  const [sdkState, sdkActions] = useCanvasSDK();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // 批量操作演示
  const handleBatchOperation = useCallback(async () => {
    setLoading(true);
    setMessage('执行批量操作...');

    try {
      // 创建多个形状的Actions
      const actions: Action[] = [
        {
          type: 'ADD_RECTANGLE',
          payload: { x: 100, y: 100, width: 80, height: 60, style: { fill: '#ff6b6b' } },
          metadata: { timestamp: Date.now(), source: 'user' as const }
        },
        {
          type: 'ADD_CIRCLE',
          payload: { x: 250, y: 150, radius: 40, style: { fill: '#4ecdc4' } },
          metadata: { timestamp: Date.now(), source: 'user' as const }
        },
        {
          type: 'ADD_TEXT',
          payload: { x: 100, y: 250, text: 'Batch Created', style: { fill: '#45b7d1' } },
          metadata: { timestamp: Date.now(), source: 'user' as const }
        }
      ];

      // 使用事务性批量操作
      await sdkActions.batchActions(actions, true);
      setMessage('批量操作完成！创建了3个形状');
    } catch (error) {
      setMessage(`批量操作失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [sdkActions]);

  // 导出功能演示
  const handleExportCanvas = useCallback(async (format: 'json' | 'svg' | 'png') => {
    setLoading(true);
    setMessage(`导出为${format.toUpperCase()}格式...`);

    try {
      await sdkActions.exportFile({
        format,
        filename: `canvas-export.${format}`,
        quality: 0.92,
        includeOnlySelected: false
      });
      setMessage(`成功导出为${format.toUpperCase()}格式`);
    } catch (error) {
      setMessage(`导出失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [sdkActions]);

  // 导入功能演示
  const handleImportFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage('导入文件中...');

    try {
      await sdkActions.importFile({
        file,
        format: 'json',
        replaceExisting: false,
        position: { x: 50, y: 50 }
      });
      setMessage('文件导入成功！');
    } catch (error) {
      setMessage(`导入失败: ${error}`);
    } finally {
      setLoading(false);
      // 清除文件输入
      event.target.value = '';
    }
  }, [sdkActions]);

  // 自动保存演示
  const handleEnableAutoSave = useCallback(async () => {
    setLoading(true);
    setMessage('启用自动保存...');

    try {
      await sdkActions.enableAutoSave({
        target: 'localStorage',
        key: 'sky-canvas-demo-autosave',
        interval: 30000, // 30秒自动保存
        enableCompression: true
      });
      setMessage('自动保存已启用（每30秒保存一次到LocalStorage）');
    } catch (error) {
      setMessage(`启用自动保存失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [sdkActions]);

  // 插件管理演示
  const handleInstallWatermarkPlugin = useCallback(async () => {
    setLoading(true);
    setMessage('安装水印插件...');

    try {
      // 插件系统暂时禁用
      console.log('插件系统暂时禁用');

      // 添加水印
      await sdkActions.dispatch({
        type: 'ADD_WATERMARK',
        payload: {
          text: '© Sky Canvas Demo',
          position: 'bottom-right',
          opacity: 0.3,
          fontSize: 14,
          color: '#666666'
        },
        metadata: {
          timestamp: Date.now(),
          source: 'user' as const
        }
      });

      setMessage('水印插件安装完成并添加了水印！');
    } catch (error) {
      setMessage(`插件安装失败: ${error}`);
    } finally {
      setLoading(false);
    }
  }, [sdkActions]);

  // 插件状态检查
  const getPluginStatus = useCallback(() => {
    const allPlugins = sdkActions.getPlugins();
    const activePlugins = sdkActions.getActivePlugins();
    return `已安装插件: ${allPlugins.length}, 已激活插件: ${activePlugins.length}`;
  }, [sdkActions]);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="mb-4 text-xl font-bold">高级功能演示</h2>

      {/* 状态显示 */}
      <div className="p-3 mb-4 bg-gray-100 rounded">
        <p className="text-sm text-gray-600">
          形状数量: {sdkState.shapes.length} |
          选中: {sdkState.selectedShapeIds.length} |
          {getPluginStatus()}
        </p>
        {message && (
          <p className={`text-sm mt-2 ${message.includes('失败') || message.includes('错误') ? 'text-red-600' : 'text-green-600'}`}>
            {message}
          </p>
        )}
      </div>

      {/* 功能按钮组 */}
      <div className="space-y-4">
        {/* 批量操作 */}
        <div className="space-x-2">
          <h3 className="mb-2 font-semibold">批量操作</h3>
          <button
            onClick={handleBatchOperation}
            disabled={loading || !sdkState.isInitialized}
            className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            批量创建形状
          </button>
        </div>

        {/* 文件操作 */}
        <div className="space-x-2">
          <h3 className="mb-2 font-semibold">文件操作</h3>
          <button
            onClick={() => handleExportCanvas('json')}
            disabled={loading || !sdkState.isInitialized}
            className="px-4 py-2 text-white bg-green-500 rounded hover:bg-green-600 disabled:opacity-50"
          >
            导出JSON
          </button>
          <button
            onClick={() => handleExportCanvas('svg')}
            disabled={loading || !sdkState.isInitialized}
            className="px-4 py-2 text-white bg-green-500 rounded hover:bg-green-600 disabled:opacity-50"
          >
            导出SVG
          </button>
          <button
            onClick={() => handleExportCanvas('png')}
            disabled={loading || !sdkState.isInitialized}
            className="px-4 py-2 text-white bg-green-500 rounded hover:bg-green-600 disabled:opacity-50"
          >
            导出PNG
          </button>
          <div className="inline-block">
            <label className="px-4 py-2 text-white bg-orange-500 rounded cursor-pointer hover:bg-orange-600">
              导入文件
              <input
                type="file"
                accept=".json,.svg,.png,.jpg"
                onChange={handleImportFile}
                disabled={loading || !sdkState.isInitialized}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* 自动保存 */}
        <div className="space-x-2">
          <h3 className="mb-2 font-semibold">自动保存</h3>
          <button
            onClick={handleEnableAutoSave}
            disabled={loading || !sdkState.isInitialized}
            className="px-4 py-2 text-white bg-purple-500 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            启用自动保存
          </button>
        </div>

        {/* 插件系统 */}
        <div className="space-x-2">
          <h3 className="mb-2 font-semibold">插件系统</h3>
          <button
            onClick={handleInstallWatermarkPlugin}
            disabled={loading || !sdkState.isInitialized || sdkActions.isPluginActive('watermark-plugin')}
            className="px-4 py-2 text-white bg-indigo-500 rounded hover:bg-indigo-600 disabled:opacity-50"
          >
            {sdkActions.isPluginActive('watermark-plugin') ? '水印插件已安装' : '安装水印插件'}
          </button>
        </div>

        {/* 撤销重做 */}
        <div className="space-x-2">
          <h3 className="mb-2 font-semibold">历史操作</h3>
          <button
            onClick={() => sdkActions.undo()}
            disabled={loading || !sdkState.isInitialized || !sdkState.canUndo}
            className="px-4 py-2 text-white bg-gray-500 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            撤销
          </button>
          <button
            onClick={() => sdkActions.redo()}
            disabled={loading || !sdkState.isInitialized || !sdkState.canRedo}
            className="px-4 py-2 text-white bg-gray-500 rounded hover:bg-gray-600 disabled:opacity-50"
          >
            重做
          </button>
          <button
            onClick={() => sdkActions.clearHistory()}
            disabled={loading || !sdkState.isInitialized}
            className="px-4 py-2 text-white bg-red-500 rounded hover:bg-red-600 disabled:opacity-50"
          >
            清空历史
          </button>
        </div>
      </div>

      {/* 加载指示器 */}
      {loading && (
        <div className="flex items-center justify-center mt-4">
          <div className="w-6 h-6 border-b-2 border-blue-500 rounded-full animate-spin"></div>
          <span className="ml-2 text-gray-600">处理中...</span>
        </div>
      )}
    </div>
  );
};