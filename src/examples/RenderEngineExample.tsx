import React, { useEffect, useRef } from 'react';
import { createCanvasRenderEngine, ShapeFactory } from '../engine';

/**
 * 渲染引擎使用示例组件
 */
export const RenderEngineExample: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 创建渲染引擎
    const engine = createCanvasRenderEngine();
    
    // 初始化引擎
    engine.initialize(canvasRef.current);

    // 创建演示图形
    const background = ShapeFactory.createRectangle('bg', 0, 0, 800, 600, true);
    background.setStyle({ fillStyle: '#f8f9fa' });

    const redRect = ShapeFactory.createRectangle('rect1', 100, 100, 150, 100, true);
    redRect.setStyle({ fillStyle: '#e74c3c' });
    redRect.transform.setRotation(Math.PI / 8);

    const blueCircle = ShapeFactory.createCircle('circle1', 400, 200, 60, true);
    blueCircle.setStyle({ fillStyle: '#3498db' });

    const greenLine = ShapeFactory.createLine('line1', 50, 50, 250, 200);
    greenLine.setStyle({ strokeStyle: '#2ecc71', lineWidth: 4 });

    const title = ShapeFactory.createText('title', '渲染引擎演示', 300, 350, '28px Arial');
    title.setStyle({ fillStyle: '#2c3e50' });

    // 添加图形到引擎
    [background, redRect, blueCircle, greenLine, title].forEach(shape => {
      engine.addDrawable(shape);
    });

    // 渲染场景
    engine.render();

    // 清理函数
    return () => {
      engine.dispose();
    };
  }, []);

  return (
    <div className="render-engine-example">
      <h3>渲染引擎演示</h3>
      <canvas 
        ref={canvasRef}
        width={800}
        height={600}
        style={{ 
          border: '1px solid #ddd',
          borderRadius: '8px',
          maxWidth: '100%',
          height: 'auto'
        }}
      />
      <div className="mt-4 text-sm text-gray-600">
        <p>✅ Canvas2D渲染器</p>
        <p>✅ 基础图形绘制（矩形、圆形、线条、文本）</p>
        <p>✅ 变换支持（旋转、缩放、平移）</p>
        <p>✅ 样式管理（颜色、线宽等）</p>
        <p>✅ 渲染状态管理</p>
      </div>
    </div>
  );
};
