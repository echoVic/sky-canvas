/**
 * useKeyboardShortcuts Hook
 * 管理画布应用的键盘快捷键
 */

import { useMemoizedFn } from 'ahooks'
import { useCallback, useEffect, useRef } from 'react'
import { useCanvas } from '../contexts/CanvasSDKContext'
import { useDrawingTools } from './useDrawingTools'

/**
 * 快捷键配置
 */
interface ShortcutConfig {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
  category: 'tool' | 'edit' | 'view' | 'layer'
}

/**
 * useKeyboardShortcuts Hook 配置
 */
interface UseKeyboardShortcutsConfig {
  enabled?: boolean
  preventDefaultForAll?: boolean
}

/**
 * useKeyboardShortcuts Hook 返回类型
 */
interface UseKeyboardShortcutsResult {
  shortcuts: ShortcutConfig[]
  isEnabled: boolean
  enable: () => void
  disable: () => void
}

/**
 * useKeyboardShortcuts Hook
 * 提供键盘快捷键功能
 */
export function useKeyboardShortcuts(
  config: UseKeyboardShortcutsConfig = {}
): UseKeyboardShortcutsResult {
  const { enabled: initialEnabled = true, preventDefaultForAll = false } = config

  const [state, actions] = useCanvas()
  const { setTool } = useDrawingTools()
  const enabledRef = useRef(initialEnabled)

  /**
   * 启用快捷键
   */
  const enable = useCallback(() => {
    enabledRef.current = true
  }, [])

  /**
   * 禁用快捷键
   */
  const disable = useCallback(() => {
    enabledRef.current = false
  }, [])

  /**
   * 删除选中形状
   */
  const deleteSelected = useMemoizedFn(() => {
    const selectedShapes = state.selectedShapes
    selectedShapes.forEach((shape) => {
      actions.removeShape(shape.id)
    })
  })

  /**
   * 全选
   */
  const selectAll = useMemoizedFn(() => {
    state.shapes.forEach((shape) => {
      actions.selectShape(shape.id)
    })
  })

  /**
   * 快捷键配置列表
   */
  const shortcuts: ShortcutConfig[] = [
    // 工具快捷键
    { key: 's', action: () => setTool('select'), description: '选择工具', category: 'tool' },
    { key: 'r', action: () => setTool('rectangle'), description: '矩形工具', category: 'tool' },
    { key: 'c', action: () => setTool('circle'), description: '圆形工具', category: 'tool' },
    { key: 'e', action: () => setTool('ellipse'), description: '椭圆工具', category: 'tool' },
    { key: 'l', action: () => setTool('line'), description: '线条工具', category: 'tool' },
    { key: 'p', action: () => setTool('polygon'), description: '多边形工具', category: 'tool' },
    { key: 'g', action: () => setTool('star'), description: '星形工具', category: 'tool' },
    { key: 't', action: () => setTool('text'), description: '文本工具', category: 'tool' },
    { key: 'd', action: () => setTool('diamond'), description: '菱形工具', category: 'tool' },
    { key: 'h', action: () => setTool('hand'), description: '平移工具', category: 'tool' },
    { key: 'i', action: () => setTool('image'), description: '图片工具', category: 'tool' },
    { key: 'q', action: () => setTool('eraser'), description: '橡皮擦工具', category: 'tool' },
    { key: 'y', action: () => setTool('eyedropper'), description: '取色器工具', category: 'tool' },

    // 编辑快捷键
    { key: 'z', ctrlKey: true, action: actions.undo, description: '撤销', category: 'edit' },
    { key: 'z', metaKey: true, action: actions.undo, description: '撤销 (Mac)', category: 'edit' },
    { key: 'y', ctrlKey: true, action: actions.redo, description: '重做', category: 'edit' },
    {
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
      action: actions.redo,
      description: '重做',
      category: 'edit',
    },
    {
      key: 'z',
      metaKey: true,
      shiftKey: true,
      action: actions.redo,
      description: '重做 (Mac)',
      category: 'edit',
    },
    { key: 'Delete', action: deleteSelected, description: '删除选中', category: 'edit' },
    { key: 'Backspace', action: deleteSelected, description: '删除选中', category: 'edit' },
    { key: 'a', ctrlKey: true, action: selectAll, description: '全选', category: 'edit' },
    { key: 'a', metaKey: true, action: selectAll, description: '全选 (Mac)', category: 'edit' },
    { key: 'Escape', action: actions.clearSelection, description: '取消选择', category: 'edit' },

    // 图层快捷键
    {
      key: ']',
      ctrlKey: true,
      action: actions.bringToFront,
      description: '置顶',
      category: 'layer',
    },
    { key: '[', ctrlKey: true, action: actions.sendToBack, description: '置底', category: 'layer' },
    { key: ']', action: actions.bringForward, description: '上移一层', category: 'layer' },
    { key: '[', action: actions.sendBackward, description: '下移一层', category: 'layer' },
  ]

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useMemoizedFn((event: KeyboardEvent) => {
    if (!enabledRef.current || !state.isInitialized) return

    // 忽略在输入框中的快捷键
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return
    }

    // 查找匹配的快捷键
    const matchedShortcut = shortcuts.find((shortcut) => {
      if (shortcut.key.toLowerCase() !== event.key.toLowerCase()) return false
      if (shortcut.ctrlKey && !event.ctrlKey) return false
      if (shortcut.metaKey && !event.metaKey) return false
      if (shortcut.shiftKey && !event.shiftKey) return false
      if (shortcut.altKey && !event.altKey) return false

      // 如果快捷键没有指定修饰键，则当前不应有修饰键
      if (!shortcut.ctrlKey && !shortcut.metaKey && (event.ctrlKey || event.metaKey)) {
        return false
      }

      return true
    })

    if (matchedShortcut) {
      if (preventDefaultForAll) {
        event.preventDefault()
      }
      matchedShortcut.action()
    }
  })

  /**
   * 绑定键盘事件
   */
  useEffect(() => {
    if (!state.isInitialized) return

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [state.isInitialized, handleKeyDown])

  return {
    shortcuts,
    isEnabled: enabledRef.current,
    enable,
    disable,
  }
}

export default useKeyboardShortcuts
