/**
 * Action 创建器
 *
 * 提供便捷的 Action 创建函数，确保 Action 的一致性和类型安全
 */

import {
  Action,
  ActionMetadata,
  ShapeData,
  TransformData,
  AddShapeAction,
  UpdateShapeAction,
  DeleteShapeAction,
  SelectShapeAction,
  MoveShapeAction,
  ResizeShapeAction,
  ZIndexAction,
  BatchAction,
  ImportFileAction,
  ExportFileAction
} from './types';

/**
 * 创建基础元数据
 */
function createMetadata(overrides: Partial<ActionMetadata> = {}): ActionMetadata {
  return {
    timestamp: Date.now(),
    source: 'user',
    ...overrides
  };
}

/**
 * 形状创建器
 */
export const ShapeActions = {
  /**
   * 创建添加矩形 Action
   */
  addRectangle: (
    x: number,
    y: number,
    width: number,
    height: number,
    style?: ShapeData['style']
  ): AddShapeAction => ({
    type: 'ADD_RECTANGLE',
    payload: {
      type: 'rectangle',
      x,
      y,
      width,
      height,
      style: {
        fill: '#3b82f6',
        stroke: '#1e40af',
        strokeWidth: 2,
        ...style
      }
    },
    metadata: createMetadata()
  }),

  /**
   * 创建添加圆形 Action
   */
  addCircle: (
    x: number,
    y: number,
    radius: number,
    style?: ShapeData['style']
  ): AddShapeAction => ({
    type: 'ADD_CIRCLE',
    payload: {
      type: 'circle',
      x,
      y,
      radius,
      style: {
        fill: '#10b981',
        stroke: '#059669',
        strokeWidth: 2,
        ...style
      }
    },
    metadata: createMetadata()
  }),

  /**
   * 创建添加钻石 Action
   */
  addDiamond: (
    x: number,
    y: number,
    width: number,
    height: number,
    style?: ShapeData['style']
  ): AddShapeAction => ({
    type: 'ADD_DIAMOND',
    payload: {
      type: 'diamond',
      x,
      y,
      width,
      height,
      style: {
        fill: '#f59e0b',
        stroke: '#d97706',
        strokeWidth: 2,
        ...style
      }
    },
    metadata: createMetadata()
  }),

  /**
   * 创建添加文本 Action
   */
  addText: (
    x: number,
    y: number,
    text: string,
    style?: ShapeData['style']
  ): AddShapeAction => ({
    type: 'ADD_TEXT',
    payload: {
      type: 'text',
      x,
      y,
      text,
      style: {
        fill: '#374151',
        ...style
      }
    },
    metadata: createMetadata()
  }),

  /**
   * 创建更新形状 Action
   */
  updateShape: (
    id: string,
    updates: Partial<ShapeData>
  ): UpdateShapeAction => ({
    type: 'UPDATE_SHAPE',
    payload: {
      id,
      updates
    },
    metadata: createMetadata()
  }),

  /**
   * 创建删除形状 Action
   */
  deleteShape: (id: string): DeleteShapeAction => ({
    type: 'DELETE_SHAPE',
    payload: {
      id
    },
    metadata: createMetadata()
  }),

  /**
   * 创建删除选中形状 Action
   */
  deleteSelected: (): Action => ({
    type: 'DELETE_SELECTED',
    metadata: createMetadata()
  })
};

/**
 * 选择操作创建器
 */
export const SelectionActions = {
  /**
   * 选择单个形状
   */
  selectShape: (id: string): SelectShapeAction => ({
    type: 'SELECT_SHAPE',
    payload: {
      ids: id
    },
    metadata: createMetadata()
  }),

  /**
   * 选择多个形状
   */
  selectShapes: (ids: string[]): SelectShapeAction => ({
    type: 'SELECT_SHAPES',
    payload: {
      ids
    },
    metadata: createMetadata()
  }),

  /**
   * 取消选择形状
   */
  deselectShape: (id: string): Action => ({
    type: 'DESELECT_SHAPE',
    payload: {
      id
    },
    metadata: createMetadata()
  }),

  /**
   * 清空选择
   */
  clearSelection: (): Action => ({
    type: 'CLEAR_SELECTION',
    metadata: createMetadata()
  }),

  /**
   * 选择全部
   */
  selectAll: (): Action => ({
    type: 'SELECT_ALL',
    metadata: createMetadata()
  })
};

/**
 * 变换操作创建器
 */
export const TransformActions = {
  /**
   * 移动形状
   */
  moveShape: (id: string, deltaX: number, deltaY: number): MoveShapeAction => ({
    type: 'MOVE_SHAPE',
    payload: {
      id,
      deltaX,
      deltaY
    },
    metadata: createMetadata()
  }),

  /**
   * 调整形状大小
   */
  resizeShape: (id: string, width: number, height: number): ResizeShapeAction => ({
    type: 'RESIZE_SHAPE',
    payload: {
      id,
      width,
      height
    },
    metadata: createMetadata()
  }),

  /**
   * 旋转形状
   */
  rotateShape: (id: string, rotation: number): Action => ({
    type: 'ROTATE_SHAPE',
    payload: {
      id,
      rotation
    },
    metadata: createMetadata()
  }),

  /**
   * 缩放形状
   */
  scaleShape: (id: string, scaleX: number, scaleY: number): Action => ({
    type: 'SCALE_SHAPE',
    payload: {
      id,
      scaleX,
      scaleY
    },
    metadata: createMetadata()
  })
};

/**
 * Z轴操作创建器
 */
export const ZIndexActions = {
  /**
   * 置顶
   */
  bringToFront: (ids: string[]): ZIndexAction => ({
    type: 'BRING_TO_FRONT',
    payload: {
      ids
    },
    metadata: createMetadata()
  }),

  /**
   * 置底
   */
  sendToBack: (ids: string[]): ZIndexAction => ({
    type: 'SEND_TO_BACK',
    payload: {
      ids
    },
    metadata: createMetadata()
  }),

  /**
   * 上移一层
   */
  bringForward: (ids: string[]): ZIndexAction => ({
    type: 'BRING_FORWARD',
    payload: {
      ids
    },
    metadata: createMetadata()
  }),

  /**
   * 下移一层
   */
  sendBackward: (ids: string[]): ZIndexAction => ({
    type: 'SEND_BACKWARD',
    payload: {
      ids
    },
    metadata: createMetadata()
  }),

  /**
   * 设置Z轴索引
   */
  setZIndex: (ids: string[], zIndex: number): ZIndexAction => ({
    type: 'SET_Z_INDEX',
    payload: {
      ids,
      zIndex
    },
    metadata: createMetadata()
  })
};

/**
 * 剪贴板操作创建器
 */
export const ClipboardActions = {
  /**
   * 复制选中项
   */
  copySelected: (): Action => ({
    type: 'COPY_SELECTED',
    metadata: createMetadata()
  }),

  /**
   * 剪切选中项
   */
  cutSelected: (): Action => ({
    type: 'CUT_SELECTED',
    metadata: createMetadata()
  }),

  /**
   * 粘贴
   */
  paste: (): Action => ({
    type: 'PASTE',
    metadata: createMetadata()
  })
};

/**
 * 历史操作创建器
 */
export const HistoryActions = {
  /**
   * 撤销
   */
  undo: (): Action => ({
    type: 'UNDO',
    metadata: createMetadata({ source: 'system' })
  }),

  /**
   * 重做
   */
  redo: (): Action => ({
    type: 'REDO',
    metadata: createMetadata({ source: 'system' })
  })
};

/**
 * 批量操作创建器
 */
export const BatchActions = {
  /**
   * 创建批量操作
   */
  batch: (actions: Action[], description?: string): BatchAction => ({
    type: 'BATCH',
    payload: {
      actions
    },
    metadata: createMetadata({
      // 如果包含异步操作，则标记为异步
      async: actions.some(action => action.metadata?.async)
    })
  })
};

/**
 * 异步操作创建器
 */
export const AsyncActions = {
  /**
   * 导入文件
   */
  importFile: (
    fileUrl: string,
    format: 'json' | 'svg' | 'png' = 'json'
  ): ImportFileAction => ({
    type: 'IMPORT_FILE',
    payload: {
      fileUrl,
      format
    },
    metadata: {
      ...createMetadata(),
      async: true
    }
  }),

  /**
   * 导出文件
   */
  exportFile: (
    format: 'json' | 'svg' | 'png' = 'json',
    options: {
      includeMetadata?: boolean;
      quality?: number;
    } = {}
  ): ExportFileAction => ({
    type: 'EXPORT_FILE',
    payload: {
      format,
      ...options
    },
    metadata: {
      ...createMetadata(),
      async: true
    }
  }),

  /**
   * 自动保存
   */
  autoSave: (): Action => ({
    type: 'AUTO_SAVE',
    metadata: createMetadata({
      async: true,
      source: 'system'
    })
  }),

  /**
   * 同步到服务器
   */
  syncToServer: (data: any): Action => ({
    type: 'SYNC_TO_SERVER',
    payload: data,
    metadata: createMetadata({
      async: true,
      source: 'system'
    })
  })
};

/**
 * 统一的 Action 创建器导出
 */
export const ActionCreators = {
  shapes: ShapeActions,
  selection: SelectionActions,
  transform: TransformActions,
  zIndex: ZIndexActions,
  clipboard: ClipboardActions,
  history: HistoryActions,
  batch: BatchActions,
  async: AsyncActions
};

/**
 * 默认导出
 */
export default ActionCreators;