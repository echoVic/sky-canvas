/**
 * Canvas 剪贴板操作混入
 * 处理复制、剪切、粘贴操作
 */

import { ShapeEntity } from '../../models/entities/Shape';
import { IClipboardService } from '../../services';

/**
 * 剪贴板操作依赖接口
 */
export interface IClipboardDeps {
  clipboardService: IClipboardService;
  eventBus: {
    emit(event: string, data: unknown): void;
  };
  logService: {
    debug(message: string): void;
  };
  // 回调函数
  getSelectedShapes: () => ShapeEntity[];
  removeShape: (id: string) => void;
  addShape: (shape: ShapeEntity) => void;
  clearSelection: () => void;
  selectShape: (id: string) => void;
}

/**
 * 复制选中的形状
 */
export function copySelectedShapes(deps: IClipboardDeps): void {
  const selectedShapes = deps.getSelectedShapes();
  if (selectedShapes.length === 0) return;

  deps.clipboardService.copy(selectedShapes);
  deps.eventBus.emit('canvas:shapesCopied', { count: selectedShapes.length });
  deps.logService.debug(`Copied ${selectedShapes.length} shapes`);
}

/**
 * 剪切选中的形状
 */
export function cutSelectedShapes(deps: IClipboardDeps): void {
  const selectedShapes = deps.getSelectedShapes();
  if (selectedShapes.length === 0) return;

  // 先复制到剪贴板
  deps.clipboardService.cut(selectedShapes);

  // 然后删除选中的形状
  selectedShapes.forEach((shape) => {
    deps.removeShape(shape.id);
  });

  deps.eventBus.emit('canvas:shapesCut', { count: selectedShapes.length });
  deps.logService.debug(`Cut ${selectedShapes.length} shapes`);
}

/**
 * 粘贴形状
 */
export function paste(deps: IClipboardDeps): ShapeEntity[] {
  const pastedShapes = deps.clipboardService.paste() as ShapeEntity[];
  if (!pastedShapes || pastedShapes.length === 0) return [];

  // 添加粘贴的形状
  pastedShapes.forEach((shape) => {
    deps.addShape(shape);
  });

  // 选中粘贴的形状
  deps.clearSelection();
  pastedShapes.forEach((shape) => {
    deps.selectShape(shape.id);
  });

  deps.eventBus.emit('canvas:shapesPasted', { count: pastedShapes.length });
  deps.logService.debug(`Pasted ${pastedShapes.length} shapes`);

  return pastedShapes;
}
