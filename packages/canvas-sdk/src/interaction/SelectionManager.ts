import { Point, Rect } from '../../types';
import { EventDispatcher, EventImpl, EventType } from '../events/EventSystem';
import { ISceneNode } from '../scene/SceneNode';

/**
 * 选择模式枚举
 */
export enum SelectionMode {
  SINGLE = 'single',      // 单选
  MULTIPLE = 'multiple',  // 多选
  ADDITIVE = 'additive',  // 累加选择
  TOGGLE = 'toggle'       // 切换选择
}

/**
 * 选择事件接口
 */
export interface SelectionEvent {
  type: 'selectionChanged' | 'selectionCleared' | 'selectionAdded' | 'selectionRemoved';
  selected: ISceneNode[];
  added: ISceneNode[];
  removed: ISceneNode[];
  target: ISceneNode | null;
}

/**
 * 选择过滤器类型
 */
export type SelectionFilter = (node: ISceneNode) => boolean;

/**
 * 选择管理器
 */
export class SelectionManager extends EventDispatcher {
  private _selectedNodes: Set<ISceneNode> = new Set();
  private _selectionMode: SelectionMode = SelectionMode.SINGLE;
  private _filters: SelectionFilter[] = [];
  private _enabled: boolean = true;
  private _selectableTypes: Set<string> = new Set();
  private _maxSelections: number = -1; // -1表示无限制

  constructor() {
    super();
  }

  // 基础属性
  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (!value) {
      this.clearSelection();
    }
  }

  get selectionMode(): SelectionMode {
    return this._selectionMode;
  }

  set selectionMode(mode: SelectionMode) {
    this._selectionMode = mode;
  }

  get maxSelections(): number {
    return this._maxSelections;
  }

  set maxSelections(max: number) {
    this._maxSelections = max;
    if (max > 0 && this._selectedNodes.size > max) {
      // 保留最新选择的节点
      const nodes = Array.from(this._selectedNodes);
      const toRemove = nodes.slice(0, nodes.length - max);
      for (const node of toRemove) {
        this._selectedNodes.delete(node);
      }
      this.dispatchSelectionEvent('selectionChanged', [], toRemove);
    }
  }

  // 选择操作
  select(node: ISceneNode | ISceneNode[], mode?: SelectionMode): boolean {
    if (!this._enabled) return false;

    const nodes = Array.isArray(node) ? node : [node];
    const filteredNodes = nodes.filter(n => this.canSelect(n));
    
    if (filteredNodes.length === 0) return false;

    const currentMode = mode || this._selectionMode;
    const added: ISceneNode[] = [];
    const removed: ISceneNode[] = [];

    switch (currentMode) {
      case SelectionMode.SINGLE: {
        // 清除现有选择
        removed.push(...this._selectedNodes);
        this._selectedNodes.clear();
        
        // 选择新节点（只选择第一个）
        const nodeToSelect = filteredNodes[0];
        this._selectedNodes.add(nodeToSelect);
        added.push(nodeToSelect);
        break;
      }

      case SelectionMode.MULTIPLE:
        // 清除现有选择，添加所有新节点
        removed.push(...this._selectedNodes);
        this._selectedNodes.clear();
        
        for (const n of filteredNodes) {
          if (this.checkMaxSelections()) {
            this._selectedNodes.add(n);
            added.push(n);
          }
        }
        break;

      case SelectionMode.ADDITIVE:
        // 添加到现有选择
        for (const n of filteredNodes) {
          if (!this._selectedNodes.has(n) && this.checkMaxSelections()) {
            this._selectedNodes.add(n);
            added.push(n);
          }
        }
        break;

      case SelectionMode.TOGGLE:
        // 切换选择状态
        for (const n of filteredNodes) {
          if (this._selectedNodes.has(n)) {
            this._selectedNodes.delete(n);
            removed.push(n);
          } else if (this.checkMaxSelections()) {
            this._selectedNodes.add(n);
            added.push(n);
          }
        }
        break;
    }

    if (added.length > 0 || removed.length > 0) {
      this.dispatchSelectionEvent('selectionChanged', added, removed);
      return true;
    }

    return false;
  }

  deselect(node: ISceneNode | ISceneNode[]): boolean {
    if (!this._enabled) return false;

    const nodes = Array.isArray(node) ? node : [node];
    const removed: ISceneNode[] = [];

    for (const n of nodes) {
      if (this._selectedNodes.has(n)) {
        this._selectedNodes.delete(n);
        removed.push(n);
      }
    }

    if (removed.length > 0) {
      this.dispatchSelectionEvent('selectionRemoved', [], removed);
      return true;
    }

    return false;
  }

  clearSelection(): boolean {
    if (!this._enabled || this._selectedNodes.size === 0) return false;

    const removed = Array.from(this._selectedNodes);
    this._selectedNodes.clear();
    
    this.dispatchSelectionEvent('selectionCleared', [], removed);
    return true;
  }

  selectAll(nodes: ISceneNode[]): boolean {
    if (!this._enabled) return false;

    const selectableNodes = nodes.filter(n => this.canSelect(n));
    return this.select(selectableNodes, SelectionMode.MULTIPLE);
  }

  // 查询方法
  isSelected(node: ISceneNode): boolean {
    return this._selectedNodes.has(node);
  }

  getSelectedNodes(): ISceneNode[] {
    return Array.from(this._selectedNodes);
  }

  getSelectionCount(): number {
    return this._selectedNodes.size;
  }

  hasSelection(): boolean {
    return this._selectedNodes.size > 0;
  }

  getFirstSelected(): ISceneNode | null {
    return this._selectedNodes.size > 0 ? this._selectedNodes.values().next().value || null : null;
  }

  getLastSelected(): ISceneNode | null {
    const nodes = Array.from(this._selectedNodes);
    return nodes.length > 0 ? nodes[nodes.length - 1] : null;
  }

  // 区域选择
  selectInBounds(bounds: Rect, nodes: ISceneNode[], mode?: SelectionMode): boolean {
    if (!this._enabled) return false;

    const nodesInBounds = nodes.filter(node => {
      if (!this.canSelect(node)) return false;
      
      const nodeBounds = node.getBounds();
      return this.boundsIntersect(bounds, nodeBounds);
    });

    return this.select(nodesInBounds, mode || SelectionMode.MULTIPLE);
  }

  selectByPoint(point: Point, nodes: ISceneNode[], mode?: SelectionMode): boolean {
    if (!this._enabled) return false;

    // 从前到后查找第一个命中的节点
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (this.canSelect(node) && node.hitTest(point)) {
        return this.select(node, mode || this._selectionMode);
      }
    }

    // 如果没有命中任何节点，根据模式决定是否清除选择
    if (mode === SelectionMode.SINGLE || this._selectionMode === SelectionMode.SINGLE) {
      return this.clearSelection();
    }

    return false;
  }

  // 过滤器管理
  addFilter(filter: SelectionFilter): void {
    this._filters.push(filter);
  }

  removeFilter(filter: SelectionFilter): void {
    const index = this._filters.indexOf(filter);
    if (index !== -1) {
      this._filters.splice(index, 1);
    }
  }

  clearFilters(): void {
    this._filters = [];
  }

  // 可选择类型管理
  addSelectableType(typeName: string): void {
    this._selectableTypes.add(typeName);
  }

  removeSelectableType(typeName: string): void {
    this._selectableTypes.delete(typeName);
  }

  clearSelectableTypes(): void {
    this._selectableTypes.clear();
  }

  setSelectableTypes(types: string[]): void {
    this._selectableTypes = new Set(types);
  }

  // 选择变换操作
  getSelectionBounds(): Rect | null {
    if (this._selectedNodes.size === 0) return null;

    const nodes = Array.from(this._selectedNodes);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const node of nodes) {
      const bounds = node.getBounds();
      minX = Math.min(minX, bounds.x);
      minY = Math.min(minY, bounds.y);
      maxX = Math.max(maxX, bounds.x + bounds.width);
      maxY = Math.max(maxY, bounds.y + bounds.height);
    }

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  getSelectionCenter(): Point | null {
    const bounds = this.getSelectionBounds();
    if (!bounds) return null;

    return {
      x: bounds.x + bounds.width / 2,
      y: bounds.y + bounds.height / 2
    };
  }

  // 私有方法
  private canSelect(node: ISceneNode): boolean {
    // 检查节点是否可见和启用
    if (!node.visible || !node.enabled) return false;

    // 检查类型限制
    if (this._selectableTypes.size > 0) {
      const typeName = node.constructor.name;
      if (!this._selectableTypes.has(typeName)) return false;
    }

    // 应用过滤器
    for (const filter of this._filters) {
      if (!filter(node)) return false;
    }

    return true;
  }

  private checkMaxSelections(): boolean {
    return this._maxSelections < 0 || this._selectedNodes.size < this._maxSelections;
  }

  private boundsIntersect(a: Rect, b: Rect): boolean {
    return !(a.x + a.width < b.x || 
             b.x + b.width < a.x || 
             a.y + a.height < b.y || 
             b.y + b.height < a.y);
  }

  private dispatchSelectionEvent(
    type: SelectionEvent['type'], 
    added: ISceneNode[], 
    removed: ISceneNode[]
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const event = new EventImpl(EventType.SELECTION_CHANGE) as any;
    event.selectionEvent = {
      type,
      selected: Array.from(this._selectedNodes),
      added,
      removed,
      target: added.length > 0 ? added[0] : (removed.length > 0 ? removed[0] : null)
    } as SelectionEvent;

    this.dispatchEvent(event);
  }

  // 序列化
  serialize(): object {
    return {
      selectedNodeIds: Array.from(this._selectedNodes).map(node => node.id),
      selectionMode: this._selectionMode,
      enabled: this._enabled,
      maxSelections: this._maxSelections
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  deserialize(data: any, nodeMap: Map<string, ISceneNode>): void {
    this.clearSelection();
    
    if (data.selectedNodeIds) {
      const nodes: ISceneNode[] = [];
      for (const id of data.selectedNodeIds) {
        const node = nodeMap.get(id);
        if (node) {
          nodes.push(node);
        }
      }
      this.select(nodes, SelectionMode.MULTIPLE);
    }

    if (data.selectionMode) {
      this._selectionMode = data.selectionMode;
    }
    
    if (typeof data.enabled === 'boolean') {
      this._enabled = data.enabled;
    }
    
    if (typeof data.maxSelections === 'number') {
      this._maxSelections = data.maxSelections;
    }
  }

  // 调试信息
  getDebugInfo(): object {
    return {
      selectedCount: this._selectedNodes.size,
      selectedNodeIds: Array.from(this._selectedNodes).map(node => node.id),
      selectionMode: this._selectionMode,
      enabled: this._enabled,
      maxSelections: this._maxSelections,
      filterCount: this._filters.length,
      selectableTypes: Array.from(this._selectableTypes)
    };
  }
}
