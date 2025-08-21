import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  MoreHorizontal,
  Plus,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Square,
  Type,
  Image
} from 'lucide-react';
import { Button } from '../UI/atoms/Button';
import { Icon } from '../UI/atoms/Icon';

interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  type: 'group' | 'shape' | 'text' | 'image';
  children?: Layer[];
  expanded?: boolean;
}

interface LeftPanelProps {
  className?: string;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({ className }) => {
  const [layers, setLayers] = useState<Layer[]>([
    {
      id: '1',
      name: '背景',
      visible: true,
      locked: false,
      type: 'shape'
    },
    {
      id: '2',
      name: '图形组',
      visible: true,
      locked: false,
      type: 'group',
      expanded: true,
      children: [
        {
          id: '2-1',
          name: '矩形 1',
          visible: true,
          locked: false,
          type: 'shape'
        },
        {
          id: '2-2',
          name: '圆形 1',
          visible: false,
          locked: false,
          type: 'shape'
        }
      ]
    },
    {
      id: '3',
      name: '文字标题',
      visible: true,
      locked: true,
      type: 'text'
    }
  ]);
  
  const [selectedLayerId, setSelectedLayerId] = useState<string>('2-1');

  const toggleLayerVisibility = (layerId: string) => {
    const updateLayer = (layers: Layer[]): Layer[] => {
      return layers.map(layer => {
        if (layer.id === layerId) {
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

  const toggleLayerLock = (layerId: string) => {
    const updateLayer = (layers: Layer[]): Layer[] => {
      return layers.map(layer => {
        if (layer.id === layerId) {
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

  const toggleGroupExpanded = (layerId: string) => {
    const updateLayer = (layers: Layer[]): Layer[] => {
      return layers.map(layer => {
        if (layer.id === layerId && layer.type === 'group') {
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

  const getLayerIcon = (type: Layer['type']) => {
    switch (type) {
      case 'group': return Layers;
      case 'shape': return Square;
      case 'text': return Type;
      case 'image': return Image;
      default: return Layers;
    }
  };

  const renderLayer = (layer: Layer, depth = 0) => {
    const isSelected = selectedLayerId === layer.id;
    const paddingLeft = depth * 16 + 12;

    return (
      <div key={layer.id}>
        <motion.div
          className={`
            flex items-center gap-2 px-3 py-2 mx-2 rounded-lg cursor-pointer
            transition-all duration-200 group
            ${
              isSelected 
                ? 'bg-blue-100 border border-blue-200 shadow-sm' 
                : 'hover:bg-gray-50'
            }
          `}
          style={{ paddingLeft }}
          onClick={() => setSelectedLayerId(layer.id)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {/* 展开/收起按钮 */}
          {layer.type === 'group' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-60 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                toggleGroupExpanded(layer.id);
              }}
            >
              {layer.expanded ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
            </Button>
          )}

          {/* 图层图标 */}
          <div className="flex-shrink-0">
            <Icon 
              icon={getLayerIcon(layer.type)} 
              size="xs" 
              className="text-gray-500"
            />
          </div>

          {/* 图层名称 */}
          <span className={`
            flex-1 text-sm truncate
            ${
              isSelected 
                ? 'text-blue-800 font-medium' 
                : 'text-gray-700'
            }
          `}>
            {layer.name}
          </span>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {/* 可见性切换 */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleLayerVisibility(layer.id);
              }}
            >
              {layer.visible ? (
                <Eye className="w-3 h-3 text-gray-500" />
              ) : (
                <EyeOff className="w-3 h-3 text-gray-400" />
              )}
            </Button>

            {/* 锁定切换 */}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleLayerLock(layer.id);
              }}
            >
              {layer.locked ? (
                <Lock className="w-3 h-3 text-orange-500" />
              ) : (
                <Unlock className="w-3 h-3 text-gray-500" />
              )}
            </Button>
          </div>
        </motion.div>

        {/* 子图层 */}
        <AnimatePresence>
          {layer.type === 'group' && layer.expanded && layer.children && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              {layer.children.map(child => renderLayer(child, depth + 1))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* 图层面板头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Icon icon={Layers} size="sm" className="text-gray-600" />
          <span className="font-medium text-gray-800">图层</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="添加图层"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            title="更多操作"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 图层列表 */}
      <div className="flex-1 overflow-y-auto py-2">
        {layers.map(layer => renderLayer(layer))}
      </div>

      {/* 图层操作栏 */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8"
            disabled={!selectedLayerId}
          >
            <Copy className="w-3 h-3 mr-1" />
            复制
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-8"
            disabled={!selectedLayerId}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            删除
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LeftPanel;