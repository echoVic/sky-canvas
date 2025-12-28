/**
 * LayersPanel 图层面板组件
 * 显示所有形状的图层列表，支持选择、排序和可见性控制
 */

import React, { useCallback, useMemo } from 'react';
import { useCanvas } from '../../contexts';
import type { IShapeEntity } from '@sky-canvas/canvas-sdk';

/**
 * 形状类型图标映射
 */
const SHAPE_ICONS: Record<string, string> = {
  rectangle: '▢',
  circle: '○',
  line: '―',
  text: 'T',
  path: '⌇',
  diamond: '◇'
};

/**
 * 图层项组件
 */
interface LayerItemProps {
  shape: IShapeEntity;
  isSelected: boolean;
  onSelect: (id: string, multiSelect: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
}

function LayerItem({
  shape,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock
}: LayerItemProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      onSelect(shape.id, e.shiftKey || e.metaKey || e.ctrlKey);
    },
    [shape.id, onSelect]
  );

  const handleVisibilityClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleVisibility(shape.id);
    },
    [shape.id, onToggleVisibility]
  );

  const handleLockClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleLock(shape.id);
    },
    [shape.id, onToggleLock]
  );

  const icon = SHAPE_ICONS[shape.type] || '?';
  const name = shape.metadata?.name || `${shape.type} - ${shape.id.slice(0, 6)}`;

  return (
    <div
      onClick={handleClick}
      className={`
        flex items-center px-2 py-1.5 cursor-pointer border-b border-gray-100
        ${isSelected ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'}
        ${!shape.visible ? 'opacity-50' : ''}
      `}
    >
      {/* 形状图标 */}
      <span className="w-6 text-center text-gray-500">{icon}</span>

      {/* 形状名称 */}
      <span className="flex-1 text-sm truncate ml-1">{name}</span>

      {/* 锁定按钮 */}
      <button
        onClick={handleLockClick}
        className={`w-6 h-6 flex items-center justify-center text-xs rounded hover:bg-gray-200
          ${shape.locked ? 'text-orange-500' : 'text-gray-400'}`}
        title={shape.locked ? '解锁' : '锁定'}
      >
        {shape.locked ? '🔒' : '🔓'}
      </button>

      {/* 可见性按钮 */}
      <button
        onClick={handleVisibilityClick}
        className={`w-6 h-6 flex items-center justify-center text-xs rounded hover:bg-gray-200
          ${shape.visible ? 'text-gray-600' : 'text-gray-300'}`}
        title={shape.visible ? '隐藏' : '显示'}
      >
        {shape.visible ? '👁' : '👁‍🗨'}
      </button>
    </div>
  );
}

/**
 * LayersPanel 主组件
 */
export function LayersPanel() {
  const [state, actions] = useCanvas();

  /**
   * 按 z-index 排序的形状（从高到低）
   */
  const sortedShapes = useMemo(() => {
    return [...state.shapes].sort((a, b) => b.zIndex - a.zIndex);
  }, [state.shapes]);

  /**
   * 选中的形状 ID 集合
   */
  const selectedIds = useMemo(() => {
    return new Set(state.selectedShapes.map((s) => s.id));
  }, [state.selectedShapes]);

  /**
   * 选择形状
   */
  const handleSelect = useCallback(
    (id: string, multiSelect: boolean) => {
      if (multiSelect) {
        // 多选模式：切换选择状态
        if (selectedIds.has(id)) {
          actions.deselectShape(id);
        } else {
          actions.selectShape(id);
        }
      } else {
        // 单选模式：清除其他选择
        actions.clearSelection();
        actions.selectShape(id);
      }
    },
    [selectedIds, actions]
  );

  /**
   * 切换可见性
   */
  const handleToggleVisibility = useCallback(
    (id: string) => {
      const shape = state.shapes.find((s) => s.id === id);
      if (shape) {
        actions.updateShape(id, { visible: !shape.visible });
      }
    },
    [state.shapes, actions]
  );

  /**
   * 切换锁定状态
   */
  const handleToggleLock = useCallback(
    (id: string) => {
      const shape = state.shapes.find((s) => s.id === id);
      if (shape) {
        actions.updateShape(id, { locked: !shape.locked });
      }
    },
    [state.shapes, actions]
  );

  /**
   * 全选/取消全选
   */
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === state.shapes.length) {
      actions.clearSelection();
    } else {
      state.shapes.forEach((shape) => {
        if (!shape.locked) {
          actions.selectShape(shape.id);
        }
      });
    }
  }, [state.shapes, selectedIds.size, actions]);

  /**
   * 删除选中
   */
  const handleDeleteSelected = useCallback(() => {
    state.selectedShapes.forEach((shape) => {
      actions.removeShape(shape.id);
    });
  }, [state.selectedShapes, actions]);

  return (
    <div className="w-56 bg-white border-l border-gray-200 flex flex-col">
      {/* 标题栏 */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">图层</span>
        <span className="text-xs text-gray-500">{state.shapes.length} 个对象</span>
      </div>

      {/* 工具栏 */}
      <div className="px-2 py-1 border-b border-gray-200 flex gap-1">
        <button
          onClick={handleSelectAll}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
          title="全选/取消全选"
        >
          {selectedIds.size === state.shapes.length && state.shapes.length > 0 ? '取消全选' : '全选'}
        </button>
        <button
          onClick={handleDeleteSelected}
          disabled={state.selectedShapes.length === 0}
          className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          title="删除选中"
        >
          删除
        </button>
      </div>

      {/* 图层列表 */}
      <div className="flex-1 overflow-y-auto">
        {sortedShapes.length === 0 ? (
          <div className="p-4 text-sm text-gray-500 text-center">
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

      {/* 选中信息 */}
      {state.selectedShapes.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-600">
          已选择 {state.selectedShapes.length} 个对象
        </div>
      )}
    </div>
  );
}

export default LayersPanel;
