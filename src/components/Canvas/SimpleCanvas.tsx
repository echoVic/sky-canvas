import React, { useEffect, useRef } from 'react';

interface SimpleCanvasProps {
  width?: number;
  height?: number;
  className?: string;
}

export const SimpleCanvas: React.FC<SimpleCanvasProps> = ({
  width = 800,
  height = 600,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // 绘制背景
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, rect.width, rect.height);

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
    ctx.fillText('Sky Canvas 正常运行', 150, 125);
    
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

    // 绘制更多测试图形
    // 三角形
    ctx.beginPath();
    ctx.moveTo(450, 100);
    ctx.lineTo(500, 200);
    ctx.lineTo(400, 200);
    ctx.closePath();
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 文本标签
    ctx.fillStyle = '#374151';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('矩形', 50, 220);
    ctx.fillText('圆形', 320, 220);
    ctx.fillText('三角形', 420, 220);
    ctx.fillText('线条', 200, 320);

    console.log('SimpleCanvas rendered successfully');
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={`border border-gray-300 bg-white ${className}`}
      style={{ width: '100%', height: '100%' }}
    />
  );
};
