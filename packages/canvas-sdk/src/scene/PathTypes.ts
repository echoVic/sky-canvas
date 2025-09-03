import { IPoint } from '@sky-canvas/render-engine';

/**
 * 路径点类型
 */
export type PathPointType = 'corner' | 'smooth' | 'symmetric';

/**
 * 路径点接口
 */
export interface IPathPoint {
  id: string;
  point: IPoint;
  type: PathPointType;
  handleIn?: IPoint;  // 入手柄
  handleOut?: IPoint; // 出手柄
  selected: boolean;
}

/**
 * 路径段接口
 */
export interface IPathSegment {
  id: string;
  points: IPathPoint[];
  closed: boolean;
}

/**
 * 路径数据接口
 */
export interface IPathData {
  segments: IPathSegment[];
  fillRule: 'nonzero' | 'evenodd';
}