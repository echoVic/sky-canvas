import { createDecorator } from '../../di'

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
}

export interface ILogService {
  readonly _serviceBrand: undefined
  trace(message: string, ...args: unknown[]): void
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
  setLevel(level: LogLevel): void
  getLevel(): LogLevel
  dispose(): void
}

export const ILogService = createDecorator<ILogService>('LogService')

export class LogService implements ILogService {
  readonly _serviceBrand: undefined
  private currentLevel: LogLevel = 'info'

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.currentLevel]
  }

  trace(message: string, ...args: unknown[]): void {
    if (this.shouldLog('trace')) {
      console.trace(`[TRACE] ${message}`, ...args)
    }
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(`[DEBUG] ${message}`, ...args)
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args)
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args)
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args)
    }
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = level
  }

  getLevel(): LogLevel {
    return this.currentLevel
  }

  dispose(): void {}
}
