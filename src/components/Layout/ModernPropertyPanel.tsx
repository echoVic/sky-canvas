import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Palette,
  Type,
  Move,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface PropertySectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

const PropertySection: React.FC<PropertySectionProps> = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultExpanded = true 
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className="border border-slate-200/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 bg-slate-50/50 hover:bg-slate-100/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-600" />
          <span className="font-medium text-slate-800">{title}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>
      
      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          className="p-3 space-y-3"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
};

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, value, onChange }) => {
  const presetColors = [
    '#000000', '#ffffff', '#ff3b30', '#ff9500', '#ffcc00',
    '#34c759', '#007aff', '#5856d6', '#af52de', '#ff2d92'
  ];
  
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="space-y-2">
        {/* 当前颜色显示 */}
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded-lg border-2 border-slate-200 cursor-pointer shadow-sm"
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
            className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* 预设颜色 */}
        <div className="grid grid-cols-5 gap-1">
          {presetColors.map((color) => (
            <button
              key={color}
              onClick={() => onChange(color)}
              className={`w-6 h-6 rounded border-2 transition-all ${
                value === color ? 'border-slate-400 scale-110' : 'border-slate-200 hover:border-slate-300'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
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
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm text-slate-500">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
      />
    </div>
  );
};

interface InputFieldProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number';
  unit?: string;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  value, 
  onChange, 
  type = 'text', 
  unit 
}) => {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </div>
    </div>
  );
};

export const ModernPropertyPanel: React.FC = () => {
  const [properties, setProperties] = useState({
    // 变换属性
    x: 200,
    y: 150,
    width: 200,
    height: 120,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    
    // 外观属性
    fillColor: '#3b82f6',
    strokeColor: '#1e40af',
    strokeWidth: 2,
    opacity: 100,
    
    // 文字属性
    fontSize: 16,
    fontFamily: 'Arial',
    fontWeight: 'normal',
    textAlign: 'left',
    textColor: '#000000'
  });
  
  const updateProperty = (key: string, value: string | number) => {
    setProperties(prev => ({ ...prev, [key]: value }));
  };
  
  return (
    <div className="h-full flex flex-col bg-white/60 backdrop-blur-xl">
      {/* 标题栏 */}
      <div className="p-4 border-b border-slate-200/50">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-slate-600" />
          <h3 className="font-medium text-slate-800">属性</h3>
        </div>
      </div>
      
      {/* 属性面板 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 变换属性 */}
        <PropertySection title="变换" icon={Move}>
          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="X"
              value={properties.x}
              onChange={(value) => updateProperty('x', Number(value))}
              type="number"
              unit="px"
            />
            <InputField
              label="Y"
              value={properties.y}
              onChange={(value) => updateProperty('y', Number(value))}
              type="number"
              unit="px"
            />
            <InputField
              label="宽度"
              value={properties.width}
              onChange={(value) => updateProperty('width', Number(value))}
              type="number"
              unit="px"
            />
            <InputField
              label="高度"
              value={properties.height}
              onChange={(value) => updateProperty('height', Number(value))}
              type="number"
              unit="px"
            />
          </div>
          
          <Slider
            label="旋转"
            value={properties.rotation}
            onChange={(value) => updateProperty('rotation', value)}
            min={-180}
            max={180}
            unit="°"
          />
          
          <div className="grid grid-cols-2 gap-3">
            <Slider
              label="缩放 X"
              value={properties.scaleX}
              onChange={(value) => updateProperty('scaleX', value)}
              min={0.1}
              max={3}
              step={0.1}
            />
            <Slider
              label="缩放 Y"
              value={properties.scaleY}
              onChange={(value) => updateProperty('scaleY', value)}
              min={0.1}
              max={3}
              step={0.1}
            />
          </div>
        </PropertySection>
        
        {/* 外观属性 */}
        <PropertySection title="外观" icon={Palette}>
          <ColorPicker
            label="填充颜色"
            value={properties.fillColor}
            onChange={(value) => updateProperty('fillColor', value)}
          />
          
          <ColorPicker
            label="描边颜色"
            value={properties.strokeColor}
            onChange={(value) => updateProperty('strokeColor', value)}
          />
          
          <Slider
            label="描边宽度"
            value={properties.strokeWidth}
            onChange={(value) => updateProperty('strokeWidth', value)}
            min={0}
            max={20}
            unit="px"
          />
          
          <Slider
            label="透明度"
            value={properties.opacity}
            onChange={(value) => updateProperty('opacity', value)}
            min={0}
            max={100}
            unit="%"
          />
        </PropertySection>
        
        {/* 文字属性 */}
        <PropertySection title="文字" icon={Type}>
          <InputField
            label="字体大小"
            value={properties.fontSize}
            onChange={(value) => updateProperty('fontSize', Number(value))}
            type="number"
            unit="px"
          />
          
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">字体</label>
            <select
              value={properties.fontFamily}
              onChange={(e) => updateProperty('fontFamily', e.target.value)}
              className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Arial">Arial</option>
              <option value="Helvetica">Helvetica</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Verdana">Verdana</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">样式</label>
            <div className="flex gap-1">
              <button
                onClick={() => updateProperty('fontWeight', properties.fontWeight === 'bold' ? 'normal' : 'bold')}
                className={`p-2 rounded border transition-colors ${
                  properties.fontWeight === 'bold' 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Bold className="w-4 h-4" />
              </button>
              <button className="p-2 rounded border bg-white border-slate-200 hover:bg-slate-50">
                <Italic className="w-4 h-4" />
              </button>
              <button className="p-2 rounded border bg-white border-slate-200 hover:bg-slate-50">
                <Underline className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">对齐</label>
            <div className="flex gap-1">
              <button
                onClick={() => updateProperty('textAlign', 'left')}
                className={`p-2 rounded border transition-colors ${
                  properties.textAlign === 'left' 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlignLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateProperty('textAlign', 'center')}
                className={`p-2 rounded border transition-colors ${
                  properties.textAlign === 'center' 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlignCenter className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateProperty('textAlign', 'right')}
                className={`p-2 rounded border transition-colors ${
                  properties.textAlign === 'right' 
                    ? 'bg-blue-500 text-white border-blue-500' 
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <AlignRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <ColorPicker
            label="文字颜色"
            value={properties.textColor}
            onChange={(value) => updateProperty('textColor', value)}
          />
        </PropertySection>
      </div>
    </div>
  );
};

export default ModernPropertyPanel;