/**
 * Action参数验证器
 * 提供统一的参数验证逻辑
 */

import { Action } from './types';

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string, public value?: any) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * 数值验证函数
 */
export function validateNumber(value: any, fieldName: string, options?: {
  min?: number;
  max?: number;
  required?: boolean;
}): number {
  const { min, max, required = true } = options || {};

  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName, value);
    }
    return 0; // 默认值
  }

  if (typeof value !== 'number' || isNaN(value)) {
    throw new ValidationError(`${fieldName} must be a valid number`, fieldName, value);
  }

  if (min !== undefined && value < min) {
    throw new ValidationError(`${fieldName} must be at least ${min}`, fieldName, value);
  }

  if (max !== undefined && value > max) {
    throw new ValidationError(`${fieldName} must be at most ${max}`, fieldName, value);
  }

  return value;
}

/**
 * 字符串验证函数
 */
export function validateString(value: any, fieldName: string, options?: {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
}): string {
  const { minLength, maxLength, required = true } = options || {};

  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName, value);
    }
    return ''; // 默认值
  }

  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName, value);
  }

  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(`${fieldName} must be at least ${minLength} characters long`, fieldName, value);
  }

  if (maxLength !== undefined && value.length > maxLength) {
    throw new ValidationError(`${fieldName} must be at most ${maxLength} characters long`, fieldName, value);
  }

  return value;
}

/**
 * 数组验证函数
 */
export function validateArray(value: any, fieldName: string, options?: {
  minLength?: number;
  maxLength?: number;
  required?: boolean;
}): any[] {
  const { minLength, maxLength, required = true } = options || {};

  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName, value);
    }
    return []; // 默认值
  }

  if (!Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an array`, fieldName, value);
  }

  if (minLength !== undefined && value.length < minLength) {
    throw new ValidationError(`${fieldName} must contain at least ${minLength} items`, fieldName, value);
  }

  if (maxLength !== undefined && value.length > maxLength) {
    throw new ValidationError(`${fieldName} must contain at most ${maxLength} items`, fieldName, value);
  }

  return value;
}

/**
 * 样式对象验证函数
 */
export function validateStyle(value: any, fieldName: string, options?: {
  required?: boolean;
}): Record<string, any> {
  const { required = false } = options || {};

  if (value === undefined || value === null) {
    if (required) {
      throw new ValidationError(`${fieldName} is required`, fieldName, value);
    }
    return {}; // 默认值
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError(`${fieldName} must be an object`, fieldName, value);
  }

  return value;
}

/**
 * Action验证器映射
 */
export const actionValidators = {
  /**
   * 矩形创建Action验证
   */
  'ADD_RECTANGLE': (action: Action) => {
    const { x, y, width, height, style } = action.payload || {};

    return {
      x: validateNumber(x, 'x'),
      y: validateNumber(y, 'y'),
      width: validateNumber(width, 'width', { min: 0.1 }),
      height: validateNumber(height, 'height', { min: 0.1 }),
      style: validateStyle(style, 'style')
    };
  },

  /**
   * 圆形创建Action验证
   */
  'ADD_CIRCLE': (action: Action) => {
    const { x, y, radius, style } = action.payload || {};

    return {
      x: validateNumber(x, 'x'),
      y: validateNumber(y, 'y'),
      radius: validateNumber(radius, 'radius', { min: 0.1 }),
      style: validateStyle(style, 'style')
    };
  },

  /**
   * 文本创建Action验证
   */
  'ADD_TEXT': (action: Action) => {
    const { x, y, text, style } = action.payload || {};

    return {
      x: validateNumber(x, 'x'),
      y: validateNumber(y, 'y'),
      text: validateString(text, 'text', { minLength: 1, maxLength: 1000 }),
      style: validateStyle(style, 'style')
    };
  },

  /**
   * 形状更新Action验证
   */
  'UPDATE_SHAPE': (action: Action) => {
    const { shapeId, updates } = action.payload || {};

    if (!shapeId || typeof shapeId !== 'string') {
      throw new ValidationError('shapeId must be a non-empty string', 'shapeId', shapeId);
    }

    if (!updates || typeof updates !== 'object') {
      throw new ValidationError('updates must be an object', 'updates', updates);
    }

    return { shapeId, updates };
  },

  /**
   * 形状删除Action验证
   */
  'DELETE_SHAPE': (action: Action) => {
    const { shapeId } = action.payload || {};

    if (!shapeId || typeof shapeId !== 'string') {
      throw new ValidationError('shapeId must be a non-empty string', 'shapeId', shapeId);
    }

    return { shapeId };
  },

  /**
   * 形状选择Action验证
   */
  'SELECT_SHAPES': (action: Action) => {
    const { shapeIds, addToSelection = false } = action.payload || {};

    return {
      shapeIds: validateArray(shapeIds, 'shapeIds', { minLength: 1 }),
      addToSelection: Boolean(addToSelection)
    };
  },

  /**
   * Z-index操作Action验证
   */
  'BRING_TO_FRONT': (action: Action) => {
    const { shapeIds } = action.payload || {};
    return {
      shapeIds: validateArray(shapeIds, 'shapeIds', { minLength: 1 })
    };
  },

  'SEND_TO_BACK': (action: Action) => {
    const { shapeIds } = action.payload || {};
    return {
      shapeIds: validateArray(shapeIds, 'shapeIds', { minLength: 1 })
    };
  },

  'BRING_FORWARD': (action: Action) => {
    const { shapeIds } = action.payload || {};
    return {
      shapeIds: validateArray(shapeIds, 'shapeIds', { minLength: 1 })
    };
  },

  'SEND_BACKWARD': (action: Action) => {
    const { shapeIds } = action.payload || {};
    return {
      shapeIds: validateArray(shapeIds, 'shapeIds', { minLength: 1 })
    };
  },

  'SET_Z_INDEX': (action: Action) => {
    const { shapeIds, zIndex } = action.payload || {};
    return {
      shapeIds: validateArray(shapeIds, 'shapeIds', { minLength: 1 }),
      zIndex: validateNumber(zIndex, 'zIndex')
    };
  }
};

/**
 * 验证Action参数
 */
export function validateAction(action: Action): any {
  if (!action || typeof action !== 'object') {
    throw new ValidationError('Action must be an object', '', action);
  }

  if (!action.type || typeof action.type !== 'string') {
    throw new ValidationError('Action type must be a non-empty string', 'type', action.type);
  }

  const validator = actionValidators[action.type as keyof typeof actionValidators];
  if (!validator) {
    // 对于没有验证器的Action类型，返回原始payload
    return action.payload || {};
  }

  try {
    return validator(action);
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError(`Validation failed for action ${action.type}: ${error}`, '', action);
  }
}