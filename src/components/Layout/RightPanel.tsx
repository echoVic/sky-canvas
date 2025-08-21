import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Palette, 
  Type, 
  Move, 
  Square,
  Circle,
  Triangle,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline
} from 'lucide-react';
import { Button } from '../UI/atoms/Button';
import { Icon } from '../UI/atoms/Icon';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  const presetColors = [
    '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
    '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#800080'
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-2">
        <div 
          className="w-8 h-8 rounded border-2 border-gray-300 cursor-pointer"
          style={{ backgroundColor: value }}
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = value;
            input.onchange = (e) => onChange((e.target as HTMLInputElement).value);
            input.click();
          }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
          placeholder="#000000"
        />
      </div>
      <div className="grid grid-cols-5 gap-1">
        {presetColors.map((color) => (
          <button
            key={color}
            className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
          />
        ))}
      </div>
    </div>
  );
};

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}

const Slider: React.FC<SliderProps> = ({ 
  label, 
  value, 
  onChange, 
  min, 
  max, 
  step = 1, 
  unit = '' 
}) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-500">{value}{unit}</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
        />
      </div>
    </div>
  );
};

interface RightPanelProps {
  className?: string;
}

export const RightPanel: React.FC<RightPanelProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<'transform' | 'style' | 'text'>('style');
  
  // 样式属性
  const [fillColor, setFillColor] = useState('#3b82f6');
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [opacity, setOpacity] = useState(100);
  
  // 变换属性
  const [x, setX] = useState(100);
  const [y, setY] = useState(100);
  const [width, setWidth] = useState(200);
  const [height, setHeight] = useState(150);
  const [rotation, setRotation] = useState(0);
  
  // 文字属性
  const [fontSize, setFontSize] = useState(16);
  const [fontWeight, setFontWeight] = useState('normal');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [textColor, setTextColor] = useState('#000000');

  const tabs = [
    { id: 'transform' as const, label: '变换', icon: Move },
    { id: 'style' as const, label: '样式', icon: Palette },
    { id: 'text' as const, label: '文字', icon: Type }
  ];

  const renderTransformPanel = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Slider
          label="X 位置"
          value={x}
          onChange={setX}
          min={0}
          max={1000}
          unit="px"
        />
        <Slider
          label="Y 位置"
          value={y}
          onChange={setY}
          min={0}
          max={1000}
          unit="px"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <Slider
          label="宽度"
          value={width}
          onChange={setWidth}
          min={1}
          max={1000}
          unit="px"
        />
        <Slider
          label="高度"
          value={height}
          onChange={setHeight}
          min={1}
          max={1000}
          unit="px"
        />
      </div>
      
      <Slider
        label="旋转"
        value={rotation}
        onChange={setRotation}
        min={-180}
        max={180}
        unit="°"
      />
      
      <div className="pt-2 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" size="sm" className="text-xs">
            <Square className="w-3 h-3 mr-1" />
            矩形
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Circle className="w-3 h-3 mr-1" />
            圆形
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Triangle className="w-3 h-3 mr-1" />
            三角
          </Button>
        </div>
      </div>
    </div>
  );

  const renderStylePanel = () => (
    <div className="space-y-4">
      <ColorPicker
        label="填充颜色"
        value={fillColor}
        onChange={setFillColor}
      />
      
      <ColorPicker
        label="描边颜色"
        value={strokeColor}
        onChange={setStrokeColor}
      />
      
      <Slider
        label="描边宽度"
        value={strokeWidth}
        onChange={setStrokeWidth}
        min={0}
        max={20}
        unit="px"
      />
      
      <Slider
        label="透明度"
        value={opacity}
        onChange={setOpacity}
        min={0}
        max={100}
        unit="%"
      />
      
      <div className="pt-2 border-t border-gray-200">
        <label className="text-sm font-medium text-gray-700 block mb-2">快速样式</label>
        <div className="grid grid-cols-2 gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => {
              setFillColor('#3b82f6');
              setStrokeColor('#1e40af');
              setStrokeWidth(2);
            }}
          >
            蓝色主题
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => {
              setFillColor('#ef4444');
              setStrokeColor('#dc2626');
              setStrokeWidth(2);
            }}
          >
            红色主题
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => {
              setFillColor('transparent');
              setStrokeColor('#000000');
              setStrokeWidth(1);
            }}
          >
            线框模式
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="text-xs"
            onClick={() => {
              setFillColor('#000000');
              setStrokeColor('transparent');
              setStrokeWidth(0);
            }}
          >
            纯色填充
          </Button>
        </div>
      </div>
    </div>
  );

  const renderTextPanel = () => (
    <div className="space-y-4">
      <ColorPicker
        label="文字颜色"
        value={textColor}
        onChange={setTextColor}
      />
      
      <Slider
        label="字体大小"
        value={fontSize}
        onChange={setFontSize}
        min={8}
        max={72}
        unit="px"
      />
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">字体样式</label>
        <div className="flex gap-1">
          <Button
            variant={fontWeight === 'bold' ? 'primary' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => setFontWeight(fontWeight === 'bold' ? 'normal' : 'bold')}
          >
            <Bold className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Italic className="w-3 h-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Underline className="w-3 h-3" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">文字对齐</label>
        <div className="flex gap-1">
          <Button
            variant={textAlign === 'left' ? 'primary' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => setTextAlign('left')}
          >
            <AlignLeft className="w-3 h-3" />
          </Button>
          <Button
            variant={textAlign === 'center' ? 'primary' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => setTextAlign('center')}
          >
            <AlignCenter className="w-3 h-3" />
          </Button>
          <Button
            variant={textAlign === 'right' ? 'primary' : 'outline'}
            size="sm"
            className="flex-1"
            onClick={() => setTextAlign('right')}
          >
            <AlignRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* 属性面板头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Icon icon={Settings} size="sm" className="text-gray-600" />
          <span className="font-medium text-gray-800">属性</span>
        </div>
      </div>

      {/* 选项卡 */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`
              flex-1 flex items-center justify-center gap-1 py-3 px-2 text-sm font-medium
              transition-colors duration-200
              ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }
            `}
            onClick={() => setActiveTab(tab.id)}
          >
            <Icon icon={tab.icon} size="xs" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 属性内容 */}
      <div className="flex-1 overflow-y-auto p-4">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'transform' && renderTransformPanel()}
          {activeTab === 'style' && renderStylePanel()}
          {activeTab === 'text' && renderTextPanel()}
        </motion.div>
      </div>

      {/* 操作按钮 */}
      <div className="border-t border-gray-200 p-3">
        <div className="flex gap-2">
          <Button variant="primary" size="sm" className="flex-1">
            应用更改
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            重置
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RightPanel;