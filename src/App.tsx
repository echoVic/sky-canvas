import { InfiniteCanvas } from './components/Canvas/InfiniteCanvas';
import { Toolbar } from './components/Tools/Toolbar';
import { PropertyPanel } from './components/Tools/PropertyPanel';

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
        
        {/* 右侧属性面板 */}
        <PropertyPanel />
      </div>
    </div>
  );
}

export default App;
