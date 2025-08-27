import React, { createContext, useContext, ReactNode } from 'react';
import { UseCanvasSDKResult, useCanvasSDK } from '../hooks';

/**
 * Canvas上下文接口
 */
interface CanvasContextValue extends UseCanvasSDKResult {
  // 扩展的上下文属性可以在这里添加
}

/**
 * Canvas上下文
 */
const CanvasContext = createContext<CanvasContextValue | null>(null);

/**
 * CanvasProvider属性接口
 */
interface CanvasProviderProps {
  children: ReactNode;
}

/**
 * Canvas提供者组件
 * 
 * 为整个应用提供Canvas SDK实例和状态管理
 */
export function CanvasProvider({ children }: CanvasProviderProps) {
  const sdkResult = useCanvasSDK();
  
  return (
    <CanvasContext.Provider value={sdkResult}>
      {children}
    </CanvasContext.Provider>
  );
}

/**
 * 使用Canvas上下文的Hook
 * 
 * @throws 如果在CanvasProvider外部使用将抛出错误
 */
export function useCanvas(): CanvasContextValue {
  const context = useContext(CanvasContext);
  
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  
  return context;
}