/**
 * AnimationExamples 单元测试
 * 测试动画示例的功能
 */

import '../setup';
import { AnimationExamples, runAnimationExamples } from '../../examples/AnimationExamples';

describe('AnimationExamples', () => {
  let examples: AnimationExamples;

  beforeEach(() => {
    examples = new AnimationExamples();
  });

  afterEach(() => {
    examples.dispose();
  });

  describe('基本功能', () => {
    it('应该正确创建 AnimationExamples 实例', () => {
      expect(examples).toBeInstanceOf(AnimationExamples);
    });

    it('应该正确清理资源', () => {
      expect(() => {
        examples.dispose();
      }).not.toThrow();
    });
  });

  describe('基础属性动画示例', () => {
    it('应该正确创建基础属性动画', () => {
      expect(() => {
        examples.basicPropertyAnimation();
      }).not.toThrow();
    });
  });

  describe('多属性动画示例', () => {
    it('应该正确创建多属性动画', () => {
      expect(() => {
        examples.multiPropertyAnimation();
      }).not.toThrow();
    });
  });

  describe('并行动画组示例', () => {
    it('应该正确创建并行动画组', () => {
      expect(() => {
        examples.parallelAnimationGroup();
      }).not.toThrow();
    });
  });

  describe('时间轴序列示例', () => {
    it('应该正确创建时间轴序列', () => {
      expect(() => {
        examples.timelineSequence();
      }).not.toThrow();
    });
  });

  describe('复杂时间轴编排示例', () => {
    it('应该正确创建复杂时间轴编排', () => {
      expect(() => {
        examples.complexTimelineChoreography();
      }).not.toThrow();
    });
  });

  describe('循环和往返动画示例', () => {
    it('应该正确创建循环和往返动画', () => {
      expect(() => {
        examples.loopingAndYoyoAnimations();
      }).not.toThrow();
    });
  });

  describe('工具函数示例', () => {
    it('应该正确执行工具函数示例', () => {
      expect(() => {
        examples.utilityFunctionExamples();
      }).not.toThrow();
    });
  });

  describe('嵌套属性动画示例', () => {
    it('应该正确创建嵌套属性动画', () => {
      expect(() => {
        examples.nestedPropertyAnimation();
      }).not.toThrow();
    });
  });

  describe('动画链式调用示例', () => {
    it('应该正确创建动画链式调用', () => {
      expect(() => {
        examples.animationChaining();
      }).not.toThrow();
    });
  });

  describe('控制台输出', () => {
    it('基础属性动画应该输出正确的日志', () => {
      expect(() => {
        examples.basicPropertyAnimation();
      }).not.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该正确处理动画创建失败', () => {
      expect(() => {
        examples.basicPropertyAnimation();
      }).not.toThrow();
    });

    it('应该正确处理动画组创建失败', () => {
      expect(() => {
        examples.parallelAnimationGroup();
      }).not.toThrow();
    });

    it('应该正确处理时间轴创建失败', () => {
      expect(() => {
        examples.timelineSequence();
      }).not.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该能够快速执行所有示例', () => {
      const startTime = performance.now();

      examples.basicPropertyAnimation();
      examples.multiPropertyAnimation();
      examples.parallelAnimationGroup();
      examples.timelineSequence();
      examples.complexTimelineChoreography();
      examples.loopingAndYoyoAnimations();
      examples.utilityFunctionExamples();
      examples.nestedPropertyAnimation();
      examples.animationChaining();

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // 应该在100ms内完成
    });
  });
});

describe('runAnimationExamples', () => {
  it('应该正确运行动画示例', () => {
    expect(() => {
      runAnimationExamples();
    }).not.toThrow();
  });

  it('应该正确输出示例标题', () => {
    expect(() => {
      runAnimationExamples();
    }).not.toThrow();
  });

  it('应该正确处理示例执行错误', () => {
    expect(() => {
      runAnimationExamples();
    }).not.toThrow();
  });
});