/**
 * 默认命令注册
 * 将所有内置命令注册到命令注册表
 */

import { Action } from '../actions/types';
import { Command } from './base';
import { CommandRegistration, registerCommands } from './registry';
import { CanvasModel } from '../models/CanvasModel';

// 形状命令
import { AddShapeCommand } from './shapes/AddShapeCommand';
import { UpdateShapeCommand } from './shapes/UpdateShapeCommand';
import { DeleteShapeCommand, DeleteSelectedCommand } from './shapes/DeleteShapeCommand';

// 选择命令
import {
  SelectShapesCommand,
  DeselectShapeCommand,
  ClearSelectionCommand,
  SelectAllCommand,
  InvertSelectionCommand
} from './selection/SelectShapesCommand';

// Z-index命令
import { ZIndexCommand } from './zindex/ZIndexCommand';

// 工具命令
import { ToolCommand } from './tools/ToolCommand';
import { BatchActionCommand } from './batch/BatchActionCommand';
import { ImportFileCommand } from './async/ImportFileCommand';
import { ExportFileCommand } from './async/ExportFileCommand';
import { AutoSaveCommand } from './async/AutoSaveCommand';

/**
 * 形状命令工厂函数
 */
const shapeCommandFactories = {
  'ADD_RECTANGLE': (model: CanvasModel, action: Action) => {
    const { x, y, width, height, style } = action.payload;
    return new AddShapeCommand(model, { type: 'rectangle', x, y, width, height, style });
  },

  'ADD_CIRCLE': (model: CanvasModel, action: Action) => {
    const { x, y, radius, style } = action.payload;
    return new AddShapeCommand(model, { type: 'circle', x, y, radius, style });
  },

  'ADD_TEXT': (model: CanvasModel, action: Action) => {
    const { x, y, text, style } = action.payload;
    return new AddShapeCommand(model, { type: 'text', x, y, text, style });
  },

  'ADD_PATH': (model: CanvasModel, action: Action) => {
    const { x, y, points, style } = action.payload;
    return new AddShapeCommand(model, { type: 'path', x, y, points, style });
  },

  'ADD_DIAMOND': (model: CanvasModel, action: Action) => {
    const { x, y, width, height, style } = action.payload;
    return new AddShapeCommand(model, { type: 'diamond', x, y, width, height, style });
  },

  'UPDATE_SHAPE': (model: CanvasModel, action: Action) => {
    const { shapeId, updates } = action.payload;
    return new UpdateShapeCommand(model, shapeId, updates);
  },

  'DELETE_SHAPE': (model: CanvasModel, action: Action) => {
    const { shapeId } = action.payload;
    return new DeleteShapeCommand(model, shapeId);
  },

  'DELETE_SELECTED': (model: CanvasModel, action: Action) => {
    return new DeleteSelectedCommand(model);
  }
};

/**
 * 选择命令工厂函数
 */
const selectionCommandFactories = {
  'SELECT_SHAPES': (model: CanvasModel, action: Action) => {
    const { shapeIds, addToSelection } = action.payload;
    return new SelectShapesCommand(model, shapeIds, addToSelection);
  },

  'DESELECT_SHAPE': (model: CanvasModel, action: Action) => {
    const { shapeId } = action.payload;
    return new DeselectShapeCommand(model, shapeId);
  },

  'CLEAR_SELECTION': (model: CanvasModel, action: Action) => {
    return new ClearSelectionCommand(model);
  },

  'SELECT_ALL': (model: CanvasModel, action: Action) => {
    return new SelectAllCommand(model);
  },

  'INVERT_SELECTION': (model: CanvasModel, action: Action) => {
    return new InvertSelectionCommand(model);
  }
};

/**
 * Z-index命令工厂函数
 */
const zIndexCommandFactories = {
  'BRING_TO_FRONT': (model: CanvasModel, action: Action) => {
    const { shapeIds } = action.payload;
    return new ZIndexCommand(model, {
      operation: 'bring-to-front',
      shapeIds: shapeIds || []
    });
  },

  'SEND_TO_BACK': (model: CanvasModel, action: Action) => {
    const { shapeIds } = action.payload;
    return new ZIndexCommand(model, {
      operation: 'send-to-back',
      shapeIds: shapeIds || []
    });
  },

  'BRING_FORWARD': (model: CanvasModel, action: Action) => {
    const { shapeIds } = action.payload;
    return new ZIndexCommand(model, {
      operation: 'bring-forward',
      shapeIds: shapeIds || []
    });
  },

  'SEND_BACKWARD': (model: CanvasModel, action: Action) => {
    const { shapeIds } = action.payload;
    return new ZIndexCommand(model, {
      operation: 'send-backward',
      shapeIds: shapeIds || []
    });
  },

  'SET_Z_INDEX': (model: CanvasModel, action: Action) => {
    const { shapeIds, zIndex } = action.payload;
    return new ZIndexCommand(model, {
      operation: 'set-z-index',
      shapeIds: shapeIds || [],
      targetZIndex: zIndex
    });
  }
};

/**
 * 工具命令工厂函数
 */
const toolCommandFactories = {
  'SET_TOOL': (model: CanvasModel, action: Action) => {
    const { toolType, previousTool } = action.payload;
    return new ToolCommand(model, {
      toolType,
      previousTool
    });
  }
};

/**
 * 批量操作命令工厂函数
 */
const batchCommandFactories = {
  'BATCH': (model: CanvasModel, action: Action) => {
    const { actions, transactional = true, description } = action.payload;
    return new BatchActionCommand(model, {
      actions: actions || [],
      transactional,
      description
    });
  }
};

/**
 * 异步操作命令工厂函数
 */
const asyncCommandFactories = {
  'IMPORT_FILE': (model: CanvasModel, action: Action) => {
    const { file, url, format, replaceExisting, position } = action.payload;
    return new ImportFileCommand(model, {
      file,
      url,
      format,
      replaceExisting,
      position
    });
  },

  'EXPORT_FILE': (model: CanvasModel, action: Action) => {
    const { filename, format, quality, includeOnlySelected, bounds } = action.payload;
    return new ExportFileCommand(model, {
      filename,
      format,
      quality,
      includeOnlySelected,
      bounds
    });
  },

  'AUTO_SAVE': (model: CanvasModel, action: Action) => {
    const { target, key, url, interval, enableCompression } = action.payload;
    return new AutoSaveCommand(model, {
      target,
      key,
      url,
      interval,
      enableCompression
    });
  },

  'SYNC_TO_SERVER': (model: CanvasModel, action: Action) => {
    // 服务器同步命令 - 可以复用AutoSaveCommand的逻辑
    const { url, interval } = action.payload;
    return new AutoSaveCommand(model, {
      target: 'server',
      url,
      interval
    });
  }
};

/**
 * 组合所有命令工厂函数
 */
const allCommandFactories = {
  ...shapeCommandFactories,
  ...selectionCommandFactories,
  ...zIndexCommandFactories,
  ...toolCommandFactories,
  ...batchCommandFactories,
  ...asyncCommandFactories
};

/**
 * 注册所有默认命令
 */
export function registerDefaultCommands(): void {
  registerCommands(allCommandFactories);

  console.log(`Registered ${Object.keys(allCommandFactories).length} default commands`);
}

/**
 * 获取所有已实现的命令类型
 */
export function getImplementedCommandTypes(): string[] {
  return [
    ...Object.keys(shapeCommandFactories),
    ...Object.keys(selectionCommandFactories),
    ...Object.keys(zIndexCommandFactories),
    ...Object.keys(toolCommandFactories),
    ...Object.keys(batchCommandFactories),
    ...Object.keys(asyncCommandFactories)
  ];
}