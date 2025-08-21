import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Square,
  Type,
  Image,
  MoreHorizontal
} from 'lucide-react';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  type: 'group' | 'shape' | 'text' | 'image';
  children?: Layer[];
  expanded?: boolean;
  opacity: number;
}

interface LayerItemProps {
  layer: Layer;
  level: number;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  selected?: boolean;
}

const LayerItem: React.FC<LayerItemProps> = ({
  layer,
  level,
  onToggleVisibility,
  onToggleLock,
  onToggleExpand,
  onSelect,
  onDelete,
  onDuplicate,
  selected
}) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'shape': return Square;
      case 'text': return Type;
      case 'image': return Image;
      case 'group': return Layers;
      default: return Square;
    }
  };
  
  const TypeIcon = getTypeIcon(layer.type);
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="group"
    >
      <div
        className={`
          flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all duration-200
          ${selected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'}
        `}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={() => onSelect(layer.id)}
      >
        {/* 展开/收起按钮 */}
        {layer.children && layer.children.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(layer.id);
            }}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
          >
            {layer.expanded ? (
              <ChevronDown className="w-3 h-3 text-slate-500" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-500" />
            )}
          </button>
        )}
        
        {/* 类型图标 */}
        <TypeIcon className="w-4 h-4 text-slate-500" />
        
        {/* 图层名称 */}
        <span className="flex-1 text-sm text-slate-700 truncate">
          {layer.name}
        </span>
        
        {/* 控制按钮 */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 可见性切换 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(layer.id);
            }}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
          >
            {layer.visible ? (
              <Eye className="w-3 h-3 text-slate-500" />
            ) : (
              <EyeOff className="w-3 h-3 text-slate-400" />
            )}
          </button>
          
          {/* 锁定切换 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(layer.id);
            }}
            className="p-1 hover:bg-slate-200 rounded transition-colors"
          >
            {layer.locked ? (
              <Lock className="w-3 h-3 text-slate-500" />
            ) : (
              <Unlock className="w-3 h-3 text-slate-400" />
            )}
          </button>
          
          {/* 更多菜单 */}
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              <MoreHorizontal className="w-3 h-3 text-slate-500" />
            </button>
            
            {showMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10 min-w-[120px]"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(layer.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Copy className="w-3 h-3" />
                  复制
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(layer.id);
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-1 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  删除
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
      
      {/* 子图层 */}
      <AnimatePresence>
        {layer.expanded && layer.children && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {layer.children.map((child) => (
              <LayerItem
                key={child.id}
                layer={child}
                level={level + 1}
                onToggleVisibility={onToggleVisibility}
                onToggleLock={onToggleLock}
                onToggleExpand={onToggleExpand}
                onSelect={onSelect}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export const ModernLayerPanel: React.FC = () => {
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: '1',
      name: '背景',
      visible: true,
      locked: false,
      type: 'shape',
      opacity: 100
    },
    {
      id: '2',
      name: '图形组',
      visible: true,
      locked: false,
      type: 'group',
      expanded: true,
      opacity: 100,
      children: [
        {
          id: '2-1',
          name: '矩形',
          visible: true,
          locked: false,
          type: 'shape',
          opacity: 100
        },
        {
          id: '2-2',
          name: '圆形',
          visible: true,
          locked: false,
          type: 'shape',
          opacity: 100
        }
      ]
    },
    {
      id: '3',
      name: '文字图层',
      visible: true,
      locked: false,
      type: 'text',
      opacity: 100
    }
  ]);
  
  const [selectedLayer, setSelectedLayer] = useState<string>('2-1');
  
  const handleToggleVisibility = (id: string) => {
    const updateLayer = (layers: Layer[]): Layer[] => {
      return layers.map(layer => {
        if (layer.id === id) {
          return { ...layer, visible: !layer.visible };
        }
        if (layer.children) {
          return { ...layer, children: updateLayer(layer.children) };
        }
        return layer;
      });
    };
    setLayers(updateLayer(layers));
  };
  
  const handleToggleLock = (id: string) => {
    const updateLayer = (layers: Layer[]): Layer[] => {
      return layers.map(layer => {
        if (layer.id === id) {
          return { ...layer, locked: !layer.locked };
        }
        if (layer.children) {
          return { ...layer, children: updateLayer(layer.children) };
        }
        return layer;
      });
    };
    setLayers(updateLayer(layers));
  };
  
  const handleToggleExpand = (id: string) => {
    const updateLayer = (layers: Layer[]): Layer[] => {
      return layers.map(layer => {
        if (layer.id === id) {
          return { ...layer, expanded: !layer.expanded };
        }
        if (layer.children) {
          return { ...layer, children: updateLayer(layer.children) };
        }
        return layer;
      });
    };
    setLayers(updateLayer(layers));
  };
  
  const handleSelect = (id: string) => {
    setSelectedLayer(id);
  };
  
  const handleDelete = (id: string) => {
    const deleteLayer = (layers: Layer[]): Layer[] => {
      return layers.filter(layer => {
        if (layer.id === id) {
          return false;
        }
        if (layer.children) {
          layer.children = deleteLayer(layer.children);
        }
        return true;
      });
    };
    setLayers(deleteLayer(layers));
  };
  
  const handleDuplicate = (id: string) => {
    // 简单的复制实现
    console.log('Duplicate layer:', id);
  };
  
  const addNewLayer = () => {
    const newLayer: Layer = {
      id: `layer-${Date.now()}`,
      name: `新图层 ${layers.length + 1}`,
      visible: true,
      locked: false,
      type: 'shape',
      opacity: 100
    };
    setLayers([...layers, newLayer]);
  };
  
  return (
    <div className="h-full flex flex-col bg-white/60 backdrop-blur-xl">
      {/* 标题栏 */}
      <div className="p-4 border-b border-slate-200/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-slate-600" />
            <h3 className="font-medium text-slate-800">图层</h3>
          </div>
          <button
            onClick={addNewLayer}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
            title="添加新图层"
          >
            <Plus className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>
      
      {/* 图层列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {layers.map((layer) => (
            <LayerItem
              key={layer.id}
              layer={layer}
              level={0}
              selected={selectedLayer === layer.id}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onToggleExpand={handleToggleExpand}
              onSelect={handleSelect}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          ))}
        </div>
      </div>
      
      {/* 底部操作栏 */}
      <div className="p-3 border-t border-slate-200/50">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{layers.length} 个图层</span>
          <span>已选择: {selectedLayer}</span>
        </div>
      </div>
    </div>
  );
};

export default ModernLayerPanel;