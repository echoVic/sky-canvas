import React from 'react';
import { motion } from 'framer-motion';
import { 
  MousePointer2, 
  Zap, 
  Layers, 
  Eye,
  Grid3X3,
  Info
} from 'lucide-react';
import { useCanvasStore } from '../../store/canvasStore';
import { useToolStore } from '../../store/toolStore';
import { Button } from '../UI/atoms/Button';
import { Icon } from '../UI/atoms/Icon';

interface StatusBarProps {
  className?: string;
}

export const StatusBar: React.FC<StatusBarProps> = ({ className }) => {
  const { zoom, size: canvasSize } = useCanvasStore();
  const { currentTool } = useToolStore();
  
  // 模拟一些状态数据
  const stats = {
    objects: 12,
    layers: 3,
    memory: '24.5MB',
    fps: 60
  };

  const statusItems = [
    {
      icon: MousePointer2,
      label: '工具',
      value: currentTool,
      color: 'text-blue-600'
    },
    {
      icon: Layers,
      label: '对象',
      value: `${stats.objects}个`,
      color: 'text-green-600'
    },
    {
      icon: Eye,
      label: '缩放',
      value: `${Math.round(zoom * 100)}%`,
      color: 'text-purple-600'
    },
    {
      icon: Grid3X3,
      label: '画布',
      value: `${canvasSize.width}×${canvasSize.height}`,
      color: 'text-orange-600'
    },
    {
      icon: Zap,
      label: '性能',
      value: `${stats.fps}fps`,
      color: 'text-red-600'
    },
    {
      icon: Info,
      label: '内存',
      value: stats.memory,
      color: 'text-gray-600'
    }
  ];

  return (
    <motion.div 
      className={`flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur-sm border-t border-gray-200/60 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* 左侧状态信息 */}
      <div className="flex items-center gap-6">
        {statusItems.map((item, index) => (
          <motion.div
            key={item.label}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            <Icon 
              icon={item.icon} 
              size="xs" 
              className={item.color}
            />
            <span className="text-xs text-gray-600">
              {item.label}:
            </span>
            <span className="text-xs font-medium text-gray-800">
              {item.value}
            </span>
          </motion.div>
        ))}
      </div>

      {/* 右侧操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 选中对象信息 */}
        {false && (
          <motion.div
            className="flex items-center gap-2 px-3 py-1 bg-blue-50 rounded-lg border border-blue-200"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <Icon icon={MousePointer2} size="xs" className="text-blue-600" />
            <span className="text-xs font-medium text-blue-700">
              已选择 0 个对象
            </span>
          </motion.div>
        )}

        {/* 网格切换 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
        >
          <Grid3X3 className="w-3 h-3 mr-1" />
          网格
        </Button>

        {/* 性能监控 */}
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
        >
          <Zap className="w-3 h-3 mr-1" />
          性能
        </Button>
      </div>
    </motion.div>
  );
};

export default StatusBar;