# Utils 模块

工具函数模块，提供渲染引擎中常用的辅助功能和工具函数。

## 主要组件

### ColorUtils
颜色工具类，提供颜色处理相关功能。

**主要功能：**
- 颜色格式转换（RGB、HSL、HSV、HEX）
- 颜色混合和插值
- 颜色空间转换
- 颜色分析和生成

## 工具类别

### 颜色处理
- **格式转换**：不同颜色格式间转换
- **颜色混合**：多种混合算法
- **渐变生成**：线性和径向渐变
- **调色板**：颜色主题生成

### 数学工具
- **插值函数**：线性、样条插值
- **随机数生成**：伪随机和噪声
- **几何计算**：基础几何运算
- **数值处理**：精度和范围处理

### 文件处理
- **Base64 编码**：数据编码解码
- **URL 处理**：路径和参数解析
- **文件类型检测**：MIME 类型识别
- **数据验证**：输入数据校验

### 性能工具
- **防抖节流**：函数调用优化
- **对象池**：对象复用机制
- **缓存机制**：结果缓存
- **性能计时**：执行时间测量

## 使用示例

```typescript
import { ColorUtils } from './utils';

// 颜色格式转换
const hexColor = '#ff6600';
const rgbColor = ColorUtils.hexToRgb(hexColor);
const hslColor = ColorUtils.rgbToHsl(rgbColor);

console.log('RGB:', rgbColor); // { r: 255, g: 102, b: 0 }
console.log('HSL:', hslColor); // { h: 24, s: 100, l: 50 }

// 颜色混合
const color1 = { r: 255, g: 0, b: 0 };   // 红色
const color2 = { r: 0, g: 0, b: 255 };   // 蓝色
const blended = ColorUtils.blend(color1, color2, 0.5);
console.log('Blended:', blended); // 紫色

// 颜色插值
const interpolated = ColorUtils.lerp(color1, color2, 0.3);

// 生成渐变色
const gradient = ColorUtils.generateGradient(color1, color2, 10);
```

### 实用工具示例

```typescript
import {
  debounce,
  throttle,
  ObjectPool,
  PerfTimer
} from './utils';

// 防抖函数
const debouncedResize = debounce(() => {
  console.log('Window resized');
}, 300);

window.addEventListener('resize', debouncedResize);

// 节流函数
const throttledScroll = throttle(() => {
  console.log('Page scrolled');
}, 100);

window.addEventListener('scroll', throttledScroll);

// 对象池使用
const vectorPool = new ObjectPool(() => ({ x: 0, y: 0 }));

function useVector() {
  const vector = vectorPool.get();
  vector.x = 10;
  vector.y = 20;

  // 使用完毕后归还
  vectorPool.release(vector);
}

// 性能计时
const timer = new PerfTimer();
timer.start('render');
// ... 渲染代码
const renderTime = timer.end('render');
console.log('渲染耗时:', renderTime, 'ms');
```

## 工具功能

### 数据处理
- **深拷贝**：对象深度复制
- **数组操作**：排序、去重、分组
- **类型检查**：数据类型判断
- **格式化**：数据格式转换

### 字符串处理
- **模板引擎**：字符串模板解析
- **路径处理**：文件路径操作
- **编码处理**：字符编码转换
- **验证工具**：格式验证

### 浏览器兼容
- **特性检测**：浏览器能力检测
- **Polyfill**：功能补丁
- **用户代理**：浏览器识别
- **兼容处理**：跨浏览器适配

### 调试工具
- **日志系统**：分级日志记录
- **断言工具**：条件断言
- **错误处理**：异常捕获和报告
- **调试信息**：开发辅助信息

## 性能优化

### 函数优化
- **记忆化**：函数结果缓存
- **柯里化**：函数参数优化
- **组合函数**：函数组合工具
- **异步工具**：Promise 和 async/await 辅助

### 内存优化
- **弱引用**：避免内存泄漏
- **清理工具**：资源清理辅助
- **循环引用检测**：内存泄漏预防
- **GC 友好**：垃圾回收优化

## 相关模块

- `math` - 数学计算工具
- `performance` - 性能分析工具
- `memory` - 内存管理工具
- 所有其他模块 - 通用工具支持