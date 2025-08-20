import React from 'react';
import { useAppStore } from '../../store/appStore';
import { useCanvasStore } from '../../store/canvasStore';
import { useHistoryStore } from '../../store/historyStore';

interface MenuItemProps {
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ label, shortcut, onClick, disabled = false }) => (
  <button
    className={`
      px-3 py-1 text-sm rounded transition-colors text-left w-full
      ${disabled 
        ? 'text-gray-400 cursor-not-allowed' 
        : 'text-gray-700 hover:bg-gray-100'
      }
    `}
    onClick={onClick}
    disabled={disabled}
  >
    <div className="flex justify-between items-center">
      <span>{label}</span>
      {shortcut && <span className="text-xs text-gray-400">{shortcut}</span>}
    </div>
  </button>
);

interface DropdownMenuProps {
  title: string;
  children: React.ReactNode;
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ title, children }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="relative">
      <button
        className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
        onClick={() => setIsOpen(!isOpen)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      >
        {title}
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[180px] z-50">
          {children}
        </div>
      )}
    </div>
  );
};

export const MenuBar: React.FC = () => {
  const { 
    showGrid, 
    showRulers, 
    showLayerPanel, 
    showPropertiesPanel, 
    showToolbar,
    setShowGrid,
    setShowRulers,
    setShowLayerPanel,
    setShowPropertiesPanel,
    setShowToolbar,
    performanceStats
  } = useAppStore();
  
  const { resetView } = useCanvasStore();
  const { canUndo, canRedo, undo, redo, clear } = useHistoryStore();

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      {/* 左侧菜单 */}
      <div className="flex items-center gap-1">
        {/* 文件菜单 */}
        <DropdownMenu title="文件">
          <MenuItem label="新建" shortcut="Ctrl+N" onClick={() => console.log('新建')} />
          <MenuItem label="打开" shortcut="Ctrl+O" onClick={() => console.log('打开')} />
          <MenuItem label="保存" shortcut="Ctrl+S" onClick={() => console.log('保存')} />
          <MenuItem label="另存为" shortcut="Ctrl+Shift+S" onClick={() => console.log('另存为')} />
          <div className="border-t border-gray-200 my-1" />
          <MenuItem label="导出为PNG" onClick={() => console.log('导出PNG')} />
          <MenuItem label="导出为SVG" onClick={() => console.log('导出SVG')} />
        </DropdownMenu>

        {/* 编辑菜单 */}
        <DropdownMenu title="编辑">
          <MenuItem label="撤销" shortcut="Ctrl+Z" onClick={undo} disabled={!canUndo} />
          <MenuItem label="重做" shortcut="Ctrl+Y" onClick={redo} disabled={!canRedo} />
          <div className="border-t border-gray-200 my-1" />
          <MenuItem label="复制" shortcut="Ctrl+C" onClick={() => console.log('复制')} />
          <MenuItem label="粘贴" shortcut="Ctrl+V" onClick={() => console.log('粘贴')} />
          <MenuItem label="删除" shortcut="Del" onClick={() => console.log('删除')} />
          <div className="border-t border-gray-200 my-1" />
          <MenuItem label="全选" shortcut="Ctrl+A" onClick={() => console.log('全选')} />
          <MenuItem label="清空画布" onClick={clear} />
        </DropdownMenu>

        {/* 视图菜单 */}
        <DropdownMenu title="视图">
          <MenuItem 
            label={`${showGrid ? '隐藏' : '显示'}网格`} 
            shortcut="Ctrl+G" 
            onClick={() => setShowGrid(!showGrid)} 
          />
          <MenuItem 
            label={`${showRulers ? '隐藏' : '显示'}标尺`} 
            shortcut="Ctrl+R" 
            onClick={() => setShowRulers(!showRulers)} 
          />
          <div className="border-t border-gray-200 my-1" />
          <MenuItem label="重置视图" shortcut="Ctrl+0" onClick={resetView} />
          <MenuItem label="适应画布" shortcut="Ctrl+1" onClick={() => console.log('适应画布')} />
          <MenuItem label="实际大小" shortcut="Ctrl+2" onClick={() => console.log('实际大小')} />
        </DropdownMenu>

        {/* 窗口菜单 */}
        <DropdownMenu title="窗口">
          <MenuItem 
            label={`${showToolbar ? '隐藏' : '显示'}工具栏`} 
            onClick={() => setShowToolbar(!showToolbar)} 
          />
          <MenuItem 
            label={`${showLayerPanel ? '隐藏' : '显示'}图层面板`} 
            onClick={() => setShowLayerPanel(!showLayerPanel)} 
          />
          <MenuItem 
            label={`${showPropertiesPanel ? '隐藏' : '显示'}属性面板`} 
            onClick={() => setShowPropertiesPanel(!showPropertiesPanel)} 
          />
        </DropdownMenu>
      </div>

      {/* 中间标题 */}
      <div className="flex-1 text-center">
        <h1 className="text-lg font-semibold text-gray-800">Sky Canvas</h1>
      </div>

      {/* 右侧状态信息 */}
      <div className="flex items-center gap-4 text-xs text-gray-600">
        {performanceStats && (
          <>
            <span>FPS: {performanceStats.fps}</span>
            <span>绘制调用: {performanceStats.drawCalls}</span>
            <span>三角形: {performanceStats.triangles}</span>
          </>
        )}
        
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full" title="已连接"></span>
          <span>就绪</span>
        </div>
      </div>
    </div>
  );
};
