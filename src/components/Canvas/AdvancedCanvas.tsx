import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useEventListener, useMouse } from 'ahooks';
import { useToolStore } from '../../store/toolStore';
import { useCanvasStore } from '../../store/canvasStore';
import { ToolType } from '../../types';
import { Vector2 } from '../../engine/math';

interface DrawingElement {
  id: string;
  type: 'brush' | 'text' | 'rectangle' | 'circle' | 'line' | 'triangle';
  points?: Vector2[];
  text?: string;
  position?: Vector2;
  size?: Vector2;
  radius?: number;
  style: {
    color: string;
    size: number;
    opacity: number;
    fontFamily?: string;
    fontSize?: number;
  };
}

interface TextElement extends DrawingElement {
  type: 'text';
  text: string;
  position: Vector2;
  isEditing?: boolean;
}

interface AdvancedCanvasProps {
  className?: string;
}

export const AdvancedCanvas: React.FC<AdvancedCanvasProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Vector2 | null>(null);
  const [currentElement, setCurrentElement] = useState<DrawingElement | null>(null);
  const [elements, setElements] = useState<DrawingElement[]>([]);
  const [editingText, setEditingText] = useState<TextElement | null>(null);
  
  const { 
    currentTool, 
    brushSize, 
    brushOpacity, 
    color, 
    fontSize, 
    fontFamily 
  } = useToolStore();
  
  const { zoom, pan } = useCanvasStore();

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

    // 绘制所有元素
    elements.forEach(element => {
      drawElement(ctx, element);
    });

    // 绘制当前元素
    if (currentElement) {
      drawElement(ctx, currentElement);
    }
  }, [elements, currentElement]);

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

  // 绘制元素
  const drawElement = useCallback((ctx: CanvasRenderingContext2D, element: DrawingElement) => {
    ctx.save();
    ctx.globalAlpha = element.style.opacity;
    ctx.strokeStyle = element.style.color;
    ctx.fillStyle = element.style.color;
    ctx.lineWidth = element.style.size;

    switch (element.type) {
      case 'brush':
        if (element.points && element.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          
          for (let i = 1; i < element.points.length - 1; i++) {
            const currentPoint = element.points[i];
            const nextPoint = element.points[i + 1];
            const controlPoint = new Vector2(
              (currentPoint.x + nextPoint.x) / 2,
              (currentPoint.y + nextPoint.y) / 2
            );
            ctx.quadraticCurveTo(currentPoint.x, currentPoint.y, controlPoint.x, controlPoint.y);
          }
          
          if (element.points.length > 1) {
            const lastPoint = element.points[element.points.length - 1];
            ctx.lineTo(lastPoint.x, lastPoint.y);
          }
          
          ctx.stroke();
        }
        break;

      case 'text':
        if (element.text && element.position) {
          ctx.font = `${element.style.fontSize || 16}px ${element.style.fontFamily || 'Arial'}`;
          ctx.textBaseline = 'top';
          ctx.fillText(element.text, element.position.x, element.position.y);
        }
        break;

      case 'rectangle':
        if (element.position && element.size) {
          ctx.strokeRect(element.position.x, element.position.y, element.size.x, element.size.y);
        }
        break;

      case 'circle':
        if (element.position && element.radius) {
          ctx.beginPath();
          ctx.arc(element.position.x, element.position.y, element.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
        break;

      case 'line':
        if (element.points && element.points.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          ctx.lineTo(element.points[1].x, element.points[1].y);
          ctx.stroke();
        }
        break;

      case 'triangle':
        if (element.points && element.points.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          ctx.lineTo(element.points[1].x, element.points[1].y);
          ctx.lineTo(element.points[2].x, element.points[2].y);
          ctx.closePath();
          ctx.stroke();
        }
        break;
    }

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

  // 开始绘制/创建形状
  const startDrawing = useCallback((e: React.PointerEvent) => {
    // 如果正在编辑文字，不处理画布点击事件
    if (editingText) {
      return;
    }
    
    const position = getCanvasPosition(e.clientX, e.clientY);
    
    if (currentTool === ToolType.TEXT) {
      // 文字工具：双击或单击添加文字
      const newTextElement: TextElement = {
        id: Date.now().toString(),
        type: 'text',
        text: '',
        position,
        isEditing: true,
        style: {
          color,
          size: brushSize,
          opacity: brushOpacity,
          fontFamily,
          fontSize
        }
      };
      
      setEditingText(newTextElement);
      setElements(prev => [...prev, newTextElement]);
      
      // 显示文字输入框
      setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.focus();
        }
      }, 0);
      
      return;
    }

    setIsDrawing(true);
    setStartPoint(position);
    
    const newElement: DrawingElement = {
      id: Date.now().toString(),
      type: currentTool as 'brush' | 'text' | 'rectangle' | 'circle' | 'line' | 'triangle',
      style: {
        color,
        size: brushSize,
        opacity: brushOpacity,
        fontFamily,
        fontSize
      }
    };

    if (currentTool === ToolType.BRUSH) {
      newElement.points = [position];
    } else if (currentTool === ToolType.RECTANGLE) {
      newElement.position = position;
      newElement.size = new Vector2(0, 0);
    } else if (currentTool === ToolType.CIRCLE) {
      newElement.position = position;
      newElement.radius = 0;
    } else if (currentTool === ToolType.LINE) {
      newElement.points = [position, position];
    }

    setCurrentElement(newElement);
    
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.setPointerCapture(e.pointerId);
    }
  }, [editingText, currentTool, color, brushSize, brushOpacity, fontFamily, fontSize, getCanvasPosition]);

  // 继续绘制/调整形状
  const continueDrawing = useCallback((e: React.PointerEvent) => {
    if (!isDrawing || !currentElement || !startPoint) return;
    
    const position = getCanvasPosition(e.clientX, e.clientY);
    
    if (currentTool === ToolType.BRUSH) {
      setCurrentElement(prev => {
        if (!prev || !prev.points) return prev;
        return {
          ...prev,
          points: [...prev.points, position]
        };
      });
    } else if (currentTool === ToolType.RECTANGLE) {
      const width = position.x - startPoint.x;
      const height = position.y - startPoint.y;
      
      setCurrentElement(prev => ({
        ...prev!,
        size: new Vector2(width, height)
      }));
    } else if (currentTool === ToolType.CIRCLE) {
      const radius = Math.sqrt(
        Math.pow(position.x - startPoint.x, 2) + 
        Math.pow(position.y - startPoint.y, 2)
      );
      
      setCurrentElement(prev => ({
        ...prev!,
        radius
      }));
    } else if (currentTool === ToolType.LINE) {
      setCurrentElement(prev => ({
        ...prev!,
        points: [startPoint, position]
      }));
    }
  }, [isDrawing, currentElement, startPoint, currentTool, getCanvasPosition]);

  // 结束绘制
  const stopDrawing = useCallback((e: React.PointerEvent) => {
    if (!isDrawing) return;

    setIsDrawing(false);
    
    if (currentElement) {
      setElements(prev => [...prev, currentElement]);
    }
    
    setCurrentElement(null);
    setStartPoint(null);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
  }, [isDrawing, currentElement]);


  // 处理文字输入
  const handleTextInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && editingText) {
      const text = e.currentTarget.value.trim();
      
      if (text) {
        // 有文字内容，保存文字
        setElements(prev => 
          prev.map(el => 
            el.id === editingText.id 
              ? { ...el, text, isEditing: false }
              : el
          )
        );
      } else {
        // 没有文字内容，删除元素
        setElements(prev => prev.filter(el => el.id !== editingText.id));
      }
      
      setEditingText(null);
      e.currentTarget.value = '';
    } else if (e.key === 'Escape') {
      // 取消编辑
      setElements(prev => prev.filter(el => el.id !== editingText?.id));
      setEditingText(null);
      e.currentTarget.value = '';
    }
  }, [editingText]);

  // 处理文字输入失去焦点
  const handleTextBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (editingText) {
      const text = e.currentTarget.value.trim();
      
      if (text) {
        // 有文字内容，保存文字
        setElements(prev => 
          prev.map(el => 
            el.id === editingText.id 
              ? { ...el, text, isEditing: false }
              : el
          )
        );
      } else {
        // 没有文字内容，删除元素
        setElements(prev => prev.filter(el => el.id !== editingText.id));
      }
      
      setEditingText(null);
      e.currentTarget.value = '';
    }
  }, [editingText]);

  // 重绘画布当元素改变时
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas, zoom, pan]);

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
                 currentTool === ToolType.TEXT ? 'text' :
                 currentTool === ToolType.PAN ? 'move' : 'crosshair'
        }}
      />
      
      {/* 文字输入框 */}
      {editingText && (
        <input
          ref={textInputRef}
          type="text"
          className="absolute bg-transparent border-none outline-none text-black"
          style={{
            left: editingText.position.x,
            top: editingText.position.y,
            fontSize: `${editingText.style.fontSize}px`,
            fontFamily: editingText.style.fontFamily,
            color: editingText.style.color,
            zIndex: 10
          }}
          onKeyDown={handleTextInput}
          onBlur={handleTextBlur}
        />
      )}
      
      {/* 绘制状态指示器 */}
      {isDrawing && (
        <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
          正在{currentTool === ToolType.BRUSH ? '绘制' : '创建形状'}...
        </div>
      )}
      
      {/* 元素计数 */}
      <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
        元素: {elements.length}
      </div>
    </div>
  );
};
