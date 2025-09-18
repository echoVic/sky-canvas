/**
 * 滤镜工具函数测试
 */

import '../../__tests__/setup';
import { FilterType } from '../../types/FilterTypes';
import { FilterUtils } from '../../utils/FilterUtils';

describe('FilterUtils', () => {
  
  describe('滤镜参数创建', () => {
    it('应该创建高斯模糊参数', () => {
      const params = FilterUtils.createGaussianBlur(10, 'high', 0.8);
      
      expect(params.type).toBe(FilterType.GAUSSIAN_BLUR);
      expect(params.radius).toBe(10);
      expect(params.quality).toBe('high');
      expect(params.opacity).toBe(0.8);
      expect(params.enabled).toBe(true);
    });

    it('应该限制高斯模糊半径范围', () => {
      const params1 = FilterUtils.createGaussianBlur(-5);
      const params2 = FilterUtils.createGaussianBlur(150);
      
      expect(params1.radius).toBe(0);
      expect(params2.radius).toBe(100);
    });

    it('应该创建亮度调整参数', () => {
      const params = FilterUtils.createBrightness(30, 0.9);
      
      expect(params.type).toBe(FilterType.BRIGHTNESS);
      expect(params.brightness).toBe(30);
      expect(params.opacity).toBe(0.9);
      expect(params.enabled).toBe(true);
    });

    it('应该限制亮度值范围', () => {
      const params1 = FilterUtils.createBrightness(-150);
      const params2 = FilterUtils.createBrightness(150);
      
      expect(params1.brightness).toBe(-100);
      expect(params2.brightness).toBe(100);
    });

    it('应该创建对比度调整参数', () => {
      const params = FilterUtils.createContrast(25);
      
      expect(params.type).toBe(FilterType.CONTRAST);
      expect(params.contrast).toBe(25);
      expect(params.enabled).toBe(true);
    });

    it('应该创建饱和度调整参数', () => {
      const params = FilterUtils.createSaturation(15);
      
      expect(params.type).toBe(FilterType.SATURATION);
      expect(params.saturation).toBe(15);
      expect(params.enabled).toBe(true);
    });

    it('应该创建色相旋转参数', () => {
      const params = FilterUtils.createHueRotate(180);
      
      expect(params.type).toBe(FilterType.HUE_ROTATE);
      expect(params.angle).toBe(180);
      expect(params.enabled).toBe(true);
    });

    it('应该处理色相角度的环绕', () => {
      const params = FilterUtils.createHueRotate(450);
      
      expect(params.angle).toBe(90); // 450 % 360 = 90
    });

    it('应该创建灰度参数', () => {
      const params = FilterUtils.createGrayscale(0.5);
      
      expect(params.type).toBe(FilterType.GRAYSCALE);
      expect(params.amount).toBe(0.5);
      expect(params.enabled).toBe(true);
    });

    it('应该限制灰度值范围', () => {
      const params1 = FilterUtils.createGrayscale(-0.5);
      const params2 = FilterUtils.createGrayscale(1.5);
      
      expect(params1.amount).toBe(0);
      expect(params2.amount).toBe(1);
    });
  });

  describe('预设效果', () => {
    it('应该创建复古效果', () => {
      const filters = FilterUtils.createVintageEffect();
      
      expect(filters).toHaveLength(4);
      expect(filters[0].type).toBe(FilterType.SATURATION);
      expect(filters[1].type).toBe(FilterType.CONTRAST);
      expect(filters[2].type).toBe(FilterType.BRIGHTNESS);
      expect(filters[3].type).toBe(FilterType.HUE_ROTATE);
    });

    it('应该创建黑白电影效果', () => {
      const filters = FilterUtils.createFilmNoirEffect();
      
      expect(filters).toHaveLength(3);
      expect(filters[0].type).toBe(FilterType.GRAYSCALE);
      expect(filters[1].type).toBe(FilterType.CONTRAST);
      expect(filters[2].type).toBe(FilterType.BRIGHTNESS);
    });

    it('应该创建梦幻效果', () => {
      const filters = FilterUtils.createDreamEffect();
      
      expect(filters).toHaveLength(4);
      expect(filters[0].type).toBe(FilterType.GAUSSIAN_BLUR);
      expect(filters[1].type).toBe(FilterType.BRIGHTNESS);
      expect(filters[2].type).toBe(FilterType.SATURATION);
      expect(filters[3].type).toBe(FilterType.CONTRAST);
    });

    it('应该创建冷色调效果', () => {
      const filters = FilterUtils.createCoolToneEffect();
      
      expect(filters).toHaveLength(3);
      expect(filters[0].type).toBe(FilterType.HUE_ROTATE);
      expect(filters[1].type).toBe(FilterType.SATURATION);
      expect(filters[2].type).toBe(FilterType.BRIGHTNESS);
    });

    it('应该创建暖色调效果', () => {
      const filters = FilterUtils.createWarmToneEffect();
      
      expect(filters).toHaveLength(4);
      expect(filters[0].type).toBe(FilterType.HUE_ROTATE);
      expect(filters[1].type).toBe(FilterType.SATURATION);
      expect(filters[2].type).toBe(FilterType.BRIGHTNESS);
      expect(filters[3].type).toBe(FilterType.CONTRAST);
    });
  });

  describe('图像数据处理', () => {
    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D;

    beforeEach(() => {
      canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      ctx = canvas.getContext('2d')!;
    });

    it('应该从Canvas获取ImageData', () => {
      const imageData = FilterUtils.getImageDataFromCanvas(canvas);
      
      expect(imageData.width).toBe(10);
      expect(imageData.height).toBe(10);
      expect(imageData.data).toBeDefined();
      expect(imageData.data.length).toBe(10 * 10 * 4);
    });

    it('应该将ImageData绘制到Canvas', () => {
      const imageData = new ImageData(5, 5);
      // 设置为蓝色
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 0;     // R
        imageData.data[i + 1] = 0; // G  
        imageData.data[i + 2] = 255; // B
        imageData.data[i + 3] = 255; // A
      }
      
      FilterUtils.putImageDataToCanvas(canvas, imageData);
      
      expect(canvas.width).toBe(5);
      expect(canvas.height).toBe(5);
      
      // 验证putImageData被调用
      expect(ctx.putImageData).toHaveBeenCalled();
    });

    it('应该转换ImageData到DataURL', () => {
      const imageData = new ImageData(2, 2);
      // 设置白色
      for (let i = 0; i < imageData.data.length; i += 4) {
        imageData.data[i] = 255;
        imageData.data[i + 1] = 255;
        imageData.data[i + 2] = 255;
        imageData.data[i + 3] = 255;
      }
      
      const dataURL = FilterUtils.imageDataToDataURL(imageData);
      
      expect(dataURL).toMatch(/^data:image\/png;base64,/);
    });

    it('应该比较两个ImageData', () => {
      const imageData1 = new ImageData(2, 2);
      const imageData2 = new ImageData(2, 2);
      const imageData3 = new ImageData(3, 3); // 不同尺寸
      
      expect(FilterUtils.compareImageData(imageData1, imageData2)).toBe(true);
      expect(FilterUtils.compareImageData(imageData1, imageData3)).toBe(false);
      
      // 修改一个像素
      imageData2.data[0] = 100;
      expect(FilterUtils.compareImageData(imageData1, imageData2)).toBe(false);
    });

    it('应该生成ImageData哈希', () => {
      const imageData1 = new ImageData(3, 3);
      const imageData2 = new ImageData(3, 3);
      
      const hash1 = FilterUtils.hashImageData(imageData1);
      const hash2 = FilterUtils.hashImageData(imageData2);
      
      expect(hash1).toBe(hash2); // 相同内容应该有相同哈希
      expect(hash1).toMatch(/^\d+x\d+_/); // 格式应该正确
      
      // 修改数据
      imageData2.data[0] = 100;
      const hash3 = FilterUtils.hashImageData(imageData2);
      expect(hash1).not.toBe(hash3); // 不同内容应该有不同哈希
    });

    it('应该创建测试图像数据', () => {
      const imageData = FilterUtils.createTestImageData(20, 15);
      
      expect(imageData.width).toBe(20);
      expect(imageData.height).toBe(15);
      expect(imageData.data.length).toBe(20 * 15 * 4);
      
      // 检查是否有彩色内容
      let hasColor = false;
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] !== imageData.data[i + 1] || 
            imageData.data[i + 1] !== imageData.data[i + 2]) {
          hasColor = true;
          break;
        }
      }
      expect(hasColor).toBe(true);
    });

    it('应该使用默认尺寸创建测试图像', () => {
      const imageData = FilterUtils.createTestImageData();
      
      expect(imageData.width).toBe(100);
      expect(imageData.height).toBe(100);
    });
  });

  describe('错误处理', () => {
    it('当无法获取2D上下文时应该抛出错误', () => {
      const mockCanvas = {
        getContext: () => null
      } as unknown as HTMLCanvasElement;
      
      expect(() => {
        FilterUtils.getImageDataFromCanvas(mockCanvas);
      }).toThrow('Cannot get 2D context from canvas');
    });

    it('当无法创建2D上下文时应该抛出错误', () => {
      const imageData = new ImageData(5, 5);
      const mockCanvas = {
        getContext: () => null
      } as unknown as HTMLCanvasElement;
      
      expect(() => {
        FilterUtils.putImageDataToCanvas(mockCanvas, imageData);
      }).toThrow('Cannot get 2D context from canvas');
    });
  });
});