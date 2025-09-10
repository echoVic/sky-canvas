/**
 * 智能批处理分组器
 * 实现按纹理、混合模式、着色器自动分组渲染对象的智能算法
 */

import { IRenderable } from '../core/IRenderEngine';
import { EventEmitter } from '../events/EventBus';

// 渲染状态
export interface RenderState {
  textureId: string | null;
  blendMode: string;
  shaderId: string;
  zIndex: number;
  opacity: number;
  cullMode: string;
  depthTest: boolean;
  stencilTest: boolean;
}

// 分组权重配置
export interface GroupingWeights {
  texture: number;      // 纹理切换代价
  blendMode: number;    // 混合模式切换代价
  shader: number;       // 着色器切换代价
  zIndex: number;       // z-index排序重要性
  stateChange: number;  // 渲染状态切换代价
}

// 分组统计信息
export interface GroupingStats {
  totalObjects: number;
  totalGroups: number;
  spatialClusters: number;
  mergedGroups: number;
  averageGroupSize: number;
  stateChanges: number;
  textureBinds: number;
  shaderSwitches: number;
  blendModeChanges: number;
  estimatedDrawCalls: number;
  optimizationRatio: number; // 优化比率（相对于未分组）
  processingTime: number;
}

// 渲染组
export interface RenderGroup {
  id: string;
  items: IRenderable[];
  renderState: RenderState;
  priority: number;
  canMerge: boolean;
  estimatedCost: number;
  spatialBounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

// 分组事件
export interface GroupingEvents {
  groupCreated: RenderGroup;
  groupMerged: { source: string; target: string; mergedGroup: RenderGroup };
  groupingComplete: { groups: RenderGroup[]; stats: GroupingStats };
  optimizationApplied: { before: GroupingStats; after: GroupingStats };
  optimizationComplete: GroupingStats;
}

/**
 * 智能批处理分组器
 */
export class IntelligentBatchGrouper extends EventEmitter<GroupingEvents> {
  private groups = new Map<string, RenderGroup>();
  private renderables: IRenderable[] = [];
  private stats: GroupingStats;
  private spatialClustersCount = 0;
  private mergedGroupsCount = 0;
  
  // 分组权重配置
  private weights: GroupingWeights = {
    texture: 10,      // 纹理切换成本最高
    blendMode: 8,     // 混合模式切换成本较高
    shader: 9,        // 着色器切换成本很高
    zIndex: 3,        // z-index影响较小但需要保持顺序
    stateChange: 6    // 其他状态切换成本中等
  };

  // 优化参数
  private readonly MAX_GROUP_SIZE = 10000;
  private readonly MIN_GROUP_SIZE = 10;
  private readonly SPATIAL_CLUSTERING_THRESHOLD = 0.3;
  private readonly MERGE_SIMILARITY_THRESHOLD = 0.8;

  constructor(customWeights?: Partial<GroupingWeights>) {
    super();
    if (customWeights) {
      this.weights = { ...this.weights, ...customWeights };
    }
    
    // 初始化统计信息
    this.stats = {
      totalObjects: 0,
      totalGroups: 0,
      spatialClusters: 0,
      mergedGroups: 0,
      averageGroupSize: 0,
      stateChanges: 0,
      textureBinds: 0,
      shaderSwitches: 0,
      blendModeChanges: 0,
      estimatedDrawCalls: 0,
      optimizationRatio: 0,
      processingTime: 0
    };
  }

  /**
   * 添加渲染对象
   */
  addRenderable(renderable: IRenderable): void {
    this.renderables.push(renderable);
  }

  /**
   * 批量添加渲染对象
   */
  addRenderables(renderables: IRenderable[]): void {
    this.renderables.push(...renderables);
  }

  /**
   * 执行智能分组
   */
  performGrouping(renderables?: IRenderable[]): RenderGroup[] {
    const startTime = performance.now();
    
    // 使用传入的对象或内部存储的对象
    const objectsToGroup = renderables || this.renderables;
    
    // 重置计数器
    this.spatialClustersCount = 0;
    this.mergedGroupsCount = 0;
    
    // 1. 清空现有分组
    this.groups.clear();

    // 2. 预处理：计算渲染状态和空间信息
    const processedItems = this.preprocessRenderables(objectsToGroup);

    // 3. 主要分组算法
    const initialGroups = this.createInitialGroups(processedItems);

    // 4. 空间聚类优化
    const spatialOptimizedGroups = this.applySpatialClustering(initialGroups);

    // 5. 分组合并优化
    const mergedGroups = this.mergeSimilarGroups(spatialOptimizedGroups);

    // 6. Z-index排序和优先级调整
    const finalGroups = this.applyZIndexSorting(mergedGroups);

    // 7. 更新内部状态
    finalGroups.forEach(group => this.groups.set(group.id, group));

    // 8. 更新统计信息
    const endTime = performance.now();
    this.stats = {
      ...this.calculateStats(finalGroups),
      totalObjects: objectsToGroup.length,
      spatialClusters: this.spatialClustersCount,
      mergedGroups: this.mergedGroupsCount,
      processingTime: endTime - startTime
    };
    
    // 9. 触发事件
    this.emit('groupingComplete', { groups: finalGroups, stats: this.stats });
    this.emit('optimizationComplete', this.stats);

    return finalGroups;
  }

  /**
   * 预处理渲染对象
   */
  private preprocessRenderables(renderables: IRenderable[]): Array<{
    renderable: IRenderable;
    state: RenderState;
    spatialBounds: { minX: number; minY: number; maxX: number; maxY: number };
  }> {
    return renderables.map(renderable => ({
      renderable,
      state: this.extractRenderState(renderable),
      spatialBounds: this.calculateSpatialBounds(renderable)
    }));
  }

  /**
   * 提取渲染状态
   */
  private extractRenderState(renderable: IRenderable): RenderState {
    // 首先尝试使用getRenderState方法
    const item = renderable as any;
    if (typeof item.getRenderState === 'function') {
      const state = item.getRenderState();
      if (state) {
        return state;
      }
    }
    
    // 降级到直接属性访问
    return {
      textureId: item.textureId || item.texture?.id || null,
      blendMode: item.blendMode || 'source-over',
      shaderId: item.shaderId || item.material?.shaderId || 'default',
      zIndex: item.zIndex || 0,
      opacity: item.opacity !== undefined ? item.opacity : 1,
      cullMode: item.cullMode || 'none',
      depthTest: item.depthTest !== undefined ? item.depthTest : false,
      stencilTest: item.stencilTest !== undefined ? item.stencilTest : false
    };
  }

  /**
   * 计算空间边界
   */
  private calculateSpatialBounds(renderable: IRenderable): { minX: number; minY: number; maxX: number; maxY: number } {
    const item = renderable as any;
    
    // 首先尝试使用getBounds方法
    if (typeof item.getBounds === 'function') {
      const bounds = item.getBounds();
      if (bounds) {
        return {
          minX: bounds.x,
          minY: bounds.y,
          maxX: bounds.x + bounds.width,
          maxY: bounds.y + bounds.height
        };
      }
    }
    
    // 降级到直接属性访问
    const x = item.x || item.position?.x || 0;
    const y = item.y || item.position?.y || 0;
    const width = item.width || item.size?.width || item.bounds?.width || 100;
    const height = item.height || item.size?.height || item.bounds?.height || 100;
    
    return {
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height
    };
  }

  /**
   * 创建初始分组
   */
  private createInitialGroups(processedItems: Array<{
    renderable: IRenderable;
    state: RenderState;
    spatialBounds: { minX: number; minY: number; maxX: number; maxY: number };
  }>): RenderGroup[] {
    const groupMap = new Map<string, RenderGroup>();

    for (const item of processedItems) {
      const groupKey = this.generateGroupKey(item.state);
      
      if (!groupMap.has(groupKey)) {
        const group: RenderGroup = {
          id: `group_${groupKey}_${Date.now()}`,
          items: [],
          renderState: item.state,
          priority: this.calculateGroupPriority(item.state),
          canMerge: true,
          estimatedCost: 0,
          spatialBounds: { ...item.spatialBounds }
        };
        
        groupMap.set(groupKey, group);
        this.emit('groupCreated', group);
      }

      const group = groupMap.get(groupKey)!;
      group.items.push(item.renderable);
      
      // 更新空间边界
      if (group.spatialBounds) {
        group.spatialBounds.minX = Math.min(group.spatialBounds.minX, item.spatialBounds.minX);
        group.spatialBounds.minY = Math.min(group.spatialBounds.minY, item.spatialBounds.minY);
        group.spatialBounds.maxX = Math.max(group.spatialBounds.maxX, item.spatialBounds.maxX);
        group.spatialBounds.maxY = Math.max(group.spatialBounds.maxY, item.spatialBounds.maxY);
      }

      // 更新渲染成本估算
      group.estimatedCost += this.calculateRenderCost(item.renderable);

      // 检查分组大小限制
      if (group.items.length >= this.MAX_GROUP_SIZE) {
        group.canMerge = false;
        // 可能需要分割大组
        this.splitLargeGroup(group, groupMap, groupKey);
      }
    }

    return Array.from(groupMap.values());
  }

  /**
   * 生成分组键
   */
  private generateGroupKey(state: RenderState): string {
    // 使用权重最高的属性作为主要分组依据
    const textureKey = state.textureId || 'notex';
    const shaderKey = state.shaderId;
    const blendKey = state.blendMode;
    
    // 为了减少分组数量，对z-index进行区间分组
    const zIndexGroup = Math.floor(state.zIndex / 10) * 10;
    
    return `${textureKey}:${shaderKey}:${blendKey}:${zIndexGroup}`;
  }

  /**
   * 计算分组优先级
   */
  private calculateGroupPriority(state: RenderState): number {
    let priority = 0;
    
    // 透明对象优先级较低（后渲染）
    if (state.opacity < 1.0 || state.blendMode !== 'source-over') {
      priority -= 1000;
    }
    
    // z-index影响优先级
    priority += state.zIndex;
    
    // 有纹理的对象优先级稍高
    if (state.textureId) {
      priority += 10;
    }
    
    return priority;
  }

  /**
   * 计算渲染成本
   */
  private calculateRenderCost(renderable: IRenderable): number {
    const item = renderable as any;
    
    let cost = 1; // 基础成本
    
    // 复杂图形增加成本
    if (item.vertices && item.vertices.length > 6) {
      cost += Math.floor(item.vertices.length / 6);
    }
    
    // 有纹理增加成本
    if (item.textureId || item.texture) {
      cost += 0.5;
    }
    
    // 透明度混合增加成本
    if (item.opacity < 1.0) {
      cost += 0.3;
    }
    
    return cost;
  }

  /**
   * 分割大分组
   */
  private splitLargeGroup(group: RenderGroup, groupMap: Map<string, RenderGroup>, originalKey: string): void {
    if (group.items.length <= this.MAX_GROUP_SIZE) {
      return;
    }

    const splitSize = Math.ceil(this.MAX_GROUP_SIZE * 0.8);
    const extraItems = group.items.splice(splitSize);
    
    // 创建新分组
    const newGroupKey = `${originalKey}_split_${Date.now()}`;
    const newGroup: RenderGroup = {
      id: `group_${newGroupKey}`,
      items: extraItems,
      renderState: { ...group.renderState },
      priority: group.priority,
      canMerge: false, // 分割后的组不再合并
      estimatedCost: extraItems.length * this.calculateRenderCost(extraItems[0]),
      spatialBounds: group.spatialBounds ? { ...group.spatialBounds } : undefined
    };
    
    groupMap.set(newGroupKey, newGroup);
    this.emit('groupCreated', newGroup);
  }

  /**
   * 应用空间聚类
   */
  private applySpatialClustering(groups: RenderGroup[]): RenderGroup[] {
    // 对于相同渲染状态的分组，尝试基于空间位置进行聚类
    const clusteredGroups: RenderGroup[] = [];
    const processedGroups = new Set<string>();

    for (const group of groups) {
      if (processedGroups.has(group.id)) {
        continue;
      }

      const spatialCluster = [group];
      processedGroups.add(group.id);

      // 寻找空间上接近且渲染状态相似的分组
      for (const otherGroup of groups) {
        if (processedGroups.has(otherGroup.id)) {
          continue;
        }

        if (this.canSpatiallyCluster(group, otherGroup)) {
          spatialCluster.push(otherGroup);
          processedGroups.add(otherGroup.id);
        }
      }

      // 如果找到了空间聚类，合并它们
      if (spatialCluster.length > 1) {
        const mergedGroup = this.mergeSpatialGroups(spatialCluster);
        clusteredGroups.push(mergedGroup);
        this.spatialClustersCount++; // 统计空间聚类数量
      } else {
        clusteredGroups.push(group);
      }
    }

    return clusteredGroups;
  }

  /**
   * 检查是否可以空间聚类
   */
  private canSpatiallyCluster(group1: RenderGroup, group2: RenderGroup): boolean {
    // 渲染状态必须相似
    if (!this.areRenderStatesSimilar(group1.renderState, group2.renderState)) {
      return false;
    }

    // 检查空间距离
    if (!group1.spatialBounds || !group2.spatialBounds) {
      return false;
    }

    const distance = this.calculateSpatialDistance(group1.spatialBounds, group2.spatialBounds);
    const combinedSize = Math.max(
      group1.spatialBounds.maxX - group1.spatialBounds.minX,
      group1.spatialBounds.maxY - group1.spatialBounds.minY,
      group2.spatialBounds.maxX - group2.spatialBounds.minX,
      group2.spatialBounds.maxY - group2.spatialBounds.minY
    );

    return distance / combinedSize < this.SPATIAL_CLUSTERING_THRESHOLD;
  }

  /**
   * 检查渲染状态是否相似
   */
  private areRenderStatesSimilar(state1: RenderState, state2: RenderState): boolean {
    return state1.textureId === state2.textureId &&
           state1.blendMode === state2.blendMode &&
           state1.shaderId === state2.shaderId &&
           Math.abs(state1.zIndex - state2.zIndex) <= 10;
  }

  /**
   * 计算空间距离
   */
  private calculateSpatialDistance(bounds1: { minX: number; minY: number; maxX: number; maxY: number }, 
                                 bounds2: { minX: number; minY: number; maxX: number; maxY: number }): number {
    const center1X = (bounds1.minX + bounds1.maxX) / 2;
    const center1Y = (bounds1.minY + bounds1.maxY) / 2;
    const center2X = (bounds2.minX + bounds2.maxX) / 2;
    const center2Y = (bounds2.minY + bounds2.maxY) / 2;
    
    return Math.sqrt(Math.pow(center2X - center1X, 2) + Math.pow(center2Y - center1Y, 2));
  }

  /**
   * 合并空间分组
   */
  private mergeSpatialGroups(groups: RenderGroup[]): RenderGroup {
    const mainGroup = groups[0];
    const mergedItems = groups.flatMap(g => g.items);
    
    // 计算合并后的空间边界
    let mergedBounds = mainGroup.spatialBounds;
    if (mergedBounds) {
      for (let i = 1; i < groups.length; i++) {
        const bounds = groups[i].spatialBounds;
        if (bounds) {
          mergedBounds.minX = Math.min(mergedBounds.minX, bounds.minX);
          mergedBounds.minY = Math.min(mergedBounds.minY, bounds.minY);
          mergedBounds.maxX = Math.max(mergedBounds.maxX, bounds.maxX);
          mergedBounds.maxY = Math.max(mergedBounds.maxY, bounds.maxY);
        }
      }
    }

    const mergedGroup: RenderGroup = {
      id: `merged_${mainGroup.id}_${Date.now()}`,
      items: mergedItems,
      renderState: mainGroup.renderState,
      priority: Math.max(...groups.map(g => g.priority)),
      canMerge: true,
      estimatedCost: groups.reduce((sum, g) => sum + g.estimatedCost, 0),
      spatialBounds: mergedBounds
    };

    return mergedGroup;
  }

  /**
   * 合并相似分组
   */
  private mergeSimilarGroups(groups: RenderGroup[]): RenderGroup[] {
    const mergedGroups: RenderGroup[] = [];
    const processedGroups = new Set<string>();

    for (const group of groups) {
      if (processedGroups.has(group.id) || !group.canMerge) {
        if (!processedGroups.has(group.id)) {
          mergedGroups.push(group);
          processedGroups.add(group.id);
        }
        continue;
      }

      const mergeTarget = this.findMergeCandidate(group, groups, processedGroups);
      
      if (mergeTarget) {
        const mergedGroup = this.mergeGroups(group, mergeTarget);
        mergedGroups.push(mergedGroup);
        processedGroups.add(group.id);
        processedGroups.add(mergeTarget.id);
        this.mergedGroupsCount++; // 统计合并的分组数量
        
        this.emit('groupMerged', {
          source: group.id,
          target: mergeTarget.id,
          mergedGroup
        });
      } else {
        mergedGroups.push(group);
        processedGroups.add(group.id);
      }
    }

    return mergedGroups;
  }

  /**
   * 寻找合并候选
   */
  private findMergeCandidate(group: RenderGroup, allGroups: RenderGroup[], processedGroups: Set<string>): RenderGroup | null {
    let bestCandidate: RenderGroup | null = null;
    let bestSimilarity = 0;

    for (const candidate of allGroups) {
      if (processedGroups.has(candidate.id) || candidate.id === group.id || !candidate.canMerge) {
        continue;
      }

      const similarity = this.calculateGroupSimilarity(group, candidate);
      if (similarity > this.MERGE_SIMILARITY_THRESHOLD && similarity > bestSimilarity) {
        // 检查合并后的大小是否合适
        const mergedSize = group.items.length + candidate.items.length;
        if (mergedSize <= this.MAX_GROUP_SIZE) {
          bestCandidate = candidate;
          bestSimilarity = similarity;
        }
      }
    }

    return bestCandidate;
  }

  /**
   * 计算分组相似度
   */
  private calculateGroupSimilarity(group1: RenderGroup, group2: RenderGroup): number {
    let similarity = 0;
    let totalWeight = 0;

    // 纹理相似度
    if (group1.renderState.textureId === group2.renderState.textureId) {
      similarity += this.weights.texture;
    }
    totalWeight += this.weights.texture;

    // 混合模式相似度
    if (group1.renderState.blendMode === group2.renderState.blendMode) {
      similarity += this.weights.blendMode;
    }
    totalWeight += this.weights.blendMode;

    // 着色器相似度
    if (group1.renderState.shaderId === group2.renderState.shaderId) {
      similarity += this.weights.shader;
    }
    totalWeight += this.weights.shader;

    // z-index相似度
    const zIndexDiff = Math.abs(group1.renderState.zIndex - group2.renderState.zIndex);
    const zIndexSimilarity = Math.max(0, 1 - zIndexDiff / 100) * this.weights.zIndex;
    similarity += zIndexSimilarity;
    totalWeight += this.weights.zIndex;

    return similarity / totalWeight;
  }

  /**
   * 合并两个分组
   */
  private mergeGroups(group1: RenderGroup, group2: RenderGroup): RenderGroup {
    const mergedItems = [...group1.items, ...group2.items];
    
    // 合并空间边界
    let mergedBounds = group1.spatialBounds;
    if (mergedBounds && group2.spatialBounds) {
      mergedBounds = {
        minX: Math.min(mergedBounds.minX, group2.spatialBounds.minX),
        minY: Math.min(mergedBounds.minY, group2.spatialBounds.minY),
        maxX: Math.max(mergedBounds.maxX, group2.spatialBounds.maxX),
        maxY: Math.max(mergedBounds.maxY, group2.spatialBounds.maxY)
      };
    } else if (group2.spatialBounds && !mergedBounds) {
      mergedBounds = group2.spatialBounds;
    }

    return {
      id: `merged_${group1.id}_${group2.id}`,
      items: mergedItems,
      renderState: group1.renderState, // 使用第一个分组的渲染状态
      priority: Math.max(group1.priority, group2.priority),
      canMerge: mergedItems.length < this.MAX_GROUP_SIZE * 0.9, // 留一些余量
      estimatedCost: group1.estimatedCost + group2.estimatedCost,
      spatialBounds: mergedBounds
    };
  }

  /**
   * 应用Z-index排序
   */
  private applyZIndexSorting(groups: RenderGroup[]): RenderGroup[] {
    // 按照优先级和z-index排序
    return groups.sort((a, b) => {
      // 首先按优先级排序
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // 然后按z-index排序
      return a.renderState.zIndex - b.renderState.zIndex;
    });
  }

  /**
   * 计算分组统计信息
   */
  private calculateStats(groups: RenderGroup[]): GroupingStats {
    const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0);
    const totalGroups = groups.length;
    
    // 计算状态切换次数
    let stateChanges = 0;
    let textureBinds = 0;
    let shaderSwitches = 0;
    let blendModeChanges = 0;
    
    let lastState: RenderState | null = null;
    const uniqueTextures = new Set<string>();
    const uniqueShaders = new Set<string>();
    const uniqueBlendModes = new Set<string>();
    
    for (const group of groups) {
      const state = group.renderState;
      
      if (state.textureId) {
        uniqueTextures.add(state.textureId);
      }
      uniqueShaders.add(state.shaderId);
      uniqueBlendModes.add(state.blendMode);
      
      if (lastState) {
        if (lastState.textureId !== state.textureId) {
          textureBinds++;
          stateChanges++;
        }
        if (lastState.shaderId !== state.shaderId) {
          shaderSwitches++;
          stateChanges++;
        }
        if (lastState.blendMode !== state.blendMode) {
          blendModeChanges++;
          stateChanges++;
        }
      }
      
      lastState = state;
    }

    const estimatedDrawCalls = totalGroups;
    const worstCaseDrawCalls = totalItems; // 如果不分组的情况
    const optimizationRatio = worstCaseDrawCalls > 0 ? 1 - (estimatedDrawCalls / worstCaseDrawCalls) : 0;

    return {
      totalObjects: totalItems,
      totalGroups,
      spatialClusters: 0, // 需要从分组过程中计算
      mergedGroups: 0,    // 需要从分组过程中计算
      averageGroupSize: totalItems / totalGroups || 0,
      stateChanges,
      textureBinds: uniqueTextures.size,
      shaderSwitches: uniqueShaders.size,
      blendModeChanges: uniqueBlendModes.size,
      estimatedDrawCalls,
      optimizationRatio,
      processingTime: 0   // 需要从分组过程中计算
    };
  }

  /**
   * 获取所有分组
   */
  getGroups(): RenderGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * 根据ID获取分组
   */
  getGroup(id: string): RenderGroup | undefined {
    return this.groups.get(id);
  }

  /**
   * 清空所有分组
   */
  clear(): void {
    this.groups.clear();
    this.renderables = [];
  }

  /**
   * 更新分组权重
   */
  updateWeights(weights: Partial<GroupingWeights>): void {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * 获取当前分组权重
   */
  getWeights(): GroupingWeights {
    return { ...this.weights };
  }

  /**
   * 获取分组统计信息
   */
  getStats(): GroupingStats {
    return { ...this.stats };
  }

  /**
   * 重置分组器
   */
  reset(): void {
    this.spatialClustersCount = 0;
    this.mergedGroupsCount = 0;
    this.stats = {
      totalObjects: 0,
      totalGroups: 0,
      spatialClusters: 0,
      mergedGroups: 0,
      averageGroupSize: 0,
      stateChanges: 0,
      textureBinds: 0,
      shaderSwitches: 0,
      blendModeChanges: 0,
      estimatedDrawCalls: 0,
      optimizationRatio: 0,
      processingTime: 0
    };
    this.clear();
  }
}