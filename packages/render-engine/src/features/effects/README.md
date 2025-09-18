# Effects 模块

视觉效果模块，提供丰富的渲染效果和后处理功能。

## 模块结构

### 滤镜系统 (filters/)
- `BaseFilter` - 滤镜基类
- `BrightnessFilter` - 亮度调节滤镜
- `ContrastFilter` - 对比度滤镜
- `GaussianBlurFilter` - 高斯模糊滤镜
- `DropShadowFilter` - 阴影滤镜

### 混合模式 (blends/)
- `BlendManager` - 混合模式管理器
- `StandardBlendModes` - 标准混合模式
- `ColorBlendModes` - 颜色混合模式

### 合成操作 (composites/)
- `CompositeManager` - 合成管理器
- `BlendCompositeOperations` - 混合合成操作
- `ColorCompositeOperations` - 颜色合成操作

### 光照系统 (lighting/)
- `LightingManager` - 光照管理器
- `DirectionalLight` - 方向光
- `PointLight` - 点光源
- `DropShadow` - 阴影效果

### 蒙版系统 (masks/)
- `CircleMask` - 圆形蒙版
- `RectangleMask` - 矩形蒙版
- `PathMask` - 路径蒙版

### 后处理 (postprocess/)
- `PostProcessManager` - 后处理管理器
- `ColorAdjustmentEffects` - 颜色调整效果

## 使用示例

### 滤镜效果
```typescript
import { BrightnessFilter, GaussianBlurFilter } from './effects';

// 创建亮度滤镜
const brightnessFilter = new BrightnessFilter(1.2);

// 创建模糊滤镜
const blurFilter = new GaussianBlurFilter(5);

// 应用滤镜
sprite.filters = [brightnessFilter, blurFilter];
```

### 光照效果
```typescript
import { LightingManager, DirectionalLight } from './effects';

// 创建光照管理器
const lightManager = new LightingManager();

// 添加方向光
const sunLight = new DirectionalLight({
  direction: { x: -1, y: -1, z: -1 },
  color: { r: 1, g: 0.9, b: 0.8 },
  intensity: 1.0
});

lightManager.addLight(sunLight);
```

### 混合模式
```typescript
import { BlendManager } from './effects';

// 设置混合模式
BlendManager.setBlendMode(sprite, 'multiply');
BlendManager.setBlendMode(overlay, 'screen');
```

## 效果类型

### 颜色效果
- 亮度/对比度调节
- 色相/饱和度调整
- 颜色替换
- 色彩平衡

### 模糊效果
- 高斯模糊
- 运动模糊
- 径向模糊
- 表面模糊

### 阴影效果
- 投影阴影
- 内阴影
- 发光效果
- 外发光

## 相关模块

- `webgl` - WebGL 渲染
- `shaders` - 着色器管理
- `graphics` - 图形接口