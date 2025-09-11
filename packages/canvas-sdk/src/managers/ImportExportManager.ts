/**
 * 导入导出管理器 - 协调导入导出服务的复杂业务逻辑
 * 如果只是简单的导入导出，直接使用对应的 Service 即可
 */

import { ShapeEntity } from '../models/entities/Shape';
import { IImportService, IExportService, IImportResult, IExportOptions } from '../services';
import { IEventBusService } from '../services';
import type { ILogService } from '../services';

/**
 * 批量操作选项
 */
export interface IBatchOperationOptions {
  batchSize?: number;
  onProgress?: (current: number, total: number) => void;
  onError?: (error: string, item?: any) => void;
}

/**
 * 导入导出管理器接口
 */
export interface IImportExportManager {
  // 批量导入
  batchImportFiles(files: FileList, options?: IBatchOperationOptions): Promise<IImportResult[]>;
  
  // 导出项目
  exportProject(shapes: ShapeEntity[], metadata?: any): Promise<void>;
  
  // 导入项目  
  importProject(file: File): Promise<{ shapes: ShapeEntity[], metadata?: any }>;
  
  // 导出选中形状
  exportSelectedShapes(shapes: ShapeEntity[], format: 'svg' | 'png' | 'json', canvas?: HTMLCanvasElement): Promise<void>;
  
  // 获取支持的格式
  getSupportedImportFormats(): string[];
  getSupportedExportFormats(): string[];
}

/**
 * 导入导出管理器实现
 * 协调 ImportService 和 ExportService
 */
export class ImportExportManager implements IImportExportManager {
  
  constructor(
    private importService: IImportService,
    private exportService: IExportService,
    private eventBus: IEventBusService,
    private logService: ILogService
  ) {
    this.logService.info('ImportExportManager initialized');
  }

  /**
   * 批量导入文件
   */
  async batchImportFiles(files: FileList, options?: IBatchOperationOptions): Promise<IImportResult[]> {
    const results: IImportResult[] = [];
    const totalFiles = files.length;
    const batchSize = options?.batchSize || 5;
    
    this.logService.info(`Starting batch import of ${totalFiles} files`);
    this.eventBus.emit('import:batchStarted', { totalFiles });
    
    // 分批处理文件
    for (let i = 0; i < totalFiles; i += batchSize) {
      const batch = Array.from(files).slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file, index) => {
        try {
          const result = await this.importService.importFromFile(file);
          
          if (options?.onProgress) {
            options.onProgress(i + index + 1, totalFiles);
          }
          
          this.eventBus.emit('import:fileCompleted', { 
            file: file.name, 
            success: result.success,
            shapesCount: result.shapes.length 
          });
          
          return result;
        } catch (error) {
          const errorMessage = `Failed to import ${file.name}: ${error}`;
          this.logService.error(errorMessage);
          
          if (options?.onError) {
            options.onError(errorMessage, file);
          }
          
          return {
            success: false,
            shapes: [],
            errors: [errorMessage]
          } as IImportResult;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 小延迟避免阻塞UI
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    const successCount = results.filter(r => r.success).length;
    this.logService.info(`Batch import completed: ${successCount}/${totalFiles} successful`);
    this.eventBus.emit('import:batchCompleted', { successCount, totalFiles, results });
    
    return results;
  }

  /**
   * 导出项目
   */
  async exportProject(shapes: ShapeEntity[], metadata?: any): Promise<void> {
    try {
      this.eventBus.emit('export:projectStarted', { shapesCount: shapes.length });
      
      const projectData = {
        version: '1.0',
        metadata: {
          exportedAt: new Date().toISOString(),
          shapesCount: shapes.length,
          ...metadata
        },
        shapes: shapes
      };
      
      const jsonContent = JSON.stringify(projectData, null, 2);
      const filename = `canvas-project-${Date.now()}.json`;
      
      this.exportService.downloadFile(jsonContent, filename, 'application/json');
      
      this.logService.info(`Project exported: ${filename}`);
      this.eventBus.emit('export:projectCompleted', { filename, shapesCount: shapes.length });
      
    } catch (error) {
      const errorMessage = `Failed to export project: ${error}`;
      this.logService.error(errorMessage);
      this.eventBus.emit('export:projectFailed', { error: errorMessage });
      throw error;
    }
  }

  /**
   * 导入项目
   */
  async importProject(file: File): Promise<{ shapes: ShapeEntity[], metadata?: any }> {
    try {
      this.eventBus.emit('import:projectStarted', { filename: file.name });
      
      const result = await this.importService.importFromFile(file);
      
      if (!result.success) {
        throw new Error(result.errors.join(', '));
      }
      
      const metadata = result.metadata || {};
      
      this.logService.info(`Project imported: ${file.name}, ${result.shapes.length} shapes`);
      this.eventBus.emit('import:projectCompleted', { 
        filename: file.name, 
        shapesCount: result.shapes.length,
        metadata 
      });
      
      return {
        shapes: result.shapes,
        metadata
      };
      
    } catch (error) {
      const errorMessage = `Failed to import project: ${error}`;
      this.logService.error(errorMessage);
      this.eventBus.emit('import:projectFailed', { error: errorMessage });
      throw error;
    }
  }

  /**
   * 导出选中形状
   */
  async exportSelectedShapes(
    shapes: ShapeEntity[], 
    format: 'svg' | 'png' | 'json',
    canvas?: HTMLCanvasElement
  ): Promise<void> {
    if (shapes.length === 0) {
      throw new Error('No shapes to export');
    }
    
    try {
      this.eventBus.emit('export:selectionStarted', { format, shapesCount: shapes.length });
      
      const timestamp = Date.now();
      let filename: string;
      let content: string | Blob;
      let mimeType: string;
      
      switch (format) {
        case 'svg':
          filename = `canvas-shapes-${timestamp}.svg`;
          content = this.exportService.exportToSVG(shapes);
          mimeType = 'image/svg+xml';
          break;
          
        case 'png':
          if (!canvas) {
            throw new Error('Canvas required for PNG export');
          }
          filename = `canvas-shapes-${timestamp}.png`;
          content = await this.exportService.exportToPNG(canvas);
          mimeType = 'image/png';
          break;
          
        case 'json':
          filename = `canvas-shapes-${timestamp}.json`;
          content = this.exportService.exportToJSON(shapes);
          mimeType = 'application/json';
          break;
          
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
      
      this.exportService.downloadFile(content, filename, mimeType);
      
      this.logService.info(`Shapes exported: ${filename}`);
      this.eventBus.emit('export:selectionCompleted', { filename, format, shapesCount: shapes.length });
      
    } catch (error) {
      const errorMessage = `Failed to export shapes: ${error}`;
      this.logService.error(errorMessage);
      this.eventBus.emit('export:selectionFailed', { error: errorMessage });
      throw error;
    }
  }

  /**
   * 获取支持的导入格式
   */
  getSupportedImportFormats(): string[] {
    return ['json', 'svg', 'png', 'jpg', 'jpeg'];
  }

  /**
   * 获取支持的导出格式
   */
  getSupportedExportFormats(): string[] {
    return ['json', 'svg', 'png', 'jpeg'];
  }
}