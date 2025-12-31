import React, { useCallback, useMemo } from 'react'
import { useSDKStore } from '../../store/sdkStore'
import type { IShapeEntity } from '@sky-canvas/canvas-sdk'
import { Eye, EyeOff, Lock, Unlock, Trash2 } from 'lucide-react'

const SHAPE_ICONS: Record<string, string> = {
  rectangle: '▢',
  circle: '○',
  line: '―',
  text: 'T',
  path: '⌇',
  diamond: '◇'
}

interface LayerItemProps {
  shape: IShapeEntity
  isSelected: boolean
  onSelect: (id: string, multiSelect: boolean) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
}

function LayerItem({ shape, isSelected, onSelect, onToggleVisibility, onToggleLock }: LayerItemProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      onSelect(shape.id, e.shiftKey || e.metaKey || e.ctrlKey)
    },
    [shape.id, onSelect]
  )

  const icon = SHAPE_ICONS[shape.type] || '?'
  const name = shape.metadata?.name || `${shape.type}`

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-center px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-800
        transition-colors group
        ${isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-l-blue-500' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-l-2 border-l-transparent'
        }
        ${!shape.visible ? 'opacity-50' : ''}
      `}
    >
      <span className="w-5 text-center text-gray-400 text-sm">{icon}</span>
      <span className="flex-1 text-sm truncate ml-2 text-gray-700 dark:text-gray-300">{name}</span>
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onToggleLock(shape.id) }}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title={shape.locked ? '解锁' : '锁定'}
        >
          {shape.locked ? <Lock size={12} className="text-orange-500" /> : <Unlock size={12} className="text-gray-400" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(shape.id) }}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          title={shape.visible ? '隐藏' : '显示'}
        >
          {shape.visible ? <Eye size={12} className="text-gray-500" /> : <EyeOff size={12} className="text-gray-300" />}
        </button>
      </div>
    </div>
  )
}

export function LayersPanel() {
  const { shapes, selectedShapes, selectShape, deselectShape, clearSelection, updateShape, removeShape } = useSDKStore()

  const sortedShapes = useMemo(() => {
    return [...shapes].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0))
  }, [shapes])

  const selectedIds = useMemo(() => {
    return new Set(selectedShapes.map((s) => s.id))
  }, [selectedShapes])

  const handleSelect = useCallback(
    (id: string, multiSelect: boolean) => {
      if (multiSelect) {
        if (selectedIds.has(id)) {
          deselectShape(id)
        } else {
          selectShape(id)
        }
      } else {
        clearSelection()
        selectShape(id)
      }
    },
    [selectedIds, selectShape, deselectShape, clearSelection]
  )

  const handleToggleVisibility = useCallback(
    (id: string) => {
      const shape = shapes.find((s) => s.id === id)
      if (shape) {
        updateShape(id, { visible: !shape.visible })
      }
    },
    [shapes, updateShape]
  )

  const handleToggleLock = useCallback(
    (id: string) => {
      const shape = shapes.find((s) => s.id === id)
      if (shape) {
        updateShape(id, { locked: !shape.locked })
      }
    },
    [shapes, updateShape]
  )

  const handleDeleteSelected = useCallback(() => {
    selectedShapes.forEach((shape) => {
      removeShape(shape.id)
    })
  }, [selectedShapes, removeShape])

  return (
    <div className="h-full flex flex-col">
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">图层</span>
        <span className="text-xs text-gray-400">{shapes.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sortedShapes.length === 0 ? (
          <div className="p-4 text-sm text-gray-400 text-center">
            暂无图层
          </div>
        ) : (
          sortedShapes.map((shape) => (
            <LayerItem
              key={shape.id}
              shape={shape}
              isSelected={selectedIds.has(shape.id)}
              onSelect={handleSelect}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
            />
          ))
        )}
      </div>

      {selectedShapes.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <span className="text-xs text-gray-500">已选 {selectedShapes.length}</span>
          <button
            onClick={handleDeleteSelected}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
            title="删除选中"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

export default LayersPanel
