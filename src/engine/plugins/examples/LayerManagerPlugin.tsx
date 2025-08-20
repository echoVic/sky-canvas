/**
 * 图层管理器插件示例
 */

import React, { useState, useEffect } from 'react';
import { UIPlugin } from '../sdk/PluginSDK';

export default class LayerManagerPlugin extends UIPlugin {
  protected async setupUI(): Promise<void> {
    // 添加菜单项
    this.addMenuItem({
      id: 'layer-manager-menu',
      label: '图层管理器',
      action: () => {
        this.context.api.ui.showNotification({
          type: 'info',
          title: '图层管理器',
          message: '图层管理器已在右侧面板中打开'
        });
      }
    });

    // 添加工具栏按钮
    this.addToolbarButton({
      id: 'layer-manager-button',
      label: '图层',
      icon: '📋',
      tooltip: '打开图层管理器',
      action: () => {
        // 切换面板显示状态
        this.emit('toggle-layer-panel');
      }
    });

    // 添加图层管理面板
    this.addPanel({
      id: 'layer-manager-panel',
      title: '图层管理器',
      icon: '📋',
      component: LayerManagerPanel,
      position: 'right',
      defaultSize: 250,
      resizable: true
    });
  }
}

// 图层管理面板组件
const LayerManagerPanel: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);

  useEffect(() => {
    // 监听画布变化
    const handleShapeAdded = (event: CustomEvent) => {
      const shape = event.detail.shape;
      addShapeToLayer(shape);
    };

    const handleShapeRemoved = (event: CustomEvent) => {
      const shapeId = event.detail.id;
      removeShapeFromLayer(shapeId);
    };

    window.addEventListener('plugin:addShape', handleShapeAdded as EventListener);
    window.addEventListener('plugin:removeShape', handleShapeRemoved as EventListener);

    return () => {
      window.removeEventListener('plugin:addShape', handleShapeAdded as EventListener);
      window.removeEventListener('plugin:removeShape', handleShapeRemoved as EventListener);
    };
  }, []);

  const addShapeToLayer = (shape: any) => {
    setLayers(prev => {
      const defaultLayer = prev.find(l => l.id === 'default') || {
        id: 'default',
        name: '默认图层',
        visible: true,
        locked: false,
        shapes: []
      };

      if (!prev.find(l => l.id === 'default')) {
        prev = [...prev, defaultLayer];
      }

      return prev.map(layer => 
        layer.id === 'default' 
          ? { ...layer, shapes: [...layer.shapes, shape] }
          : layer
      );
    });
  };

  const removeShapeFromLayer = (shapeId: string) => {
    setLayers(prev => 
      prev.map(layer => ({
        ...layer,
        shapes: layer.shapes.filter(shape => shape.id !== shapeId)
      }))
    );
  };

  const createNewLayer = () => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `图层 ${layers.length + 1}`,
      visible: true,
      locked: false,
      shapes: []
    };
    setLayers(prev => [...prev, newLayer]);
  };

  const deleteLayer = (layerId: string) => {
    if (layerId === 'default') {
      return; // 不能删除默认图层
    }
    setLayers(prev => prev.filter(layer => layer.id !== layerId));
  };

  const toggleLayerVisibility = (layerId: string) => {
    setLayers(prev => 
      prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, visible: !layer.visible }
          : layer
      )
    );
  };

  const toggleLayerLock = (layerId: string) => {
    setLayers(prev => 
      prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, locked: !layer.locked }
          : layer
      )
    );
  };

  const renameLayer = (layerId: string, newName: string) => {
    setLayers(prev => 
      prev.map(layer => 
        layer.id === layerId 
          ? { ...layer, name: newName }
          : layer
      )
    );
  };

  return (
    <div className="layer-manager p-3">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold">图层</h3>
        <button
          onClick={createNewLayer}
          className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
          title="新建图层"
        >
          +
        </button>
      </div>

      <div className="space-y-1">
        {layers.map(layer => (
          <LayerItem
            key={layer.id}
            layer={layer}
            isSelected={selectedLayerId === layer.id}
            onSelect={() => setSelectedLayerId(layer.id)}
            onToggleVisibility={() => toggleLayerVisibility(layer.id)}
            onToggleLock={() => toggleLayerLock(layer.id)}
            onRename={(newName) => renameLayer(layer.id, newName)}
            onDelete={() => deleteLayer(layer.id)}
          />
        ))}
      </div>

      {layers.length === 0 && (
        <div className="text-center text-gray-500 text-sm py-4">
          暂无图层
        </div>
      )}
    </div>
  );
};

// 图层项组件
interface LayerItemProps {
  layer: Layer;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);

  const handleNameSubmit = () => {
    if (editName.trim() && editName !== layer.name) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setEditName(layer.name);
      setIsEditing(false);
    }
  };

  return (
    <div 
      className={`layer-item flex items-center p-2 rounded text-sm ${
        isSelected ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50 hover:bg-gray-100'
      }`}
      onClick={onSelect}
    >
      {/* 可见性切换 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility();
        }}
        className="mr-2 text-gray-500 hover:text-gray-700"
        title={layer.visible ? '隐藏图层' : '显示图层'}
      >
        {layer.visible ? '👁️' : '🙈'}
      </button>

      {/* 锁定切换 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock();
        }}
        className="mr-2 text-gray-500 hover:text-gray-700"
        title={layer.locked ? '解锁图层' : '锁定图层'}
      >
        {layer.locked ? '🔒' : '🔓'}
      </button>

      {/* 图层名称 */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            className="w-full px-1 py-0 text-sm border rounded"
            autoFocus
          />
        ) : (
          <span
            className="truncate cursor-pointer"
            onDoubleClick={() => setIsEditing(true)}
            title={layer.name}
          >
            {layer.name}
          </span>
        )}
      </div>

      {/* 形状数量 */}
      <span className="ml-2 text-xs text-gray-400">
        {layer.shapes.length}
      </span>

      {/* 删除按钮 */}
      {layer.id !== 'default' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="ml-2 text-red-500 hover:text-red-700 text-xs"
          title="删除图层"
        >
          ×
        </button>
      )}
    </div>
  );
};

// 图层接口
interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  shapes: any[];
}
