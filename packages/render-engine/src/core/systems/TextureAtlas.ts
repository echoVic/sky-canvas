/**
 * 动态纹理图集
 * 用于将多个小纹理合并到一个大纹理中，减少纹理切换
 */

import { AtlasNode, AtlasRegion } from './BatchRenderSystemTypes';

/**
 * 动态纹理图集类
 */
export class TextureAtlas {
  private gl: WebGLRenderingContext;
  private texture: WebGLTexture;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private root: AtlasNode;
  private textureMap = new Map<WebGLTexture, AtlasRegion>();

  constructor(gl: WebGLRenderingContext, size: number = 2048) {
    this.gl = gl;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d')!;

    this.texture = gl.createTexture()!;
    this.root = { x: 0, y: 0, width: size, height: size, used: false };

    this.initTexture();
  }

  private initTexture(): void {
    const { gl, texture, canvas } = this;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  addTexture(
    sourceTexture: WebGLTexture,
    width: number,
    height: number
  ): AtlasRegion | null {
    if (this.textureMap.has(sourceTexture)) {
      return this.textureMap.get(sourceTexture)!;
    }

    const node = this.findNode(this.root, width, height);
    if (!node) return null;

    const splitNode = this.splitNode(node, width, height);
    const region: AtlasRegion = { x: splitNode.x, y: splitNode.y, width, height };

    this.drawTextureToAtlas(sourceTexture, region);
    this.textureMap.set(sourceTexture, region);

    return region;
  }

  private findNode(node: AtlasNode, width: number, height: number): AtlasNode | null {
    if (node.used) {
      if (node.right) {
        const rightResult = this.findNode(node.right, width, height);
        if (rightResult) return rightResult;
      }
      if (node.down) {
        return this.findNode(node.down, width, height);
      }
      return null;
    }

    if (width <= node.width && height <= node.height) {
      return node;
    }

    return null;
  }

  private splitNode(node: AtlasNode, width: number, height: number): AtlasNode {
    node.used = true;
    node.down = {
      x: node.x,
      y: node.y + height,
      width: node.width,
      height: node.height - height,
      used: false
    };
    node.right = {
      x: node.x + width,
      y: node.y,
      width: node.width - width,
      height,
      used: false
    };
    return node;
  }

  private drawTextureToAtlas(sourceTexture: WebGLTexture, region: AtlasRegion): void {
    const { gl } = this;
    const framebuffer = gl.createFramebuffer();
    const oldFramebuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);

    try {
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_2D,
        sourceTexture,
        0
      );

      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
        const pixels = new Uint8Array(region.width * region.height * 4);
        gl.readPixels(0, 0, region.width, region.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = region.width;
        tempCanvas.height = region.height;
        const tempCtx = tempCanvas.getContext('2d')!;

        const imageData = tempCtx.createImageData(region.width, region.height);
        imageData.data.set(pixels);
        tempCtx.putImageData(imageData, 0, 0);

        this.ctx.drawImage(tempCanvas, region.x, region.y);
      }
    } finally {
      gl.bindFramebuffer(gl.FRAMEBUFFER, oldFramebuffer);
      gl.deleteFramebuffer(framebuffer);
    }
  }

  getTexture(): WebGLTexture {
    return this.texture;
  }

  getUVMapping(sourceTexture: WebGLTexture): AtlasRegion | null {
    return this.textureMap.get(sourceTexture) || null;
  }

  updateTexture(): void {
    const { gl, texture, canvas } = this;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }

  dispose(): void {
    this.gl.deleteTexture(this.texture);
    this.textureMap.clear();
  }
}
