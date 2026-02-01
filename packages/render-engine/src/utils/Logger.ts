/**
 * 统一日志系统
 * 提供日志级别控制、命名空间支持和生产环境禁用功能
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

export interface LoggerConfig {
  level: LogLevel
  enabled: boolean
  prefix?: string
  timestamp?: boolean
}

const DEFAULT_CONFIG: LoggerConfig = {
  level: LogLevel.DEBUG,
  enabled: true,
  prefix: '[RenderEngine]',
  timestamp: false,
}

let globalConfig: LoggerConfig = { ...DEFAULT_CONFIG }

const formatTimestamp = (): string => {
  const now = new Date()
  return `[${now.toISOString()}]`
}

const formatMessage = (namespace: string, level: string, config: LoggerConfig): string => {
  const parts: string[] = []

  if (config.timestamp) {
    parts.push(formatTimestamp())
  }

  if (config.prefix) {
    parts.push(config.prefix)
  }

  if (namespace) {
    parts.push(`[${namespace}]`)
  }

  parts.push(`[${level}]`)

  return parts.join(' ')
}

export class Logger {
  private namespace: string
  private config: LoggerConfig

  constructor(namespace: string = '', config?: Partial<LoggerConfig>) {
    this.namespace = namespace
    this.config = { ...globalConfig, ...config }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.config.enabled && level >= this.config.level
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(formatMessage(this.namespace, 'DEBUG', this.config), ...args)
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(formatMessage(this.namespace, 'INFO', this.config), ...args)
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(formatMessage(this.namespace, 'WARN', this.config), ...args)
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(formatMessage(this.namespace, 'ERROR', this.config), ...args)
    }
  }

  log(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(formatMessage(this.namespace, 'LOG', this.config), ...args)
    }
  }

  group(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(formatMessage(this.namespace, 'GROUP', this.config), label)
    }
  }

  groupEnd(): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd()
    }
  }

  time(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.time(`${this.namespace}:${label}`)
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.timeEnd(`${this.namespace}:${label}`)
    }
  }

  table(data: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.table(data)
    }
  }

  setLevel(level: LogLevel): void {
    this.config.level = level
  }

  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled
  }

  createChild(childNamespace: string): Logger {
    const fullNamespace = this.namespace ? `${this.namespace}:${childNamespace}` : childNamespace
    return new Logger(fullNamespace, this.config)
  }

  static setGlobalLevel(level: LogLevel): void {
    globalConfig.level = level
  }

  static setGlobalEnabled(enabled: boolean): void {
    globalConfig.enabled = enabled
  }

  static setGlobalConfig(config: Partial<LoggerConfig>): void {
    globalConfig = { ...globalConfig, ...config }
  }

  static getGlobalConfig(): LoggerConfig {
    return { ...globalConfig }
  }

  static disableInProduction(): void {
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') {
      globalConfig.enabled = false
    }
  }

  static enableOnlyErrors(): void {
    globalConfig.level = LogLevel.ERROR
  }

  static create(namespace: string, config?: Partial<LoggerConfig>): Logger {
    return new Logger(namespace, config)
  }
}

export const createLogger = (namespace: string, config?: Partial<LoggerConfig>): Logger => {
  return new Logger(namespace, config)
}

export const logger = new Logger()
