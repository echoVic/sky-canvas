/**
 * Inspector 属性面板组件
 * 显示和编辑选中形状的属性
 */

import React, { useCallback, useMemo } from 'react';
import { useCanvas } from '../../contexts';
import type { ShapeEntity } from '@sky-canvas/canvas-sdk';

/**
 * 颜色输入组件
 */
interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border cursor-pointer"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 px-2 py-1 text-xs border rounded"
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

/**
 * 数字输入组件
 */
interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function NumberInput({ label, value, onChange, min, max, step = 1 }: NumberInputProps) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="w-20 px-2 py-1 text-xs border rounded"
      />
    </div>
  );
}

/**
 * 属性分组组件
 */
interface PropertyGroupProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function PropertyGroup({ title, children, defaultOpen = true }: PropertyGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {title}
        <span className="text-gray-400">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

/**
 * Inspector 主组件
 */
export function Inspector() {
  const [state, actions] = useCanvas();
  const selectedShape = state.selectedShapes[0];

  /**
   * 更新形状属性
   */
  const updateShape = useCallback(
    (updates: Partial<ShapeEntity>) => {
      if (!selectedShape) return;
      actions.updateShape(selectedShape.id, updates);
    },
    [selectedShape, actions]
  );

  /**
   * 更新位置
   */
  const updatePosition = useCallback(
    (axis: 'x' | 'y', value: number) => {
      if (!selectedShape) return;
      updateShape({
        transform: {
          ...selectedShape.transform,
          position: {
            ...selectedShape.transform.position,
            [axis]: value
          }
        }
      });
    },
    [selectedShape, updateShape]
  );

  /**
   * 更新旋转
   */
  const updateRotation = useCallback(
    (degrees: number) => {
      if (!selectedShape) return;
      const radians = (degrees * Math.PI) / 180;
      updateShape({
        transform: {
          ...selectedShape.transform,
          rotation: radians
        }
      });
    },
    [selectedShape, updateShape]
  );

  /**
   * 更新尺寸（矩形）
   */
  const updateSize = useCallback(
    (dimension: 'width' | 'height', value: number) => {
      if (!selectedShape || selectedShape.type !== 'rectangle') return;
      updateShape({
        size: {
          ...selectedShape.size,
          [dimension]: Math.max(1, value)
        }
      } as Partial<ShapeEntity>);
    },
    [selectedShape, updateShape]
  );

  /**
   * 更新半径（圆形）
   */
  const updateRadius = useCallback(
    (value: number) => {
      if (!selectedShape || selectedShape.type !== 'circle') return;
      updateShape({ radius: Math.max(1, value) } as Partial<ShapeEntity>);
    },
    [selectedShape, updateShape]
  );

  /**
   * 更新样式
   */
  const updateStyle = useCallback(
    (property: string, value: string | number) => {
      if (!selectedShape) return;
      updateShape({
        style: {
          ...selectedShape.style,
          [property]: value
        }
      });
    },
    [selectedShape, updateShape]
  );

  /**
   * 旋转角度（弧度转度）
   */
  const rotationDegrees = useMemo(() => {
    if (!selectedShape) return 0;
    return Math.round((selectedShape.transform.rotation * 180) / Math.PI);
  }, [selectedShape]);

  // 无选中时显示提示
  if (!selectedShape) {
    return (
      <div className="w-64 bg-white border-l border-gray-200 p-4">
        <div className="text-sm text-gray-500 text-center">
          选择一个形状以编辑其属性
        </div>
      </div>
    );
  }

  // 多选时显示提示
  if (state.selectedShapes.length > 1) {
    return (
      <div className="w-64 bg-white border-l border-gray-200 p-4">
        <div className="text-sm text-gray-500 text-center">
          已选择 {state.selectedShapes.length} 个形状
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto">
      {/* 形状信息 */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="text-sm font-medium text-gray-700">
          {selectedShape.metadata?.name || `${selectedShape.type} - ${selectedShape.id.slice(0, 8)}`}
        </div>
        <div className="text-xs text-gray-500">类型: {selectedShape.type}</div>
      </div>

      {/* 变换属性 */}
      <PropertyGroup title="变换">
        <NumberInput
          label="X"
          value={Math.round(selectedShape.transform.position.x)}
          onChange={(v) => updatePosition('x', v)}
        />
        <NumberInput
          label="Y"
          value={Math.round(selectedShape.transform.position.y)}
          onChange={(v) => updatePosition('y', v)}
        />
        <NumberInput
          label="旋转"
          value={rotationDegrees}
          onChange={updateRotation}
          min={-360}
          max={360}
        />
      </PropertyGroup>

      {/* 尺寸属性（根据形状类型） */}
      {selectedShape.type === 'rectangle' && (
        <PropertyGroup title="尺寸">
          <NumberInput
            label="宽度"
            value={Math.round(selectedShape.size.width)}
            onChange={(v) => updateSize('width', v)}
            min={1}
          />
          <NumberInput
            label="高度"
            value={Math.round(selectedShape.size.height)}
            onChange={(v) => updateSize('height', v)}
            min={1}
          />
        </PropertyGroup>
      )}

      {selectedShape.type === 'circle' && (
        <PropertyGroup title="尺寸">
          <NumberInput
            label="半径"
            value={Math.round(selectedShape.radius)}
            onChange={updateRadius}
            min={1}
          />
        </PropertyGroup>
      )}

      {/* 样式属性 */}
      <PropertyGroup title="填充">
        <ColorInput
          label="颜色"
          value={selectedShape.style.fillColor || ''}
          onChange={(v) => updateStyle('fillColor', v)}
        />
        <NumberInput
          label="透明度"
          value={selectedShape.style.opacity ?? 1}
          onChange={(v) => updateStyle('opacity', v)}
          min={0}
          max={1}
          step={0.1}
        />
      </PropertyGroup>

      <PropertyGroup title="描边">
        <ColorInput
          label="颜色"
          value={selectedShape.style.strokeColor || ''}
          onChange={(v) => updateStyle('strokeColor', v)}
        />
        <NumberInput
          label="宽度"
          value={selectedShape.style.strokeWidth ?? 1}
          onChange={(v) => updateStyle('strokeWidth', v)}
          min={0}
          max={50}
        />
      </PropertyGroup>

      {/* 图层属性 */}
      <PropertyGroup title="图层">
        <NumberInput
          label="Z-Index"
          value={selectedShape.zIndex}
          onChange={(v) => actions.setZIndex([selectedShape.id], v)}
        />
        <div className="flex gap-1 mt-2">
          <button
            onClick={actions.bringToFront}
            className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="置顶"
          >
            置顶
          </button>
          <button
            onClick={actions.bringForward}
            className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="上移"
          >
            上移
          </button>
          <button
            onClick={actions.sendBackward}
            className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="下移"
          >
            下移
          </button>
          <button
            onClick={actions.sendToBack}
            className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
            title="置底"
          >
            置底
          </button>
        </div>
      </PropertyGroup>
    </div>
  );
}

export default Inspector;
