/**
 * Common type definitions for Sky Canvas SDK
 */
/**
 * Point interface representing a 2D coordinate
 */
export interface Point {
    x: number;
    y: number;
}
/**
 * Rectangle interface
 */
export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Render context interface
 */
export interface RenderContext {
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    viewport: Rect;
    pixelRatio: number;
    timestamp: number;
}
/**
 * Color interface
 */
export interface Color {
    r: number;
    g: number;
    b: number;
    a?: number;
}
/**
 * Size interface
 */
export interface Size {
    width: number;
    height: number;
}
/**
 * Transform interface for 2D transformations
 */
export interface Transform {
    scale: Point;
    rotation: number;
    translation: Point;
}
/**
 * Bounds interface
 */
export interface Bounds extends Rect {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
