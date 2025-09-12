/**
 * 错误处理工具 - VSCode 兼容
 */

export function illegalState(message?: string): Error {
  return new Error(message || 'Illegal state');
}

export class NotSupportedError extends Error {
  constructor(message?: string) {
    super(message || 'Not supported');
    this.name = 'NotSupportedError';
  }
}

export class CancellationError extends Error {
  constructor() {
    super('Canceled');
    this.name = 'CancellationError';
  }
}