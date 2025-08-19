import React, { useRef, useEffect, useCallback } from 'react';
import { useCanvasStore } from '../../store/canvasStore';
import { useToolStore } from '../../store/toolStore';
import { CanvasRenderer } from '../../engine/renderers/CanvasRenderer';
import { RenderContext, Point, ToolType } from '../../types';
import { MathUtils } from '../../engine/math';

interface InfiniteCanvasProps {
  className?: string;
}

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef<Point>({ x: 0, y: 0 });

  const { zoom, pan, size, setSize, setPan, setDragging } = useCanvasStore();
  const { currentTool } = useToolStore();

  // 初始化渲染器
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderer = new CanvasRenderer();
    rendererRef.current = renderer;

    const devicePixelRatio = window.devicePixelRatio || 1;
    
    const renderContext: RenderContext = {
      canvas,
      ctx,
      viewport: { x: pan.x, y: pan.y, width: size.width, height: size.height },
      devicePixelRatio
    };

    renderer.startRenderLoop(renderContext);

    return () => {
      renderer.dispose();
    };
  }, []);

  // 更新画布尺寸
  const updateCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const devicePixelRatio = window.devicePixelRatio || 1;

    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    setSize({ width: rect.width, height: rect.height });
  }, [setSize]);

  useEffect(() => {
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, [updateCanvasSize]);

  // 鼠标事件处理
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    isDraggingRef.current = true;
    lastPointerRef.current = point;
    setDragging(true);

    canvas.setPointerCapture(e.pointerId);
  }, [setDragging]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    if (currentTool === ToolType.PAN) {
      const delta: Point = {
        x: point.x - lastPointerRef.current.x,
        y: point.y - lastPointerRef.current.y
      };

      setPan({
        x: pan.x - delta.x / zoom,
        y: pan.y - delta.y / zoom
      });
    }

    lastPointerRef.current = point;
  }, [currentTool, pan, zoom, setPan]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    isDraggingRef.current = false;
    setDragging(false);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(e.pointerId);
    }
  }, [setDragging]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = MathUtils.clamp(zoom * zoomFactor, 0.1, 10);

    // 以鼠标位置为中心缩放
    const worldPoint = MathUtils.inverseTransformPoint(point, zoom, pan);
    const newPan = {
      x: worldPoint.x - point.x / newZoom,
      y: worldPoint.y - point.y / newZoom
    };

    useCanvasStore.getState().setZoom(newZoom);
    setPan(newPan);
  }, [zoom, pan, setPan]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full h-full cursor-crosshair ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      style={{ touchAction: 'none' }}
    />
  );
};
