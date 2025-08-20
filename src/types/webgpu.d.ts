// WebGPU类型定义
declare global {
  interface Navigator {
    gpu?: GPU;
  }

  interface GPU {
    requestAdapter(options?: GPURequestAdapterOptions): Promise<GPUAdapter | null>;
    getPreferredCanvasFormat(): GPUTextureFormat;
  }

  interface GPUAdapter {
    requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice>;
    features: GPUSupportedFeatures;
    limits: GPUSupportedLimits;
    info: GPUAdapterInfo;
  }

  interface GPUDevice {
    features: GPUSupportedFeatures;
    limits: GPUSupportedLimits;
    queue: GPUQueue;
    
    createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
    createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
    createShaderModule(descriptor: GPUShaderModuleDescriptor): GPUShaderModule;
    createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
    createBindGroup(descriptor: GPUBindGroupDescriptor): GPUBindGroup;
    createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder;
    
    destroy(): void;
    lost: Promise<GPUDeviceLostInfo>;
  }

  interface GPUQueue {
    submit(commandBuffers: GPUCommandBuffer[]): void;
    writeBuffer(buffer: GPUBuffer, bufferOffset: number, data: ArrayBuffer): void;
    writeTexture(
      destination: GPUImageCopyTexture,
      data: ArrayBuffer,
      dataLayout: GPUImageDataLayout,
      size: GPUExtent3D
    ): void;
    copyExternalImageToTexture(
      source: GPUImageCopyExternalImage,
      destination: GPUImageCopyTexture,
      copySize: GPUExtent3D
    ): void;
  }

  interface GPUBuffer {
    size: number;
    usage: GPUBufferUsageFlags;
    mapState: GPUBufferMapState;
    
    destroy(): void;
    mapAsync(mode: GPUMapModeFlags, offset?: number, size?: number): Promise<void>;
    getMappedRange(offset?: number, size?: number): ArrayBuffer;
    unmap(): void;
  }

  interface GPUTexture {
    width: number;
    height: number;
    depthOrArrayLayers: number;
    mipLevelCount: number;
    sampleCount: number;
    dimension: GPUTextureDimension;
    format: GPUTextureFormat;
    usage: GPUTextureUsageFlags;
    
    createView(descriptor?: GPUTextureViewDescriptor): GPUTextureView;
    destroy(): void;
  }

  interface GPUTextureView {
    label?: string;
  }

  interface GPUShaderModule {
    label?: string;
    getCompilationInfo(): Promise<GPUCompilationInfo>;
  }

  interface GPURenderPipeline {
    label?: string;
    getBindGroupLayout(index: number): GPUBindGroupLayout;
  }

  interface GPUBindGroup {
    label?: string;
  }

  interface GPUBindGroupLayout {
    label?: string;
  }

  interface GPUCommandEncoder {
    label?: string;
    
    beginRenderPass(descriptor: GPURenderPassDescriptor): GPURenderPassEncoder;
    finish(descriptor?: GPUCommandBufferDescriptor): GPUCommandBuffer;
  }

  interface GPURenderPassEncoder {
    label?: string;
    
    setPipeline(pipeline: GPURenderPipeline): void;
    setBindGroup(index: number, bindGroup: GPUBindGroup): void;
    setVertexBuffer(slot: number, buffer: GPUBuffer, offset?: number, size?: number): void;
    setIndexBuffer(buffer: GPUBuffer, format: GPUIndexFormat, offset?: number, size?: number): void;
    draw(vertexCount: number, instanceCount?: number, firstVertex?: number, firstInstance?: number): void;
    drawIndexed(indexCount: number, instanceCount?: number, firstIndex?: number, baseVertex?: number, firstInstance?: number): void;
    end(): void;
  }

  interface GPUCommandBuffer {
    label?: string;
  }

  interface GPUCanvasContext {
    canvas: HTMLCanvasElement;
    configure(configuration: GPUCanvasConfiguration): void;
    unconfigure(): void;
    getCurrentTexture(): GPUTexture;
  }

  // 枚举和常量类型
  type GPUTextureFormat = 
    | 'r8unorm' | 'r8snorm' | 'r8uint' | 'r8sint'
    | 'r16uint' | 'r16sint' | 'r16float'
    | 'rg8unorm' | 'rg8snorm' | 'rg8uint' | 'rg8sint'
    | 'r32uint' | 'r32sint' | 'r32float'
    | 'rg16uint' | 'rg16sint' | 'rg16float'
    | 'rgba8unorm' | 'rgba8unorm-srgb' | 'rgba8snorm' | 'rgba8uint' | 'rgba8sint'
    | 'bgra8unorm' | 'bgra8unorm-srgb'
    | 'rgb9e5ufloat' | 'rgb10a2unorm' | 'rg11b10ufloat'
    | 'rg32uint' | 'rg32sint' | 'rg32float'
    | 'rgba16uint' | 'rgba16sint' | 'rgba16float'
    | 'rgba32uint' | 'rgba32sint' | 'rgba32float'
    | 'stencil8' | 'depth16unorm' | 'depth24plus' | 'depth24plus-stencil8' | 'depth32float';

  type GPUBufferUsageFlags = number;
  type GPUTextureUsageFlags = number;
  type GPUMapModeFlags = number;
  type GPUIndexFormat = 'uint16' | 'uint32';
  type GPUTextureDimension = '1d' | '2d' | '3d';
  type GPUBufferMapState = 'unmapped' | 'pending' | 'mapped';

  // 描述符接口
  interface GPURequestAdapterOptions {
    powerPreference?: 'low-power' | 'high-performance';
    forceFallbackAdapter?: boolean;
  }

  interface GPUDeviceDescriptor {
    label?: string;
    requiredFeatures?: GPUFeatureName[];
    requiredLimits?: Record<string, number>;
  }

  interface GPUBufferDescriptor {
    label?: string;
    size: number;
    usage: GPUBufferUsageFlags;
    mappedAtCreation?: boolean;
  }

  interface GPUTextureDescriptor {
    label?: string;
    size: GPUExtent3D;
    mipLevelCount?: number;
    sampleCount?: number;
    dimension?: GPUTextureDimension;
    format: GPUTextureFormat;
    usage: GPUTextureUsageFlags;
  }

  interface GPUTextureViewDescriptor {
    label?: string;
    format?: GPUTextureFormat;
    dimension?: GPUTextureViewDimension;
    aspect?: GPUTextureAspect;
    baseMipLevel?: number;
    mipLevelCount?: number;
    baseArrayLayer?: number;
    arrayLayerCount?: number;
  }

  interface GPUShaderModuleDescriptor {
    label?: string;
    code: string;
  }

  interface GPURenderPipelineDescriptor {
    label?: string;
    layout: GPUPipelineLayout | 'auto';
    vertex: GPUVertexState;
    primitive?: GPUPrimitiveState;
    depthStencil?: GPUDepthStencilState;
    multisample?: GPUMultisampleState;
    fragment?: GPUFragmentState;
  }

  interface GPUBindGroupDescriptor {
    label?: string;
    layout: GPUBindGroupLayout;
    entries: GPUBindGroupEntry[];
  }

  interface GPUCommandEncoderDescriptor {
    label?: string;
  }

  interface GPURenderPassDescriptor {
    label?: string;
    colorAttachments: (GPURenderPassColorAttachment | null)[];
    depthStencilAttachment?: GPURenderPassDepthStencilAttachment;
  }

  interface GPUCanvasConfiguration {
    device: GPUDevice;
    format: GPUTextureFormat;
    usage?: GPUTextureUsageFlags;
    colorSpace?: 'srgb' | 'display-p3';
    alphaMode?: 'opaque' | 'premultiplied';
  }

  // 其他必要的接口和类型
  interface GPUExtent3D {
    width: number;
    height?: number;
    depthOrArrayLayers?: number;
  }

  interface GPUVertexState {
    module: GPUShaderModule;
    entryPoint: string;
    buffers?: GPUVertexBufferLayout[];
  }

  interface GPUFragmentState {
    module: GPUShaderModule;
    entryPoint: string;
    targets: (GPUColorTargetState | null)[];
  }

  interface GPUPrimitiveState {
    topology?: GPUPrimitiveTopology;
    stripIndexFormat?: GPUIndexFormat;
    frontFace?: GPUFrontFace;
    cullMode?: GPUCullMode;
  }

  interface GPUVertexBufferLayout {
    arrayStride: number;
    stepMode?: GPUVertexStepMode;
    attributes: GPUVertexAttribute[];
  }

  interface GPUVertexAttribute {
    format: GPUVertexFormat;
    offset: number;
    shaderLocation: number;
  }

  interface GPUColorTargetState {
    format: GPUTextureFormat;
    blend?: GPUBlendState;
    writeMask?: GPUColorWriteFlags;
  }

  interface GPUBlendState {
    color: GPUBlendComponent;
    alpha: GPUBlendComponent;
  }

  interface GPUBlendComponent {
    operation?: GPUBlendOperation;
    srcFactor?: GPUBlendFactor;
    dstFactor?: GPUBlendFactor;
  }

  interface GPURenderPassColorAttachment {
    view: GPUTextureView;
    resolveTarget?: GPUTextureView;
    clearValue?: GPUColor;
    loadOp: GPULoadOp;
    storeOp: GPUStoreOp;
  }

  interface GPUBindGroupEntry {
    binding: number;
    resource: GPUBindingResource;
  }

  interface GPUImageCopyTexture {
    texture: GPUTexture;
    mipLevel?: number;
    origin?: GPUOrigin3D;
    aspect?: GPUTextureAspect;
  }

  interface GPUImageCopyExternalImage {
    source: ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
    origin?: GPUOrigin2D;
    flipY?: boolean;
  }

  interface GPUImageDataLayout {
    offset?: number;
    bytesPerRow?: number;
    rowsPerImage?: number;
  }

  // 更多类型定义
  type GPUFeatureName = string;
  type GPUTextureViewDimension = '1d' | '2d' | '2d-array' | 'cube' | 'cube-array' | '3d';
  type GPUTextureAspect = 'all' | 'stencil-only' | 'depth-only';
  type GPUPrimitiveTopology = 'point-list' | 'line-list' | 'line-strip' | 'triangle-list' | 'triangle-strip';
  type GPUFrontFace = 'ccw' | 'cw';
  type GPUCullMode = 'none' | 'front' | 'back';
  type GPUVertexStepMode = 'vertex' | 'instance';
  type GPUVertexFormat = 'uint8x2' | 'uint8x4' | 'sint8x2' | 'sint8x4' | 'unorm8x2' | 'unorm8x4' | 'snorm8x2' | 'snorm8x4' | 'uint16x2' | 'uint16x4' | 'sint16x2' | 'sint16x4' | 'unorm16x2' | 'unorm16x4' | 'snorm16x2' | 'snorm16x4' | 'float16x2' | 'float16x4' | 'float32' | 'float32x2' | 'float32x3' | 'float32x4' | 'uint32' | 'uint32x2' | 'uint32x3' | 'uint32x4' | 'sint32' | 'sint32x2' | 'sint32x3' | 'sint32x4';
  type GPUBlendOperation = 'add' | 'subtract' | 'reverse-subtract' | 'min' | 'max';
  type GPUBlendFactor = 'zero' | 'one' | 'src' | 'one-minus-src' | 'src-alpha' | 'one-minus-src-alpha' | 'dst' | 'one-minus-dst' | 'dst-alpha' | 'one-minus-dst-alpha' | 'src-alpha-saturated' | 'constant' | 'one-minus-constant';
  type GPULoadOp = 'load' | 'clear';
  type GPUStoreOp = 'store' | 'discard';
  type GPUColorWriteFlags = number;
  type GPUColor = [number, number, number, number] | { r: number; g: number; b: number; a: number };
  type GPUOrigin3D = [number, number, number] | { x: number; y: number; z: number };
  type GPUOrigin2D = [number, number] | { x: number; y: number };
  type GPUBindingResource = GPUBufferBinding | GPUSampler | GPUTextureView;

  interface GPUBufferBinding {
    buffer: GPUBuffer;
    offset?: number;
    size?: number;
  }

  interface GPUSampler {
    label?: string;
  }

  interface GPUSupportedFeatures extends Set<GPUFeatureName> {}
  interface GPUSupportedLimits {
    maxTextureDimension1D: number;
    maxTextureDimension2D: number;
    maxTextureDimension3D: number;
    maxTextureArrayLayers: number;
    maxBindGroups: number;
    maxDynamicUniformBuffersPerPipelineLayout: number;
    maxDynamicStorageBuffersPerPipelineLayout: number;
    maxSampledTexturesPerShaderStage: number;
    maxSamplersPerShaderStage: number;
    maxStorageBuffersPerShaderStage: number;
    maxStorageTexturesPerShaderStage: number;
    maxUniformBuffersPerShaderStage: number;
    maxUniformBufferBindingSize: number;
    maxStorageBufferBindingSize: number;
    minUniformBufferOffsetAlignment: number;
    minStorageBufferOffsetAlignment: number;
    maxVertexBuffers: number;
    maxVertexAttributes: number;
    maxVertexBufferArrayStride: number;
    maxInterStageShaderComponents: number;
    maxComputeWorkgroupStorageSize: number;
    maxComputeInvocationsPerWorkgroup: number;
    maxComputeWorkgroupSizeX: number;
    maxComputeWorkgroupSizeY: number;
    maxComputeWorkgroupSizeZ: number;
    maxComputeWorkgroupsPerDimension: number;
  }

  interface GPUAdapterInfo {
    vendor: string;
    architecture: string;
    device: string;
    description: string;
  }

  interface GPUDeviceLostInfo {
    reason: 'destroyed' | 'unknown';
    message: string;
  }

  interface GPUCompilationInfo {
    messages: GPUCompilationMessage[];
  }

  interface GPUCompilationMessage {
    message: string;
    type: 'error' | 'warning' | 'info';
    lineNum: number;
    linePos: number;
    offset: number;
    length: number;
  }

  interface GPUPipelineLayout {
    label?: string;
  }

  interface GPUDepthStencilState {
    format: GPUTextureFormat;
    depthWriteEnabled?: boolean;
    depthCompare?: GPUCompareFunction;
    stencilFront?: GPUStencilFaceState;
    stencilBack?: GPUStencilFaceState;
    stencilReadMask?: number;
    stencilWriteMask?: number;
    depthBias?: number;
    depthBiasSlopeScale?: number;
    depthBiasClamp?: number;
  }

  interface GPUMultisampleState {
    count?: number;
    mask?: number;
    alphaToCoverageEnabled?: boolean;
  }

  interface GPURenderPassDepthStencilAttachment {
    view: GPUTextureView;
    depthClearValue?: number;
    depthLoadOp?: GPULoadOp;
    depthStoreOp?: GPUStoreOp;
    depthReadOnly?: boolean;
    stencilClearValue?: number;
    stencilLoadOp?: GPULoadOp;
    stencilStoreOp?: GPUStoreOp;
    stencilReadOnly?: boolean;
  }

  interface GPUStencilFaceState {
    compare?: GPUCompareFunction;
    failOp?: GPUStencilOperation;
    depthFailOp?: GPUStencilOperation;
    passOp?: GPUStencilOperation;
  }

  type GPUCompareFunction = 'never' | 'less' | 'equal' | 'less-equal' | 'greater' | 'not-equal' | 'greater-equal' | 'always';
  type GPUStencilOperation = 'keep' | 'zero' | 'replace' | 'invert' | 'increment-clamp' | 'decrement-clamp' | 'increment-wrap' | 'decrement-wrap';

  interface GPUCommandBufferDescriptor {
    label?: string;
  }

  // 常量
  const GPUBufferUsage: {
    MAP_READ: 0x0001;
    MAP_WRITE: 0x0002;
    COPY_SRC: 0x0004;
    COPY_DST: 0x0008;
    INDEX: 0x0010;
    VERTEX: 0x0020;
    UNIFORM: 0x0040;
    STORAGE: 0x0080;
    INDIRECT: 0x0100;
    QUERY_RESOLVE: 0x0200;
  };

  const GPUTextureUsage: {
    COPY_SRC: 0x01;
    COPY_DST: 0x02;
    TEXTURE_BINDING: 0x04;
    STORAGE_BINDING: 0x08;
    RENDER_ATTACHMENT: 0x10;
  };

  const GPUMapMode: {
    READ: 0x0001;
    WRITE: 0x0002;
  };

  const GPUColorWrite: {
    RED: 0x1;
    GREEN: 0x2;
    BLUE: 0x4;
    ALPHA: 0x8;
    ALL: 0xF;
  };
}

export {};
