import { useCallback, useEffect, useRef } from 'react';
import { RenderEngine } from '../engine/RenderEngine';
import { RendererType } from '../engine/core/RenderTypes';
import { useAppStore } from '../store/appStore';
import { useCanvasStore } from '../store/canvasStore';

export interface UseCanvasOptions {
  rendererType?: RendererType;
  enableInteraction?: boolean;
  autoResize?: boolean;
}

export const useCanvas = (options: UseCanvasOptions = {}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RenderEngine | null>(null);
  
  const {
    zoom,
    pan,
    size,
    isDragging,
    setSize,
    setZoom,
    setPan,
    setDragging
  } = useCanvasStore();
  
  const {
    renderEngine,
    setRenderEngine,
    updateFPS,
    updateRenderStats,
    setError
  } = useAppStore();
  
  const {
    rendererType = RendererType.CANVAS_2D,
    enableInteraction = true,
    autoResize = true
  } = options;
  
  // 初始化渲染引擎
  const initializeEngine = useCallback(async () => {
    if (!canvasRef.current) return;
    
    try {
      const engine = new RenderEngine(rendererType);
      await engine.initialize(canvasRef.current);
      
      engineRef.current = engine;
      setRenderEngine(engine);
      setError(null);
    } catch (error) {
      console.error('Failed to initialize render engine:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [rendererType, setRenderEngine, setError]);
  
  // 处理画布大小变化
  const handleResize = useCallback(() => {
    if (!canvasRef.current || !autoResize) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const newSize = {
      width: rect.width,
      height: rect.height
    };
    
    if (newSize.width !== size.width || newSize.height !== size.height) {
      setSize(newSize);
      
      // 更新画布实际尺寸
      canvasRef.current.width = newSize.width * window.devicePixelRatio;
      canvasRef.current.height = newSize.height * window.devicePixelRatio;
      canvasRef.current.style.width = `${newSize.width}px`;
      canvasRef.current.style.height = `${newSize.height}px`;
      
      // 通知渲染引擎尺寸变化
      if (engineRef.current) {
        engineRef.current.resize(newSize.width, newSize.height);
      }
    }
  }, [autoResize, size, setSize]);
  
  // 渲染循环
  const render = useCallback(() => {
    if (!engineRef.current) return;
    
    const startTime = performance.now();
    
    try {
      engineRef.current.render();
      
      // 更新性能统计
      const endTime = performance.now();
      const frameTime = endTime - startTime;
      const fps = frameTime > 0 ? 1000 / frameTime : 60;
      
      updateFPS(Math.round(fps));
      
      const stats = engineRef.current.getStats();
      updateRenderStats({
        drawCalls: stats.drawCalls,
        triangles: stats.triangles,
        vertices: stats.vertices
      });
    } catch (error) {
      console.error('Render error:', error);
      setError(error instanceof Error ? error.message : 'Render error');
    }
  }, [updateFPS, updateRenderStats, setError]);
  
  // 鼠标事件处理
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (!enableInteraction) return;
    
    setDragging(true);
    event.preventDefault();
  }, [enableInteraction, setDragging]);
  
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!enableInteraction || !isDragging) return;
    
    const deltaX = event.movementX / zoom;
    const deltaY = event.movementY / zoom;
    
    setPan({
      x: pan.x + deltaX,
      y: pan.y + deltaY
    });
  }, [enableInteraction, isDragging, zoom, pan, setPan]);
  
  const handleMouseUp = useCallback(() => {
    if (!enableInteraction) return;
    
    setDragging(false);
  }, [enableInteraction, setDragging]);
  
  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (!enableInteraction) return;
    
    event.preventDefault();
    
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = zoom * delta;
    
    setZoom(Math.max(0.1, Math.min(10, newZoom)));
  }, [enableInteraction, zoom, setZoom]);
  
  // 生命周期管理
  useEffect(() => {
    initializeEngine();
    
    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
        setRenderEngine(null);
      }
    };
  }, [initializeEngine, setRenderEngine]);
  
  // 自动调整大小
  useEffect(() => {
    if (!autoResize) return;
    
    const resizeObserver = new ResizeObserver(handleResize);
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }
    
    return () => resizeObserver.disconnect();
  }, [autoResize, handleResize]);
  
  // 渲染循环
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      render();
      animationId = requestAnimationFrame(animate);
    };
    
    animationId = requestAnimationFrame(animate);
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [render]);
  
  return {
    canvasRef,
    engine: engineRef.current,
    
    // 状态
    zoom,
    pan,
    size,
    isDragging,
    
    // 事件处理器
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleWheel,
    
    // 方法
    initializeEngine,
    handleResize
  };
};
