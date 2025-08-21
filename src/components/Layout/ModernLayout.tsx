import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  ChevronLeft,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { ModernCanvas } from '../Canvas/ModernCanvas';
import { ModernPropertyPanel } from './ModernPropertyPanel';
import { ModernToolbar } from '../Tools/ModernToolbar';

interface ModernLayoutProps {
  className?: string;
}

export const ModernLayout: React.FC<ModernLayoutProps> = ({ className }) => {
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen) {
      setRightPanelOpen(false);
    } else {
      setRightPanelOpen(true);
    }
  };

  return (
    <div className={`h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100 ${className}`}>
      {/* 顶部工具栏 */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm"
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            {/* 左侧控制 */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              </div>
              <div className="text-sm font-medium text-slate-700">Sky Canvas</div>
            </div>

            {/* 中央工具栏 */}
            <ModernToolbar />

            {/* 右侧控制 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <Settings className="w-4 h-4 text-slate-600" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-slate-600" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-slate-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 主要内容区域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 中央画布区域 */}
        <motion.div 
          className="flex-1 flex flex-col relative"
          layout
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {/* 画布容器 */}
          <div className="flex-1 relative overflow-hidden">
            <ModernCanvas />
            
            {/* 浮动控制按钮 */}
            {!rightPanelOpen && (
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setRightPanelOpen(true)}
                className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur-xl rounded-lg shadow-lg hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* 右侧属性面板 */}
        <AnimatePresence>
          {rightPanelOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="bg-white/60 backdrop-blur-xl border-l border-slate-200/50 shadow-sm overflow-hidden"
            >
              <ModernPropertyPanel />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 底部状态栏 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-xl border-t border-slate-200/50 px-6 py-2"
      >
        <div className="flex items-center justify-between text-sm text-slate-600">
          <div className="flex items-center gap-4">
            <span>画布: 1920 × 1080</span>
            <span>缩放: 100%</span>
            <span>对象: 2</span>
          </div>
          <div className="flex items-center gap-4">
            <span>就绪</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ModernLayout;