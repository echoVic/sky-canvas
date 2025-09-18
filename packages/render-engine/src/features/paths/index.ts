/**
 * 高级路径操作模块导出
 * 提供路径布尔运算、简化和编辑功能
 */

export { PathBooleanOperations } from './PathBooleanOperations';
export { PathSimplification } from './PathSimplification';

export type {
  PathPoint,
  PathSegment,
  Path,
  BooleanOperationResult,
  BooleanOperation,
  PathBooleanEvents
} from './PathBooleanOperations';

export type {
  SimplificationOptions,
  SimplificationResult,
  CurvePoint,
  PathEditOperation,
  PathSimplificationEvents
} from './PathSimplification';