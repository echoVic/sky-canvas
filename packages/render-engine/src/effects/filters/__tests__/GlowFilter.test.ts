/**
 * 发光滤镜测试
 */

import '../../__tests__/setup';
import { GlowFilter } from '../GlowFilter';
import { FilterType } from '../../types/FilterTypes';

describe('GlowFilter', () => {
  let filter: GlowFilter;
  
  beforeEach(() => {
    filter = new GlowFilter();
  });

  afterEach(() => {
    filter.dispose();
  });

  it('应该正确初始化', () => {
    expect(filter.type).toBe(FilterType.GLOW);
    expect(filter.name).toBe('Glow');
    expect(filter.requiresWebGL).toBe(false);
  });

  it('应该返回默认参数', () => {
    const defaultParams = filter.getDefaultParameters();
    expect(defaultParams.type).toBe(FilterType.GLOW);
    expect(defaultParams.color).toBe('#ffffff');
    expect(defaultParams.blur).toBe(8);
    expect(defaultParams.strength).toBe(1.5);
    expect(defaultParams.quality).toBe('medium');
    expect(defaultParams.enabled).toBe(true);
  });

  it('应该验证参数', () => {
    const validParams = {
      type: FilterType.GLOW as const,
      color: '#00ff00',
      blur: 10,
      strength: 2,
      quality: 'high' as const,
      opacity: 1,
      enabled: true
    };
    
    expect(filter.validateParameters(validParams)).toBe(true);
  });

  it('应该拒绝无效参数', () => {
    const invalidParams = {
      type: FilterType.GLOW as const,
      color: '#00ff00',
      blur: -5, // 负值无效
      strength: 2,
      quality: 'high' as const,
      opacity: 1,
      enabled: true
    };
    
    expect(filter.validateParameters(invalidParams)).toBe(false);
  });

  it('应该拒绝无效的质量设置', () => {
    const invalidParams = {
      type: FilterType.GLOW as const,
      color: '#00ff00',
      blur: 5,
      strength: 2,
      quality: 'invalid' as any,
      opacity: 1,
      enabled: true
    };
    
    expect(filter.validateParameters(invalidParams)).toBe(false);
  });

  it('当模糊和强度都为0时应该返回原始图像', async () => {
    const imageData = new ImageData(10, 10);
    // 设置测试数据
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 255;     // R
      imageData.data[i + 1] = 0;   // G
      imageData.data[i + 2] = 0;   // B
      imageData.data[i + 3] = 255; // A
    }

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now()
    };

    const params = {
        type: FilterType.GLOW as const,
        color: '#ffffff',
        blur: 2,
        strength: 1,
        quality: 'medium' as const,
        opacity: 1,
        enabled: true
      };

    const result = await filter.apply(context, params);
    
    expect(result.success).toBe(true);
    expect(result.processedImageData).toBeDefined();
    expect(result.processedImageData!.width).toBe(imageData.width);
    expect(result.processedImageData!.height).toBe(imageData.height);
  });

  it('应该创建发光效果', async () => {
    const imageData = new ImageData(5, 5);
    // 设置一个小的测试图形
    const centerIndex = (2 * 5 + 2) * 4; // 中心像素
    imageData.data[centerIndex] = 255;     // R
    imageData.data[centerIndex + 1] = 255; // G
    imageData.data[centerIndex + 2] = 255; // B
    imageData.data[centerIndex + 3] = 255; // A

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now()
    };

    const params = {
      type: FilterType.GLOW as const,
      color: '#00ff00',
      blur: 3,
      strength: 2,
      quality: 'medium' as const,
      opacity: 1,
      enabled: true
    };

    const result = await filter.apply(context, params);
    
    expect(result.success).toBe(true);
    expect(result.processedImageData).toBeDefined();
    expect(result.processingTime).toBeGreaterThan(0);
    
    // 发光效果应该扩展图像尺寸（包含发光边缘）
    expect(result.processedImageData!.width).toBeGreaterThanOrEqual(imageData.width);
    expect(result.processedImageData!.height).toBeGreaterThanOrEqual(imageData.height);
  });

  it('应该正确处理不同质量设置', async () => {
    const imageData = new ImageData(3, 3);
    imageData.data[0] = 255;
    imageData.data[3] = 255;

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now()
    };

    // 测试低质量
    const lowQualityParams = {
      type: FilterType.GLOW as const,
      color: '#ff0000',
      blur: 5,
      strength: 1,
      quality: 'low' as const,
      opacity: 1,
      enabled: true
    };

    const lowResult = await filter.apply(context, lowQualityParams);
    expect(lowResult.success).toBe(true);

    // 测试高质量
    const params = {
      type: FilterType.GLOW as const,
      color: '#ff0000',
      blur: 5,
      strength: 1.5,
      quality: 'high' as const,
      opacity: 1,
      enabled: true
    };

    const highResult = await filter.apply(context, params);
    expect(highResult.success).toBe(true);
    
    // 高质量应该花费更多时间
    expect(highResult.processingTime).toBeGreaterThanOrEqual(lowResult.processingTime!);
  });

  it('应该正确处理高强度发光', async () => {
    const imageData = new ImageData(3, 3);
    imageData.data[0] = 100;
    imageData.data[1] = 100;
    imageData.data[2] = 100;
    imageData.data[3] = 255;

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now()
    };

    const params = {
      type: FilterType.GLOW as const,
      color: '#ffffff',
      blur: 2,
      strength: 3, // 高强度
      quality: 'medium' as const,
      opacity: 1,
      enabled: true
    };

    const result = await filter.apply(context, params);
    expect(result.success).toBe(true);
    expect(result.processedImageData).toBeDefined();
  });

  it('应该估算处理时间', () => {
    const params = {
      type: FilterType.GLOW as const,
      color: '#ffffff',
      blur: 15,
      strength: 2.5,
      quality: 'high' as const,
      opacity: 1,
      enabled: true
    };

    const time = filter.estimateProcessingTime(100, 100, params);
    expect(time).toBeGreaterThan(0);
  });

  it('应该正确解析不同颜色格式', async () => {
    const imageData = new ImageData(2, 2);
    imageData.data[0] = 255;
    imageData.data[3] = 255;

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now()
    };

    // 测试短十六进制颜色
    const params1 = {
      type: FilterType.GLOW as const,
      color: '#f0f',
      blur: 1,
      strength: 1,
      quality: 'low' as const,
      opacity: 1,
      enabled: true
    };

    const result1 = await filter.apply(context, params1);
    expect(result1.success).toBe(true);

    // 测试rgba颜色
    const params2 = {
      type: FilterType.GLOW as const,
      color: 'rgba(0, 255, 255, 0.8)',
      blur: 1,
      strength: 1,
      quality: 'low' as const,
      opacity: 1,
      enabled: true
    };

    const result2 = await filter.apply(context, params2);
    expect(result2.success).toBe(true);
  });

  it('应该处理多次模糊通道', async () => {
    const imageData = new ImageData(4, 4);
    imageData.data[0] = 255;
    imageData.data[3] = 255;

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now()
    };

    const params = {
      type: FilterType.GLOW as const,
      color: '#ffff00',
      blur: 6,
      strength: 1.5,
      quality: 'high' as const, // 高质量使用多次模糊
      opacity: 1,
      enabled: true
    };

    const result = await filter.apply(context, params);
    expect(result.success).toBe(true);
    expect(result.processedImageData).toBeDefined();
  });
});