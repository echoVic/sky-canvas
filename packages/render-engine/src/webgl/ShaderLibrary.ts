/**
 * 内置着色器库
 * 提供常用的2D图形渲染着色器
 */
import { IShaderSource } from './ShaderManager';

/**
 * 基础2D形状着色器
 */
export const BASIC_SHAPE_SHADER: IShaderSource = {
  name: 'basic_shape',
  version: '1.0.0',
  vertex: `
    attribute vec2 a_position;
    attribute vec4 a_color;
    
    uniform mat3 u_transform;
    uniform mat3 u_projection;
    
    varying vec4 v_color;
    
    void main() {
      vec3 position = u_projection * u_transform * vec3(a_position, 1.0);
      gl_Position = vec4(position.xy, 0.0, 1.0);
      v_color = a_color;
    }
  `,
  fragment: `
    precision mediump float;
    
    varying vec4 v_color;
    
    void main() {
      gl_FragColor = v_color;
    }
  `
};

/**
 * 纹理着色器
 */
export const TEXTURE_SHADER: IShaderSource = {
  name: 'texture',
  version: '1.0.0',
  vertex: `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    attribute vec4 a_color;
    
    uniform mat3 u_transform;
    uniform mat3 u_projection;
    
    varying vec2 v_texCoord;
    varying vec4 v_color;
    
    void main() {
      vec3 position = u_projection * u_transform * vec3(a_position, 1.0);
      gl_Position = vec4(position.xy, 0.0, 1.0);
      v_texCoord = a_texCoord;
      v_color = a_color;
    }
  `,
  fragment: `
    precision mediump float;
    
    uniform sampler2D u_texture;
    
    varying vec2 v_texCoord;
    varying vec4 v_color;
    
    void main() {
      vec4 texColor = texture2D(u_texture, v_texCoord);
      gl_FragColor = texColor * v_color;
    }
  `
};

/**
 * 单色着色器 - 用于单一颜色绘制
 */
export const SOLID_COLOR_SHADER: IShaderSource = {
  name: 'solid_color',
  version: '1.0.0',
  vertex: `
    attribute vec2 a_position;
    
    uniform mat3 u_transform;
    uniform mat3 u_projection;
    
    void main() {
      vec3 position = u_projection * u_transform * vec3(a_position, 1.0);
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,
  fragment: `
    precision mediump float;
    
    uniform vec4 u_color;
    
    void main() {
      gl_FragColor = u_color;
    }
  `
};

/**
 * SDF（Signed Distance Field）圆形着色器
 */
export const SDF_CIRCLE_SHADER: IShaderSource = {
  name: 'sdf_circle',
  version: '1.0.0',
  vertex: `
    attribute vec2 a_position;
    attribute vec2 a_center;
    attribute float a_radius;
    attribute vec4 a_color;
    attribute vec4 a_strokeColor;
    attribute float a_strokeWidth;
    
    uniform mat4 u_projection;
    uniform mat4 u_modelView;
    
    varying vec2 v_position;
    varying vec2 v_center;
    varying float v_radius;
    varying vec4 v_color;
    varying vec4 v_strokeColor;
    varying float v_strokeWidth;
    
    void main() {
      gl_Position = u_projection * u_modelView * vec4(a_position, 0.0, 1.0);
      v_position = a_position;
      v_center = a_center;
      v_radius = a_radius;
      v_color = a_color;
      v_strokeColor = a_strokeColor;
      v_strokeWidth = a_strokeWidth;
    }
  `,
  fragment: `
    precision mediump float;
    
    varying vec2 v_position;
    varying vec2 v_center;
    varying float v_radius;
    varying vec4 v_color;
    varying vec4 v_strokeColor;
    varying float v_strokeWidth;
    
    void main() {
      float dist = distance(v_position, v_center);
      float alpha = 1.0;
      
      // 抗锯齿边缘
      float edge = v_radius;
      float feather = 1.0;
      alpha = smoothstep(edge + feather, edge - feather, dist);
      
      vec4 finalColor = v_color;
      
      // 描边
      if (v_strokeWidth > 0.0) {
        float strokeEdge = v_radius - v_strokeWidth;
        float strokeAlpha = smoothstep(strokeEdge - feather, strokeEdge + feather, dist);
        finalColor = mix(v_strokeColor, v_color, strokeAlpha);
      }
      
      gl_FragColor = finalColor * alpha;
    }
  `
};

/**
 * SDF矩形着色器
 */
export const SDF_RECT_SHADER: IShaderSource = {
  name: 'sdf_rect',
  version: '1.0.0',
  vertex: `
    attribute vec2 a_position;
    attribute vec2 a_center;
    attribute vec2 a_size;
    attribute float a_cornerRadius;
    attribute vec4 a_color;
    attribute vec4 a_strokeColor;
    attribute float a_strokeWidth;
    
    uniform mat4 u_projection;
    uniform mat4 u_modelView;
    
    varying vec2 v_position;
    varying vec2 v_center;
    varying vec2 v_size;
    varying float v_cornerRadius;
    varying vec4 v_color;
    varying vec4 v_strokeColor;
    varying float v_strokeWidth;
    
    void main() {
      gl_Position = u_projection * u_modelView * vec4(a_position, 0.0, 1.0);
      v_position = a_position;
      v_center = a_center;
      v_size = a_size;
      v_cornerRadius = a_cornerRadius;
      v_color = a_color;
      v_strokeColor = a_strokeColor;
      v_strokeWidth = a_strokeWidth;
    }
  `,
  fragment: `
    precision mediump float;
    
    varying vec2 v_position;
    varying vec2 v_center;
    varying vec2 v_size;
    varying float v_cornerRadius;
    varying vec4 v_color;
    varying vec4 v_strokeColor;
    varying float v_strokeWidth;
    
    float roundedBoxSDF(vec2 p, vec2 b, float r) {
      vec2 q = abs(p) - b + r;
      return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    }
    
    void main() {
      vec2 relPos = v_position - v_center;
      vec2 halfSize = v_size * 0.5;
      
      float dist = roundedBoxSDF(relPos, halfSize, v_cornerRadius);
      float feather = 1.0;
      float alpha = smoothstep(feather, -feather, dist);
      
      vec4 finalColor = v_color;
      
      // 描边
      if (v_strokeWidth > 0.0) {
        float strokeDist = abs(dist) - v_strokeWidth;
        float strokeAlpha = smoothstep(feather, -feather, strokeDist);
        finalColor = mix(v_color, v_strokeColor, strokeAlpha);
      }
      
      gl_FragColor = finalColor * alpha;
    }
  `
};

/**
 * 批处理着色器（支持多纹理）
 */
export const BATCH_SHADER: IShaderSource = {
  name: 'batch',
  version: '1.0.0',
  vertex: `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    attribute vec4 a_color;
    attribute float a_textureId;
    
    uniform mat4 u_projection;
    
    varying vec2 v_texCoord;
    varying vec4 v_color;
    varying float v_textureId;
    
    void main() {
      gl_Position = u_projection * vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
      v_color = a_color;
      v_textureId = a_textureId;
    }
  `,
  fragment: `
    precision mediump float;
    
    uniform sampler2D u_textures[16];
    
    varying vec2 v_texCoord;
    varying vec4 v_color;
    varying float v_textureId;
    
    vec4 getTextureColor() {
      int id = int(v_textureId + 0.5);
      
      if (id == 0) return texture2D(u_textures[0], v_texCoord);
      else if (id == 1) return texture2D(u_textures[1], v_texCoord);
      else if (id == 2) return texture2D(u_textures[2], v_texCoord);
      else if (id == 3) return texture2D(u_textures[3], v_texCoord);
      else if (id == 4) return texture2D(u_textures[4], v_texCoord);
      else if (id == 5) return texture2D(u_textures[5], v_texCoord);
      else if (id == 6) return texture2D(u_textures[6], v_texCoord);
      else if (id == 7) return texture2D(u_textures[7], v_texCoord);
      else if (id == 8) return texture2D(u_textures[8], v_texCoord);
      else if (id == 9) return texture2D(u_textures[9], v_texCoord);
      else if (id == 10) return texture2D(u_textures[10], v_texCoord);
      else if (id == 11) return texture2D(u_textures[11], v_texCoord);
      else if (id == 12) return texture2D(u_textures[12], v_texCoord);
      else if (id == 13) return texture2D(u_textures[13], v_texCoord);
      else if (id == 14) return texture2D(u_textures[14], v_texCoord);
      else if (id == 15) return texture2D(u_textures[15], v_texCoord);
      
      return vec4(1.0, 0.0, 1.0, 1.0); // 错误颜色（洋红色）
    }
    
    void main() {
      vec4 texColor = getTextureColor();
      gl_FragColor = texColor * v_color;
    }
  `
};

/**
 * 后处理着色器 - 简单的色彩调整
 */
export const POST_PROCESS_SHADER: IShaderSource = {
  name: 'post_process',
  version: '1.0.0',
  vertex: `
    attribute vec2 a_position;
    attribute vec2 a_texCoord;
    
    varying vec2 v_texCoord;
    
    void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
      v_texCoord = a_texCoord;
    }
  `,
  fragment: `
    precision mediump float;
    
    uniform sampler2D u_texture;
    uniform float u_brightness;
    uniform float u_contrast;
    uniform float u_saturation;
    
    varying vec2 v_texCoord;
    
    vec3 rgb2hsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }
    
    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
    void main() {
      vec4 color = texture2D(u_texture, v_texCoord);
      
      // 亮度调整
      color.rgb += u_brightness;
      
      // 对比度调整
      color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
      
      // 饱和度调整
      vec3 hsv = rgb2hsv(color.rgb);
      hsv.y *= u_saturation;
      color.rgb = hsv2rgb(hsv);
      
      gl_FragColor = color;
    }
  `
};

/**
 * 着色器库
 */
export const SHADER_LIBRARY = {
  BASIC_SHAPE: BASIC_SHAPE_SHADER,
  TEXTURE: TEXTURE_SHADER,
  SOLID_COLOR: SOLID_COLOR_SHADER,
  SDF_CIRCLE: SDF_CIRCLE_SHADER,
  SDF_RECT: SDF_RECT_SHADER,
  BATCH: BATCH_SHADER,
  POST_PROCESS: POST_PROCESS_SHADER
};

/**
 * 获取着色器源码
 * @param name 着色器名称
 * @returns 着色器源码或null
 */
export function getShaderSource(name: keyof typeof SHADER_LIBRARY): IShaderSource | null {
  return SHADER_LIBRARY[name] || null;
}

/**
 * 获取所有着色器名称
 * @returns 着色器名称列表
 */
export function getAllShaderNames(): string[] {
  return Object.keys(SHADER_LIBRARY);
}