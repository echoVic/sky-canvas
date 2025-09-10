/**
 * MVVM相关服务标识符
 * 与现有DI系统集成
 */

import { ServiceIdentifier, createServiceIdentifier } from './ServiceIdentifier';
import { IShapeRepositoryService } from '../services/ShapeRepositoryService';
import { ICanvasViewModelService } from '../services/CanvasViewModelService';

// ViewModel服务
export const ICanvasViewModelService = createServiceIdentifier<ICanvasViewModelService>('ICanvasViewModelService');

// Repository服务
export const IShapeRepositoryService = createServiceIdentifier<IShapeRepositoryService>('IShapeRepositoryService');

// 导出所有MVVM服务标识符
export const MVVMServiceIdentifiers = {
  ICanvasViewModelService,
  IShapeRepositoryService
} as const;

// 类型导出
export type {
  ICanvasViewModelService,
  IShapeRepositoryService
};