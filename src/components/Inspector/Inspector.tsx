import type { ShapeEntity } from '@sky-canvas/canvas-sdk'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type React from 'react'
import { useCallback, useMemo, useState } from 'react'
import { useSDKStore } from '../../store/sdkStore'

interface ColorInputProps {
  label: string
  value: string
  onChange: (value: string) => void
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex gap-1 items-center">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-6 h-6 rounded border cursor-pointer"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-16 px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}

interface NumberInputProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}

function NumberInput({ label, value, onChange, min, max, step = 1, unit }: NumberInputProps) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <div className="flex gap-1 items-center">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="w-16 px-1.5 py-0.5 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 text-right"
        />
        {unit && <span className="w-4 text-xs text-gray-400">{unit}</span>}
      </div>
    </div>
  )
}

interface PropertyGroupProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
}

function PropertyGroup({ title, children, defaultOpen = true }: PropertyGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-100 dark:border-gray-800">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex gap-1 items-center px-3 py-2 w-full text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
      </button>
      {isOpen && <div className="px-3 pb-2">{children}</div>}
    </div>
  )
}

export function Inspector() {
  const {
    selectedShapes,
    updateShape,
    bringToFront,
    bringForward,
    sendBackward,
    sendToBack,
    setZIndex,
  } = useSDKStore()
  const selectedShape = selectedShapes[0] as ShapeEntity | undefined

  const handleUpdateShape = useCallback(
    (updates: Partial<ShapeEntity>) => {
      if (!selectedShape) return
      updateShape(selectedShape.id, updates)
    },
    [selectedShape, updateShape]
  )

  const updatePosition = useCallback(
    (axis: 'x' | 'y', value: number) => {
      if (!selectedShape) return
      handleUpdateShape({
        transform: {
          ...selectedShape.transform,
          position: {
            ...selectedShape.transform.position,
            [axis]: value,
          },
        },
      })
    },
    [selectedShape, handleUpdateShape]
  )

  const updateRotation = useCallback(
    (degrees: number) => {
      if (!selectedShape) return
      const radians = (degrees * Math.PI) / 180
      handleUpdateShape({
        transform: {
          ...selectedShape.transform,
          rotation: radians,
        },
      })
    },
    [selectedShape, handleUpdateShape]
  )

  const updateSize = useCallback(
    (dimension: 'width' | 'height', value: number) => {
      if (!selectedShape || selectedShape.type !== 'rectangle') return
      handleUpdateShape({
        size: {
          ...selectedShape.size,
          [dimension]: Math.max(1, value),
        },
      } as Partial<ShapeEntity>)
    },
    [selectedShape, handleUpdateShape]
  )

  const updateStyle = useCallback(
    (property: string, value: string | number) => {
      if (!selectedShape) return
      handleUpdateShape({
        style: {
          ...selectedShape.style,
          [property]: value,
        },
      })
    },
    [selectedShape, handleUpdateShape]
  )

  const rotationDegrees = useMemo(() => {
    if (!selectedShape) return 0
    return Math.round((selectedShape.transform.rotation * 180) / Math.PI)
  }, [selectedShape])

  if (!selectedShape) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">属性</span>
        </div>
        <div className="flex flex-1 justify-center items-center p-4">
          <span className="text-sm text-center text-gray-400">选择一个形状以编辑其属性</span>
        </div>
      </div>
    )
  }

  if (selectedShapes.length > 1) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">属性</span>
        </div>
        <div className="flex flex-1 justify-center items-center p-4">
          <span className="text-sm text-center text-gray-400">
            已选择 {selectedShapes.length} 个形状
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex overflow-hidden flex-col h-full">
      <div className="flex-shrink-0 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="text-sm font-medium text-gray-700 truncate dark:text-gray-300">
          {typeof selectedShape.metadata?.name === 'string'
            ? selectedShape.metadata.name
            : selectedShape.type}
        </div>
        <div className="text-xs text-gray-400">{selectedShape.id.slice(0, 12)}...</div>
      </div>

      <div className="overflow-y-auto flex-1">
        <PropertyGroup title="位置">
          <NumberInput
            label="X"
            value={Math.round(selectedShape.transform.position.x)}
            onChange={(v) => updatePosition('x', v)}
            unit="px"
          />
          <NumberInput
            label="Y"
            value={Math.round(selectedShape.transform.position.y)}
            onChange={(v) => updatePosition('y', v)}
            unit="px"
          />
          <NumberInput
            label="旋转"
            value={rotationDegrees}
            onChange={updateRotation}
            min={-360}
            max={360}
            unit="°"
          />
        </PropertyGroup>

        {selectedShape.type === 'rectangle' && (
          <PropertyGroup title="尺寸">
            <NumberInput
              label="宽度"
              value={Math.round(selectedShape.size.width)}
              onChange={(v) => updateSize('width', v)}
              min={1}
              unit="px"
            />
            <NumberInput
              label="高度"
              value={Math.round(selectedShape.size.height)}
              onChange={(v) => updateSize('height', v)}
              min={1}
              unit="px"
            />
          </PropertyGroup>
        )}

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
            unit="px"
          />
        </PropertyGroup>

        <PropertyGroup title="图层">
          <NumberInput
            label="层级"
            value={selectedShape.zIndex}
            onChange={(v) => setZIndex([selectedShape.id], v)}
          />
          <div className="flex gap-1 mt-2">
            <button
              type="button"
              onClick={() => bringToFront()}
              className="flex-1 px-2 py-1 text-xs bg-gray-100 rounded dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              置顶
            </button>
            <button
              type="button"
              onClick={() => bringForward()}
              className="flex-1 px-2 py-1 text-xs bg-gray-100 rounded dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              上移
            </button>
            <button
              type="button"
              onClick={() => sendBackward()}
              className="flex-1 px-2 py-1 text-xs bg-gray-100 rounded dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              下移
            </button>
            <button
              type="button"
              onClick={() => sendToBack()}
              className="flex-1 px-2 py-1 text-xs bg-gray-100 rounded dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              置底
            </button>
          </div>
        </PropertyGroup>
      </div>
    </div>
  )
}

export default Inspector
