/**
 * 依赖关系图 - 参考 VSCode DI 架构
 * 用于表示和处理依赖项之间的关系，检测循环依赖
 */

/**
 * 图节点
 */
export interface Node<T> {
  readonly data: T;
  readonly incoming: Map<string, Node<T>>;
  readonly outgoing: Map<string, Node<T>>;
}

/**
 * 有向图
 */
export class Graph<T> {
  private readonly _nodes = new Map<string, Node<T>>();

  /**
   * 获取节点
   */
  get(key: string): Node<T> | undefined {
    return this._nodes.get(key);
  }

  /**
   * 插入节点
   */
  insertNode(key: string, data: T): Node<T> {
    const node: Node<T> = {
      data,
      incoming: new Map(),
      outgoing: new Map()
    };
    this._nodes.set(key, node);
    return node;
  }

  /**
   * 插入边
   */
  insertEdge(from: string, to: string): void {
    const fromNode = this._nodes.get(from);
    const toNode = this._nodes.get(to);

    if (!fromNode || !toNode) {
      throw new Error(`Unknown node '${!fromNode ? from : to}'`);
    }

    fromNode.outgoing.set(to, toNode);
    toNode.incoming.set(from, fromNode);
  }

  /**
   * 移除节点
   */
  removeNode(key: string): void {
    const node = this._nodes.get(key);
    if (!node) {
      return;
    }

    this._nodes.delete(key);

    // 移除所有相关的边
    for (const [, incomingNode] of node.incoming) {
      incomingNode.outgoing.delete(key);
    }

    for (const [, outgoingNode] of node.outgoing) {
      outgoingNode.incoming.delete(key);
    }
  }

  /**
   * 拓扑排序 - 检测循环依赖并返回正确的依赖顺序
   */
  topologicalSort(): string[] {
    const result: string[] = [];
    const incomingCount = new Map<string, number>();
    const queue: string[] = [];

    // 计算每个节点的入度
    for (const [key, node] of this._nodes) {
      incomingCount.set(key, node.incoming.size);
      if (node.incoming.size === 0) {
        queue.push(key);
      }
    }

    // Kahn 算法进行拓扑排序
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);

      const currentNode = this._nodes.get(current)!;
      for (const [outgoingKey] of currentNode.outgoing) {
        const count = incomingCount.get(outgoingKey)! - 1;
        incomingCount.set(outgoingKey, count);
        
        if (count === 0) {
          queue.push(outgoingKey);
        }
      }
    }

    // 检测循环依赖
    if (result.length !== this._nodes.size) {
      const remaining = Array.from(this._nodes.keys()).filter(key => !result.includes(key));
      throw new Error(`Circular dependency detected involving: ${remaining.join(', ')}`);
    }

    return result;
  }

  /**
   * 查找从起点到终点的路径
   */
  findPath(from: string, to: string): string[] | undefined {
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (current: string): boolean => {
      if (current === to) {
        path.push(current);
        return true;
      }

      if (visited.has(current)) {
        return false;
      }

      visited.add(current);
      path.push(current);

      const node = this._nodes.get(current);
      if (node) {
        for (const [outgoingKey] of node.outgoing) {
          if (dfs(outgoingKey)) {
            return true;
          }
        }
      }

      path.pop();
      return false;
    };

    return dfs(from) ? path : undefined;
  }

  /**
   * 检查是否存在从起点到终点的路径
   */
  hasPath(from: string, to: string): boolean {
    return this.findPath(from, to) !== undefined;
  }

  /**
   * 获取所有节点的键
   */
  getAllKeys(): string[] {
    return Array.from(this._nodes.keys());
  }

  /**
   * 获取节点数量
   */
  get size(): number {
    return this._nodes.size;
  }

  /**
   * 清空图
   */
  clear(): void {
    this._nodes.clear();
  }

  /**
   * 克隆图
   */
  clone(): Graph<T> {
    const cloned = new Graph<T>();
    
    // 复制所有节点
    for (const [key, node] of this._nodes) {
      cloned.insertNode(key, node.data);
    }

    // 复制所有边
    for (const [key, node] of this._nodes) {
      for (const [outgoingKey] of node.outgoing) {
        cloned.insertEdge(key, outgoingKey);
      }
    }

    return cloned;
  }
}