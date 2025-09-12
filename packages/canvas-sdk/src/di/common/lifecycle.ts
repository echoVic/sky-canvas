/**
 * 生命周期管理 - VSCode 兼容
 */

export interface IDisposable {
  dispose(): void;
}

export function isDisposable(thing: any): thing is IDisposable {
  return typeof thing?.dispose === 'function';
}

export function dispose<T extends IDisposable>(disposable: T): T;
export function dispose<T extends IDisposable>(disposable: T | undefined): T | undefined;
export function dispose<T extends IDisposable>(disposables: T[]): T[];
export function dispose<T extends IDisposable>(disposables: Set<T>): Set<T>;
export function dispose<T extends IDisposable>(arg: T | T[] | Set<T> | undefined): T | T[] | Set<T> | undefined {
  if (arg === undefined) {
    return undefined;
  }
  
  if (Array.isArray(arg)) {
    for (const item of arg) {
      if (isDisposable(item)) {
        item.dispose();
      }
    }
    return arg;
  }
  
  if (arg instanceof Set) {
    for (const item of arg) {
      if (isDisposable(item)) {
        item.dispose();
      }
    }
    return arg;
  }
  
  if (isDisposable(arg)) {
    arg.dispose();
  }
  return arg;
}

export class DisposableStore implements IDisposable {
  private _disposables = new Set<IDisposable>();
  private _isDisposed = false;

  dispose(): void {
    if (this._isDisposed) {
      return;
    }
    
    this._isDisposed = true;
    this.clear();
  }

  clear(): void {
    for (const disposable of this._disposables) {
      disposable.dispose();
    }
    this._disposables.clear();
  }

  add<T extends IDisposable>(disposable: T): T {
    if (this._isDisposed) {
      disposable.dispose();
    } else {
      this._disposables.add(disposable);
    }
    return disposable;
  }
}