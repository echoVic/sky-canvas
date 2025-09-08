/**
 * 日志服务实现
 */

import { injectable } from '../di/ServiceIdentifier';
import { ILogService } from '../di/ServiceIdentifiers';

/**
 * 日志级别
 */
enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4
}

/**
 * 日志条目接口
 */
interface LogEntry {
  level: LogLevel;
  message: string;
  args: any[];
  timestamp: Date;
  category?: string;
}

/**
 * 日志服务实现
 */
@injectable
export class LogService implements ILogService {
  private currentLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogEntries = 1000;
  private logToConsole = true;
  private logToMemory = true;
  private categoryFilters: Set<string> = new Set();
  
  /**
   * 记录 trace 级别日志
   */
  trace(message: string, ...args: any[]): void {
    this.log(LogLevel.TRACE, message, args);
  }
  
  /**
   * 记录 debug 级别日志
   */
  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, args);
  }
  
  /**
   * 记录 info 级别日志
   */
  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, args);
  }
  
  /**
   * 记录 warn 级别日志
   */
  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, args);
  }
  
  /**
   * 记录 error 级别日志
   */
  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, args);
  }
  
  /**
   * 设置日志级别
   */
  setLevel(level: 'trace' | 'debug' | 'info' | 'warn' | 'error'): void {
    switch (level) {
      case 'trace':
        this.currentLevel = LogLevel.TRACE;
        break;
      case 'debug':
        this.currentLevel = LogLevel.DEBUG;
        break;
      case 'info':
        this.currentLevel = LogLevel.INFO;
        break;
      case 'warn':
        this.currentLevel = LogLevel.WARN;
        break;
      case 'error':
        this.currentLevel = LogLevel.ERROR;
        break;
      default:
        this.currentLevel = LogLevel.INFO;
    }
  }
  
  /**
   * 核心日志记录方法
   */
  private log(level: LogLevel, message: string, args: any[]): void {
    // 检查日志级别
    if (level < this.currentLevel) {
      return;
    }
    
    const entry: LogEntry = {
      level,
      message,
      args,
      timestamp: new Date()
    };
    
    // 记录到内存
    if (this.logToMemory) {
      this.logs.push(entry);
      
      // 限制日志条目数量
      if (this.logs.length > this.maxLogEntries) {
        this.logs.shift();
      }
    }
    
    // 输出到控制台
    if (this.logToConsole) {
      this.logToConsoleOutput(entry);
    }
  }
  
  /**
   * 输出到控制台
   */
  private logToConsoleOutput(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}] Canvas SDK:`;
    
    switch (entry.level) {
      case LogLevel.TRACE:
        console.trace(prefix, entry.message, ...entry.args);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, ...entry.args);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, ...entry.args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, ...entry.args);
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, ...entry.args);
        break;
    }
  }
  
  /**
   * 创建分类日志器
   */
  createCategoryLogger(category: string): CategoryLogger {
    return new CategoryLogger(this, category);
  }
  
  /**
   * 记录带分类的日志
   */
  logWithCategory(level: LogLevel, category: string, message: string, args: any[]): void {
    // 检查分类过滤器
    if (this.categoryFilters.size > 0 && !this.categoryFilters.has(category)) {
      return;
    }
    
    const entry: LogEntry = {
      level,
      message,
      args,
      timestamp: new Date(),
      category
    };
    
    // 记录到内存
    if (this.logToMemory) {
      this.logs.push(entry);
      
      if (this.logs.length > this.maxLogEntries) {
        this.logs.shift();
      }
    }
    
    // 输出到控制台
    if (this.logToConsole) {
      this.logCategoryToConsole(entry);
    }
  }
  
  /**
   * 输出分类日志到控制台
   */
  private logCategoryToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelName = LogLevel[entry.level];
    const prefix = `[${timestamp}] [${levelName}] [${entry.category}] Canvas SDK:`;
    
    switch (entry.level) {
      case LogLevel.TRACE:
        console.trace(prefix, entry.message, ...entry.args);
        break;
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message, ...entry.args);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message, ...entry.args);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message, ...entry.args);
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message, ...entry.args);
        break;
    }
  }
  
  /**
   * 获取日志条目
   */
  getLogs(level?: 'trace' | 'debug' | 'info' | 'warn' | 'error'): LogEntry[] {
    if (!level) {
      return [...this.logs];
    }
    
    const filterLevel = this.stringToLogLevel(level);
    return this.logs.filter(log => log.level >= filterLevel);
  }
  
  /**
   * 清空日志
   */
  clearLogs(): void {
    this.logs.length = 0;
  }
  
  /**
   * 设置控制台输出开关
   */
  setConsoleOutput(enabled: boolean): void {
    this.logToConsole = enabled;
  }
  
  /**
   * 设置内存日志开关
   */
  setMemoryLogging(enabled: boolean): void {
    this.logToMemory = enabled;
  }
  
  /**
   * 设置最大日志条目数
   */
  setMaxLogEntries(max: number): void {
    this.maxLogEntries = Math.max(0, max);
    
    // 如果当前日志超过限制，则截取
    if (this.logs.length > this.maxLogEntries) {
      this.logs = this.logs.slice(-this.maxLogEntries);
    }
  }
  
  /**
   * 添加分类过滤器
   */
  addCategoryFilter(category: string): void {
    this.categoryFilters.add(category);
  }
  
  /**
   * 移除分类过滤器
   */
  removeCategoryFilter(category: string): void {
    this.categoryFilters.delete(category);
  }
  
  /**
   * 清空分类过滤器
   */
  clearCategoryFilters(): void {
    this.categoryFilters.clear();
  }
  
  /**
   * 导出日志为 JSON
   */
  exportLogsAsJSON(): string {
    return JSON.stringify(this.logs.map(entry => ({
      ...entry,
      level: LogLevel[entry.level],
      timestamp: entry.timestamp.toISOString()
    })), null, 2);
  }
  
  /**
   * 字符串转日志级别
   */
  private stringToLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'trace': return LogLevel.TRACE;
      case 'debug': return LogLevel.DEBUG;
      case 'info': return LogLevel.INFO;
      case 'warn': return LogLevel.WARN;
      case 'error': return LogLevel.ERROR;
      default: return LogLevel.INFO;
    }
  }
}

/**
 * 分类日志器
 */
export class CategoryLogger {
  constructor(
    private logService: LogService,
    private category: string
  ) {}
  
  trace(message: string, ...args: any[]): void {
    this.logService.logWithCategory(LogLevel.TRACE, this.category, message, args);
  }
  
  debug(message: string, ...args: any[]): void {
    this.logService.logWithCategory(LogLevel.DEBUG, this.category, message, args);
  }
  
  info(message: string, ...args: any[]): void {
    this.logService.logWithCategory(LogLevel.INFO, this.category, message, args);
  }
  
  warn(message: string, ...args: any[]): void {
    this.logService.logWithCategory(LogLevel.WARN, this.category, message, args);
  }
  
  error(message: string, ...args: any[]): void {
    this.logService.logWithCategory(LogLevel.ERROR, this.category, message, args);
  }
}
