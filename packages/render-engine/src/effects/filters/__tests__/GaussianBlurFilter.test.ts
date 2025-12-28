/**
 * 高斯模糊滤镜测试
 */

import '../../__tests__/setup';
import { GaussianBlurFilter } from '../GaussianBlurFilter';
import { FilterType } from '../../types/FilterTypes';

describe('GaussianBlurFilter', () => {
  let filter: GaussianBlurFilter;
  
  beforeEach(() => {
    filter = new GaussianBlurFilter();
  });

  afterEach(() => {
    filter.dispose();
  });

  it('应该正确初始化', () => {
    expect(filter.type).toBe(FilterType.GAUSSIAN_BLUR);
    expect(filter.name).toBe('Gaussian Blur');
    expect(filter.requiresWebGL).toBe(false);
  });

  it('应该返回默认参数', () => {
    const defaultParams = filter.getDefaultParameters();
    expect(defaultParams.type).toBe(FilterType.GAUSSIAN_BLUR);
    expect(defaultParams.radius).toBe(5);
    expect(defaultParams.quality).toBe('medium');
    expect(defaultParams.opacity).toBe(1);
    expect(defaultParams.enabled).toBe(true);
  });

  it('应该验证参数', () => {
    const validParams = {
      type: FilterType.GAUSSIAN_BLUR as const,
      radius: 5,
      quality: 'medium' as const,
      opacity: 0.8,
      enabled: true
    };
    
    expect(filter.validateParameters(validParams)).toBe(true);
  });

  it('应该拒绝无效参数', () => {
    const invalidParams = {
      type: FilterType.GAUSSIAN_BLUR as const,
      radius: -5, // 无效半径
      quality: 'medium' as const,
      opacity: 1,
      enabled: true
    };
    
    expect(filter.validateParameters(invalidParams)).toBe(false);
  });

  it('当半径为0时应该返回原始图像', async () => {
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
      type: FilterType.GAUSSIAN_BLUR as const,
      radius: 3,
      quality: 'medium' as const,
      opacity: 1,
      enabled: true
    };

    const result = await filter.apply(context, params);
    
    expect(result.success).toBe(true);
    expect(result.processedImageData).toBeDefined();
    expect(result.processedImageData!.data[0]).toBe(255);
  });

  it('应该估算处理时间', () => {
    const params = {
      type: FilterType.GAUSSIAN_BLUR as const,
      radius: 5,
      quality: 'high' as const,
      opacity: 1,
      enabled: true
    };

    const time = filter.estimateProcessingTime(100, 100, params);
    expect(time).toBeGreaterThan(0);
  });

  it('当滤镜禁用时应该返回原始图像', async () => {
    const imageData = new ImageData(10, 10);
    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now()
    };

    const params = {
      type: FilterType.GAUSSIAN_BLUR as const,
      radius: 10,
      quality: 'medium' as const,
      opacity: 1,
      enabled: true
    };

    const result = await filter.apply(context, params);
    
    expect(result.success).toBe(true);
    expect(result.processedImageData).toStrictEqual(imageData);
  });

  it('应该正确处理不透明度', async () => {
    const imageData = new ImageData(2, 2);
    // 设置白色像素
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 255;
      imageData.data[i + 1] = 255;
      imageData.data[i + 2] = 255;
      imageData.data[i + 3] = 255;
    }

    const context = {
      sourceImageData: imageData,
      width: imageData.width,
      height: imageData.height,
      timestamp: Date.now()
    };

    const params = {
      type: FilterType.GAUSSIAN_BLUR as const,
      radius: 2,
      quality: 'low' as const,
      opacity: 1,
      enabled: true
    };

    const result = await filter.apply(context, params);
    
    expect(result.success).toBe(true);
    expect(result.processedImageData).toBeDefined();
  });
});