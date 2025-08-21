import React, { useEffect, useRef, useState } from 'react';
import { Circle, Rectangle, Text } from '../engine/core/shapes';
import { InteractionManager } from '../engine/interaction/InteractionManager';
import { Transform, Vector2 } from '../engine/math';
import { RenderEngine } from '../engine/RenderEngine';
import { Camera, Scene } from '../engine/scene/Scene';
import { Viewport } from '../engine/scene/Viewport';
import { ISceneNode } from '../engine/scene/SceneNode';
import { wrapShape } from '../engine/scene/ShapeNode';
import { Rect } from '../types';
import { EventType, BaseEvent } from '../engine/events/EventSystem';

interface ToolbarProps {
  interactionManager: InteractionManager;
  currentTool: string;
  onToolChange: (tool: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ interactionManager, currentTool, onToolChange }) => {
  const tools = interactionManager.getTools();

  return (
    <div className="flex gap-2 p-4 bg-gray-100 border-b toolbar">
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
  selectedNodes: ISceneNode[];
  onPropertyChange: (nodeId: string, property: string, value: string | number | { x: number; y: number } | boolean) => void;
}

const Properties: React.FC<PropertiesProps> = ({ selectedNodes, onPropertyChange }) => {
  if (selectedNodes.length === 0) {
    return (
      <div className="p-4 border-l properties bg-gray-50">
        <h3 className="mb-2 text-lg font-semibold">属性</h3>
        <p className="text-gray-500">未选择任何对象</p>
      </div>
    );
  }

  const node = selectedNodes[0]; // 显示第一个选中节点的属性

  return (
    <div className="w-64 p-4 border-l properties bg-gray-50">
      <h3 className="mb-4 text-lg font-semibold">属性</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            位置 X
          </label>
          <input
            type="number"
            value={node.transform.position.x}
            onChange={(e) => onPropertyChange(node.id, 'position.x', parseFloat(e.target.value))}
            className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
          />
        </div>
        
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            位置 Y
          </label>
          <input
            type="number"
            value={node.transform.position.y}
            onChange={(e) => onPropertyChange(node.id, 'position.y', parseFloat(e.target.value))}
            className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
          />
        </div>
        
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
            旋转角度
          </label>
          <input
            type="number"
            value={node.transform.rotation * 180 / Math.PI}
            onChange={(e) => onPropertyChange(node.id, 'rotation', parseFloat(e.target.value) * Math.PI / 180)}
            className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
          />
        </div>
        
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
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
            className="w-full px-3 py-1 text-sm border border-gray-300 rounded"
          />
        </div>
        
        <div>
          <label className="block mb-1 text-sm font-medium text-gray-700">
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
        <p className="mt-4 text-sm text-gray-500">
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
  const [selectedNodes, setSelectedNodes] = useState<ISceneNode[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeCanvas = async () => {
      if (!canvasRef.current || isInitialized) return;

      const canvas = canvasRef.current;
      const engine = new RenderEngine('canvas2d');
      const scene = new Scene();
      const camera = new Camera('main-camera', 'Main Camera');
      const viewportBounds: Rect = { x: 0, y: 0, width: canvas.width, height: canvas.height };
      const viewport = new Viewport(viewportBounds);
      const interactionManager = new InteractionManager();

      // 初始化引擎
      await engine.initialize(canvas);
    
    // 设置视口
    viewport.setZoom(1);
    viewport.setPan(new Vector2(0, 0));

    // 设置摄像机
    camera.setViewport(viewportBounds);
    scene.setActiveCamera(camera);

    // 初始化交互管理器
    interactionManager.initialize(canvas, scene, viewport);

    // 创建示例图形
    createSampleShapes(scene);

      // 监听选择变化
      interactionManager.addEventListener(EventType.SELECTION_CHANGE, (event: BaseEvent & { selectionEvent?: { selected: ISceneNode[] } }) => {
        if (event.selectionEvent) {
          setSelectedNodes(event.selectionEvent.selected || []);
        }
      });

      // 将场景中的节点添加到渲染引擎
      const addSceneNodesToEngine = (node: ISceneNode) => {
        if (node.visible && 'draw' in node) {
          engine.addDrawable(node as unknown as import('../engine/core').Drawable);
        }
        node.children.forEach(child => addSceneNodesToEngine(child));
      };
      addSceneNodesToEngine(scene);

      // 启动渲染循环
      const renderLoop = () => {
        if (!engine) return;
        
        engine.clear();
        engine.render();
        
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
    };

    initializeCanvas();
  }, [isInitialized]);

  const createSampleShapes = (scene: Scene) => {
    // 创建矩形
    const rect = new Rectangle('rect1', 100, 100, 100, 60, true, {
      fillStyle: '#ff6b6b',
      strokeStyle: '#d63031',
      lineWidth: 2
    });
    const rectNode = wrapShape(rect, 'rect1');
    rectNode.transform = new Transform(new Vector2(100, 100));
    scene.addChild(rectNode);

    // 创建圆形
    const circle = new Circle('circle1', 250, 150, 40, true, {
      fillStyle: '#74b9ff',
      strokeStyle: '#0984e3',
      lineWidth: 2
    });
    const circleNode = wrapShape(circle, 'circle1');
    circleNode.transform = new Transform(new Vector2(250, 150));
    scene.addChild(circleNode);

    // 创建文本
    const text = new Text('text1', 'Hello Canvas!', 150, 250, '16px Arial', {
      fillStyle: '#2d3436',
      strokeStyle: '#636e72',
      lineWidth: 1
    });
    const textNode = wrapShape(text, 'text1');
    textNode.transform = new Transform(new Vector2(150, 250));
    scene.addChild(textNode);

    // 创建旋转的矩形
    const rotatedRect = new Rectangle('rect2', 350, 100, 80, 80, true, {
      fillStyle: '#fd79a8',
      strokeStyle: '#e84393',
      lineWidth: 2
    });
    const rotatedRectNode = wrapShape(rotatedRect, 'rect2');
    rotatedRectNode.transform = new Transform(
      new Vector2(350, 100),
      Math.PI / 4,
      new Vector2(1, 1)
    );
    scene.addChild(rotatedRectNode);

      // 更新碰撞检测
      interactionManagerRef.current?.updateCollisionNodes();
    };

  const handleToolChange = (toolName: string) => {
    if (interactionManagerRef.current) {
      interactionManagerRef.current.setActiveTool(toolName);
      setCurrentTool(toolName);
    }
  };

  const handlePropertyChange = (nodeId: string, property: string, value: string | number | { x: number; y: number } | boolean) => {
    const node = selectedNodes.find(n => n.id === nodeId);
    if (!node) return;

    // 更新节点属性
    if (property.startsWith('position.')) {
      const axis = property.split('.')[1];
      const newPosition = node.transform.position.clone();
      newPosition[axis as 'x' | 'y'] = value as number;
      node.transform.setPosition(newPosition);
    } else if (property === 'rotation') {
      node.transform.setRotation(value as number);
    } else if (property === 'scale') {
      const scaleValue = value as { x: number; y: number };
      node.transform.setScale(new Vector2(scaleValue.x, scaleValue.y));
    } else if (property === 'visible') {
      node.visible = value as boolean;
    }

    // 强制重新渲染
    if ('markDirty' in node && typeof node.markDirty === 'function') {
      node.markDirty();
    }
    
    // 更新碰撞检测
    interactionManagerRef.current?.updateCollisionNodes();
  };

  const addShape = (type: 'rectangle' | 'circle' | 'text') => {
    if (!sceneRef.current) return;

    const position = new Vector2(200 + Math.random() * 200, 150 + Math.random() * 150);
    let shapeNode: ISceneNode;

    switch (type) {
      case 'rectangle': {
        const rect = new Rectangle(`rect_${Date.now()}`, position.x, position.y, 80, 60, true, {
          fillStyle: `hsl(${Math.random() * 360}, 70%, 60%)`,
          strokeStyle: `hsl(${Math.random() * 360}, 70%, 40%)`,
          lineWidth: 2
        });
        shapeNode = wrapShape(rect);
        break;
      }
      case 'circle': {
        const circle = new Circle(`circle_${Date.now()}`, position.x, position.y, 30, true, {
          fillStyle: `hsl(${Math.random() * 360}, 70%, 60%)`,
          strokeStyle: `hsl(${Math.random() * 360}, 70%, 40%)`,
          lineWidth: 2
        });
        shapeNode = wrapShape(circle);
        break;
      }
      case 'text': {
        const text = new Text(`text_${Date.now()}`, '新文本', position.x, position.y, '14px Arial', {
          fillStyle: '#2d3436',
          strokeStyle: '#636e72',
          lineWidth: 1
        });
        shapeNode = wrapShape(text);
        break;
      }
    }

    shapeNode.transform = new Transform(position);
    sceneRef.current.addChild(shapeNode);
    
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
      <div className="flex gap-2 p-2 border-b bg-gray-50">
        <button
          onClick={() => addShape('rectangle')}
          className="px-3 py-1 text-sm text-white bg-blue-500 rounded hover:bg-blue-600"
        >
          添加矩形
        </button>
        <button
          onClick={() => addShape('circle')}
          className="px-3 py-1 text-sm text-white bg-green-500 rounded hover:bg-green-600"
        >
          添加圆形
        </button>
        <button
          onClick={() => addShape('text')}
          className="px-3 py-1 text-sm text-white bg-purple-500 rounded hover:bg-purple-600"
        >
          添加文本
        </button>
        <button
          onClick={clearCanvas}
          className="px-3 py-1 text-sm text-white bg-red-500 rounded hover:bg-red-600"
        >
          清空画布
        </button>
      </div>

      {/* 主内容区域 */}
      <div className="flex flex-1">
        {/* 画布 */}
        <div className="relative flex-1">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="bg-white border border-gray-300"
            style={{ width: '100%', height: '100%' }}
          />
          
          {/* 状态显示 */}
          <div className="absolute px-3 py-2 text-sm text-white bg-black bg-opacity-75 rounded top-4 left-4">
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
      <div className="p-4 text-sm text-gray-600 bg-gray-100 border-t">
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
