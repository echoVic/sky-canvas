import React, { useState } from 'react';
import { 
  Card, 
  CardBody, 
  CardHeader, 
  Switch, 
  Slider,
  Button,
  Accordion,
  AccordionItem,
  Chip,
  Progress
} from '@heroui/react';
import { 
  Layers, 
  Settings, 
  Palette, 
  Eye, 
  EyeOff, 
  Trash2,
  Plus,
  History,
  Grid3x3,
  Ruler,
  Lock,
  Unlock,
  Image,
  Type,
  Shapes,
  Paintbrush
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useToolStore } from '../../store/toolStore';

interface ModernSidebarProps {
  className?: string;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ className = '' }) => {
  const { showLayerPanel, showPropertiesPanel } = useAppStore();
  const { color, setColor, brushSize, setBrushSize, brushOpacity, setBrushOpacity, fontSize, setFontSize } = useToolStore();
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [showRuler, setShowRuler] = useState(false);

  // 模拟图层数据
  const layers = [
    { id: '1', name: '背景', visible: true, locked: false, opacity: 1, type: 'background' },
    { id: '2', name: '草图', visible: true, locked: false, opacity: 0.8, type: 'sketch' },
    { id: '3', name: '线稿', visible: true, locked: false, opacity: 1, type: 'lineart' },
    { id: '4', name: '文字', visible: true, locked: false, opacity: 1, type: 'text' },
  ];

  // 模拟历史记录数据
  const historyItems = [
    { id: '1', action: '添加文字', time: '刚刚', icon: Type },
    { id: '2', action: '绘制圆形', time: '1分钟前', icon: Shapes },
    { id: '3', action: '画笔绘制', time: '2分钟前', icon: Paintbrush },
    { id: '4', action: '添加图层', time: '5分钟前', icon: Layers },
  ];

  const getLayerIcon = (type: string) => {
    switch (type) {
      case 'background': return Image;
      case 'text': return Type;
      case 'sketch': return Paintbrush;
      case 'lineart': return Shapes;
      default: return Layers;
    }
  };

  return (
    <div className={`w-80 bg-gradient-to-b from-white/95 to-gray-50/95 backdrop-blur-xl border-l border-white/20 flex flex-col shadow-2xl ${className}`}>
      <div className="p-4 border-b border-white/20 bg-gradient-to-r from-blue-50/50 to-purple-50/30">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          设计面板
        </h2>
        <p className="text-sm text-gray-600 mt-1">管理图层、属性和历史记录</p>
      </div>
      
      <Accordion 
        variant="splitted" 
        defaultExpandedKeys={['layers', 'properties', 'canvas']}
        className="px-3 py-3 flex-1 overflow-y-auto"
      >
        {/* 图层面板 */}
        <AccordionItem 
          key="layers" 
          aria-label="图层" 
          title={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-blue-600" />
                <span className="font-medium">图层管理</span>
              </div>
              <Chip size="sm" variant="flat" color="primary">{layers.length}</Chip>
            </div>
          }
          className="bg-gradient-to-r from-blue-50/30 to-transparent"
        >
          <div className="space-y-3">
            {/* 图层列表 */}
            <div className="space-y-2">
              {layers.map((layer, index) => {
                const LayerIcon = getLayerIcon(layer.type);
                return (
                  <Card key={layer.id} className="p-3 bg-white/80 backdrop-blur-sm border border-white/50 hover:shadow-lg transition-all duration-200" shadow="sm">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <LayerIcon size={16} className="text-gray-600" />
                        <span className="text-sm font-medium flex-1">{layer.name}</span>
                        <Chip size="sm" variant="flat" color={layer.visible ? "success" : "default"}>
                          #{index + 1}
                        </Chip>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="hover:bg-blue-50"
                        >
                          {layer.visible ? <Eye size={14} className="text-green-600" /> : <EyeOff size={14} className="text-gray-400" />}
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          className="hover:bg-yellow-50"
                        >
                          {layer.locked ? <Lock size={14} className="text-yellow-600" /> : <Unlock size={14} className="text-gray-400" />}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-medium">
                          {Math.round(layer.opacity * 100)}%
                        </span>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          className="hover:bg-red-50"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">透明度</span>
                        <span className="text-xs font-mono text-gray-500">{Math.round(layer.opacity * 100)}%</span>
                      </div>
                      <Progress 
                        value={layer.opacity * 100} 
                        className="h-2" 
                        color="primary"
                        size="sm"
                      />
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* 添加图层按钮 */}
            <Button
              variant="flat"
              startContent={<Plus size={16} />}
              className="w-full bg-gradient-to-r from-blue-50 to-purple-50 hover:from-blue-100 hover:to-purple-100 border border-blue-200/50 text-blue-700 font-medium"
            >
              添加新图层
            </Button>
          </div>
        </AccordionItem>

        {/* 属性面板 */}
        <AccordionItem 
          key="properties" 
          aria-label="属性" 
          title={
            <div className="flex items-center gap-2">
              <Palette size={18} className="text-purple-600" />
              <span className="font-medium">工具属性</span>
            </div>
          }
          className="bg-gradient-to-r from-purple-50/30 to-transparent"
        >
          <div className="space-y-4">
            {/* 画笔设置 */}
            <Card shadow="sm" className="bg-white/80 backdrop-blur-sm border border-white/50">
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Paintbrush size={16} className="text-blue-600" />
                    <span className="text-sm font-medium">画笔设置</span>
                  </div>
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: color }}
                  />
                </div>
              </CardHeader>
              <CardBody className="pt-0 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-gray-700 font-medium">颜色选择</label>
                    <Chip size="sm" variant="flat" color="primary">{color}</Chip>
                  </div>
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full h-10 rounded-lg border-2 border-gray-200 cursor-pointer hover:border-blue-300 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-gray-700 font-medium">画笔大小</label>
                    <Chip size="sm" variant="flat" color="secondary">{brushSize}px</Chip>
                  </div>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={1}
                    maxValue={50}
                    value={brushSize}
                    onChange={(value) => setBrushSize(Array.isArray(value) ? value[0] : value)}
                    className="mb-2"
                    color="primary"
                  />
                  <Progress value={(brushSize / 50) * 100} className="h-1" color="primary" size="sm" />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-gray-700 font-medium">透明度</label>
                    <Chip size="sm" variant="flat" color="warning">{Math.round(brushOpacity * 100)}%</Chip>
                  </div>
                  <Slider
                    size="sm"
                    step={0.1}
                    minValue={0.1}
                    maxValue={1}
                    value={brushOpacity}
                    onChange={(value) => setBrushOpacity(Array.isArray(value) ? value[0] : value)}
                    className="mb-2"
                    color="warning"
                  />
                  <Progress value={brushOpacity * 100} className="h-1" color="warning" size="sm" />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-gray-700 font-medium">字体大小</label>
                    <Chip size="sm" variant="flat" color="success">{fontSize}px</Chip>
                  </div>
                  <Slider
                    size="sm"
                    step={2}
                    minValue={8}
                    maxValue={72}
                    value={fontSize}
                    onChange={(value) => setFontSize(Array.isArray(value) ? value[0] : value)}
                    className="mb-2"
                    color="success"
                  />
                  <Progress value={(fontSize / 72) * 100} className="h-1" color="success" size="sm" />
                </div>
              </CardBody>
            </Card>
          </div>
        </AccordionItem>
        
        {/* 画布设置 */}
        <AccordionItem 
          key="canvas" 
          aria-label="画布设置" 
          title={
            <div className="flex items-center gap-2">
              <Grid3x3 size={18} className="text-green-600" />
              <span className="font-medium">画布设置</span>
            </div>
          }
          className="bg-gradient-to-r from-green-50/30 to-transparent"
        >
          <Card shadow="sm" className="bg-white/80 backdrop-blur-sm border border-white/50">
            <CardBody className="space-y-4">
              <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Grid3x3 size={16} className="text-green-600" />
                  <span className="text-sm text-gray-700 font-medium">显示网格</span>
                </div>
                <Switch size="sm" isSelected={showGrid} onValueChange={setShowGrid} color="success" />
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Grid3x3 size={16} className="text-blue-600" />
                  <span className="text-sm text-gray-700 font-medium">吸附网格</span>
                </div>
                <Switch size="sm" isSelected={snapToGrid} onValueChange={setSnapToGrid} color="primary" />
              </div>
              <div className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Ruler size={16} className="text-purple-600" />
                  <span className="text-sm text-gray-700 font-medium">显示标尺</span>
                </div>
                <Switch size="sm" isSelected={showRuler} onValueChange={setShowRuler} color="secondary" />
              </div>
            </CardBody>
          </Card>
        </AccordionItem>

        {/* 历史记录 */}
        <AccordionItem 
          key="history" 
          aria-label="历史记录" 
          title={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <History size={18} className="text-orange-600" />
                <span className="font-medium">操作历史</span>
              </div>
              <Chip size="sm" variant="flat" color="warning">{historyItems.length}</Chip>
            </div>
          }
          className="bg-gradient-to-r from-orange-50/30 to-transparent"
        >
          <div className="space-y-2">
            {historyItems.length > 0 ? (
              historyItems.map((item) => {
                const ActionIcon = item.icon;
                return (
                  <Card key={item.id} className="p-3 bg-white/60 backdrop-blur-sm border border-white/30 hover:bg-white/80 transition-all duration-200 cursor-pointer" shadow="sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-orange-100 to-yellow-100">
                        <ActionIcon size={14} className="text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-800">{item.action}</div>
                        <div className="text-xs text-gray-500">{item.time}</div>
                      </div>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} className="text-gray-400" />
                      </Button>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="text-sm text-gray-500 text-center py-8 bg-white/40 rounded-lg border border-dashed border-gray-300">
                <History size={24} className="mx-auto mb-2 text-gray-400" />
                <div>暂无操作历史</div>
                <div className="text-xs mt-1">开始绘制后这里会显示操作记录</div>
              </div>
            )}
          </div>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
