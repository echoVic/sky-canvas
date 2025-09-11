/**
 * sky-canvas - Canvas SDK Public API
 * 
 * @packageDocumentation
 */

// The primary factory function for creating an SDK instance.
export { createCanvasSDK } from './main';

// Core types for consumers of the SDK.
export type { CanvasSDK, ICanvasSDKConfig } from './CanvasSDK';
export type { SDKConfig } from './main';

// Export any other public-facing types or interfaces your SDK offers.
// For example, if you want users to be able to interact with shapes:
// export type { Shape, ShapeType, Circle, Rect } from './shapes';