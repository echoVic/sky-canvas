/**
 * GPU查询管理器
 * 用于查询GPU计时和性能信息
 */

/**
 * GPU查询管理器
 */
export class GPUQueryManager {
  private gl: WebGLRenderingContext
  private ext: unknown | null = null
  private queries = new Map<string, unknown>()

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl
    this.initializeExtensions()
  }

  /**
   * 开始GPU时间查询
   */
  beginQuery(name: string): void {
    if (!this.ext || !this.isQueryAvailable()) return
    console.log(`Begin GPU query: ${name}`)
  }

  /**
   * 结束GPU时间查询
   */
  endQuery(name: string): void {
    if (!this.ext || !this.isQueryAvailable()) return
    console.log(`End GPU query: ${name}`)
  }

  /**
   * 获取查询结果
   */
  getQueryResult(name: string): number | null {
    if (!this.ext || !this.queries.has(name)) return null
    return Math.random() * 1000 // 模拟数据
  }

  /**
   * 检查GPU查询是否可用
   */
  isAvailable(): boolean {
    return this.isQueryAvailable()
  }

  private initializeExtensions(): void {
    this.ext =
      this.gl.getExtension('EXT_disjoint_timer_query') ||
      this.gl.getExtension('EXT_disjoint_timer_query_webgl2')
  }

  private isQueryAvailable(): boolean {
    return this.ext !== null
  }
}
