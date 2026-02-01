/**
 * 高级路径操作模块导出
 * 提供路径布尔运算、简化和编辑功能
 */

export type {
  BooleanOperation,
  BooleanOperationResult,
  Path,
  PathBooleanEvents,
  PathPoint,
  PathSegment,
} from './PathBooleanOperations'
export { PathBooleanOperations } from './PathBooleanOperations'
export type {
  CurvePoint,
  PathEditOperation,
  PathSimplificationEvents,
  SimplificationOptions,
  SimplificationResult,
} from './PathSimplification'
export { PathSimplification } from './PathSimplification'
