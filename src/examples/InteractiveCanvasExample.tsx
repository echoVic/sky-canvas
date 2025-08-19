import React, { useEffect, useRef, useState } from 'react';
import { Circle, Rectangle, Text } from '../engine/core/shapes';
import { InteractionManager } from '../engine/interaction/InteractionManager';
import { Transform, Vector2 } from '../engine/math';
import { RenderEngine } from '../engine/RenderEngine';
import { Camera, Scene } from '../engine/scene/Scene';
import { Viewport } from '../engine/scene/Viewport';

interface ToolbarProps {
  interactionManager: InteractionManager;
  currentTool: string;
  onToolChange: (tool: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ interactionManager, currentTool, onToolChange }) => {
  const tools = interactionManager.getTools();

  return (
    <div className="toolbar flex gap-2 p-4 bg-gray-100 border-b">
      {tools.map(tool => (
        <button
          key={tool.name}
          className={`px-4 py-2 rounded ${
            currentTool === tool.name 
              ? 'bg-blue-500 text-white' 
              : 'bg-white text-gray-700 hover:bg-gray-50'
          }`}
          onClick={() => onToolChange(tool.name)}
          disabled={!tool.enabled}
        >
          {tool.name.charAt(0).toUpperCase() + tool.name.slice(1)}
        </button>
      ))}
    </div>
  );
};

interface PropertiesProps {
  selectedNodes: any[];
  onPropertyChange: (nodeId: string, property: string, value: any) => void;
}

const Properties: React.FC<PropertiesProps> = ({ selectedNodes, onPropertyChange }) => {
  if (selectedNodes.length === 0) {
    return (
      <div className="properties p-4 bg-gray-50 border-l">
        <h3 className="text-lg font-semibold mb-2">属性</h3>
        <p className="text-gray-500">未选择任何对象</p>
      </div>
    );
  }

  const node = selectedNodes[0]; // 显示第一个选中节点的属性

  return (
    <div className="properties p-4 bg-gray-50 border-l w-64">
      <h3 className="text-lg font-semibold mb-4">属性</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            位置 X
          </label>
          <input
            type="number"
            value={node.transform.position.x}
            onChange={(e) => onPropertyChange(node.id, 'position.x', parseFloat(e.target.value))}
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            位置 Y
          </label>
          <input
            type="number"
            value={node.transform.position.y}
            onChange={(e) => onPropertyChange(node.id, 'position.y', parseFloat(e.target.value))}
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            旋转角度
          </label>
          <input
            type="number"
            value={node.transform.rotation * 180 / Math.PI}
            onChange={(e) => onPropertyChange(node.id, 'rotation', parseFloat(e.target.value) * Math.PI / 180)}
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            缩放
          </label>
          <input
            type="number"
            step="0.1"
            value={node.transform.scale.x}
            onChange={(e) => {
              const scale = parseFloat(e.target.value);
              onPropertyChange(node.id, 'scale', { x: scale, y: scale });
            }}
            className="w-full px-3 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            可见性
          </label>
          <input
            type="checkbox"
            checked={node.visible}
            onChange={(e) => onPropertyChange(node.id, 'visible', e.target.checked)}
            className="rounded"
          />
        </div>
      </div>
      
      {selectedNodes.length > 1 && (
        <p className="text-sm text-gray-500 mt-4">
          已选择 {selectedNodes.length} 个对象
        </p>
      )}
    </div>
  );
};

const InteractiveCanvasExample: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<RenderEngine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const interactionManagerRef = useRef<InteractionManager | null>(null);
  
  const [currentTool, setCurrentTool] = useState('select');
  const [selectedNodes, setSelectedNodes] = useState<any[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    const canvas = canvasRef.current;
    const engine = new RenderEngine();
    const scene = new Scene();
    const camera = new Camera();
    const viewport = new Viewport();
    const interactionManager = new InteractionManager();

    // 初始化引擎
    engine.initialize(canvas, 'canvas2d');
    
    // 设置视口
    viewport.setSize(canvas.width, canvas.height);
    viewport.setZoom(1);
    viewport.setPosition(new Vector2(0, 0));

    // 设置摄像机
    camera.setViewport(viewport);
    scene.setActiveCamera(camera);

    // 初始化交互管理器
    interactionManager.initialize(canvas, scene, viewport);

    // 创建示例图形
    createSampleShapes(scene);

    // 监听选择变化
    interactionManager.addEventListener('selection-change', (event: any) => {
      setSelectedNodes([...event.selectedNodes]);
    });

    // 启动渲染循环
    const renderLoop = () => {
      engine.clear();
      scene.render(engine.getRenderer()!);
      
      // 渲染交互调试信息
      const context = engine.getRenderer()!.getContext();
      if (context) {
        interactionManager.renderDebug(context);
      }
      
      requestAnimationFrame(renderLoop);
    };
    renderLoop();

    // 保存引用
    engineRef.current = engine;
    sceneRef.current = scene;
    interactionManagerRef.current = interactionManager;
    
    setIsInitialized(true);

    return () => {
      interactionManager.dispose();
      engine.dispose();
    };
  }, [isInitialized]);

  const createSampleShapes = (scene: Scene) => {
    // 创建矩形
    const rect = new Rectangle(100, 60);
    rect.transform = new Transform(new Vector2(100, 100));
    rect.style = {
      fillColor: '#ff6b6b',
      strokeColor: '#d63031',
      lineWidth: 2
    };
    scene.addChild(rect);

    // 创建圆形
    const circle = new Circle(40);
    circle.transform = new Transform(new Vector2(250, 150));
    circle.style = {
      fillColor: '#74b9ff',
      strokeColor: '#0984e3',
      lineWidth: 2
    };
    scene.addChild(circle);

    // 创建文本
    const text = new Text('Hello Canvas!', '16px Arial');
    text.transform = new Transform(new Vector2(150, 250));
    text.style = {
      fillColor: '#2d3436',
      strokeColor: '#636e72',
      lineWidth: 1
    };
    scene.addChild(text);

    // 创建旋转的矩形
    const rotatedRect = new Rectangle(80, 80);
    rotatedRect.transform = new Transform(
      new Vector2(350, 100),
      Math.PI / 4,
      new Vector2(1, 1)
    );
    rotatedRect.style = {
      fillColor: '#fd79a8',
      strokeColor: '#e84393',
      lineWidth: 2
    };
    scene.addChild(rotatedRect);

    // 更新碰撞检测
    interactionManagerRef.current?.updateCollisionNodes();
  };

  const handleToolChange = (toolName: string) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.setActiveTool(toolName);
      setCurrentTool(toolName);
    }
  };

  const handlePropertyChange = (nodeId: string, property: string, value: any) => {
    const node = selectedNodes.find(n => n.id === nodeId);
    if (!node) return;

    // 更新节点属性
    if (property.startsWith('position.')) {
      const axis = property.split('.')[1];
      const newPosition = node.transform.position.clone();
      newPosition[axis as 'x' | 'y'] = value;
      node.transform.setPosition(newPosition);
    } else if (property === 'rotation') {
      node.transform.setRotation(value);
    } else if (property === 'scale') {
      node.transform.setScale(new Vector2(value.x, value.y));
    } else if (property === 'visible') {
      node.visible = value;
    }

    // 强制重新渲染
    node.markDirty();
    
    // 更新碰撞检测
    interactionManagerRef.current?.updateCollisionNodes();
  };

  const addShape = (type: 'rectangle' | 'circle' | 'text') => {
    if (!sceneRef.current) return;

    let shape;
    const position = new Vector2(200 + Math.random() * 200, 150 + Math.random() * 150);

    switch (type) {
      case 'rectangle':
        shape = new Rectangle(80, 60);
        shape.style = {
          fillColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
          strokeColor: `hsl(${Math.random() * 360}, 70%, 40%)`,
          lineWidth: 2
        };
        break;
      case 'circle':
        shape = new Circle(30);
        shape.style = {
          fillColor: `hsl(${Math.random() * 360}, 70%, 60%)`,
          strokeColor: `hsl(${Math.random() * 360}, 70%, 40%)`,
          lineWidth: 2
        };
        break;
      case 'text':
        shape = new Text('新文本', '14px Arial');
        shape.style = {
          fillColor: '#2d3436',
          strokeColor: '#636e72',
          lineWidth: 1
        };
        break;
    }

    shape.transform = new Transform(position);
    sceneRef.current.addChild(shape);
    
    // 更新碰撞检测
    interactionManagerRef.current?.updateCollisionNodes();
  };

  const clearCanvas = () => {
    if (!sceneRef.current) return;
    
    // 清空所有子节点
    const children = [...sceneRef.current.children];
    for (const child of children) {
      child.removeFromParent();
    }
    
    // 清空选择
    interactionManagerRef.current?.clearSelection();
    
    // 更新碰撞检测
    interactionManagerRef.current?.updateCollisionNodes();
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 工具栏 */}
      {interactionManagerRef.current && (
        <Toolbar
          interactionManager={interactionManagerRef.current}
          currentTool={currentTool}
          onToolChange={handleToolChange}
        />
      )}
      
      {/* 操作按钮 */}
      <div className="flex gap-2 p-2 bg-gray-50 border-b">
        <button
          onClick={() => addShape('rectangle')}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          添加矩形
        </button>
        <button
          onClick={() => addShape('circle')}
          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
        >
          添加圆形
        </button>
        <button
          onClick={() => addShape('text')}
          className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
        >
          添加文本
        </button>
        <button
          onClick={clearCanvas}
          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
        >
          清空画布
        </button>
      </div>

      {/* 主内容区域 */}
      <div className="flex flex-1">
        {/* 画布 */}
        <div className="flex-1 relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border border-gray-300 bg-white"
            style={{ width: '100%', height: '100%' }}
          />
          
          {/* 状态显示 */}
          <div className="absolute top-4 left-4 bg-black bg-opacity-75 text-white px-3 py-2 rounded text-sm">
            <div>当前工具: {currentTool}</div>
            <div>已选择: {selectedNodes.length} 个对象</div>
          </div>
        </div>

        {/* 属性面板 */}
        <Properties
          selectedNodes={selectedNodes}
          onPropertyChange={handlePropertyChange}
        />
      </div>

      {/* 使用说明 */}
      <div className="p-4 bg-gray-100 border-t text-sm text-gray-600">
        <div className="flex gap-8">
          <div>
            <strong>选择工具:</strong> 点击选择对象，拖拽进行框选，Ctrl+点击多选
          </div>
          <div>
            <strong>平移工具:</strong> 拖拽移动视图
          </div>
          <div>
            <strong>缩放工具:</strong> 点击放大，右键缩小，鼠标滚轮缩放
          </div>
          <div>
            <strong>键盘:</strong> Delete删除选中对象
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveCanvasExample;
