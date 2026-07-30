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
`

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
`

/**
 * 实例化矩形顶点着色器
 * 一次 drawIndexed 渲染海量矩形:共享单位 quad,per-instance 传 offset/size/color。
 * 顶点世界坐标 = i_offset + position * i_size,再过 model/projection。
 */
export const INSTANCED_RECT_VERTEX_SHADER = /* wgsl */ `
struct Uniforms {
  projectionMatrix: mat3x3<f32>,
  modelMatrix: mat3x3<f32>,
}

struct VertexInput {
  @location(0) position: vec2<f32>,
  @location(1) i_offset: vec2<f32>,
  @location(2) i_size: vec2<f32>,
  @location(3) i_color: vec4<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let worldPos = input.i_offset + input.position * input.i_size;
  let modelPos = uniforms.modelMatrix * vec3<f32>(worldPos, 1.0);
  let projPos = uniforms.projectionMatrix * modelPos;

  output.position = vec4<f32>(projPos.xy, 0.0, 1.0);
  output.color = input.i_color;

  return output;
}
`

/**
 * 实例化圆形顶点着色器
 * per-instance 传 center/radius/color;单位 quad 顶点为 (-1,-1)~(1,1),
 * 缩放到半径后覆盖圆的包围盒,localPos 传给片段做 SDF 抗锯齿。
 */
export const INSTANCED_CIRCLE_VERTEX_SHADER = /* wgsl */ `
struct Uniforms {
  projectionMatrix: mat3x3<f32>,
  modelMatrix: mat3x3<f32>,
}

struct VertexInput {
  @location(0) position: vec2<f32>,   // 单位 quad (-1,-1)~(1,1)
  @location(1) i_center: vec2<f32>,
  @location(2) i_radius: f32,
  @location(3) i_color: vec4<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) localPos: vec2<f32>,   // -1~1,片段里 length() 即归一化距离
  @location(1) color: vec4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let worldPos = input.i_center + input.position * input.i_radius;
  let modelPos = uniforms.modelMatrix * vec3<f32>(worldPos, 1.0);
  let projPos = uniforms.projectionMatrix * modelPos;

  output.position = vec4<f32>(projPos.xy, 0.0, 1.0);
  output.localPos = input.position;
  output.color = input.i_color;

  return output;
}
`

/**
 * 实例化圆形片段着色器:用归一化距离做 SDF 抗锯齿填充。
 */
export const INSTANCED_CIRCLE_FRAGMENT_SHADER = /* wgsl */ `
struct FragmentInput {
  @location(0) localPos: vec2<f32>,
  @location(1) color: vec4<f32>,
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  let dist = length(input.localPos);      // 0(圆心)~ 1(半径处)
  let aa = fwidth(dist);
  let alpha = 1.0 - smoothstep(1.0 - aa, 1.0, dist);
  if (alpha < 0.001) {
    discard;
  }
  return vec4<f32>(input.color.rgb, input.color.a * alpha);
}
`

/**
 * 实例化线段顶点着色器
 * per-instance 传 p1/p2/width/color;单位 quad (0,-0.5)~(1,0.5) 沿线段方向拉伸+旋转
 * 成一个宽度为 width 的矩形条带。
 */
export const INSTANCED_LINE_VERTEX_SHADER = /* wgsl */ `
struct Uniforms {
  projectionMatrix: mat3x3<f32>,
  modelMatrix: mat3x3<f32>,
}

struct VertexInput {
  @location(0) position: vec2<f32>,   // 单位 quad x:0~1(沿线), y:-0.5~0.5(垂直)
  @location(1) i_p1: vec2<f32>,
  @location(2) i_p2: vec2<f32>,
  @location(3) i_width: f32,
  @location(4) i_color: vec4<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>,
}

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;

  let dir = input.i_p2 - input.i_p1;
  let len = length(dir);
  // 退化线段(长度为 0)避免 NaN
  let axis = select(vec2<f32>(1.0, 0.0), dir / len, len > 0.0001);
  let normal = vec2<f32>(-axis.y, axis.x);

  // position.x 沿线段方向 [0,1],position.y 垂直方向 [-0.5,0.5]
  let worldPos = input.i_p1 + axis * (input.position.x * len) + normal * (input.position.y * input.i_width);
  let modelPos = uniforms.modelMatrix * vec3<f32>(worldPos, 1.0);
  let projPos = uniforms.projectionMatrix * modelPos;

  output.position = vec4<f32>(projPos.xy, 0.0, 1.0);
  output.color = input.i_color;

  return output;
}
`

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
`

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
`

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
`

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
`

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
`

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
`

/**
 * 着色器类型枚举
 */
export enum ShaderType {
  BASIC_2D = 'basic2d',
  INSTANCED_RECT = 'instancedRect',
  INSTANCED_CIRCLE = 'instancedCircle',
  INSTANCED_LINE = 'instancedLine',
  TEXTURED = 'textured',
  CIRCLE = 'circle',
  LINE = 'line',
}

/**
 * 着色器源码映射
 */
export const SHADER_SOURCES: Record<ShaderType, { vertex: string; fragment: string }> = {
  [ShaderType.BASIC_2D]: {
    vertex: BASIC_2D_VERTEX_SHADER,
    fragment: BASIC_FRAGMENT_SHADER,
  },
  [ShaderType.INSTANCED_RECT]: {
    vertex: INSTANCED_RECT_VERTEX_SHADER,
    fragment: BASIC_FRAGMENT_SHADER,
  },
  [ShaderType.INSTANCED_CIRCLE]: {
    vertex: INSTANCED_CIRCLE_VERTEX_SHADER,
    fragment: INSTANCED_CIRCLE_FRAGMENT_SHADER,
  },
  [ShaderType.INSTANCED_LINE]: {
    vertex: INSTANCED_LINE_VERTEX_SHADER,
    fragment: BASIC_FRAGMENT_SHADER,
  },
  [ShaderType.TEXTURED]: {
    vertex: TEXTURED_VERTEX_SHADER,
    fragment: TEXTURED_FRAGMENT_SHADER,
  },
  [ShaderType.CIRCLE]: {
    vertex: CIRCLE_VERTEX_SHADER,
    fragment: CIRCLE_FRAGMENT_SHADER,
  },
  [ShaderType.LINE]: {
    vertex: LINE_VERTEX_SHADER,
    fragment: LINE_FRAGMENT_SHADER,
  },
}
