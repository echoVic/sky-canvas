import React from 'react';
import { RendererType } from '../../engine/core/RenderTypes';
import { useCanvas } from '../../hooks/useCanvas';
import { useTools } from '../../hooks/useTools';
import { useAppStore } from '../../store/appStore';

interface CanvasContainerProps {
  className?: string;
  rendererType?: RendererType;
  enableInteraction?: boolean;
  showGrid?: boolean;
}

export const CanvasContainer: React.FC<CanvasContainerProps> = ({
  className = '',
  rendererType = RendererType.CANVAS_2D,
  enableInteraction = true,
  showGrid = true
}) => {
  const { showGrid: showGridFromStore } = useAppStore();
  const { getToolCursor } = useTools();
  
  const {
    canvasRef,
    zoom,
    pan,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel
  } = useCanvas({
    rendererType,
    enableInteraction,
    autoResize: true
  });
  
  const shouldShowGrid = showGrid && showGridFromStore;
  const cursor = getToolCursor();
  
  return (
    <div 
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{ cursor: isDragging ? 'grabbing' : cursor }}
    >
      {/* 网格背景 */}
      {shouldShowGrid && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, #e5e7eb 1px, transparent 1px),
              linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: `${pan.x * zoom}px ${pan.y * zoom}px`
          }}
        />
      )}
      
      {/* 主画布 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />
      
      {/* 缩放和平移信息 */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm font-mono">
        <div>缩放: {(zoom * 100).toFixed(0)}%</div>
        <div>位置: ({pan.x.toFixed(0)}, {pan.y.toFixed(0)})</div>
      </div>
    </div>
  );
};
