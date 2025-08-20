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
  
  // 直接在Canvas上绘制测试内容
  React.useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 设置高DPI支持
        const dpr = window.devicePixelRatio || 1;
        ctx.scale(dpr, dpr);
        
        // 绘制背景
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        
        // 绘制测试矩形
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(50, 50, 200, 150);
        
        // 绘制边框
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 2;
        ctx.strokeRect(50, 50, 200, 150);
        
        // 绘制文本
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Sky Canvas 运行中', 150, 125);
        
        // 绘制圆形
        ctx.beginPath();
        ctx.arc(350, 150, 50, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();
        ctx.strokeStyle = '#059669';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 绘制线条
        ctx.beginPath();
        ctx.moveTo(100, 250);
        ctx.lineTo(300, 300);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.stroke();
        
        console.log('Canvas test content rendered successfully');
      }
    }
  }, [canvasRef]);
  
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
