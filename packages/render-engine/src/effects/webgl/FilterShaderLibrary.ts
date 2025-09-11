/**
 * 滤镜着色器库
 * 提供各种滤镜效果的WebGL着色器代码
 */

export class FilterShaderLibrary {
  /**
   * 获取亮度调整着色器
   */
  static getBrightnessShader(): { vertex: string; fragment: string } {
    return {
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
        varying vec2 v_texCoord;
        
        void main() {
          vec4 color = texture2D(u_texture, v_texCoord);
          color.rgb += u_brightness;
          gl_FragColor = color;
        }
      `
    };
  }

  /**
   * 获取对比度调整着色器
   */
  static getContrastShader(): { vertex: string; fragment: string } {
    return {
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
        uniform float u_contrast;
        varying vec2 v_texCoord;
        
        void main() {
          vec4 color = texture2D(u_texture, v_texCoord);
          color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
          gl_FragColor = color;
        }
      `
    };
  }

  /**
   * 获取饱和度调整着色器
   */
  static getSaturationShader(): { vertex: string; fragment: string } {
    return {
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
        uniform float u_saturation;
        varying vec2 v_texCoord;
        
        void main() {
          vec4 color = texture2D(u_texture, v_texCoord);
          float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          color.rgb = mix(vec3(gray), color.rgb, u_saturation);
          gl_FragColor = color;
        }
      `
    };
  }

  /**
   * 获取高斯模糊着色器
   */
  static getGaussianBlurShader(): { vertex: string; fragment: string } {
    return {
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
        uniform vec2 u_resolution;
        uniform float u_radius;
        varying vec2 v_texCoord;
        
        void main() {
          vec4 color = vec4(0.0);
          float total = 0.0;
          
          for (float x = -u_radius; x <= u_radius; x += 1.0) {
            for (float y = -u_radius; y <= u_radius; y += 1.0) {
              vec2 offset = vec2(x, y) / u_resolution;
              float weight = exp(-(x*x + y*y) / (2.0 * u_radius * u_radius));
              color += texture2D(u_texture, v_texCoord + offset) * weight;
              total += weight;
            }
          }
          
          gl_FragColor = color / total;
        }
      `
    };
  }

  /**
   * 获取灰度着色器
   */
  static getGrayscaleShader(): { vertex: string; fragment: string } {
    return {
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
        uniform float u_amount;
        varying vec2 v_texCoord;
        
        void main() {
          vec4 color = texture2D(u_texture, v_texCoord);
          float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
          color.rgb = mix(color.rgb, vec3(gray), u_amount);
          gl_FragColor = color;
        }
      `
    };
  }

  /**
   * 获取反相着色器
   */
  static getInvertShader(): { vertex: string; fragment: string } {
    return {
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
        uniform float u_amount;
        varying vec2 v_texCoord;
        
        void main() {
          vec4 color = texture2D(u_texture, v_texCoord);
          color.rgb = mix(color.rgb, 1.0 - color.rgb, u_amount);
          gl_FragColor = color;
        }
      `
    };
  }

  /**
   * 获取深褐色着色器
   */
  static getSepiaShader(): { vertex: string; fragment: string } {
    return {
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
        uniform float u_amount;
        varying vec2 v_texCoord;
        
        void main() {
          vec4 color = texture2D(u_texture, v_texCoord);
          
          float r = color.r;
          float g = color.g;
          float b = color.b;
          
          float newR = (r * 0.393) + (g * 0.769) + (b * 0.189);
          float newG = (r * 0.349) + (g * 0.686) + (b * 0.168);
          float newB = (r * 0.272) + (g * 0.534) + (b * 0.131);
          
          color.rgb = mix(color.rgb, vec3(newR, newG, newB), u_amount);
          gl_FragColor = color;
        }
      `
    };
  }

  /**
   * 获取色相旋转着色器
   */
  static getHueRotateShader(): { vertex: string; fragment: string } {
    return {
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
        uniform float u_angle;
        varying vec2 v_texCoord;
        
        void main() {
          vec4 color = texture2D(u_texture, v_texCoord);
          
          float angle = u_angle * 3.14159265 / 180.0;
          float cosA = cos(angle);
          float sinA = sin(angle);
          
          mat3 hueMatrix = mat3(
            vec3(cosA + (1.0 - cosA) / 3.0, 1.0/3.0 * (1.0 - cosA) - sqrt(1.0/3.0) * sinA, 1.0/3.0 * (1.0 - cosA) + sqrt(1.0/3.0) * sinA),
            vec3(1.0/3.0 * (1.0 - cosA) + sqrt(1.0/3.0) * sinA, cosA + 1.0/3.0 * (1.0 - cosA), 1.0/3.0 * (1.0 - cosA) - sqrt(1.0/3.0) * sinA),
            vec3(1.0/3.0 * (1.0 - cosA) - sqrt(1.0/3.0) * sinA, 1.0/3.0 * (1.0 - cosA) + sqrt(1.0/3.0) * sinA, cosA + 1.0/3.0 * (1.0 - cosA))
          );
          
          color.rgb = hueMatrix * color.rgb;
          gl_FragColor = color;
        }
      `
    };
  }

  /**
   * 获取所有着色器
   */
  static getAllShaders(): Record<string, { vertex: string; fragment: string }> {
    return {
      brightness: this.getBrightnessShader(),
      contrast: this.getContrastShader(),
      saturation: this.getSaturationShader(),
      gaussianBlur: this.getGaussianBlurShader(),
      grayscale: this.getGrayscaleShader(),
      invert: this.getInvertShader(),
      sepia: this.getSepiaShader(),
      hueRotate: this.getHueRotateShader()
    };
  }

  /**
   * 获取特定着色器
   */
  static getShader(name: string): { vertex: string; fragment: string } | undefined {
    const shaders = this.getAllShaders();
    return shaders[name];
  }
}
