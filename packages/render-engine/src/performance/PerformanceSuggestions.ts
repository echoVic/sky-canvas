/**
 * 性能建议系统
 * 提供基于指标的优化建议
 */

import {
  type BottleneckAnalysis,
  type CorrelationResult,
  UnifiedMetricType,
} from './PerformanceTypes'

/**
 * 建议类型
 */
type IssueType = 'low' | 'high'

/**
 * 性能建议查找表
 */
const SUGGESTIONS_MAP: Record<UnifiedMetricType, Record<IssueType, string[]>> = {
  [UnifiedMetricType.FPS]: {
    low: ['减少渲染复杂度', '优化着色器', '启用批处理', '使用LOD系统'],
    high: ['检查是否有不必要的优化', '可以提高渲染质量'],
  },
  [UnifiedMetricType.FRAME_TIME]: {
    low: ['检查计时器精度'],
    high: ['优化渲染管线', '减少CPU处理时间', '启用并行处理'],
  },
  [UnifiedMetricType.RENDER_TIME]: {
    low: ['渲染效率良好'],
    high: ['优化渲染管线', '减少渲染复杂度', '启用并行渲染'],
  },
  [UnifiedMetricType.UPDATE_TIME]: {
    low: ['更新效率良好'],
    high: ['优化更新逻辑', '减少不必要计算', '启用增量更新'],
  },
  [UnifiedMetricType.DRAW_CALLS]: {
    low: ['可以进一步合并批处理'],
    high: ['合并绘制调用', '使用实例化渲染', '启用批处理系统'],
  },
  [UnifiedMetricType.VERTICES]: {
    low: ['顶点数量合理'],
    high: ['减少顶点数量', '使用LOD系统', '启用几何优化'],
  },
  [UnifiedMetricType.TRIANGLES]: {
    low: ['三角形数量合理'],
    high: ['减少三角形数量', '使用LOD系统', '启用网格优化'],
  },
  [UnifiedMetricType.BATCH_COUNT]: {
    low: ['批处理效率良好'],
    high: ['合并更多批次', '优化批处理算法', '启用智能分组'],
  },
  [UnifiedMetricType.GPU_MEMORY]: {
    low: ['GPU内存使用合理'],
    high: ['清理GPU资源', '启用纹理压缩', '优化缓冲区管理'],
  },
  [UnifiedMetricType.SHADER_COMPILE_TIME]: {
    low: ['着色器编译效率良好'],
    high: ['缓存编译结果', '优化着色器代码', '启用预编译'],
  },
  [UnifiedMetricType.MEMORY_USAGE]: {
    low: ['检查是否有内存泄漏'],
    high: ['清理未使用资源', '启用纹理压缩', '优化资源管理'],
  },
  [UnifiedMetricType.TEXTURE_MEMORY]: {
    low: ['纹理内存使用合理'],
    high: ['压缩纹理', '清理未使用纹理', '优化纹理格式'],
  },
  [UnifiedMetricType.BUFFER_MEMORY]: {
    low: ['缓冲区内存使用合理'],
    high: ['清理缓冲区', '优化缓冲区大小', '启用内存池'],
  },
  [UnifiedMetricType.CPU_USAGE]: {
    low: ['CPU使用率良好'],
    high: ['优化CPU密集型操作', '启用多线程', '减少同步等待'],
  },
  [UnifiedMetricType.CACHE_HIT_RATE]: {
    low: ['优化缓存策略', '增加缓存容量', '改善缓存键算法'],
    high: ['缓存效率良好'],
  },
  [UnifiedMetricType.CULLED_OBJECTS]: {
    low: ['裁剪效率有待提高'],
    high: ['裁剪系统工作良好'],
  },
  [UnifiedMetricType.LOD_SWITCHES]: {
    low: ['LOD切换较少'],
    high: ['优化LOD阈值', '减少频繁切换', '改善LOD算法'],
  },
  [UnifiedMetricType.PLUGIN_LOAD_TIME]: {
    low: ['插件加载效率良好'],
    high: ['优化插件加载', '启用懒加载', '压缩插件资源'],
  },
  [UnifiedMetricType.PLUGIN_ACTIVATE_TIME]: {
    low: ['插件激活效率良好'],
    high: ['优化插件初始化', '减少依赖加载', '启用异步激活'],
  },
  [UnifiedMetricType.PLUGIN_API_CALLS]: {
    low: ['插件API调用较少'],
    high: ['优化API调用频率', '启用批量操作', '缓存API结果'],
  },
  [UnifiedMetricType.PLUGIN_ERRORS]: {
    low: ['插件运行稳定'],
    high: ['修复插件错误', '加强错误处理', '验证插件兼容性'],
  },
  [UnifiedMetricType.INPUT_LATENCY]: {
    low: ['输入响应良好'],
    high: ['优化事件处理', '减少输入队列积压', '启用预测输入'],
  },
  [UnifiedMetricType.EVENT_PROCESSING_TIME]: {
    low: ['事件处理效率良好'],
    high: ['优化事件处理逻辑', '启用事件池', '减少事件传播'],
  },
  [UnifiedMetricType.GESTURE_RECOGNITION_TIME]: {
    low: ['手势识别效率良好'],
    high: ['优化识别算法', '减少计算复杂度', '启用硬件加速'],
  },
}

/**
 * 性能建议提供器
 */
export class PerformanceSuggestionProvider {
  /**
   * 获取指标建议
   */
  getSuggestionsForMetric(metricType: UnifiedMetricType, issue: IssueType): string[] {
    return SUGGESTIONS_MAP[metricType]?.[issue] || ['暂无建议']
  }

  /**
   * 生成综合建议
   */
  generateRecommendations(
    bottlenecks: BottleneckAnalysis,
    correlations: CorrelationResult[],
    highSeverityWarningsCount: number
  ): string[] {
    const recommendations: string[] = []

    // 基于瓶颈分析的建议
    if (bottlenecks.type !== 'none') {
      recommendations.push(...bottlenecks.suggestions)
    }

    // 基于关联分析的建议
    for (const correlation of correlations) {
      if (Math.abs(correlation.correlation) > 0.8) {
        recommendations.push(
          `注意 ${correlation.metric1} 和 ${correlation.metric2} 之间的强关联性，优化时需要同时考虑`
        )
      }
    }

    // 通用建议
    if (highSeverityWarningsCount > 0) {
      recommendations.push('优先处理高严重性警告')
    }

    return [...new Set(recommendations)] // 去重
  }
}
