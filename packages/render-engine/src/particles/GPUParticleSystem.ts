/**
 * GPU加速粒子系统
 * 使用WebGL实例化渲染和Transform Feedback实现高性能粒子效果
 */

import { IEventBus } from '../events/EventBus';

export interface ParticleConfig {
  maxParticles: number;
  textureUrl?: string;
  blendMode: 'normal' | 'additive' | 'multiply' | 'screen';
  useTransformFeedback: boolean;
}

export interface ParticleData {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  acceleration: { x: number; y: number; z: number };
  life: number;
  maxLife: number;
  size: number;
  color: { r: number; g: number; b: number; a: number };
  rotation: number;
  angularVelocity: number;
}

export interface ParticleSystemEvents {
  'particles-spawned': { count: number };
  'particles-updated': { aliveCount: number };
  'system-empty': {};
  'buffer-overflow': { requestedCount: number; maxCount: number };
}

/**
 * GPU粒子系统 - 使用WebGL进行高性能粒子渲染
 */
export class GPUParticleSystem {
  private gl: WebGLRenderingContext | WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private particles: Float32Array;
  private particleCount = 0;
  private maxParticles: number;
  
  // WebGL资源
  private program: WebGLProgram | null = null;
  private transformFeedbackProgram: WebGLProgram | null = null;
  private vao: WebGLVertexArrayObject | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private velocityBuffer: WebGLBuffer | null = null;
  private lifeBuffer: WebGLBuffer | null = null;
  private sizeBuffer: WebGLBuffer | null = null;
  private colorBuffer: WebGLBuffer | null = null;
  
  // Transform Feedback (WebGL2)
  private transformFeedback: WebGLTransformFeedback | null = null;
  private feedbackBuffers: WebGLBuffer[] = [];
  
  // 纹理
  private texture: WebGLTexture | null = null;
  
  // 时间管理
  private lastUpdateTime = 0;
  private isRunning = false;
  
  private eventBus?: IEventBus;
  private config: ParticleConfig;

  constructor(canvas: HTMLCanvasElement, config: ParticleConfig) {
    this.canvas = canvas;
    this.config = config;
    this.maxParticles = config.maxParticles;
    
    // 获取WebGL上下文，优先WebGL2
    this.gl = (canvas.getContext('webgl2') || canvas.getContext('webgl')) as WebGLRenderingContext | WebGL2RenderingContext;
    
    if (!this.gl) {
      throw new Error('WebGL not supported');
    }

    // 初始化粒子数据
    this.particles = new Float32Array(this.maxParticles * 16); // 每个粒子16个float数据
    
    this.initialize();
  }

  private initialize(): void {
    this.createShaders();
    this.createBuffers();
    this.createTexture();
    
    // 启用混合
    this.gl.enable(this.gl.BLEND);
    this.setBlendMode(this.config.blendMode);
    
    // 启用深度测试
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.depthFunc(this.gl.LEQUAL);
  }

  private createShaders(): void {
    const isWebGL2 = this.gl instanceof WebGL2RenderingContext;
    
    // 顶点着色器
    const vertexShaderSource = isWebGL2 ? `#version 300 es
      layout(location = 0) in vec3 a_position;
      layout(location = 1) in vec3 a_velocity;
      layout(location = 2) in float a_life;
      layout(location = 3) in float a_size;
      layout(location = 4) in vec4 a_color;
      
      uniform mat4 u_mvpMatrix;
      uniform float u_deltaTime;
      
      out vec4 v_color;
      out float v_life;
      out vec2 v_texCoord;
      
      void main() {
        // 更新粒子位置
        vec3 position = a_position + a_velocity * u_deltaTime;
        
        gl_Position = u_mvpMatrix * vec4(position, 1.0);
        gl_PointSize = a_size * (a_life > 0.0 ? 1.0 : 0.0);
        
        v_color = a_color;
        v_life = a_life;
        v_texCoord = vec2(0.5, 0.5); // 点精灵纹理坐标
      }
    ` : `
      attribute vec3 a_position;
      attribute vec3 a_velocity;
      attribute float a_life;
      attribute float a_size;
      attribute vec4 a_color;
      
      uniform mat4 u_mvpMatrix;
      uniform float u_deltaTime;
      
      varying vec4 v_color;
      varying float v_life;
      varying vec2 v_texCoord;
      
      void main() {
        vec3 position = a_position + a_velocity * u_deltaTime;
        
        gl_Position = u_mvpMatrix * vec4(position, 1.0);
        gl_PointSize = a_size * (a_life > 0.0 ? 1.0 : 0.0);
        
        v_color = a_color;
        v_life = a_life;
        v_texCoord = vec2(0.5, 0.5);
      }
    `;

    // 片段着色器
    const fragmentShaderSource = isWebGL2 ? `#version 300 es
      precision highp float;
      
      in vec4 v_color;
      in float v_life;
      in vec2 v_texCoord;
      
      uniform sampler2D u_texture;
      uniform bool u_useTexture;
      
      out vec4 fragColor;
      
      void main() {
        if (v_life <= 0.0) discard;
        
        vec4 color = v_color;
        
        if (u_useTexture) {
          // 对于点精灵，使用gl_PointCoord
          vec4 texColor = texture(u_texture, gl_PointCoord);
          color = color * texColor;
        }
        
        // 根据生命值淡化
        color.a *= v_life;
        
        fragColor = color;
      }
    ` : `
      precision highp float;
      
      varying vec4 v_color;
      varying float v_life;
      varying vec2 v_texCoord;
      
      uniform sampler2D u_texture;
      uniform bool u_useTexture;
      
      void main() {
        if (v_life <= 0.0) discard;
        
        vec4 color = v_color;
        
        if (u_useTexture) {
          vec4 texColor = texture2D(u_texture, gl_PointCoord);
          color = color * texColor;
        }
        
        color.a *= v_life;
        
        gl_FragColor = color;
      }
    `;

    this.program = this.createShaderProgram(vertexShaderSource, fragmentShaderSource);

    // 如果是WebGL2并且启用了Transform Feedback，创建计算着色器
    if (isWebGL2 && this.config.useTransformFeedback) {
      this.createTransformFeedbackProgram();
    }
  }

  private createShaderProgram(vertexSource: string, fragmentSource: string): WebGLProgram {
    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentSource);
    
    const program = this.gl.createProgram();
    if (!program) {
      throw new Error('Failed to create shader program');
    }
    
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      const error = this.gl.getProgramInfoLog(program);
      this.gl.deleteProgram(program);
      throw new Error(`Shader program linking failed: ${error}`);
    }
    
    return program;
  }

  private compileShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type);
    if (!shader) {
      throw new Error('Failed to create shader');
    }
    
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      const error = this.gl.getShaderInfoLog(shader);
      this.gl.deleteShader(shader);
      throw new Error(`Shader compilation failed: ${error}`);
    }
    
    return shader;
  }

  private createTransformFeedbackProgram(): void {
    const gl2 = this.gl as WebGL2RenderingContext;
    
    // Transform Feedback顶点着色器 - 用于计算粒子物理
    const transformVertexSource = `#version 300 es
      layout(location = 0) in vec3 a_position;
      layout(location = 1) in vec3 a_velocity;
      layout(location = 2) in vec3 a_acceleration;
      layout(location = 3) in float a_life;
      layout(location = 4) in float a_maxLife;
      layout(location = 5) in float a_size;
      layout(location = 6) in vec4 a_color;
      layout(location = 7) in float a_rotation;
      layout(location = 8) in float a_angularVelocity;
      
      uniform float u_deltaTime;
      uniform vec3 u_gravity;
      uniform float u_drag;
      
      out vec3 v_position;
      out vec3 v_velocity;
      out vec3 v_acceleration;
      out float v_life;
      out float v_maxLife;
      out float v_size;
      out vec4 v_color;
      out float v_rotation;
      out float v_angularVelocity;
      
      void main() {
        // 更新生命值
        float newLife = max(0.0, a_life - u_deltaTime);
        
        if (newLife > 0.0) {
          // 更新速度（加入重力和阻力）
          vec3 totalAcceleration = a_acceleration + u_gravity;
          vec3 newVelocity = a_velocity + totalAcceleration * u_deltaTime;
          newVelocity *= pow(u_drag, u_deltaTime); // 阻力
          
          // 更新位置
          vec3 newPosition = a_position + newVelocity * u_deltaTime;
          
          // 更新旋转
          float newRotation = a_rotation + a_angularVelocity * u_deltaTime;
          
          v_position = newPosition;
          v_velocity = newVelocity;
          v_acceleration = a_acceleration;
          v_life = newLife;
          v_maxLife = a_maxLife;
          v_size = a_size;
          v_color = a_color;
          v_rotation = newRotation;
          v_angularVelocity = a_angularVelocity;
        } else {
          // 粒子死亡，保持原数据
          v_position = a_position;
          v_velocity = vec3(0.0);
          v_acceleration = vec3(0.0);
          v_life = 0.0;
          v_maxLife = a_maxLife;
          v_size = a_size;
          v_color = a_color;
          v_rotation = a_rotation;
          v_angularVelocity = 0.0;
        }
      }
    `;

    // Transform Feedback片段着色器（空的，因为我们只需要顶点数据）
    const transformFragmentSource = `#version 300 es
      precision highp float;
      out vec4 fragColor;
      void main() {
        fragColor = vec4(1.0);
      }
    `;

    const vertexShader = this.compileShader(gl2.VERTEX_SHADER, transformVertexSource);
    const fragmentShader = this.compileShader(gl2.FRAGMENT_SHADER, transformFragmentSource);
    
    this.transformFeedbackProgram = gl2.createProgram();
    if (!this.transformFeedbackProgram) {
      throw new Error('Failed to create transform feedback program');
    }
    
    gl2.attachShader(this.transformFeedbackProgram, vertexShader);
    gl2.attachShader(this.transformFeedbackProgram, fragmentShader);
    
    // 设置Transform Feedback变量
    gl2.transformFeedbackVaryings(this.transformFeedbackProgram, [
      'v_position', 'v_velocity', 'v_acceleration', 'v_life', 'v_maxLife', 
      'v_size', 'v_color', 'v_rotation', 'v_angularVelocity'
    ], gl2.INTERLEAVED_ATTRIBS);
    
    gl2.linkProgram(this.transformFeedbackProgram);
    
    if (!gl2.getProgramParameter(this.transformFeedbackProgram, gl2.LINK_STATUS)) {
      const error = gl2.getProgramInfoLog(this.transformFeedbackProgram);
      gl2.deleteProgram(this.transformFeedbackProgram);
      throw new Error(`Transform feedback program linking failed: ${error}`);
    }
  }

  private createBuffers(): void {
    const gl = this.gl;
    
    // 创建顶点数组对象
    if (gl instanceof WebGL2RenderingContext) {
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
    }
    
    // 位置缓冲
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.maxParticles * 3 * 4, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);
    
    // 速度缓冲
    this.velocityBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.velocityBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.maxParticles * 3 * 4, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);
    
    // 生命值缓冲
    this.lifeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.lifeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.maxParticles * 4, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(2);
    
    // 大小缓冲
    this.sizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.maxParticles * 4, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(3);
    
    // 颜色缓冲
    this.colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.maxParticles * 4 * 4, gl.DYNAMIC_DRAW);
    gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(4);
    
    if (gl instanceof WebGL2RenderingContext) {
      gl.bindVertexArray(null);
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private createTexture(): void {
    if (!this.config.textureUrl) return;
    
    const gl = this.gl;
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    
    // 创建1x1白色像素作为默认纹理
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, 
      new Uint8Array([255, 255, 255, 255]));
    
    // 加载实际纹理
    const image = new Image();
    image.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      
      // 设置纹理参数
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    };
    image.src = this.config.textureUrl;
  }

  /**
   * 设置混合模式
   */
  private setBlendMode(mode: 'normal' | 'additive' | 'multiply' | 'screen'): void {
    const gl = this.gl;
    
    switch (mode) {
      case 'additive':
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        break;
      case 'multiply':
        gl.blendFunc(gl.DST_COLOR, gl.ZERO);
        break;
      case 'screen':
        gl.blendFunc(gl.ONE_MINUS_DST_COLOR, gl.ONE);
        break;
      case 'normal':
      default:
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        break;
    }
  }

  /**
   * 设置事件总线
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * 生成粒子
   */
  spawnParticles(count: number, particleData: Partial<ParticleData>[]): boolean {
    if (this.particleCount + count > this.maxParticles) {
      this.eventBus?.emit('buffer-overflow', { 
        requestedCount: count, 
        maxCount: this.maxParticles 
      });
      return false;
    }

    let spawned = 0;
    for (let i = 0; i < count && this.particleCount < this.maxParticles; i++) {
      const data = particleData[i] || {};
      const particleIndex = this.particleCount * 16;
      
      // 设置粒子数据（默认值）
      const particle: ParticleData = {
        position: data.position || { x: 0, y: 0, z: 0 },
        velocity: data.velocity || { x: 0, y: 0, z: 0 },
        acceleration: data.acceleration || { x: 0, y: 0, z: 0 },
        life: data.life || 1.0,
        maxLife: data.maxLife || 1.0,
        size: data.size || 10.0,
        color: data.color || { r: 1, g: 1, b: 1, a: 1 },
        rotation: data.rotation || 0,
        angularVelocity: data.angularVelocity || 0
      };
      
      // 存储到Float32Array
      this.particles[particleIndex + 0] = particle.position.x;
      this.particles[particleIndex + 1] = particle.position.y;
      this.particles[particleIndex + 2] = particle.position.z;
      this.particles[particleIndex + 3] = particle.velocity.x;
      this.particles[particleIndex + 4] = particle.velocity.y;
      this.particles[particleIndex + 5] = particle.velocity.z;
      this.particles[particleIndex + 6] = particle.acceleration.x;
      this.particles[particleIndex + 7] = particle.acceleration.y;
      this.particles[particleIndex + 8] = particle.acceleration.z;
      this.particles[particleIndex + 9] = particle.life;
      this.particles[particleIndex + 10] = particle.maxLife;
      this.particles[particleIndex + 11] = particle.size;
      this.particles[particleIndex + 12] = particle.color.r;
      this.particles[particleIndex + 13] = particle.color.g;
      this.particles[particleIndex + 14] = particle.color.b;
      this.particles[particleIndex + 15] = particle.color.a;
      
      this.particleCount++;
      spawned++;
    }

    if (spawned > 0) {
      this.eventBus?.emit('particles-spawned', { count: spawned });
    }

    return spawned === count;
  }

  /**
   * 更新粒子系统
   */
  update(deltaTime: number): void {
    if (this.particleCount === 0) return;

    let aliveCount = 0;

    // CPU更新（WebGL1 or 非Transform Feedback模式）
    if (!(this.gl instanceof WebGL2RenderingContext) || !this.config.useTransformFeedback) {
      for (let i = 0; i < this.particleCount; i++) {
        const particleIndex = i * 16;
        const life = this.particles[particleIndex + 9];
        
        if (life > 0) {
          // 更新生命值
          const newLife = Math.max(0, life - deltaTime);
          this.particles[particleIndex + 9] = newLife;
          
          if (newLife > 0) {
            // 更新位置和速度
            const vx = this.particles[particleIndex + 3];
            const vy = this.particles[particleIndex + 4];
            const vz = this.particles[particleIndex + 5];
            
            this.particles[particleIndex + 0] += vx * deltaTime; // position.x
            this.particles[particleIndex + 1] += vy * deltaTime; // position.y
            this.particles[particleIndex + 2] += vz * deltaTime; // position.z
            
            aliveCount++;
          }
        }
      }
    } else {
      // GPU更新（WebGL2 + Transform Feedback）
      this.updateWithTransformFeedback(deltaTime);
      aliveCount = this.countAliveParticles();
    }

    this.eventBus?.emit('particles-updated', { aliveCount });

    if (aliveCount === 0) {
      this.eventBus?.emit('system-empty', {});
    }
  }

  private updateWithTransformFeedback(deltaTime: number): void {
    // TODO: 实现Transform Feedback更新
    // 这需要复杂的WebGL2 Transform Feedback设置
  }

  private countAliveParticles(): number {
    let count = 0;
    for (let i = 0; i < this.particleCount; i++) {
      const life = this.particles[i * 16 + 9];
      if (life > 0) count++;
    }
    return count;
  }

  /**
   * 渲染粒子系统
   */
  render(mvpMatrix: Float32Array): void {
    if (!this.program || this.particleCount === 0) return;

    const gl = this.gl;
    
    gl.useProgram(this.program);
    
    // 设置uniform
    const mvpLocation = gl.getUniformLocation(this.program, 'u_mvpMatrix');
    if (mvpLocation) {
      gl.uniformMatrix4fv(mvpLocation, false, mvpMatrix);
    }
    
    const useTextureLocation = gl.getUniformLocation(this.program, 'u_useTexture');
    if (useTextureLocation) {
      gl.uniform1i(useTextureLocation, this.texture ? 1 : 0);
    }
    
    if (this.texture) {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
    }
    
    // 更新缓冲区数据
    this.updateBuffers();
    
    // 绑定VAO
    if (gl instanceof WebGL2RenderingContext && this.vao) {
      gl.bindVertexArray(this.vao);
    }
    
    // 渲染点
    gl.drawArrays(gl.POINTS, 0, this.particleCount);
    
    if (gl instanceof WebGL2RenderingContext && this.vao) {
      gl.bindVertexArray(null);
    }
  }

  private updateBuffers(): void {
    const gl = this.gl;
    
    // 更新位置缓冲
    if (this.positionBuffer) {
      const positions = new Float32Array(this.particleCount * 3);
      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3 + 0] = this.particles[i * 16 + 0]; // x
        positions[i * 3 + 1] = this.particles[i * 16 + 1]; // y
        positions[i * 3 + 2] = this.particles[i * 16 + 2]; // z
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
    }
    
    // 更新生命值缓冲
    if (this.lifeBuffer) {
      const lives = new Float32Array(this.particleCount);
      for (let i = 0; i < this.particleCount; i++) {
        lives[i] = this.particles[i * 16 + 9]; // life
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.lifeBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, lives);
    }
    
    // 更新大小缓冲
    if (this.sizeBuffer) {
      const sizes = new Float32Array(this.particleCount);
      for (let i = 0; i < this.particleCount; i++) {
        sizes[i] = this.particles[i * 16 + 11]; // size
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.sizeBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, sizes);
    }
    
    // 更新颜色缓冲
    if (this.colorBuffer) {
      const colors = new Float32Array(this.particleCount * 4);
      for (let i = 0; i < this.particleCount; i++) {
        colors[i * 4 + 0] = this.particles[i * 16 + 12]; // r
        colors[i * 4 + 1] = this.particles[i * 16 + 13]; // g
        colors[i * 4 + 2] = this.particles[i * 16 + 14]; // b
        colors[i * 4 + 3] = this.particles[i * 16 + 15]; // a
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.colorBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, colors);
    }
    
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  /**
   * 启动粒子系统
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastUpdateTime = Date.now();
  }

  /**
   * 停止粒子系统
   */
  stop(): void {
    this.isRunning = false;
  }

  /**
   * 清除所有粒子
   */
  clear(): void {
    this.particleCount = 0;
    this.particles.fill(0);
  }

  /**
   * 获取活跃粒子数量
   */
  getAliveParticleCount(): number {
    return this.countAliveParticles();
  }

  /**
   * 获取最大粒子数量
   */
  getMaxParticleCount(): number {
    return this.maxParticles;
  }

  /**
   * 销毁粒子系统
   */
  dispose(): void {
    this.stop();
    this.clear();
    
    const gl = this.gl;
    
    // 清理WebGL资源
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
    
    if (this.transformFeedbackProgram) {
      gl.deleteProgram(this.transformFeedbackProgram);
      this.transformFeedbackProgram = null;
    }
    
    // 清理缓冲区
    const buffers = [
      this.positionBuffer,
      this.velocityBuffer,
      this.lifeBuffer,
      this.sizeBuffer,
      this.colorBuffer,
      ...this.feedbackBuffers
    ].filter(Boolean) as WebGLBuffer[];
    
    buffers.forEach(buffer => gl.deleteBuffer(buffer));
    
    if (this.texture) {
      gl.deleteTexture(this.texture);
      this.texture = null;
    }
    
    if (this.vao && gl instanceof WebGL2RenderingContext) {
      gl.deleteVertexArray(this.vao);
      this.vao = null;
    }
    
    if (this.transformFeedback && gl instanceof WebGL2RenderingContext) {
      gl.deleteTransformFeedback(this.transformFeedback);
      this.transformFeedback = null;
    }
  }
}