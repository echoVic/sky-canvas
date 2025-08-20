import React from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Switch, 
  Slider,
  Button,
  Accordion,
  AccordionItem
} from '@heroui/react';
import { 
  Layers, 
  Settings, 
  Palette, 
  Eye, 
  EyeOff, 
  Trash2,
  Plus
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useToolStore } from '../../store/toolStore';

interface ModernSidebarProps {
  className?: string;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ className = '' }) => {
  const { showLayerPanel, showPropertiesPanel } = useAppStore();
  const { color, setColor, brushSize, setBrushSize, brushOpacity, setBrushOpacity } = useToolStore();

  // 模拟图层数据
  const layers = [
    { id: '1', name: '背景', visible: true, locked: false, opacity: 1 },
    { id: '2', name: '草图', visible: true, locked: false, opacity: 0.8 },
    { id: '3', name: '线稿', visible: true, locked: false, opacity: 1 },
  ];

  return (
    <div className={`w-80 bg-white border-l border-gray-200 flex flex-col ${className}`}>
      <Accordion 
        variant="splitted" 
        defaultExpandedKeys={['layers', 'properties']}
        className="px-2 py-2"
      >
        {/* 图层面板 */}
        <AccordionItem 
          key="layers" 
          aria-label="图层" 
          title={
            <div className="flex items-center gap-2">
              <Layers size={18} />
              <span>图层</span>
            </div>
          }
        >
          <div className="space-y-2">
            {/* 图层列表 */}
            <div className="space-y-1">
              {layers.map((layer) => (
                <Card key={layer.id} className="p-2" shadow="sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                      >
                        {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                      </Button>
                      <span className="text-sm flex-1">{layer.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">
                        {Math.round(layer.opacity * 100)}%
                      </span>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="danger"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                  <Slider
                    size="sm"
                    step={0.1}
                    minValue={0}
                    maxValue={1}
                    value={layer.opacity}
                    className="mt-2"
                  />
                </Card>
              ))}
            </div>

            {/* 添加图层按钮 */}
            <Button
              variant="flat"
              startContent={<Plus size={16} />}
              className="w-full"
            >
              添加图层
            </Button>
          </div>
        </AccordionItem>

        {/* 属性面板 */}
        <AccordionItem 
          key="properties" 
          aria-label="属性" 
          title={
            <div className="flex items-center gap-2">
              <Settings size={18} />
              <span>属性</span>
            </div>
          }
        >
          <div className="space-y-4">
            {/* 画笔设置 */}
            <Card shadow="sm">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Palette size={16} />
                  <span className="text-sm font-medium">画笔设置</span>
                </div>
              </CardHeader>
              <CardBody className="pt-0 space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-gray-600">颜色</label>
                    <div 
                      className="w-6 h-6 rounded border border-gray-300"
                      style={{ backgroundColor: color }}
                    />
                  </div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-8 rounded border border-gray-300"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-gray-600">大小</label>
                    <span className="text-sm text-gray-500">{brushSize}px</span>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={1}
                    maxValue={50}
                    value={brushSize}
                    onChange={(value) => setBrushSize(Array.isArray(value) ? value[0] : value)}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-gray-600">透明度</label>
                    <span className="text-sm text-gray-500">{Math.round(brushOpacity * 100)}%</span>
                  </div>
                  <Slider
                    size="sm"
                    step={0.1}
                    minValue={0.1}
                    maxValue={1}
                    value={brushOpacity}
                    onChange={(value) => setBrushOpacity(Array.isArray(value) ? value[0] : value)}
                  />
                </div>
              </CardBody>
            </Card>

            {/* 画布设置 */}
            <Card shadow="sm">
              <CardHeader className="pb-2">
                <span className="text-sm font-medium">画布设置</span>
              </CardHeader>
              <CardBody className="pt-0 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">显示网格</span>
                  <Switch size="sm" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">吸附网格</span>
                  <Switch size="sm" />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">显示标尺</span>
                  <Switch size="sm" />
                </div>
              </CardBody>
            </Card>
          </div>
        </AccordionItem>

        {/* 历史记录 */}
        <AccordionItem 
          key="history" 
          aria-label="历史记录" 
          title="历史记录"
        >
          <div className="space-y-2">
            <div className="text-sm text-gray-500 text-center py-4">
              暂无历史记录
            </div>
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
