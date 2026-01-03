# 渲染管线详解

## 概述

Sky Canvas 的渲染管线是一个多阶段、高性能的渲染系统，支持多线程处理、GPU 驱动渲染和智能批处理优化。

## 渲染管线架构

```mermaid
flowchart TB
    subgraph "Input"
        TASKS[渲染任务队列]
    end
    
    subgraph "Preparation Phase"
        PREP[多线程准备]
        TRANSFORM[变换计算]
    end
    
    subgraph "Culling Phase"
        FRUSTUM[视锥剔除]
        OCCLUSION[遮挡剔除]
    end
    
    subgraph "Sorting Phase"
        PRIORITY[优先级排序]
        DEPTH[深度排序]
    end
    
    subgraph "Batching Phase"
        GROUP[智能分组]
        MERGE[批次合并]
    end
    
    subgraph "Rendering Phase"
        GPU_CMD[GPU 命令生成]
        EXECUTE[执行渲染]
    end
    
    subgraph "Output"
        CANVAS[画布输出]
    end
    
    TASKS --> PREP
    PREP --> TRANSFORM
    TRANSFORM --> FRUSTUM
    FRUSTUM --> OCCLUSION
    OCCLUSION --> PRIORITY
    PRIORITY --> DEPTH
    DEPTH --> GROUP
    GROUP --> MERGE
    MERGE --> GPU_CMD
    GPU_CMD --> EXECUTE
    EXECUTE --> CANVAS
```

## 渲染阶段详解

### 1. Setup 阶段 (设置)

初始化渲染帧，准备渲染上下文：

```mermaid
sequenceDiagram
    participant App as 应用
    participant Pipeline as 渲染管线
    participant Context as 渲染上下文
    participant Stats as 性能统计
    
    App->>Pipeline: beginFrame()
    Pipeline->>Context: 重置状态
    Pipeline->>Stats: 开始计时
    Pipeline->>Pipeline: 清空任务队列
```

**主要职责**：
- 重置渲染状态
- 清空命令缓冲区
- 初始化帧统计

### 2. Cull 阶段 (剔除)

移除不可见对象，减少渲染负载：

```mermaid
flowchart LR
    subgraph "Culling System"
        INPUT[所有对象]
        
        subgraph "Frustum Culling"
            PLANES[视锥平面]
            AABB[AABB 检测]
        end
        
        subgraph "Occlusion Culling"
            QUERY[遮挡查询]
            HIZ[Hi-Z Buffer]
        end
        
        OUTPUT[可见对象]
    end
    
    INPUT --> PLANES
    PLANES --> AABB
    AABB --> QUERY
    QUERY --> HIZ
    HIZ --> OUTPUT
```

**视锥剔除算法**：
```
对于每个对象的 AABB：
  对于每个视锥平面 (6个)：
    计算 AABB 与平面的关系
    如果完全在平面外侧 → 剔除
  如果通过所有平面检测 → 保留
```

**性能指标**：
- `culledObjects`: 被剔除的对象数量
- 目标剔除率: 40-60% (典型场景)

### 3. Sort 阶段 (排序)

按渲染顺序排列对象：

```mermaid
flowchart TB
    subgraph "Sorting Criteria"
        P[优先级排序]
        D[深度排序]
        M[材质排序]
        T[纹理排序]
    end
    
    subgraph "Sort Result"
        OPAQUE[不透明对象<br/>前到后]
        TRANSPARENT[透明对象<br/>后到前]
    end
    
    P --> D
    D --> M
    M --> T
    T --> OPAQUE
    T --> TRANSPARENT
```

**排序策略**：
1. **优先级排序**: 高优先级任务先渲染
2. **深度排序**: 
   - 不透明对象: 前到后 (利用深度测试早期剔除)
   - 透明对象: 后到前 (正确的混合顺序)
3. **状态排序**: 减少状态切换

### 4. Batch 阶段 (批处理)

合并相似的渲染调用：

```mermaid
flowchart TB
    subgraph "Batch Grouping"
        TASKS[排序后的任务]
        
        subgraph "Grouping Criteria"
            SHADER[相同着色器]
            TEXTURE[相同纹理]
            BLEND[相同混合模式]
            STATE[相同渲染状态]
        end
        
        BATCHES[渲染批次]
    end
    
    TASKS --> SHADER
    SHADER --> TEXTURE
    TEXTURE --> BLEND
    BLEND --> STATE
    STATE --> BATCHES
```

**批处理系统架构**：

```mermaid
classDiagram
    class BatchManager {
        +config: BatchManagerConfig
        +addRenderable(item)
        +flush()
        +getStats(): BatchStats
    }
    
    class IBatchStrategy {
        <<interface>>
        +canBatch(a, b): boolean
        +createBatch(items): BatchData
    }
    
    class BatchBuffer {
        +vertices: Float32Array
        +indices: Uint16Array
        +addVertex(data)
        +clear()
    }
    
    class RenderBatch {
        +tasks: IRenderTask[]
        +totalTime: number
        +priority: number
    }
    
    BatchManager --> IBatchStrategy
    BatchManager --> BatchBuffer
    BatchManager --> RenderBatch
```

**批处理优化效果**：
- 减少 Draw Calls: 60-80%
- 减少状态切换: 50-70%
- 提升帧率: 2-3x

### 5. Render 阶段 (渲染)

执行实际的 GPU 渲染命令：

```mermaid
sequenceDiagram
    participant Pipeline as 渲染管线
    participant GPU as GPU 命令缓冲
    participant Backend as 渲染后端
    participant Canvas as 画布
    
    Pipeline->>GPU: 生成 GPU 命令
    
    loop 每个渲染批次
        GPU->>Backend: 提交命令
        Backend->>Backend: 绑定着色器
        Backend->>Backend: 设置 Uniforms
        Backend->>Backend: 绑定纹理
        Backend->>Canvas: Draw Call
    end
    
    Backend->>Canvas: 完成渲染
```

**GPU 命令类型**：
- `draw`: 绘制命令
- `compute`: 计算命令
- `copy`: 复制命令

### 6. PostProcess 阶段 (后处理)

应用后处理效果：

```mermaid
flowchart LR
    subgraph "Post-Process Pipeline"
        INPUT[渲染结果]
        
        subgraph "Effects"
            BLOOM[Bloom 泛光]
            BLUR[Blur 模糊]
            COLOR[Color Grading]
            VIGNETTE[Vignette 暗角]
        end
        
        OUTPUT[最终输出]
    end
    
    INPUT --> BLOOM
    BLOOM --> BLUR
    BLUR --> COLOR
    COLOR --> VIGNETTE
    VIGNETTE --> OUTPUT
```

### 7. Present 阶段 (呈现)

将渲染结果呈现到屏幕：

```mermaid
sequenceDiagram
    participant Pipeline as 渲染管线
    participant SwapChain as 交换链
    participant Display as 显示
    
    Pipeline->>SwapChain: 提交帧缓冲
    SwapChain->>SwapChain: 等待 VSync
    SwapChain->>Display: 呈现
    Pipeline->>Pipeline: 更新统计
```

## 多线程渲染

```mermaid
flowchart TB
    subgraph "Main Thread"
        MAIN[主线程]
        SUBMIT[提交任务]
        COLLECT[收集结果]
    end
    
    subgraph "Worker Pool"
        W1[Worker 1<br/>变换计算]
        W2[Worker 2<br/>剔除检测]
        W3[Worker 3<br/>排序处理]
        W4[Worker N<br/>批处理准备]
    end
    
    MAIN --> SUBMIT
    SUBMIT --> W1
    SUBMIT --> W2
    SUBMIT --> W3
    SUBMIT --> W4
    W1 --> COLLECT
    W2 --> COLLECT
    W3 --> COLLECT
    W4 --> COLLECT
    COLLECT --> MAIN
```

**Worker 任务分配**：
```
任务数 / Worker数 = 每个 Worker 的任务量
并行处理 → Promise.all() 等待完成
```

## 渲染后端适配

```mermaid
classDiagram
    class IModernRenderPipeline {
        <<interface>>
        +initialize(canvas, config)
        +beginFrame()
        +submitCommand(command)
        +endFrame()
        +dispose()
    }
    
    class WebGLModernRenderPipeline {
        +gl: WebGLRenderingContext
        +shaderManager: IShaderManager
        +bufferManager: IBufferManager
    }
    
    class WebGPUPipelineManager {
        +device: GPUDevice
        +format: GPUTextureFormat
        +pipelines: Map
    }
    
    class Canvas2DRenderPipeline {
        +ctx: CanvasRenderingContext2D
    }
    
    IModernRenderPipeline <|.. WebGLModernRenderPipeline
    IModernRenderPipeline <|.. WebGPUPipelineManager
    IModernRenderPipeline <|.. Canvas2DRenderPipeline
```

### WebGL 渲染管线

```mermaid
flowchart TB
    subgraph "WebGL Pipeline"
        subgraph "Resource Management"
            SM[ShaderManager<br/>着色器管理]
            BM[BufferManager<br/>缓冲区管理]
            TM[TextureManager<br/>纹理管理]
        end
        
        subgraph "Rendering"
            COMPILE[编译着色器]
            BIND[绑定资源]
            DRAW[执行绘制]
        end
    end
    
    SM --> COMPILE
    BM --> BIND
    TM --> BIND
    COMPILE --> BIND
    BIND --> DRAW
```

### WebGPU 渲染管线

```mermaid
flowchart TB
    subgraph "WebGPU Pipeline"
        subgraph "Pipeline State"
            VS[Vertex Shader]
            FS[Fragment Shader]
            LAYOUT[Pipeline Layout]
        end
        
        subgraph "Bind Groups"
            BG0[BindGroup 0<br/>Uniforms]
            BG1[BindGroup 1<br/>Textures]
        end
        
        subgraph "Execution"
            ENCODER[Command Encoder]
            PASS[Render Pass]
            SUBMIT[Submit]
        end
    end
    
    VS --> LAYOUT
    FS --> LAYOUT
    LAYOUT --> BG0
    LAYOUT --> BG1
    BG0 --> ENCODER
    BG1 --> ENCODER
    ENCODER --> PASS
    PASS --> SUBMIT
```

## 性能监控

```mermaid
flowchart LR
    subgraph "Performance Metrics"
        FT[Frame Time<br/>帧时间]
        DC[Draw Calls<br/>绘制调用]
        BC[Batch Count<br/>批次数量]
        CO[Culled Objects<br/>剔除对象]
        MU[Memory Usage<br/>内存使用]
    end
    
    subgraph "Monitoring"
        COLLECT[收集数据]
        ANALYZE[分析趋势]
        ALERT[性能警告]
    end
    
    FT --> COLLECT
    DC --> COLLECT
    BC --> COLLECT
    CO --> COLLECT
    MU --> COLLECT
    COLLECT --> ANALYZE
    ANALYZE --> ALERT
```

**关键性能指标**：

| 指标 | 描述 | 目标值 |
|------|------|--------|
| `frameTime` | 单帧渲染时间 | < 16.67ms (60fps) |
| `drawCalls` | GPU 绘制调用次数 | < 100 |
| `batchCount` | 渲染批次数量 | < 50 |
| `triangles` | 渲染三角形数量 | < 100K |
| `textureBinds` | 纹理绑定次数 | < 20 |
| `shaderSwitches` | 着色器切换次数 | < 10 |

## 自适应质量管理

```mermaid
flowchart TB
    subgraph "Quality Manager"
        MONITOR[性能监控]
        ANALYZE[分析性能]
        
        subgraph "Quality Levels"
            HIGH[高质量]
            MEDIUM[中等质量]
            LOW[低质量]
        end
        
        ADJUST[调整参数]
    end
    
    MONITOR --> ANALYZE
    ANALYZE --> HIGH
    ANALYZE --> MEDIUM
    ANALYZE --> LOW
    HIGH --> ADJUST
    MEDIUM --> ADJUST
    LOW --> ADJUST
```

**自适应策略**：
- 帧率下降 → 降低质量等级
- 帧率稳定 → 尝试提升质量
- 内存压力 → 减少缓存大小

## 渲染配置

```typescript
interface RenderConfig {
  enableBatching: boolean;      // 启用批处理
  enableCulling: boolean;       // 启用剔除
  enableLOD: boolean;           // 启用 LOD
  enableOcclusion: boolean;     // 启用遮挡剔除
  enableInstancing: boolean;    // 启用实例化
  enableAsyncLoading: boolean;  // 启用异步加载
  enablePredictiveCache: boolean; // 启用预测缓存
  enableDynamicOptimization: boolean; // 启用动态优化
  maxConcurrentTasks: number;   // 最大并发任务数
  adaptiveQuality: boolean;     // 自适应质量
}
```

## 性能预算

```typescript
interface PerformanceBudget {
  targetFPS: number;        // 目标帧率 (默认: 60)
  maxFrameTime: number;     // 最大帧时间 (默认: 16.67ms)
  maxDrawCalls: number;     // 最大绘制调用 (默认: 100)
  maxTriangles: number;     // 最大三角形数 (默认: 100000)
  maxMemoryUsage: number;   // 最大内存使用 (默认: 512MB)
  maxGPUMemory: number;     // 最大 GPU 内存 (默认: 256MB)
}
```

## 调度系统

```mermaid
flowchart TB
    subgraph "Task Scheduler"
        QUEUE[任务队列]
        
        subgraph "Priority Levels"
            P0[P0 - 关键任务]
            P1[P1 - 高优先级]
            P2[P2 - 普通任务]
            P3[P3 - 后台任务]
        end
        
        DISPATCH[任务分发]
        EXECUTE[执行任务]
    end
    
    QUEUE --> P0
    QUEUE --> P1
    QUEUE --> P2
    QUEUE --> P3
    P0 --> DISPATCH
    P1 --> DISPATCH
    P2 --> DISPATCH
    P3 --> DISPATCH
    DISPATCH --> EXECUTE
```

## 相关文档

- [系统架构概述](./README.md)
- [插件系统架构](./plugin-system.md)
- [性能优化指南](../PERFORMANCE.md)
