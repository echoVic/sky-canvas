import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Grid3X3, RotateCcw } from 'lucide-react';

interface CanvasObject {
  id: string;
  type: 'rectangle' | 'circle' | 'line' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  selected: boolean;
}

interface ModernCanvasProps {
  className?: string;
}

export const ModernCanvas: React.FC<ModernCanvasProps> = ({ className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [objects] = useState<CanvasObject[]>([
    {
      id: '1',
      type: 'rectangle',
      x: 200,
      y: 150,
      width: 200,
      height: 120,
      fillColor: '#3b82f6',
      strokeColor: '#1e40af',
      strokeWidth: 2,
      selected: false
    },
    {
      id: '2',
      type: 'circle',
      x: 500,
      y: 200,
      radius: 80,
      fillColor: '#ef4444',
      strokeColor: '#dc2626',
      strokeWidth: 2,
      selected: false
    }
  ]);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // 绘制网格
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!showGrid) return;
    
    const gridSize = 20 * zoom;
    const offsetX = pan.x % gridSize;
    const offsetY = pan.y % gridSize;
    
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.5;
    
    // 垂直线
    for (let x = offsetX; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    
    // 水平线
    for (let y = offsetY; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    ctx.globalAlpha = 1;
  }, [showGrid, zoom, pan]);

  // 绘制对象
  const drawObjects = useCallback((ctx: CanvasRenderingContext2D) => {
    objects.forEach(obj => {
      ctx.save();
      
      // 应用变换
      ctx.translate(pan.x, pan.y);
      ctx.scale(zoom, zoom);
      
      // 设置样式
      ctx.fillStyle = obj.fillColor;
      ctx.strokeStyle = obj.strokeColor;
      ctx.lineWidth = obj.strokeWidth;
      
      // 绘制对象
      switch (obj.type) {
        case 'rectangle':
          if (obj.width && obj.height) {
            ctx.fillRect(obj.x, obj.y, obj.width, obj.height);
            ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
          }
          break;
        case 'circle':
          if (obj.radius) {
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
          }
          break;
        case 'line':
          // 简单的线条实现
          ctx.beginPath();
          ctx.moveTo(obj.x, obj.y);
          ctx.lineTo(obj.x + (obj.width || 100), obj.y + (obj.height || 0));
          ctx.stroke();
          break;
        case 'text':
          ctx.fillStyle = obj.fillColor;
          ctx.font = '16px Arial';
          ctx.fillText(obj.text || 'Text', obj.x, obj.y);
          break;
      }
      
      // 绘制选择框
      if (obj.selected) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        if (obj.type === 'rectangle' && obj.width && obj.height) {
          ctx.strokeRect(obj.x - 5, obj.y - 5, obj.width + 10, obj.height + 10);
        } else if (obj.type === 'circle' && obj.radius) {
          ctx.beginPath();
          ctx.arc(obj.x, obj.y, obj.radius + 5, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        ctx.setLineDash([]);
      }
      
      ctx.restore();
    });
  }, [objects, zoom, pan]);

  // 渲染画布
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格
    drawGrid(ctx, canvas);
    
    // 绘制对象
    drawObjects(ctx);
  }, [drawGrid, drawObjects]);

  // 处理鼠标事件
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  // 重置视图
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // 调整画布大小
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      render();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [render]);

  // 重新渲染
  useEffect(() => {
    render();
  }, [render]);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 ${className}`}
    >
      {/* 画布 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
      
      {/* 浮动控制面板 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/90 backdrop-blur-xl rounded-xl p-2 shadow-lg border border-slate-200/50"
      >
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded-lg transition-colors ${
            showGrid 
              ? 'bg-blue-500 text-white' 
              : 'hover:bg-slate-100 text-slate-600'
          }`}
          title="切换网格"
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
        
        <button
          onClick={resetView}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          title="重置视图"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        
        <div className="px-3 py-1 bg-slate-100 rounded-lg text-sm text-slate-600">
          {Math.round(zoom * 100)}%
        </div>
      </motion.div>
      
      {/* 画布信息 */}
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-xl rounded-lg p-3 shadow-lg border border-slate-200/50">
        <div className="text-sm text-slate-600 space-y-1">
          <div>缩放: {Math.round(zoom * 100)}%</div>
          <div>平移: ({Math.round(pan.x)}, {Math.round(pan.y)})</div>
          <div>对象: {objects.length}</div>
        </div>
      </div>
    </div>
  );
};

export default ModernCanvas;