/**
 * WebGL帧缓冲管理器
 */

import {
  ResourceType,
  ResourceState,
  ResourceMetadata,
  FramebufferConfig,
  ResourceRef
} from './WebGLResourceTypes';
import { TextureManager } from './TextureManager';

/**
 * 帧缓冲管理器
 */
export class FramebufferManager {
  private framebuffers = new Map<string, ResourceRef<WebGLFramebuffer>>();
  private configs = new Map<string, FramebufferConfig>();

  constructor(
    private gl: WebGLRenderingContext,
    private textureManager: TextureManager
  ) {}

  /**
   * 创建帧缓冲
   */
  createFramebuffer(id: string, config: FramebufferConfig): ResourceRef<WebGLFramebuffer> {
    if (this.framebuffers.has(id)) {
      throw new Error(`Framebuffer with id '${id}' already exists`);
    }

    const framebuffer = this.gl.createFramebuffer();
    if (!framebuffer) {
      throw new Error('Failed to create WebGL framebuffer');
    }

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);

    const attachments: string[] = [];
    let totalSize = 0;

    // 创建颜色附件
    for (let i = 0; i < config.colorTextures; i++) {
      const textureId = `${id}_color_${i}`;
      const colorTexture = this.textureManager.createTexture(textureId, {
        width: config.width,
        height: config.height,
        format: this.gl.RGBA,
        type: this.gl.UNSIGNED_BYTE,
        minFilter: this.gl.LINEAR,
        magFilter: this.gl.LINEAR,
        wrapS: this.gl.CLAMP_TO_EDGE,
        wrapT: this.gl.CLAMP_TO_EDGE
      });

      this.gl.framebufferTexture2D(
        this.gl.FRAMEBUFFER,
        this.gl.COLOR_ATTACHMENT0 + i,
        this.gl.TEXTURE_2D,
        colorTexture.resource,
        0
      );

      attachments.push(textureId);
      totalSize += colorTexture.metadata.size;
    }

    // 创建深度附件
    if (config.depthTexture) {
      const { textureId, size } = this.createDepthAttachment(id, config);
      attachments.push(textureId);
      totalSize += size;
    }

    this.validateFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

    const metadata: ResourceMetadata = {
      id,
      type: ResourceType.FRAMEBUFFER,
      state: ResourceState.READY,
      size: totalSize,
      createTime: performance.now(),
      lastAccessed: performance.now(),
      accessCount: 0,
      tags: [],
      dependencies: attachments
    };

    const resourceRef: ResourceRef<WebGLFramebuffer> = { id, resource: framebuffer, metadata };
    this.framebuffers.set(id, resourceRef);
    this.configs.set(id, config);

    return resourceRef;
  }

  private createDepthAttachment(id: string, config: FramebufferConfig): { textureId: string; size: number } {
    const depthTextureId = `${id}_depth`;
    const depthTexture = this.textureManager.createTexture(depthTextureId, {
      width: config.width,
      height: config.height,
      format: this.gl.DEPTH_COMPONENT,
      type: this.gl.UNSIGNED_INT,
      minFilter: this.gl.NEAREST,
      magFilter: this.gl.NEAREST,
      wrapS: this.gl.CLAMP_TO_EDGE,
      wrapT: this.gl.CLAMP_TO_EDGE
    });

    this.gl.framebufferTexture2D(
      this.gl.FRAMEBUFFER,
      this.gl.DEPTH_ATTACHMENT,
      this.gl.TEXTURE_2D,
      depthTexture.resource,
      0
    );

    return { textureId: depthTextureId, size: depthTexture.metadata.size };
  }

  private validateFramebuffer(): void {
    const status = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
    if (status !== this.gl.FRAMEBUFFER_COMPLETE) {
      throw new Error(`Framebuffer incomplete: ${status}`);
    }
  }

  /**
   * 获取帧缓冲
   */
  getFramebuffer(id: string): ResourceRef<WebGLFramebuffer> | null {
    const ref = this.framebuffers.get(id);
    if (ref) {
      ref.metadata.lastAccessed = performance.now();
      ref.metadata.accessCount++;
    }
    return ref || null;
  }

  /**
   * 删除帧缓冲
   */
  deleteFramebuffer(id: string): boolean {
    const ref = this.framebuffers.get(id);
    if (!ref) return false;

    ref.metadata.state = ResourceState.DISPOSING;

    // 删除依赖的纹理
    for (const depId of ref.metadata.dependencies) {
      this.textureManager.deleteTexture(depId);
    }

    this.gl.deleteFramebuffer(ref.resource);
    ref.metadata.state = ResourceState.DISPOSED;

    this.framebuffers.delete(id);
    this.configs.delete(id);

    return true;
  }

  /**
   * 调整帧缓冲大小
   */
  resizeFramebuffer(id: string, width: number, height: number): void {
    const config = this.configs.get(id);
    if (!config) {
      throw new Error(`Framebuffer '${id}' not found`);
    }

    this.deleteFramebuffer(id);
    const newConfig = { ...config, width, height };
    this.createFramebuffer(id, newConfig);
  }

  /**
   * 获取所有帧缓冲
   */
  getAllFramebuffers(): ResourceRef<WebGLFramebuffer>[] {
    return Array.from(this.framebuffers.values());
  }

  /**
   * 检查帧缓冲是否存在
   */
  hasFramebuffer(id: string): boolean {
    return this.framebuffers.has(id);
  }

  /**
   * 获取帧缓冲配置
   */
  getFramebufferConfig(id: string): FramebufferConfig | null {
    return this.configs.get(id) || null;
  }
}
