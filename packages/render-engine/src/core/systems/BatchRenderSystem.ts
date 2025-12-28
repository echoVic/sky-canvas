/**
 * 批量渲染系统
 * 实现高效的批量渲染优化，包括智能批次合并和动态纹理图集
 */

import { BaseSystem } from './SystemManager';
import { ExtensionType, Extension } from './ExtensionSystem';
import { BaseRenderer } from '../index';
import {
  BatchState,
  BatchData,
  IBatchable,
  BatchRenderStats
} from './BatchRenderSystemTypes';
import { TextureAtlas } from './TextureAtlas';

// 重新导出类型
export * from './BatchRenderSystemTypes';
export { TextureAtlas } from './TextureAtlas';

/**
 * 批量渲染系统
 */
@Extension({
  type: ExtensionType.RenderSystem,
  name: 'batch-render-system',
  priority: 900
})
export class BatchRenderSystem extends BaseSystem {
  readonly name = 'batch-render-system';
  readonly priority = 900;

  private renderer: BaseRenderer | null = null;
  private gl: WebGLRenderingContext | null = null;

  // 批次配置
  private readonly maxBatchSize = 4096;
  private readonly maxTextureUnits = 16;
  private readonly atlasSize = 2048;

  // 批次数据
  private currentBatch: BatchData;
  private currentState: BatchState;
  private batches: IBatchable[] = [];
  private sortedBatches: IBatchable[] = [];

  // WebGL 资源
  private vertexBuffer: WebGLBuffer | null = null;
  private indexBuffer: WebGLBuffer | null = null;
  private shader: WebGLProgram | null = null;

  // 纹理管理
  private textureUnits: (WebGLTexture | null)[] = [];
  private currentTextureUnit = 0;
  private textureAtlas: TextureAtlas | null = null;
  private enableAtlas = true;

  // 智能批次合并
  private batchGroups = new Map<string, IBatchable[]>();
  private frameObjectCount = 0;

  // 性能统计
  private stats: BatchRenderStats = {
    batchCount: 0,
    drawCalls: 0,
    objectsBatched: 0,
    textureSwaps: 0,
    atlasHits: 0,
    atlasMisses: 0,
    sortTime: 0,
    batchTime: 0
  };

  constructor() {
    super();
    this.currentBatch = this.createBatchData();
    this.currentState = this.createBatchState();
    this.textureUnits = new Array(this.maxTextureUnits).fill(null);
  }

  /** 初始化 */
  async init(): Promise<void> {
    if (!this.renderer) {
      throw new Error('Renderer is required and cannot be null or undefined');
    }

    let renderContext;
    try {
      renderContext = this.renderer.getContext?.();
    } catch (error) {
      throw new Error(`Failed to get render context: ${error}`);
    }

    if (!renderContext) {
      throw new Error('Render context is not available');
    }

    let canvas: HTMLCanvasElement | null = null;
    if (renderContext && 'canvas' in renderContext && renderContext.canvas instanceof HTMLCanvasElement) {
      canvas = renderContext.canvas;
    }

    if (!canvas) {
      throw new Error('Canvas is not available in render context');
    }

    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL is not supported in this browser');
    }

    if (!(gl instanceof WebGLRenderingContext) && !(gl instanceof WebGL2RenderingContext)) {
      throw new Error('WebGL context required for batch rendering');
    }

    this.gl = gl as WebGLRenderingContext;
    this.initWebGLResources();

    if (this.enableAtlas) {
      this.textureAtlas = new TextureAtlas(this.gl, this.atlasSize);
    }
  }

  /** 设置渲染器 */
  setRenderer(renderer: BaseRenderer): void {
    if (!renderer) {
      throw new Error('Renderer cannot be null or undefined');
    }
    this.renderer = renderer;
  }

  /** 开始批次 */
  begin(): void {
    this.resetStats();
    this.resetBatch();
    this.resetTextureUnits();
  }

  /** 添加可批量渲染对象 */
  addBatchable(batchable: IBatchable): void {
    if (this.enableAtlas && this.textureAtlas && batchable.texture) {
      this.tryAddToAtlas(batchable);
    }

    if (this.canAddToBatch(batchable)) {
      this.addToBatch(batchable);
    } else {
      this.flush();
      this.startNewBatch(batchable);
      this.addToBatch(batchable);
    }
  }

  /** 结束批次并渲染 */
  end(): void {
    if (this.currentBatch.count > 0) {
      this.flush();
    }
  }

  /** 添加到批次队列 */
  queueBatchable(batchable: IBatchable): void {
    this.batches.push(batchable);
    this.frameObjectCount++;
  }

  /** 处理智能批次合并 */
  processSmartBatching(): void {
    if (this.batches.length === 0) return;

    const startTime = performance.now();
    this.groupBatches();
    this.optimizeBatchOrder();

    for (const batchable of this.sortedBatches) {
      this.addBatchable(batchable);
    }

    this.stats.batchTime = performance.now() - startTime;
    this.batches = [];
  }

  /** 获取统计信息 */
  getStats(): BatchRenderStats {
    return { ...this.stats };
  }

  /** 销毁 */
  destroy(): void {
    if (this.gl) {
      if (this.vertexBuffer) this.gl.deleteBuffer(this.vertexBuffer);
      if (this.indexBuffer) this.gl.deleteBuffer(this.indexBuffer);
      if (this.shader) this.gl.deleteProgram(this.shader);
    }

    if (this.textureAtlas) {
      this.textureAtlas.dispose();
      this.textureAtlas = null;
    }

    this.renderer = null;
    this.gl = null;
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.shader = null;
    this.batchGroups.clear();
    this.batches = [];
    this.sortedBatches = [];
  }

  // ============ 私有方法 ============

  private canAddToBatch(batchable: IBatchable): boolean {
    if (this.currentBatch.count + batchable.vertexCount > this.maxBatchSize) {
      return false;
    }

    if (batchable.texture && !this.hasTextureUnit(batchable.texture)) {
      if (this.currentTextureUnit >= this.maxTextureUnits) {
        return false;
      }
    }

    return this.isStateCompatible(batchable);
  }

  private addToBatch(batchable: IBatchable): void {
    const offset = this.currentBatch.count;

    if (batchable.texture) {
      this.assignTextureUnit(batchable.texture);
    }

    const verticesAdded = batchable.fillBatchData(
      this.currentBatch.vertices,
      this.currentBatch.indices,
      this.currentBatch.uvs,
      this.currentBatch.colors,
      offset
    );

    this.currentBatch.count += verticesAdded;
    this.stats.objectsBatched++;
  }

  private startNewBatch(batchable: IBatchable): void {
    this.currentState.texture = batchable.texture;
    this.currentState.blendMode = batchable.blendMode;
    this.currentState.vertexCount = 0;
    this.currentState.indexCount = 0;

    this.resetBatch();
    this.stats.batchCount++;
  }

  private flush(): void {
    if (!this.gl || !this.shader || this.currentBatch.count === 0) {
      return;
    }

    this.uploadBatchData();
    this.setRenderState();
    this.bindTextures();

    this.gl.drawElements(
      this.gl.TRIANGLES,
      this.currentBatch.count * 6,
      this.gl.UNSIGNED_SHORT,
      0
    );

    this.stats.drawCalls++;
    this.resetBatch();
  }

  private uploadBatchData(): void {
    if (!this.gl || !this.vertexBuffer || !this.indexBuffer) return;

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, this.currentBatch.vertices.subarray(0, this.currentBatch.count * 4));

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferSubData(this.gl.ELEMENT_ARRAY_BUFFER, 0, this.currentBatch.indices.subarray(0, this.currentBatch.count * 6));
  }

  private setRenderState(): void {
    if (!this.gl) return;
    this.setBlendMode(this.currentState.blendMode);
    this.gl.useProgram(this.shader);
  }

  private bindTextures(): void {
    if (!this.gl) return;

    for (let i = 0; i < this.currentTextureUnit; i++) {
      const texture = this.textureUnits[i];
      if (texture) {
        this.gl.activeTexture(this.gl.TEXTURE0 + i);
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
      }
    }
  }

  private setBlendMode(blendMode: number): void {
    if (!this.gl) return;

    switch (blendMode) {
      case 0: // NORMAL
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
        break;
      case 1: // ADD
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE);
        break;
      case 2: // MULTIPLY
        this.gl.blendFunc(this.gl.DST_COLOR, this.gl.ONE_MINUS_SRC_ALPHA);
        break;
      default:
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
  }

  private hasTextureUnit(texture: WebGLTexture): boolean {
    return this.textureUnits.indexOf(texture) !== -1;
  }

  private assignTextureUnit(texture: WebGLTexture): number {
    let unit = this.textureUnits.indexOf(texture);

    if (unit === -1) {
      unit = this.currentTextureUnit++;
      this.textureUnits[unit] = texture;
      this.stats.textureSwaps++;
    }

    return unit;
  }

  private isStateCompatible(batchable: IBatchable): boolean {
    return this.currentState.blendMode === batchable.blendMode;
  }

  private createBatchData(): BatchData {
    return {
      vertices: new Float32Array(this.maxBatchSize * 8),
      indices: new Uint16Array(this.maxBatchSize * 6),
      uvs: new Float32Array(this.maxBatchSize * 8),
      colors: new Uint32Array(this.maxBatchSize * 4),
      count: 0,
      capacity: this.maxBatchSize
    };
  }

  private createBatchState(): BatchState {
    return {
      texture: null,
      blendMode: 0,
      shader: null,
      vertexCount: 0,
      indexCount: 0
    };
  }

  private resetBatch(): void {
    this.currentBatch.count = 0;
  }

  private resetTextureUnits(): void {
    this.textureUnits.fill(null);
    this.currentTextureUnit = 0;
  }

  private resetStats(): void {
    this.stats.batchCount = 0;
    this.stats.drawCalls = 0;
    this.stats.objectsBatched = 0;
    this.stats.textureSwaps = 0;
  }

  private initWebGLResources(): void {
    if (!this.gl) return;

    this.vertexBuffer = this.gl.createBuffer();
    this.indexBuffer = this.gl.createBuffer();

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.currentBatch.vertices, this.gl.DYNAMIC_DRAW);

    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, this.currentBatch.indices, this.gl.DYNAMIC_DRAW);

    this.shader = this.createShader();
  }

  private createShader(): WebGLProgram | null {
    if (!this.gl) return null;

    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      attribute vec4 a_color;
      uniform mat3 u_matrix;
      varying vec2 v_texCoord;
      varying vec4 v_color;
      void main() {
        vec3 position = u_matrix * vec3(a_position, 1.0);
        gl_Position = vec4(position.xy, 0.0, 1.0);
        v_texCoord = a_texCoord;
        v_color = a_color;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_texture;
      varying vec2 v_texCoord;
      varying vec4 v_color;
      void main() {
        gl_FragColor = texture2D(u_texture, v_texCoord) * v_color;
      }
    `;

    const vertexShader = this.compileShader(vertexShaderSource, this.gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(fragmentShaderSource, this.gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return null;

    const program = this.gl.createProgram();
    if (!program) return null;

    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Shader program link error:', this.gl.getProgramInfoLog(program));
      return null;
    }

    return program;
  }

  private compileShader(source: string, type: number): WebGLShader | null {
    if (!this.gl) return null;

    const shader = this.gl.createShader(type);
    if (!shader) return null;

    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  private tryAddToAtlas(batchable: IBatchable): void {
    if (!this.textureAtlas || !batchable.texture) return;

    const textureSize = batchable.getTextureSize();
    const atlasRegion = this.textureAtlas.addTexture(
      batchable.texture,
      textureSize.width,
      textureSize.height
    );

    if (atlasRegion) {
      this.stats.atlasHits++;
      this.textureAtlas.updateTexture();
    } else {
      this.stats.atlasMisses++;
    }
  }

  private groupBatches(): void {
    const startTime = performance.now();

    this.batchGroups.clear();

    for (const batchable of this.batches) {
      const key = this.getBatchKey(batchable);
      if (!this.batchGroups.has(key)) {
        this.batchGroups.set(key, []);
      }
      this.batchGroups.get(key)!.push(batchable);
    }

    this.stats.sortTime = performance.now() - startTime;
  }

  private getBatchKey(batchable: IBatchable): string {
    const textureId = batchable.texture ? this.getTextureId(batchable.texture) : 'null';
    return `${textureId}_${batchable.blendMode}`;
  }

  private getTextureId(texture: WebGLTexture): string {
    return texture.toString();
  }

  private optimizeBatchOrder(): void {
    this.sortedBatches = [];

    const groups = Array.from(this.batchGroups.values());
    groups.sort((a, b) => {
      const avgPriorityA = a.reduce((sum, item) => sum + item.priority, 0) / a.length;
      const avgPriorityB = b.reduce((sum, item) => sum + item.priority, 0) / b.length;
      return avgPriorityB - avgPriorityA;
    });

    for (const group of groups) {
      group.sort((a, b) => {
        const distA = a.bounds.x + a.bounds.y;
        const distB = b.bounds.x + b.bounds.y;
        return distA - distB;
      });
      this.sortedBatches.push(...group);
    }
  }
}
