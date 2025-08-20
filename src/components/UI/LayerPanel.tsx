import React, { useState } from 'react';
import { useSelection } from '../../hooks/useSelection';
import { useAppStore } from '../../store/appStore';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  type: 'group' | 'shape' | 'text' | 'image';
}

interface LayerItemProps {
  layer: Layer;
  isSelected: boolean;
  onSelect: (layer: Layer) => void;
  onToggleVisibility: (layer: Layer) => void;
  onToggleLock: (layer: Layer) => void;
  onRename: (layer: Layer, newName: string) => void;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(layer.name);

  const handleDoubleClick = () => {
    setIsEditing(true);
    setEditName(layer.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRename(layer, editName);
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setEditName(layer.name);
      setIsEditing(false);
    }
  };

  const getLayerIcon = () => {
    switch (layer.type) {
      case 'group': return '📁';
      case 'shape': return '⬜';
      case 'text': return '📝';
      case 'image': return '🖼️';
      default: return '📄';
    }
  };

  return (
    <div
      className={`
        flex items-center gap-2 p-2 rounded cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-50'}
      `}
      onClick={() => onSelect(layer)}
    >
      {/* 可见性切换 */}
      <button
        className={`w-4 h-4 flex items-center justify-center text-xs ${
          layer.visible ? 'text-gray-700' : 'text-gray-300'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleVisibility(layer);
        }}
        title={layer.visible ? '隐藏图层' : '显示图层'}
      >
        {layer.visible ? '👁️' : '🙈'}
      </button>

      {/* 锁定切换 */}
      <button
        className={`w-4 h-4 flex items-center justify-center text-xs ${
          layer.locked ? 'text-red-500' : 'text-gray-400'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleLock(layer);
        }}
        title={layer.locked ? '解锁图层' : '锁定图层'}
      >
        {layer.locked ? '🔒' : '🔓'}
      </button>

      {/* 图层图标 */}
      <span className="w-4 h-4 flex items-center justify-center text-xs">
        {getLayerIcon()}
      </span>

      {/* 图层名称 */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={handleKeyDown}
            className="w-full px-1 py-0 text-xs border border-blue-300 rounded"
            autoFocus
          />
        ) : (
          <span
            className="text-xs truncate block"
            onDoubleClick={handleDoubleClick}
          >
            {layer.name}
          </span>
        )}
      </div>

      {/* 透明度 */}
      <span className="text-xs text-gray-500 w-8 text-right">
        {Math.round(layer.opacity * 100)}%
      </span>
    </div>
  );
};

export const LayerPanel: React.FC = () => {
  const { showLayerPanel } = useAppStore();
  const { selectedNodes } = useSelection();
  
  // 模拟图层数据
  const [layers] = useState<Layer[]>([
    { id: '1', name: '背景', visible: true, locked: false, opacity: 1, type: 'shape' },
    { id: '2', name: '矩形 1', visible: true, locked: false, opacity: 0.8, type: 'shape' },
    { id: '3', name: '文本标题', visible: true, locked: false, opacity: 1, type: 'text' },
    { id: '4', name: '图片', visible: false, locked: true, opacity: 0.9, type: 'image' },
    { id: '5', name: '组合', visible: true, locked: false, opacity: 1, type: 'group' }
  ]);

  const [selectedLayerId, setSelectedLayerId] = useState<string>('2');

  if (!showLayerPanel) return null;

  const handleSelectLayer = (layer: Layer) => {
    setSelectedLayerId(layer.id);
  };

  const handleToggleVisibility = (layer: Layer) => {
    console.log('Toggle visibility for layer:', layer.name);
  };

  const handleToggleLock = (layer: Layer) => {
    console.log('Toggle lock for layer:', layer.name);
  };

  const handleRename = (layer: Layer, newName: string) => {
    console.log('Rename layer:', layer.name, 'to:', newName);
  };

  return (
    <div className="bg-white border-l border-gray-200 w-64 flex flex-col">
      {/* 头部 */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-700">图层</h3>
          <div className="flex gap-1">
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-600"
              title="新建图层"
            >
              ➕
            </button>
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-600"
              title="删除图层"
            >
              🗑️
            </button>
          </div>
        </div>
        
        {/* 混合模式和透明度 */}
        <div className="flex gap-2 text-xs">
          <select className="flex-1 px-2 py-1 border border-gray-300 rounded">
            <option>正常</option>
            <option>叠加</option>
            <option>柔光</option>
            <option>强光</option>
          </select>
          <input
            type="range"
            min="0"
            max="100"
            defaultValue="100"
            className="w-16"
            title="透明度"
          />
        </div>
      </div>

      {/* 图层列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {layers.map((layer) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              isSelected={selectedLayerId === layer.id}
              onSelect={handleSelectLayer}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onRename={handleRename}
            />
          ))}
        </div>
      </div>

      {/* 底部操作 */}
      <div className="p-2 border-t border-gray-200">
        <div className="flex gap-1">
          <button className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">
            复制
          </button>
          <button className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">
            合并
          </button>
          <button className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded">
            分组
          </button>
        </div>
      </div>
    </div>
  );
};
