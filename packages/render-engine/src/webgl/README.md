# WebGL 模块

WebGL 专用模块，提供 WebGL 渲染的底层支持和优化功能。

## 主要组件

### BufferManager
缓冲区管理器，管理 WebGL 顶点和索引缓冲区。

**主要功能：**
- 顶点缓冲区管理
- 索引缓冲区管理
- 缓冲区优化
- 内存使用监控

### ShaderManager
WebGL 着色器管理器，专门处理 WebGL 着色器。

**功能包括：**
- 着色器编译和链接
- 程序验证
- 错误处理
- 性能分析

### WebGLResourceManager
WebGL 资源管理器，管理 WebGL 特有的资源。

**管理资源：**
- 纹理对象
- 帧缓冲区
- 渲染缓冲区
- VAO 对象

## WebGL 特性

### 核心功能
- **上下文管理**：WebGL 上下文创建和配置
- **状态管理**：WebGL 渲染状态控制
- **扩展支持**：WebGL 扩展检测和使用
- **错误处理**：WebGL 错误检测和报告

### 高级功能
- **实例化渲染**：大量对象高效渲染
- **变换反馈**：GPU 计算结果回读
- **多重渲染目标**：多目标同时渲染
- **计算着色器**：WebGL 2.0 计算功能

## 使用示例

```typescript
import {
  BufferManager,
  ShaderManager,
  WebGLResourceManager
} from './webgl';

// 创建 WebGL 资源管理器
const webglResources = new WebGLResourceManager(gl);

// 缓冲区管理
const bufferManager = new BufferManager(gl);

// 创建顶点缓冲区
const vertices = new Float32Array([
  -1, -1, 0,
   1, -1, 0,
   0,  1, 0
]);

const vertexBuffer = bufferManager.createVertexBuffer(vertices, {
  usage: 'static',
  attributes: [
    { name: 'position', size: 3, type: 'float', normalized: false }
  ]
});

// 着色器管理
const shaderManager = new ShaderManager(gl);

const program = await shaderManager.createProgram({
  vertex: `
    attribute vec3 position;
    void main() {
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragment: `
    precision mediump float;
    void main() {
      gl_Color = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `
});

// 渲染
function render() {
  gl.useProgram(program.program);
  vertexBuffer.bind();
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
```

## WebGL 优化

### 渲染优化
- **批处理**：减少绘制调用
- **状态排序**：优化状态切换
- **几何实例化**：重复几何优化
- **视锥体剔除**：不可见对象剔除

### 内存优化
- **缓冲区复用**：缓冲区对象池
- **纹理压缩**：减少显存占用
- **资源释放**：及时释放无用资源
- **垃圾回收**：减少 GC 压力

### GPU 优化
- **着色器优化**：高效的着色器代码
- **纹理优化**：合理的纹理设置
- **精度优化**：合适的数值精度
- **并行计算**：利用 GPU 并行能力

## WebGL 扩展

### 常用扩展
- **OES_vertex_array_object**：VAO 支持
- **OES_texture_float**：浮点纹理
- **WEBGL_depth_texture**：深度纹理
- **EXT_texture_filter_anisotropic**：各向异性过滤

### 高级扩展
- **WEBGL_draw_buffers**：多重渲染目标
- **OES_element_index_uint**：32位索引
- **EXT_color_buffer_float**：浮点颜色缓冲
- **WEBGL_compressed_texture_s3tc**：DXT 压缩纹理

## 调试功能

### 错误检测
- **自动错误检查**：每次 WebGL 调用后检查错误
- **详细错误报告**：错误类型和位置信息
- **堆栈追踪**：错误调用栈
- **性能警告**：低效操作警告

### 调试工具
- **状态查看器**：当前 WebGL 状态显示
- **资源监控**：GPU 资源使用情况
- **性能分析**：渲染性能统计
- **着色器调试**：着色器编译信息

## 兼容性支持

### WebGL 版本
- **WebGL 1.0**：基础 WebGL 支持
- **WebGL 2.0**：现代 WebGL 功能
- **自动降级**：版本不支持时的降级
- **功能检测**：动态功能可用性检测

### 设备适配
- **移动设备优化**：移动端特殊处理
- **低端设备支持**：性能受限设备适配
- **精度处理**：不同设备的精度差异
- **扩展检测**：设备特定扩展支持

## 相关模块

- `adapters` - WebGL 适配器
- `graphics` - 图形渲染接口
- `shaders` - 着色器系统
- `textures` - 纹理管理
- `performance` - 性能监控