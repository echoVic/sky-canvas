/**
 * WebGPU WGSL 着色器定义
 */

/**
 * 基础 2D 顶点着色器
 * 支持变换矩阵和顶点颜色
 */
export const BASIC_2D_VERTEX_SHADER = /* wgsl */ `
struct Uniforms {
  projectionMatrix: mat3x3<f32>,
  modelMatrix: mat3x3<f32>,
}

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) color: vec4<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  // 应用模型变换
  let modelPos = uniforms.modelMatrix * vec3<f32>(input.position, 1.0);

  // 应用投影变换
  let projPos = uniforms.projectionMatrix * modelPos;

  output.position = vec4<f32>(projPos.xy, 0.0, 1.0);
  output.color = input.color;

  return output;
}
`;

/**
 * 基础片段着色器
 * 简单的颜色输出
 */
export const BASIC_FRAGMENT_SHADER = /* wgsl */ `
struct FragmentInput {
  @location(0) color: vec4<f32>,
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  return input.color;
}
`;

/**
 * 带纹理的顶点着色器
 */
export const TEXTURED_VERTEX_SHADER = /* wgsl */ `
struct Uniforms {
  projectionMatrix: mat3x3<f32>,
  modelMatrix: mat3x3<f32>,
}

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) texCoord: vec2<f32>,
  @location(2) color: vec4<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) texCoord: vec2<f32>,
  @location(1) color: vec4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let modelPos = uniforms.modelMatrix * vec3<f32>(input.position, 1.0);
  let projPos = uniforms.projectionMatrix * modelPos;

  output.position = vec4<f32>(projPos.xy, 0.0, 1.0);
  output.texCoord = input.texCoord;
  output.color = input.color;

  return output;
}
`;

/**
 * 带纹理的片段着色器
 */
export const TEXTURED_FRAGMENT_SHADER = /* wgsl */ `
@group(0) @binding(1) var texSampler: sampler;
@group(0) @binding(2) var tex: texture_2d<f32>;

struct FragmentInput {
  @location(0) texCoord: vec2<f32>,
  @location(1) color: vec4<f32>,
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  let texColor = textureSample(tex, texSampler, input.texCoord);
  return texColor * input.color;
}
`;

/**
 * 圆形着色器（使用 SDF）
 */
export const CIRCLE_VERTEX_SHADER = /* wgsl */ `
struct Uniforms {
  projectionMatrix: mat3x3<f32>,
  modelMatrix: mat3x3<f32>,
}

struct CircleParams {
  center: vec2<f32>,
  radius: f32,
  strokeWidth: f32,
  fillColor: vec4<f32>,
  strokeColor: vec4<f32>,
}

struct VertexInput {
  @location(0) position: vec2<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) localPos: vec2<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<uniform> circleParams: CircleParams;

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  // 计算世界坐标
  let worldPos = circleParams.center + input.position * (circleParams.radius + circleParams.strokeWidth);
  let modelPos = uniforms.modelMatrix * vec3<f32>(worldPos, 1.0);
  let projPos = uniforms.projectionMatrix * modelPos;

  output.position = vec4<f32>(projPos.xy, 0.0, 1.0);
  output.localPos = input.position * (circleParams.radius + circleParams.strokeWidth);

  return output;
}
`;

export const CIRCLE_FRAGMENT_SHADER = /* wgsl */ `
struct CircleParams {
  center: vec2<f32>,
  radius: f32,
  strokeWidth: f32,
  fillColor: vec4<f32>,
  strokeColor: vec4<f32>,
}

@group(0) @binding(1) var<uniform> circleParams: CircleParams;

struct FragmentInput {
  @location(0) localPos: vec2<f32>,
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  let dist = length(input.localPos);
  let radius = circleParams.radius;
  let strokeWidth = circleParams.strokeWidth;

  // 抗锯齿
  let aa = fwidth(dist);

  // 填充
  let fillAlpha = 1.0 - smoothstep(radius - aa, radius, dist);

  // 描边
  let strokeOuter = radius + strokeWidth * 0.5;
  let strokeInner = radius - strokeWidth * 0.5;
  let strokeAlpha = smoothstep(strokeInner - aa, strokeInner, dist) *
                    (1.0 - smoothstep(strokeOuter, strokeOuter + aa, dist));

  // 混合颜色
  var color = circleParams.fillColor * fillAlpha;
  color = mix(color, circleParams.strokeColor, strokeAlpha);

  if (color.a < 0.001) {
    discard;
  }

  return color;
}
`;

/**
 * 线段着色器
 */
export const LINE_VERTEX_SHADER = /* wgsl */ `
struct Uniforms {
  projectionMatrix: mat3x3<f32>,
  modelMatrix: mat3x3<f32>,
}

struct LineParams {
  width: f32,
  color: vec4<f32>,
}

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) normal: vec2<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) edgeDist: f32,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<uniform> lineParams: LineParams;

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  // 扩展顶点以创建线段宽度
  let expandedPos = input.position + input.normal * lineParams.width * 0.5;

  let modelPos = uniforms.modelMatrix * vec3<f32>(expandedPos, 1.0);
  let projPos = uniforms.projectionMatrix * modelPos;

  output.position = vec4<f32>(projPos.xy, 0.0, 1.0);
  output.edgeDist = length(input.normal) * lineParams.width * 0.5;

  return output;
}
`;

export const LINE_FRAGMENT_SHADER = /* wgsl */ `
struct LineParams {
  width: f32,
  color: vec4<f32>,
}

@group(0) @binding(1) var<uniform> lineParams: LineParams;

struct FragmentInput {
  @location(0) edgeDist: f32,
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  // 抗锯齿边缘
  let aa = fwidth(input.edgeDist);
  let alpha = 1.0 - smoothstep(lineParams.width * 0.5 - aa, lineParams.width * 0.5, abs(input.edgeDist));

  return vec4<f32>(lineParams.color.rgb, lineParams.color.a * alpha);
}
`;

/**
 * 着色器类型枚举
 */
export enum ShaderType {
  BASIC_2D = 'basic2d',
  TEXTURED = 'textured',
  CIRCLE = 'circle',
  LINE = 'line'
}

/**
 * 着色器源码映射
 */
export const SHADER_SOURCES: Record<ShaderType, { vertex: string; fragment: string }> = {
  [ShaderType.BASIC_2D]: {
    vertex: BASIC_2D_VERTEX_SHADER,
    fragment: BASIC_FRAGMENT_SHADER
  },
  [ShaderType.TEXTURED]: {
    vertex: TEXTURED_VERTEX_SHADER,
    fragment: TEXTURED_FRAGMENT_SHADER
  },
  [ShaderType.CIRCLE]: {
    vertex: CIRCLE_VERTEX_SHADER,
    fragment: CIRCLE_FRAGMENT_SHADER
  },
  [ShaderType.LINE]: {
    vertex: LINE_VERTEX_SHADER,
    fragment: LINE_FRAGMENT_SHADER
  }
};
