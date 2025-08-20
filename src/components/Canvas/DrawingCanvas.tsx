import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEventListener, useMouse } from 'ahooks';
import { useToolStore } from '../../store/toolStore';
import { useCanvasStore } from '../../store/canvasStore';
import { ToolType } from '../../types';
import { Vector2 } from '../../engine/math';

interface DrawingCanvasProps {
  className?: string;
}

interface DrawingPath {
  id: string;
  points: Vector2[];
  tool: ToolType;
  color: string;
  size: number;
  opacity: number;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  
  const { currentTool, brushSize, brushOpacity, color } = useToolStore();
  const { zoom, pan } = useCanvasStore();
  const mouse = useMouse(canvasRef.current);

  // 初始化画布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置高DPI支持
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    ctx.scale(dpr, dpr);
    contextRef.current = ctx;

    // 设置画布样式
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.imageSmoothingEnabled = true;

    // 绘制背景
    redrawCanvas();
  }, []);

  // 重绘整个画布
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制网格
    drawGrid(ctx, canvas.width, canvas.height);

    // 绘制所有路径
    paths.forEach(path => {
      drawPath(ctx, path);
    });

    // 绘制当前路径
    if (currentPath) {
      drawPath(ctx, currentPath);
    }
  }, [paths, currentPath]);

  // 绘制网格
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    const gridSize = 20 * zoom;
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 1;

    // 垂直线
    for (let x = (pan.x % gridSize); x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // 水平线
    for (let y = (pan.y % gridSize); y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [zoom, pan]);

  // 绘制路径
  const drawPath = useCallback((ctx: CanvasRenderingContext2D, path: DrawingPath) => {
    if (path.points.length < 2) return;

    ctx.save();
    ctx.globalAlpha = path.opacity;
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.size;

    if (path.tool === ToolType.ERASER) {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);

    // 使用二次贝塞尔曲线平滑线条
    for (let i = 1; i < path.points.length - 1; i++) {
      const currentPoint = path.points[i];
      const nextPoint = path.points[i + 1];
      const controlPoint = new Vector2(
        (currentPoint.x + nextPoint.x) / 2,
        (currentPoint.y + nextPoint.y) / 2
      );
      ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, controlPoint.x, controlPoint.y);
    }

    // 绘制最后一个点
    if (path.points.length > 1) {
      const lastPoint = path.points[path.points.length - 1];
      ctx.lineTo(lastPoint.x, lastPoint.y);
    }

    ctx.stroke();
    ctx.restore();
  }, []);

  // 获取鼠标在画布上的位置
  const getCanvasPosition = useCallback((clientX: number, clientY: number): Vector2 => {
    const canvas = canvasRef.current;
    if (!canvas) return new Vector2(0, 0);

    const rect = canvas.getBoundingClientRect();
    return new Vector2(
      (clientX - rect.left) / zoom + pan.x,
      (clientY - rect.top) / zoom + pan.y
    );
  }, [zoom, pan]);

  // 开始绘制
  const startDrawing = useCallback((e: React.PointerEvent) => {
    if (currentTool !== ToolType.BRUSH && currentTool !== ToolType.ERASER) return;

    setIsDrawing(true);
    const position = getCanvasPosition(e.clientX, e.clientY);
    
    const newPath: DrawingPath = {
      id: Date.now().toString(),
      points: [position],
      tool: currentTool,
      color: color,
      size: brushSize,
      opacity: brushOpacity
    };

    setCurrentPath(newPath);
    
    // 设置指针捕获
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.setPointerCapture(e.pointerId);
    }
  }, [currentTool, color, brushSize, brushOpacity, getCanvasPosition]);

  // 继续绘制
  const continueDrawing = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !currentPath) return;
    if (currentTool !== ToolType.BRUSH && currentTool !== ToolType.ERASER) return;

    const position = getCanvasPosition(e.clientX, e.clientY);
    
    setCurrentPath(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, position]
      };
    });
  }, [isDrawing, currentPath, currentTool, getCanvasPosition]);

  // 结束绘制
  const stopDrawing = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return;

    setIsDrawing(false);
    
    if (currentPath && currentPath.points.length > 1) {
      setPaths(prev => [...prev, currentPath]);
    }
    
    setCurrentPath(null);

    // 释放指针捕获
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
  }, [isDrawing, currentPath]);

  // 处理平移
  const handlePan = useCallback((e: React.PointerEvent) => {
    if (currentTool !== ToolType.PAN) return;
    
    // 平移逻辑将在后续实现
    console.log('Pan tool selected');
  }, [currentTool]);

  // 重绘画布当路径或缩放改变时
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas, zoom, pan]);

  // 清空画布
  const clearCanvas = useCallback(() => {
    setPaths([]);
    setCurrentPath(null);
    redrawCanvas();
  }, [redrawCanvas]);

  // 撤销最后一笔
  const undoLastStroke = useCallback(() => {
    setPaths(prev => prev.slice(0, -1));
  }, []);

  // 键盘事件处理
  useEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            // Redo - 暂时不实现
          } else {
            undoLastStroke();
          }
          break;
        case 'c':
          e.preventDefault();
          clearCanvas();
          break;
      }
    }
  });

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full cursor-crosshair border border-gray-200 rounded-lg"
        onPointerDown={startDrawing}
        onPointerMove={continueDrawing}
        onPointerUp={stopDrawing}
        onPointerLeave={stopDrawing}
        style={{ 
          touchAction: 'none',
          cursor: currentTool === ToolType.BRUSH ? 'crosshair' : 
                 currentTool === ToolType.ERASER ? 'grab' : 
                 currentTool === ToolType.PAN ? 'move' : 'default'
        }}
      />
      
      {/* 绘制状态指示器 */}
      {isDrawing && (
        <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
          正在绘制...
        </div>
      )}
      
      {/* 路径计数 */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
        笔画: {paths.length}
      </div>
    </div>
  );
};
