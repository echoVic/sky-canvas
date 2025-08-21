import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ZoomIn, ZoomOut, RotateCcw, Grid3X3 } from 'lucide-react';
import { Button } from '../UI/atoms/Button';

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

interface CanvasProps {
  className?: string;
  currentTool: string;
  brushSize: number;
  brushOpacity: number;
  currentColor: string;
}

export const Canvas: React.FC<CanvasProps> = ({
  className,
  currentTool,
  brushSize,
  brushOpacity,
  currentColor
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [objects, setObjects] = useState<CanvasObject[]>([
    {
      id: '1',
      type: 'rectangle',
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      fillColor: '#3b82f6',
      strokeColor: '#1e40af',
      strokeWidth: 2,
      selected: false
    },
    {
      id: '2',
      type: 'circle',
      x: 400,
      y: 200,
      radius: 80,
      fillColor: '#ef4444',
      strokeColor: '#dc2626',
      strokeWidth: 2,
      selected: true
    }
  ]);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{x: number, y: number}[]>([]);

  // 绘制网格
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    if (!showGrid) return;
    
    const gridSize = 20 * zoom;
    const offsetX = pan.x % gridSize;
    const offsetY = pan.y % gridSize;
    
    ctx.save();
    ctx.strokeStyle = '#e5e7eb';
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
    
    ctx.restore();
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
            if (obj.strokeWidth > 0) {
              ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
            }
          }
          break;
          
        case 'circle':
          if (obj.radius) {
            ctx.beginPath();
            ctx.arc(obj.x, obj.y, obj.radius, 0, Math.PI * 2);
            ctx.fill();
            if (obj.strokeWidth > 0) {
              ctx.stroke();
            }
          }
          break;
          
        case 'text':
          if (obj.text) {
            ctx.font = '16px Arial';
            ctx.fillText(obj.text, obj.x, obj.y);
          }
          break;
      }
      
      // 绘制选中状态
      if (obj.selected) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([5 / zoom, 5 / zoom]);
        
        switch (obj.type) {
          case 'rectangle':
            if (obj.width && obj.height) {
              ctx.strokeRect(obj.x - 5, obj.y - 5, obj.width + 10, obj.height + 10);
            }
            break;
          case 'circle':
            if (obj.radius) {
              ctx.beginPath();
              ctx.arc(obj.x, obj.y, obj.radius + 5, 0, Math.PI * 2);
              ctx.stroke();
            }
            break;
        }
        
        ctx.setLineDash([]);
      }
      
      ctx.restore();
    });
  }, [objects, zoom, pan]);

  // 绘制当前路径（画笔工具）
  const drawCurrentPath = useCallback((ctx: CanvasRenderingContext2D) => {
    if (currentPath.length < 2) return;
    
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);
    
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = brushOpacity / 100;
    
    ctx.beginPath();
    ctx.moveTo(currentPath[0].x, currentPath[0].y);
    
    for (let i = 1; i < currentPath.length; i++) {
      ctx.lineTo(currentPath[i].x, currentPath[i].y);
    }
    
    ctx.stroke();
    ctx.restore();
  }, [currentPath, currentColor, brushSize, brushOpacity, zoom, pan]);

  // 重绘画布
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格
    drawGrid(ctx, canvas);
    
    // 绘制对象
    drawObjects(ctx);
    
    // 绘制当前路径
    drawCurrentPath(ctx);
  }, [drawGrid, drawObjects, drawCurrentPath]);

  // 处理鼠标事件
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left - pan.x) / zoom;
    const y = (e.clientY - rect.top - pan.y) / zoom;
    
    if (currentTool === 'select') {
      // 选择工具逻辑
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (currentTool === 'brush') {
      // 画笔工具逻辑
      setIsDrawing(true);
      setCurrentPath([{ x, y }]);
    } else if (currentTool === 'rectangle') {
      // 矩形工具逻辑
      const newRect: CanvasObject = {
        id: Date.now().toString(),
        type: 'rectangle',
        x: x - 50,
        y: y - 25,
        width: 100,
        height: 50,
        fillColor: currentColor,
        strokeColor: '#000000',
        strokeWidth: 2,
        selected: true
      };
      
      setObjects(prev => [
        ...prev.map(obj => ({ ...obj, selected: false })),
        newRect
      ]);
    } else if (currentTool === 'circle') {
      // 圆形工具逻辑
      const newCircle: CanvasObject = {
        id: Date.now().toString(),
        type: 'circle',
        x,
        y,
        radius: 30,
        fillColor: currentColor,
        strokeColor: '#000000',
        strokeWidth: 2,
        selected: true
      };
      
      setObjects(prev => [
        ...prev.map(obj => ({ ...obj, selected: false })),
        newCircle
      ]);
    }
  }, [currentTool, zoom, pan, currentColor]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (isDragging && currentTool === 'select') {
      // 拖拽平移
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setDragStart({ x: e.clientX, y: e.clientY });
    } else if (isDrawing && currentTool === 'brush') {
      // 画笔绘制
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - pan.x) / zoom;
      const y = (e.clientY - rect.top - pan.y) / zoom;
      
      setCurrentPath(prev => [...prev, { x, y }]);
    }
  }, [isDragging, isDrawing, currentTool, dragStart, zoom, pan]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsDrawing(false);
    setCurrentPath([]);
  }, []);

  // 缩放控制
  const handleZoom = useCallback((delta: number) => {
    setZoom(prev => Math.max(0.1, Math.min(5, prev + delta)));
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        setObjects(prev => prev.filter(obj => !obj.selected));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 调整画布大小
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      redraw();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [redraw]);

  // 重绘触发
  useEffect(() => {
    redraw();
  }, [redraw]);

  return (
    <div 
      ref={containerRef}
      className={`relative flex-1 overflow-hidden bg-gray-50 ${className}`}
    >
      {/* 画布 */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      
      {/* 画布控制工具 */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <motion.div 
          className="flex flex-col gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-2"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => handleZoom(0.1)}
            title="放大 (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <div className="px-2 py-1 text-xs text-center text-gray-600 border-y border-gray-200">
            {Math.round(zoom * 100)}%
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => handleZoom(-0.1)}
            title="缩小 (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <div className="border-t border-gray-200 pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleResetView}
              title="重置视图 (0)"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
          
          <Button
            variant={showGrid ? 'primary' : 'ghost'}
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setShowGrid(!showGrid)}
            title="切换网格 (G)"
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </motion.div>
      </div>
      
      {/* 画布信息 */}
      <div className="absolute bottom-4 left-4">
        <motion.div 
          className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="text-xs text-gray-600">
            工具: <span className="font-medium">{currentTool}</span> |
            缩放: <span className="font-medium">{Math.round(zoom * 100)}%</span> |
            对象: <span className="font-medium">{objects.length}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Canvas;