import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layers, 
  Settings, 
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '../UI/atoms/Button';
import { Icon } from '../UI/atoms/Icon';

interface MainLayoutProps {
  children: React.ReactNode;
  toolbar?: React.ReactNode;
  leftPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
  statusBar?: React.ReactNode;
}

interface PanelState {
  isOpen: boolean;
  width: number;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  toolbar,
  leftPanel,
  rightPanel,
  statusBar
}) => {
  const [leftPanelState, setLeftPanelState] = useState<PanelState>({
    isOpen: true,
    width: 280
  });
  
  const [rightPanelState, setRightPanelState] = useState<PanelState>({
    isOpen: true,
    width: 320
  });

  const toggleLeftPanel = () => {
    setLeftPanelState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  };

  const toggleRightPanel = () => {
    setRightPanelState(prev => ({ ...prev, isOpen: !prev.isOpen }));
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
      {/* 顶部工具栏 */}
      {toolbar && (
        <motion.div 
          className="flex-shrink-0 z-30 relative"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="bg-white/80 backdrop-blur-xl border-b border-gray-200/60 shadow-sm">
            <div className="px-6 py-4">
              {toolbar}
            </div>
          </div>
        </motion.div>
      )}

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* 左侧面板 */}
        <AnimatePresence mode="wait">
          {leftPanelState.isOpen && (
            <motion.div
              className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-r border-gray-200/60 shadow-lg z-20"
              style={{ width: leftPanelState.width }}
              initial={{ x: -leftPanelState.width, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -leftPanelState.width, opacity: 0 }}
              transition={{ 
                duration: 0.3, 
                ease: "easeOut" 
              }}
            >
              {/* 左侧面板头部 */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200/60">
                <div className="flex items-center gap-3">
                  <Icon 
                    icon={Layers} 
                    variant="default" 
                    size="sm" 
                  />
                  <span className="font-medium text-gray-800">图层</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleLeftPanel}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
              
              {/* 左侧面板内容 */}
              <div className="flex-1 overflow-y-auto">
                {leftPanel || (
                  <div className="p-4 text-center text-gray-500">
                    <Layers className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">暂无图层</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 左侧面板切换按钮（当面板关闭时显示） */}
        {!leftPanelState.isOpen && (
          <motion.div
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-30"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              variant="glass"
              size="sm"
              onClick={toggleLeftPanel}
              className="h-12 w-8 rounded-r-xl rounded-l-none shadow-lg"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* 中央画布区域 */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* 画布容器 */}
          <div className="flex-1 relative bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
            {/* 网格背景 */}
            <div 
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '20px 20px'
              }}
            />
            
            {/* 主要内容 */}
            <div className="relative z-10 h-full">
              {children}
            </div>
          </div>
        </div>

        {/* 右侧面板 */}
        <AnimatePresence mode="wait">
          {rightPanelState.isOpen && (
            <motion.div
              className="flex-shrink-0 bg-white/90 backdrop-blur-xl border-l border-gray-200/60 shadow-lg z-20"
              style={{ width: rightPanelState.width }}
              initial={{ x: rightPanelState.width, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: rightPanelState.width, opacity: 0 }}
              transition={{ 
                duration: 0.3, 
                ease: "easeOut" 
              }}
            >
              {/* 右侧面板头部 */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200/60">
                <div className="flex items-center gap-3">
                  <Icon 
                    icon={Settings} 
                    variant="default" 
                    size="sm" 
                  />
                  <span className="font-medium text-gray-800">属性</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleRightPanel}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              
              {/* 右侧面板内容 */}
              <div className="flex-1 overflow-y-auto">
                {rightPanel || (
                  <div className="p-4 text-center text-gray-500">
                    <Settings className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">选择对象以查看属性</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 右侧面板切换按钮（当面板关闭时显示） */}
        {!rightPanelState.isOpen && (
          <motion.div
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-30"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Button
              variant="glass"
              size="sm"
              onClick={toggleRightPanel}
              className="h-12 w-8 rounded-l-xl rounded-r-none shadow-lg"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </div>

      {/* 底部状态栏 */}
      {statusBar && (
        <motion.div 
          className="flex-shrink-0 z-30"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="bg-white/80 backdrop-blur-xl border-t border-gray-200/60 shadow-sm">
            <div className="px-6 py-3">
              {statusBar}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default MainLayout;