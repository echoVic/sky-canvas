/**
 * 帧率计算器
 * 跟踪和计算帧率统计
 */

/**
 * 帧率计算器
 */
export class FPSCounter {
  private frameTimes: number[] = [];
  private lastFrameTime = 0;
  private frameCount = 0;
  private startTime = 0;
  private maxFrameHistory = 60;

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * 记录新帧
   */
  recordFrame(): void {
    const now = performance.now();

    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.frameTimes.push(frameTime);

      if (this.frameTimes.length > this.maxFrameHistory) {
        this.frameTimes.shift();
      }
    }

    this.lastFrameTime = now;
    this.frameCount++;
  }

  /**
   * 获取当前FPS
   */
  getCurrentFPS(): number {
    if (this.frameTimes.length < 2) return 0;

    const avgFrameTime = this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
    return avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
  }

  /**
   * 获取平均帧时间
   */
  getAverageFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
  }

  /**
   * 获取总体FPS
   */
  getOverallFPS(): number {
    const elapsed = performance.now() - this.startTime;
    return elapsed > 0 ? (this.frameCount * 1000) / elapsed : 0;
  }

  /**
   * 获取帧数
   */
  getFrameCount(): number {
    return this.frameCount;
  }

  /**
   * 获取最小帧时间
   */
  getMinFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return Math.min(...this.frameTimes);
  }

  /**
   * 获取最大帧时间
   */
  getMaxFrameTime(): number {
    if (this.frameTimes.length === 0) return 0;
    return Math.max(...this.frameTimes);
  }

  /**
   * 重置计数器
   */
  reset(): void {
    this.frameTimes = [];
    this.lastFrameTime = 0;
    this.frameCount = 0;
    this.startTime = performance.now();
  }
}
