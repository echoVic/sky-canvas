/**
 * 默认命令注册
 * 将所有内置命令注册到命令注册表
 */

import { Action } from '../actions/types';
import { ICanvasModel } from '../models/CanvasModel';
import { ICommandRegistration, ICommandRegistry } from './services';

// 图形命令
import { AddGraphicCommand } from './shapes/AddGraphicCommand';
import { DeleteSelectedCommand, DeleteShapeCommand } from './shapes/DeleteShapeCommand';
import { UpdateShapeCommand } from './shapes/UpdateShapeCommand';

// 选择命令
import {
  ClearSelectionCommand,
  DeselectShapeCommand,
  InvertSelectionCommand,
  SelectAllCommand,
  SelectShapesCommand
} from './selection/SelectShapesCommand';

// Z-index命令
import { ZIndexCommand } from './zindex/ZIndexCommand';

// 工具命令
import { AutoSaveCommand } from './async/AutoSaveCommand';
import { ExportFileCommand } from './async/ExportFileCommand';
import { ImportFileCommand } from './async/ImportFileCommand';
import { BatchActionCommand } from './batch/BatchActionCommand';
import { ToolCommand } from './tools/ToolCommand';

/**
 * 形状命令工厂函数
 */
const shapeCommandFactories = {
  'ADD_RECTANGLE': (model: ICanvasModel, action: Action) => {
    const { x, y, width, height, style } = action.payload;
    return new AddGraphicCommand(model, { type: 'rectangle', x, y, width, height, style });
  },

  'ADD_CIRCLE': (model: ICanvasModel, action: Action) => {
    const { x, y, radius, style } = action.payload;
    return new AddGraphicCommand(model, { type: 'circle', x, y, radius, style });
  },

  'ADD_TEXT': (model: ICanvasModel, action: Action) => {
    const { x, y, text, style } = action.payload;
    return new AddGraphicCommand(model, { type: 'text', x, y, text, style });
  },

  'ADD_LINE': (model: ICanvasModel, action: Action) => {
    const { x, y, x2, y2, style } = action.payload;
    return new AddGraphicCommand(model, { type: 'line', x, y, x2, y2, style });
  },


  'UPDATE_GRAPHIC': (model: ICanvasModel, action: Action) => {
    const { graphicId, updates } = action.payload;
    return new UpdateShapeCommand(model, graphicId, updates);
  },

  'DELETE_GRAPHIC': (model: ICanvasModel, action: Action) => {
    const { graphicId } = action.payload;
    return new DeleteShapeCommand(model, graphicId);
  },

  'DELETE_SELECTED': (model: ICanvasModel, action: Action) => {
    return new DeleteSelectedCommand(model);
  }
};

/**
 * 选择命令工厂函数
 */
const selectionCommandFactories = {
  'SELECT_SHAPES': (model: ICanvasModel, action: Action) => {
    const { shapeIds, addToSelection } = action.payload;
    return new SelectShapesCommand(model, shapeIds, addToSelection);
  },

  'DESELECT_SHAPE': (model: ICanvasModel, action: Action) => {
    const { shapeId } = action.payload;
    return new DeselectShapeCommand(model, shapeId);
  },

  'CLEAR_SELECTION': (model: ICanvasModel, action: Action) => {
    return new ClearSelectionCommand(model);
  },

  'SELECT_ALL': (model: ICanvasModel, action: Action) => {
    return new SelectAllCommand(model);
  },

  'INVERT_SELECTION': (model: ICanvasModel, action: Action) => {
    return new InvertSelectionCommand(model);
  }
};

/**
 * Z-index命令工厂函数
 */
const zIndexCommandFactories = {
  'BRING_TO_FRONT': (model: ICanvasModel, action: Action) => {
    const { shapeIds } = action.payload;
    return new ZIndexCommand(model, {
      operation: 'bring-to-front',
      shapeIds: shapeIds || []
    });
  },

  'SEND_TO_BACK': (model: ICanvasModel, action: Action) => {
    const { shapeIds } = action.payload;
    return new ZIndexCommand(model, {
      operation: 'send-to-back',
      shapeIds: shapeIds || []
    });
  },

  'BRING_FORWARD': (model: ICanvasModel, action: Action) => {
    const { shapeIds } = action.payload;
    return new ZIndexCommand(model, {
      operation: 'bring-forward',
      shapeIds: shapeIds || []
    });
  },

  'SEND_BACKWARD': (model: ICanvasModel, action: Action) => {
    const { shapeIds } = action.payload;
    return new ZIndexCommand(model, {
      operation: 'send-backward',
      shapeIds: shapeIds || []
    });
  },

  'SET_Z_INDEX': (model: ICanvasModel, action: Action) => {
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
  'SET_TOOL': (model: ICanvasModel, action: Action) => {
    const { toolType, previousTool } = action.payload;
    return new ToolCommand(model, {
      toolType,
      previousTool
    });
  }
};

/**
 * 创建批量操作命令工厂函数，需要commandRegistry
 */
const createBatchCommandFactories = (commandRegistry: ICommandRegistry) => ({
  'BATCH': (model: ICanvasModel, action: Action) => {
    const { actions, transactional = true, description } = action.payload;
    return new BatchActionCommand(model, commandRegistry, {
      actions: actions || [],
      transactional,
      description
    });
  }
});

/**
 * 异步操作命令工厂函数
 */
const asyncCommandFactories = {
  'IMPORT_FILE': (model: ICanvasModel, action: Action) => {
    const { file, url, format, replaceExisting, position } = action.payload;
    return new ImportFileCommand(model, {
      file,
      url,
      format,
      replaceExisting,
      position
    });
  },

  'EXPORT_FILE': (model: ICanvasModel, action: Action) => {
    const { filename, format, quality, includeOnlySelected, bounds } = action.payload;
    return new ExportFileCommand(model, {
      filename,
      format,
      quality,
      includeOnlySelected,
      bounds
    });
  },

  'AUTO_SAVE': (model: ICanvasModel, action: Action) => {
    const { target, key, url, interval, enableCompression } = action.payload;
    return new AutoSaveCommand(model, {
      target,
      key,
      url,
      interval,
      enableCompression
    });
  },

  'SYNC_TO_SERVER': (model: ICanvasModel, action: Action) => {
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
 * 注册所有默认命令到指定的命令注册表
 */
export function registerDefaultCommands(commandRegistry: ICommandRegistry): void {
  // 创建需要commandRegistry的工厂函数
  const batchCommandFactories = createBatchCommandFactories(commandRegistry);

  // 组合所有命令工厂函数
  const allCommandFactories = {
    ...shapeCommandFactories,
    ...selectionCommandFactories,
    ...zIndexCommandFactories,
    ...toolCommandFactories,
    ...batchCommandFactories,
    ...asyncCommandFactories
  };

  // 转换为新的注册格式
  const registrations: Record<string, ICommandRegistration> = {};

  Object.entries(allCommandFactories).forEach(([actionType, factory]) => {
    registrations[actionType] = { factory };
  });

  commandRegistry.registerBatch(registrations);
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
    'BATCH', // 批量命令类型
    ...Object.keys(asyncCommandFactories)
  ];
}