/**
 * 性能基准测试系统测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  BatchEfficiencyBenchmark,
  type BenchmarkConfig,
  BenchmarkType,
  createDefaultBenchmarkSuite,
  DrawCallBenchmark,
  FPSBenchmark,
  MemoryBenchmark,
  PerformanceBenchmarkSuite,
} from '../PerformanceBenchmark'

// Mock performance APIs
Object.defineProperty(global.performance, 'now', {
  writable: true,
  value: vi.fn(() => Date.now()),
})

Object.defineProperty(global.performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 50 * 1024 * 1024,
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024,
  },
})

global.requestAnimationFrame = vi.fn((callback) => {
  setTimeout(callback, 16) // 模拟60fps
  return 1
})

describe('PerformanceBenchmarkSuite', () => {
  let suite: PerformanceBenchmarkSuite

  beforeEach(() => {
    suite = new PerformanceBenchmarkSuite()
    vi.clearAllMocks()
  })

  afterEach(() => {
    suite?.removeAllListeners()
  })

  describe('基础功能', () => {
    it('应该能够创建基准测试套件', () => {
      expect(suite).toBeInstanceOf(PerformanceBenchmarkSuite)
    })

    it('应该能够添加测试场景', () => {
      const mockScenario = {
        name: 'Test Scenario',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn().mockReturnValue({
          name: 'Test',
          type: BenchmarkType.FRAME_RATE,
          score: 60,
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now(),
          passed: true,
        }),
      }

      suite.addScenario(mockScenario)
      expect(suite['scenarios']).toHaveLength(1)
    })

    it('应该能够运行所有测试场景', async () => {
      const mockScenario = {
        name: 'Test Scenario',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn().mockReturnValue({
          name: 'Test',
          type: BenchmarkType.FRAME_RATE,
          score: 60,
          unit: 'FPS',
          metadata: { fps: 60 },
          timestamp: Date.now(),
          passed: true,
        }),
      }

      suite.addScenario(mockScenario)
      const results = await suite.runAll()

      expect(results).toHaveLength(1)
      expect(results[0].passed).toBe(true)
      expect(mockScenario.setup).toHaveBeenCalled()
      expect(mockScenario.execute).toHaveBeenCalled()
      expect(mockScenario.cleanup).toHaveBeenCalled()
    })

    it('应该能够处理测试失败', async () => {
      const mockScenario = {
        name: 'Failing Scenario',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockRejectedValue(new Error('Test error')),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn(),
      }

      let errorReceived = false
      suite.on('scenarioError', () => {
        errorReceived = true
      })

      suite.addScenario(mockScenario)
      const results = await suite.runAll()

      expect(results).toHaveLength(0)
      expect(errorReceived).toBe(true)
    })

    it('应该能够获取测试摘要', async () => {
      const mockScenarios = [
        {
          name: 'Passing Test',
          setup: vi.fn().mockResolvedValue(undefined),
          execute: vi.fn().mockResolvedValue(undefined),
          cleanup: vi.fn().mockResolvedValue(undefined),
          measure: vi.fn().mockReturnValue({
            name: 'Test1',
            type: BenchmarkType.FRAME_RATE,
            score: 60,
            unit: 'FPS',
            metadata: {},
            timestamp: Date.now(),
            passed: true,
          }),
        },
        {
          name: 'Failing Test',
          setup: vi.fn().mockResolvedValue(undefined),
          execute: vi.fn().mockResolvedValue(undefined),
          cleanup: vi.fn().mockResolvedValue(undefined),
          measure: vi.fn().mockReturnValue({
            name: 'Test2',
            type: BenchmarkType.FRAME_RATE,
            score: 20,
            unit: 'FPS',
            metadata: {},
            timestamp: Date.now(),
            passed: false,
            threshold: 30,
          }),
        },
      ]

      mockScenarios.forEach((scenario) => suite.addScenario(scenario))
      await suite.runAll()

      const summary = suite.getSummary()
      expect(summary.total).toBe(2)
      expect(summary.passed).toBe(1)
      expect(summary.failed).toBe(1)
    })
  })

  describe('性能回归检测', () => {
    it('应该能够检测性能回归', async () => {
      const mockScenario = {
        name: 'Performance Test',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn().mockReturnValue({
          name: 'Performance Test',
          type: BenchmarkType.FRAME_RATE,
          score: 45, // 比基准低25%
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now(),
          passed: true,
        }),
      }

      suite.addScenario(mockScenario)
      await suite.runAll()

      const baseline = [
        {
          name: 'Performance Test',
          type: BenchmarkType.FRAME_RATE,
          score: 60,
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now() - 10000,
          passed: true,
        },
      ]

      const regression = suite.detectRegression(baseline, 0.1)
      expect(regression.regressions).toHaveLength(1)
      expect(regression.regressions[0].regression).toBeCloseTo(25, 1)
    })

    it('应该能够检测性能改进', async () => {
      const mockScenario = {
        name: 'Improved Test',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn().mockReturnValue({
          name: 'Improved Test',
          type: BenchmarkType.FRAME_RATE,
          score: 80, // 比基准高33%
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now(),
          passed: true,
        }),
      }

      suite.addScenario(mockScenario)
      await suite.runAll()

      const baseline = [
        {
          name: 'Improved Test',
          type: BenchmarkType.FRAME_RATE,
          score: 60,
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now() - 10000,
          passed: true,
        },
      ]

      const regression = suite.detectRegression(baseline, 0.1)
      expect(regression.improvements).toHaveLength(1)
      expect(regression.improvements[0].improvement).toBeCloseTo(33.33, 1)
    })
  })

  describe('报告生成', () => {
    it('应该能够导出JSON结果', async () => {
      const mockScenario = {
        name: 'Export Test',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn().mockReturnValue({
          name: 'Export Test',
          type: BenchmarkType.FRAME_RATE,
          score: 60,
          unit: 'FPS',
          metadata: { fps: 60 },
          timestamp: Date.now(),
          passed: true,
        }),
      }

      suite.addScenario(mockScenario)
      await suite.runAll()

      const json = suite.exportResults()
      const report = JSON.parse(json)

      expect(report).toHaveProperty('timestamp')
      expect(report).toHaveProperty('environment')
      expect(report).toHaveProperty('summary')
      expect(report).toHaveProperty('results')
      expect(report.results).toHaveLength(1)
    })

    it('应该能够生成HTML报告', async () => {
      const mockScenario = {
        name: 'HTML Report Test',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn().mockReturnValue({
          name: 'HTML Report Test',
          type: BenchmarkType.FRAME_RATE,
          score: 60,
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now(),
          passed: true,
        }),
      }

      suite.addScenario(mockScenario)
      await suite.runAll()

      const html = suite.generateHTMLReport()

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('性能基准测试报告')
      expect(html).toContain('HTML Report Test')
      expect(html).toContain('PASS')
    })
  })

  describe('事件系统', () => {
    it('应该触发套件开始事件', async () => {
      let suiteStarted = false
      suite.on('suiteStart', () => {
        suiteStarted = true
      })

      await suite.runAll()
      expect(suiteStarted).toBe(true)
    })

    it('应该触发场景完成事件', async () => {
      let scenarioCompleted = false
      suite.on('scenarioComplete', () => {
        scenarioCompleted = true
      })

      const mockScenario = {
        name: 'Event Test',
        setup: vi.fn().mockResolvedValue(undefined),
        execute: vi.fn().mockResolvedValue(undefined),
        cleanup: vi.fn().mockResolvedValue(undefined),
        measure: vi.fn().mockReturnValue({
          name: 'Event Test',
          type: BenchmarkType.FRAME_RATE,
          score: 60,
          unit: 'FPS',
          metadata: {},
          timestamp: Date.now(),
          passed: true,
        }),
      }

      suite.addScenario(mockScenario)
      await suite.runAll()

      expect(scenarioCompleted).toBe(true)
    })
  })
})

describe('FPSBenchmark', () => {
  let mockRenderLoop: () => void
  let config: BenchmarkConfig

  beforeEach(() => {
    mockRenderLoop = vi.fn()
    config = {
      name: 'FPS Test',
      type: BenchmarkType.FRAME_RATE,
      duration: 100, // 短时间测试
      threshold: 30,
      warmupTime: 50,
    }
  })

  it('应该能够测量FPS', async () => {
    const benchmark = new FPSBenchmark(mockRenderLoop, config)

    await benchmark.setup()
    await benchmark.execute()
    const result = benchmark.measure()

    expect(result.name).toBe('FPS Performance Test')
    expect(result.type).toBe(BenchmarkType.FRAME_RATE)
    expect(result.score).toBeGreaterThan(0)
    expect(result.unit).toBe('FPS')
    expect(result.metadata.fps).toBeDefined()
  })

  it('应该进行预热', async () => {
    const benchmark = new FPSBenchmark(mockRenderLoop, config)

    await benchmark.setup()

    // 预热应该调用渲染循环
    expect(mockRenderLoop).toHaveBeenCalled()
  })
})

describe('MemoryBenchmark', () => {
  let mockMemoryOperation: () => void
  let config: BenchmarkConfig

  beforeEach(() => {
    mockMemoryOperation = vi.fn()
    config = {
      name: 'Memory Test',
      type: BenchmarkType.MEMORY_USAGE,
      duration: 100,
      threshold: 50,
    }
  })

  it('应该能够测量内存使用', async () => {
    const benchmark = new MemoryBenchmark(mockMemoryOperation, config)

    await benchmark.setup()
    await benchmark.execute()
    const result = benchmark.measure()

    expect(result.name).toBe('Memory Usage Test')
    expect(result.type).toBe(BenchmarkType.MEMORY_USAGE)
    expect(result.unit).toBe('MB')
    expect(result.metadata.memoryUsage).toBeDefined()
  })
})

describe('DrawCallBenchmark', () => {
  let mockRenderObjects: (count: number) => { drawCalls: number; batches: number }
  let config: BenchmarkConfig

  beforeEach(() => {
    mockRenderObjects = vi.fn().mockReturnValue({
      drawCalls: 10,
      batches: 5,
    })

    config = {
      name: 'Draw Call Test',
      type: BenchmarkType.DRAW_CALLS,
      duration: 100,
      threshold: 5,
    }
  })

  it('应该能够测量绘制调用效率', async () => {
    const benchmark = new DrawCallBenchmark(mockRenderObjects, config)

    await benchmark.setup()
    await benchmark.execute()
    const result = benchmark.measure()

    expect(result.name).toBe('Draw Call Efficiency Test')
    expect(result.type).toBe(BenchmarkType.DRAW_CALLS)
    expect(result.unit).toBe('objects/call')
    expect(result.score).toBe(10) // 100 objects / 10 draw calls
    expect(result.metadata.drawCalls).toBe(10)
    expect(result.metadata.batchCount).toBe(5)
  })
})

describe('BatchEfficiencyBenchmark', () => {
  let mockBatchedRender: (objects: any[]) => number
  let config: BenchmarkConfig

  beforeEach(() => {
    mockBatchedRender = vi.fn().mockReturnValue(20) // 从1000个对象减少到20个批次

    config = {
      name: 'Batch Test',
      type: BenchmarkType.BATCH_EFFICIENCY,
      duration: 100,
      threshold: 50,
    }
  })

  it('应该能够测量批处理效率', async () => {
    const benchmark = new BatchEfficiencyBenchmark(mockBatchedRender, config)

    await benchmark.setup()
    await benchmark.execute()
    const result = benchmark.measure()

    expect(result.name).toBe('Batch Efficiency Test')
    expect(result.type).toBe(BenchmarkType.BATCH_EFFICIENCY)
    expect(result.unit).toBe('% reduction')
    expect(result.score).toBe(98) // (1000-20)/1000 * 100 = 98%
    expect(result.metadata.batchCount).toBe(20)
  })
})

describe('createDefaultBenchmarkSuite', () => {
  it('应该创建包含默认测试的套件', () => {
    const mockRenderEngine = {
      render: vi.fn(),
    }

    const suite = createDefaultBenchmarkSuite(mockRenderEngine)

    expect(suite).toBeInstanceOf(PerformanceBenchmarkSuite)
    expect(suite['scenarios']).toHaveLength(2) // FPS + Memory tests
  })

  it('应该接受自定义性能监控器', () => {
    const mockRenderEngine = { render: vi.fn() }
    const mockPerformanceMonitor = {} as any

    const suite = createDefaultBenchmarkSuite(mockRenderEngine, mockPerformanceMonitor)

    expect(suite['performanceMonitor']).toBe(mockPerformanceMonitor)
  })
})
