import { InfiniteCanvas } from './components/Canvas/InfiniteCanvas';
import { Toolbar } from './components/Tools/Toolbar';
import { PropertyPanel } from './components/Tools/PropertyPanel';
import { MathTestPanel } from './components/UI/MathTestPanel';

function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 顶部工具栏 */}
      <Toolbar />
      
      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 画布区域 */}
        <div className="flex-1 relative">
          <InfiniteCanvas className="absolute inset-0" />
        </div>
        
        {/* 右侧面板 */}
        <div className="w-64 bg-white border-l border-gray-200 overflow-y-auto">
          {/* 数学库测试面板 */}
          <div className="p-4 border-b border-gray-200">
            <MathTestPanel />
          </div>
          
          {/* 属性面板 */}
          <PropertyPanel />
        </div>
      </div>
    </div>
  );
}

export default App;
