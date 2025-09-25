/**
 * Action 系统类型定义
 *
 * Action 是纯数据对象，描述用户想要做什么。
 * Action 本身必须是同步的，但它所触发的执行流程可以是异步的。
 */

/**
 * Action 元数据
 */
export interface ActionMetadata {
  /** 唯一标识符 */
  id?: string;
  /** 时间戳 */
  timestamp: number;
  /** 来源 */
  source: 'user' | 'system' | 'remote';
  /** 是否会触发异步操作 */
  async?: boolean;
  /** 用户ID（用于协作场景） */
  userId?: string;
  /** 会话ID */
  sessionId?: string;
}

/**
 * 基础 Action 接口
 * Action 永远是同步的数据对象
 */
export interface Action {
  /** Action 类型 */
  type: string;
  /** 载荷数据 */
  payload?: any;
  /** 元数据 */
  metadata?: ActionMetadata;
}

/**
 * 形状相关 Action 类型
 */
export type ShapeActionType =
  | 'ADD_RECTANGLE'
  | 'ADD_CIRCLE'
  | 'ADD_DIAMOND'
  | 'ADD_TEXT'
  | 'ADD_PATH'
  | 'UPDATE_SHAPE'
  | 'DELETE_SHAPE'
  | 'DELETE_SELECTED';

/**
 * 选择相关 Action 类型
 */
export type SelectionActionType =
  | 'SELECT_SHAPE'
  | 'SELECT_SHAPES'
  | 'DESELECT_SHAPE'
  | 'CLEAR_SELECTION'
  | 'SELECT_ALL';

/**
 * 变换相关 Action 类型
 */
export type TransformActionType =
  | 'MOVE_SHAPE'
  | 'RESIZE_SHAPE'
  | 'ROTATE_SHAPE'
  | 'SCALE_SHAPE';

/**
 * Z轴相关 Action 类型
 */
export type ZIndexActionType =
  | 'BRING_TO_FRONT'
  | 'SEND_TO_BACK'
  | 'BRING_FORWARD'
  | 'SEND_BACKWARD'
  | 'SET_Z_INDEX';

/**
 * 剪贴板相关 Action 类型
 */
export type ClipboardActionType =
  | 'COPY_SELECTED'
  | 'CUT_SELECTED'
  | 'PASTE';

/**
 * 历史相关 Action 类型
 */
export type HistoryActionType =
  | 'UNDO'
  | 'REDO';

/**
 * 批量操作 Action 类型
 */
export type BatchActionType =
  | 'BATCH';

/**
 * 异步操作 Action 类型
 */
export type AsyncActionType =
  | 'IMPORT_FILE'
  | 'EXPORT_FILE'
  | 'AUTO_SAVE'
  | 'SYNC_TO_SERVER';

/**
 * 所有 Action 类型的联合类型
 */
export type ActionType =
  | ShapeActionType
  | SelectionActionType
  | TransformActionType
  | ZIndexActionType
  | ClipboardActionType
  | HistoryActionType
  | BatchActionType
  | AsyncActionType;

/**
 * 形状数据接口
 */
export interface ShapeData {
  id?: string;
  type: 'rectangle' | 'circle' | 'diamond' | 'text' | 'path';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  points?: Array<{ x: number; y: number }>; // 用于路径
  style?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    opacity?: number;
  };
  visible?: boolean;
  locked?: boolean;
  zIndex?: number;
}

/**
 * 变换数据接口
 */
export interface TransformData {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

/**
 * 具体的 Action 接口定义
 */

/**
 * 添加形状 Action
 */
export interface AddShapeAction extends Action {
  type: ShapeActionType;
  payload: ShapeData;
}

/**
 * 更新形状 Action
 */
export interface UpdateShapeAction extends Action {
  type: 'UPDATE_SHAPE';
  payload: {
    id: string;
    updates: Partial<ShapeData>;
  };
}

/**
 * 删除形状 Action
 */
export interface DeleteShapeAction extends Action {
  type: 'DELETE_SHAPE';
  payload: {
    id: string;
  };
}

/**
 * 选择形状 Action
 */
export interface SelectShapeAction extends Action {
  type: 'SELECT_SHAPE' | 'SELECT_SHAPES';
  payload: {
    ids: string | string[];
  };
}

/**
 * 移动形状 Action
 */
export interface MoveShapeAction extends Action {
  type: 'MOVE_SHAPE';
  payload: {
    id: string;
    deltaX: number;
    deltaY: number;
  };
}

/**
 * 调整大小 Action
 */
export interface ResizeShapeAction extends Action {
  type: 'RESIZE_SHAPE';
  payload: {
    id: string;
    width: number;
    height: number;
  };
}

/**
 * Z轴操作 Action
 */
export interface ZIndexAction extends Action {
  type: ZIndexActionType;
  payload: {
    ids: string[];
    zIndex?: number;
  };
}

/**
 * 批量操作 Action
 */
export interface BatchAction extends Action {
  type: 'BATCH';
  payload: {
    actions: Action[];
  };
}

/**
 * 文件导入 Action
 */
export interface ImportFileAction extends Action {
  type: 'IMPORT_FILE';
  payload: {
    fileUrl: string;
    format: 'json' | 'svg' | 'png';
  };
  metadata: ActionMetadata & {
    async: true;
  };
}

/**
 * 文件导出 Action
 */
export interface ExportFileAction extends Action {
  type: 'EXPORT_FILE';
  payload: {
    format: 'json' | 'svg' | 'png';
    includeMetadata?: boolean;
    quality?: number;
  };
  metadata: ActionMetadata & {
    async: true;
  };
}

/**
 * Action 类型守卫
 */
export function isShapeAction(action: Action): action is AddShapeAction | UpdateShapeAction | DeleteShapeAction {
  return ['ADD_RECTANGLE', 'ADD_CIRCLE', 'ADD_DIAMOND', 'ADD_TEXT', 'ADD_PATH', 'UPDATE_SHAPE', 'DELETE_SHAPE'].includes(action.type);
}

export function isSelectionAction(action: Action): action is SelectShapeAction {
  return ['SELECT_SHAPE', 'SELECT_SHAPES', 'DESELECT_SHAPE', 'CLEAR_SELECTION', 'SELECT_ALL'].includes(action.type);
}

export function isTransformAction(action: Action): action is MoveShapeAction | ResizeShapeAction {
  return ['MOVE_SHAPE', 'RESIZE_SHAPE', 'ROTATE_SHAPE', 'SCALE_SHAPE'].includes(action.type);
}

export function isAsyncAction(action: Action): action is ImportFileAction | ExportFileAction {
  return action.metadata?.async === true || ['IMPORT_FILE', 'EXPORT_FILE', 'AUTO_SAVE', 'SYNC_TO_SERVER'].includes(action.type);
}

export function isBatchAction(action: Action): action is BatchAction {
  return action.type === 'BATCH';
}

/**
 * Action 执行结果
 */
export interface ActionResult {
  /** 是否成功 */
  success: boolean;
  /** 时间戳 */
  timestamp: number;
  /** Action ID */
  actionId?: string;
  /** 错误信息 */
  error?: string;
  /** 结果数据 */
  data?: any;
}