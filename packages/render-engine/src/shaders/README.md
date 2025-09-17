# Shaders 模块

着色器管理模块，提供着色器的编译、链接和管理功能。

## 主要组件

### ShaderManager
着色器管理器，统一管理所有着色器程序。

**主要功能：**
- 着色器编译和链接
- 程序缓存和复用
- 错误处理和调试
- 动态重载支持

### ShaderProgram
着色器程序封装，简化着色器使用。

**功能包括：**
- 统一变量管理
- 属性绑定
- 状态验证
- 性能优化

## 着色器类型

### 基础着色器
- **顶点着色器**：顶点变换和处理
- **片段着色器**：像素颜色计算
- **几何着色器**：几何图元生成
- **计算着色器**：通用并行计算

### 特效着色器
- **后处理着色器**：屏幕空间效果
- **粒子着色器**：粒子系统渲染
- **UI 着色器**：界面元素渲染
- **文本着色器**：文字渲染优化

## 使用示例

```typescript
import { ShaderManager, ShaderProgram } from './shaders';

// 创建着色器管理器
const shaderManager = new ShaderManager();

// 加载着色器程序
const basicShader = await shaderManager.loadProgram('basic', {
  vertex: 'shaders/basic.vert',
  fragment: 'shaders/basic.frag'
});

// 使用着色器
function render(context: RenderContext) {
  basicShader.use();
  basicShader.setUniform('u_mvpMatrix', mvpMatrix);
  basicShader.setUniform('u_color', [1.0, 0.5, 0.0, 1.0]);

  // 绘制几何体
  context.drawArrays('triangles', 0, vertexCount);
}
```

## 着色器功能

### 编译系统
- **预处理器**：宏定义和条件编译
- **包含系统**：着色器文件包含
- **变体生成**：多种配置组合
- **错误报告**：详细的编译错误信息

### 优化功能
- **代码压缩**：移除无用代码
- **常量折叠**：编译时计算
- **循环展开**：性能优化
- **精度优化**：合适的数值精度

## 内置着色器

### 基础渲染
- **纯色着色器**：单色填充
- **纹理着色器**：纹理映射
- **渐变着色器**：线性/径向渐变
- **混合着色器**：多纹理混合

### 高级效果
- **光照着色器**：Lambert、Phong、PBR
- **阴影着色器**：阴影映射
- **法线映射**：表面细节增强
- **环境映射**：反射和折射

## 相关模块

- `webgl` - WebGL 渲染支持
- `graphics` - 图形渲染接口
- `resources` - 资源管理
- `effects` - 视觉效果