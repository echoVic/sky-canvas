# Textures 模块

纹理管理模块，提供纹理的创建、加载、缓存和优化功能。

## 主要组件

### TextureManager
纹理管理器，统一管理所有纹理资源。

**主要功能：**
- 纹理加载和卸载
- 内存池管理
- 压缩格式支持
- 自动 Mipmap 生成

### EnhancedTextureManager
增强型纹理管理器，提供更高级的纹理功能。

**增强功能：**
- 智能纹理压缩
- 动态纹理图集
- 流式纹理加载
- 纹理预处理

## 纹理类型

### 基础纹理
- **2D 纹理**：标准平面纹理
- **立方体纹理**：环境映射和天空盒
- **数组纹理**：纹理序列
- **3D 纹理**：体积纹理

### 特殊纹理
- **渲染纹理**：渲染到纹理
- **深度纹理**：深度缓冲
- **数据纹理**：数值数据存储
- **压缩纹理**：DXT、ETC、ASTC 格式

## 使用示例

```typescript
import { TextureManager, EnhancedTextureManager } from './textures';

// 创建纹理管理器
const textureManager = new EnhancedTextureManager({
  maxTextureSize: 2048,
  enableCompression: true,
  enableMipmaps: true,
  maxMemoryUsage: 256 * 1024 * 1024 // 256MB
});

// 加载纹理
async function loadTexture(url: string) {
  const texture = await textureManager.loadTexture(url, {
    flipY: true,
    generateMipmaps: true,
    wrapS: 'repeat',
    wrapT: 'repeat',
    magFilter: 'linear',
    minFilter: 'linear-mipmap-linear'
  });
  return texture;
}

// 创建纹理图集
async function createAtlas(imageUrls: string[]) {
  const atlas = await textureManager.createTextureAtlas(imageUrls, {
    maxSize: 2048,
    padding: 2,
    powerOfTwo: true
  });
  return atlas;
}

// 渲染到纹理
function renderToTexture(scene: Scene) {
  const renderTexture = textureManager.createRenderTexture(512, 512);

  // 设置渲染目标
  renderer.setRenderTarget(renderTexture);
  renderer.render(scene);
  renderer.setRenderTarget(null);

  return renderTexture;
}
```

## 纹理优化

### 压缩技术
- **DXT 压缩**：桌面端标准格式
- **ETC 压缩**：移动端Android格式
- **ASTC 压缩**：新一代压缩格式
- **PVRTC 压缩**：iOS设备专用格式

### 内存优化
- **纹理池**：纹理对象复用
- **智能缓存**：LRU 缓存策略
- **分级加载**：不同质量级别
- **动态释放**：自动内存管理

### 性能优化
- **纹理图集**：减少绘制调用
- **流式加载**：大纹理分块加载
- **预加载**：关键纹理提前加载
- **异步处理**：非阻塞纹理操作

## 纹理格式

### 颜色格式
- **RGB/RGBA**：标准颜色格式
- **灰度**：单通道格式
- **浮点**：HDR 高动态范围
- **整数**：数据纹理格式

### 压缩格式
- **DXT1/DXT5**：DirectX 纹理压缩
- **ETC1/ETC2**：Ericsson 纹理压缩
- **ASTC**：自适应可缩放纹理压缩
- **PVRTC**：PowerVR 纹理压缩

## 高级功能

### 纹理特效
- **程序化纹理**：算法生成纹理
- **动态纹理**：实时更新纹理
- **噪声纹理**：Perlin、Simplex 噪声
- **渐变纹理**：平滑过渡效果

### 纹理工具
- **纹理检查器**：调试和分析工具
- **格式转换**：不同格式间转换
- **纹理打包**：自动图集生成
- **质量评估**：纹理质量分析

## 相关模块

- `resources` - 资源管理
- `webgl` - WebGL 纹理支持
- `memory` - 内存管理
- `performance` - 性能监控