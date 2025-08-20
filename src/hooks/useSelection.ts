import { useCallback, useEffect } from 'react';
import { ISceneNode } from '../engine/scene/SceneNode';
import { useAppStore } from '../store/appStore';

export const useSelection = () => {
  const {
    selectedNodes,
    renderEngine,
    setSelectedNodes,
    addSelectedNode,
    removeSelectedNode,
    clearSelection
  } = useAppStore();
  
  // 选择单个节点
  const selectNode = useCallback((node: ISceneNode, addToSelection = false) => {
    if (addToSelection) {
      addSelectedNode(node);
    } else {
      setSelectedNodes([node]);
    }
  }, [addSelectedNode, setSelectedNodes]);
  
  // 选择多个节点
  const selectNodes = useCallback((nodes: ISceneNode[], addToSelection = false) => {
    if (addToSelection) {
      const newNodes = nodes.filter(node => !selectedNodes.includes(node));
      setSelectedNodes([...selectedNodes, ...newNodes]);
    } else {
      setSelectedNodes(nodes);
    }
  }, [selectedNodes, setSelectedNodes]);
  
  // 取消选择节点
  const deselectNode = useCallback((node: ISceneNode) => {
    removeSelectedNode(node);
  }, [removeSelectedNode]);
  
  // 切换节点选择状态
  const toggleNodeSelection = useCallback((node: ISceneNode) => {
    if (selectedNodes.includes(node)) {
      removeSelectedNode(node);
    } else {
      addSelectedNode(node);
    }
  }, [selectedNodes, addSelectedNode, removeSelectedNode]);
  
  // 检查节点是否被选中
  const isNodeSelected = useCallback((node: ISceneNode) => {
    return selectedNodes.includes(node);
  }, [selectedNodes]);
  
  // 获取选择边界框
  const getSelectionBounds = useCallback(() => {
    if (selectedNodes.length === 0) return null;
    
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    selectedNodes.forEach(node => {
      // 假设节点有getBounds方法
      if ('getBounds' in node && typeof node.getBounds === 'function') {
        const bounds = node.getBounds();
        minX = Math.min(minX, bounds.x);
        minY = Math.min(minY, bounds.y);
        maxX = Math.max(maxX, bounds.x + bounds.width);
        maxY = Math.max(maxY, bounds.y + bounds.height);
      }
    });
    
    if (minX === Infinity) return null;
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }, [selectedNodes]);
  
  // 删除选中的节点
  const deleteSelected = useCallback(() => {
    selectedNodes.forEach(node => {
      if ('removeFromParent' in node && typeof node.removeFromParent === 'function') {
        node.removeFromParent();
      }
    });
    clearSelection();
  }, [selectedNodes, clearSelection]);
  
  // 复制选中的节点
  const copySelected = useCallback(() => {
    if (selectedNodes.length === 0) return null;
    
    // 这里应该实现节点的序列化逻辑
    return selectedNodes.map(node => {
      // 假设节点有serialize方法
      if ('serialize' in node && typeof node.serialize === 'function') {
        return node.serialize();
      }
      return null;
    }).filter(Boolean);
  }, [selectedNodes]);
  
  // 框选功能
  const selectInRect = useCallback((rect: { x: number; y: number; width: number; height: number }) => {
    if (!renderEngine) return;
    
    // 这里需要从渲染引擎获取场景中的所有节点
    // 然后检查哪些节点在选择矩形内
    const allNodes: ISceneNode[] = []; // 从渲染引擎获取
    
    const nodesInRect = allNodes.filter(node => {
      if ('getBounds' in node && typeof node.getBounds === 'function') {
        const bounds = node.getBounds();
        return (
          bounds.x < rect.x + rect.width &&
          bounds.x + bounds.width > rect.x &&
          bounds.y < rect.y + rect.height &&
          bounds.y + bounds.height > rect.y
        );
      }
      return false;
    });
    
    setSelectedNodes(nodesInRect);
  }, [renderEngine, setSelectedNodes]);
  
  // 键盘快捷键处理
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      deleteSelected();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      clearSelection();
    } else if (event.ctrlKey || event.metaKey) {
      if (event.key === 'a') {
        event.preventDefault();
        // 全选逻辑
        if (renderEngine) {
          // 从渲染引擎获取所有节点并选择
        }
      } else if (event.key === 'c') {
        event.preventDefault();
        copySelected();
      }
    }
  }, [deleteSelected, clearSelection, copySelected, renderEngine]);
  
  // 注册键盘事件
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  return {
    // 状态
    selectedNodes,
    hasSelection: selectedNodes.length > 0,
    selectionCount: selectedNodes.length,
    
    // 选择操作
    selectNode,
    selectNodes,
    deselectNode,
    toggleNodeSelection,
    clearSelection,
    
    // 查询
    isNodeSelected,
    getSelectionBounds,
    
    // 操作
    deleteSelected,
    copySelected,
    selectInRect
  };
};
