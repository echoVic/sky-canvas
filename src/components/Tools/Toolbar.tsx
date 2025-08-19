import React from 'react';
import { useToolStore } from '../../store/toolStore';
import { useCanvasStore } from '../../store/canvasStore';
import { useHistoryStore } from '../../store/historyStore';

export const Toolbar: React.FC = () => {
  const { currentTool, tools, setCurrentTool } = useToolStore();
  const { zoomIn, zoomOut, resetView, zoom } = useCanvasStore();
  const { undo, redo, canUndo, canRedo } = useHistoryStore();

  return (
    <div className="flex items-center gap-2 p-4 bg-white border-b border-gray-200 shadow-sm">
      {/* 工具按钮 */}
      <div className="flex items-center gap-1 mr-4">
        {tools.map((tool) => (
          <button
            key={tool.type}
            onClick={() => setCurrentTool(tool.type)}
            className={`
              flex items-center justify-center w-10 h-10 rounded-lg border transition-colors
              ${currentTool === tool.type 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }
            `}
            title={`${tool.name} (${tool.shortcut})`}
          >
            <span className="text-lg">{tool.icon}</span>
          </button>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="w-px h-8 bg-gray-200 mx-2" />

      {/* 历史操作 */}
      <div className="flex items-center gap-1 mr-4">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="flex items-center justify-center w-8 h-8 rounded bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          title="撤销 (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="flex items-center justify-center w-8 h-8 rounded bg-gray-50 border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
          title="重做 (Ctrl+Y)"
        >
          ↷
        </button>
      </div>

      {/* 分隔线 */}
      <div className="w-px h-8 bg-gray-200 mx-2" />

      {/* 缩放控制 */}
      <div className="flex items-center gap-1">
        <button
          onClick={zoomOut}
          className="flex items-center justify-center w-8 h-8 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100"
          title="缩小"
        >
          −
        </button>
        <span className="min-w-16 text-center text-sm text-gray-600">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={zoomIn}
          className="flex items-center justify-center w-8 h-8 rounded bg-gray-50 border border-gray-200 hover:bg-gray-100"
          title="放大"
        >
          +
        </button>
        <button
          onClick={resetView}
          className="ml-2 px-3 py-1 text-sm bg-gray-50 border border-gray-200 rounded hover:bg-gray-100"
          title="重置视图"
        >
          重置
        </button>
      </div>
    </div>
  );
};
