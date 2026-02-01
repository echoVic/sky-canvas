/**
 * 历史记录命令实现
 */

import type { ICommand } from './historyService'

/**
 * 属性更改命令 - 最常用的命令类型
 */
export class PropertyChangeCommand<T, K extends keyof T> implements ICommand {
  private target: T
  private property: K
  private oldValue: T[K]
  private newValue: T[K]
  public description: string

  constructor(target: T, property: K, newValue: T[K], description?: string) {
    this.target = target
    this.property = property
    this.oldValue = target[property]
    this.newValue = newValue
    this.description = description || `Change ${String(property)}`
  }

  execute(): void {
    this.target[this.property] = this.newValue
  }

  undo(): void {
    this.target[this.property] = this.oldValue
  }

  toString(): string {
    return this.description
  }
}

/**
 * 多属性更改命令
 */
export class MultiPropertyChangeCommand<T> implements ICommand {
  private target: T
  private changes: Array<{
    property: keyof T
    oldValue: T[keyof T]
    newValue: T[keyof T]
  }> = []
  public description: string

  constructor(target: T, description?: string) {
    this.target = target
    this.description = description || 'Change multiple properties'
  }

  /**
   * 添加属性更改
   */
  addChange<K extends keyof T>(property: K, newValue: T[K]): void {
    this.changes.push({
      property,
      oldValue: this.target[property],
      newValue,
    })
  }

  execute(): void {
    for (const change of this.changes) {
      this.target[change.property] = change.newValue
    }
  }

  undo(): void {
    // 按相反顺序恢复
    for (let i = this.changes.length - 1; i >= 0; i--) {
      const change = this.changes[i]
      this.target[change.property] = change.oldValue
    }
  }

  toString(): string {
    return `${this.description} (${this.changes.length} properties)`
  }
}

/**
 * 集合添加命令
 */
export class CollectionAddCommand<T> implements ICommand {
  private collection: T[]
  private item: T
  private index: number
  public description: string

  constructor(collection: T[], item: T, index?: number, description?: string) {
    this.collection = collection
    this.item = item
    this.index = index ?? collection.length
    this.description = description || 'Add item to collection'
  }

  execute(): void {
    this.collection.splice(this.index, 0, this.item)
  }

  undo(): void {
    this.collection.splice(this.index, 1)
  }

  toString(): string {
    return this.description
  }
}

/**
 * 集合删除命令
 */
export class CollectionRemoveCommand<T> implements ICommand {
  private collection: T[]
  private item: T
  private index: number
  public description: string

  constructor(collection: T[], item: T, description?: string) {
    this.collection = collection
    this.item = item
    this.index = collection.indexOf(item)
    this.description = description || 'Remove item from collection'

    if (this.index === -1) {
      throw new Error('Item not found in collection')
    }
  }

  execute(): void {
    this.collection.splice(this.index, 1)
  }

  undo(): void {
    this.collection.splice(this.index, 0, this.item)
  }

  toString(): string {
    return this.description
  }
}

/**
 * 集合移动命令
 */
export class CollectionMoveCommand<T> implements ICommand {
  private collection: T[]
  private fromIndex: number
  private toIndex: number
  private item: T
  public description: string

  constructor(collection: T[], fromIndex: number, toIndex: number, description?: string) {
    this.collection = collection
    this.fromIndex = fromIndex
    this.toIndex = toIndex
    this.item = collection[fromIndex]
    this.description = description || `Move item from ${fromIndex} to ${toIndex}`
  }

  execute(): void {
    // 先移除
    this.collection.splice(this.fromIndex, 1)
    // 再插入（注意索引可能需要调整）
    const adjustedToIndex = this.toIndex > this.fromIndex ? this.toIndex - 1 : this.toIndex
    this.collection.splice(adjustedToIndex, 0, this.item)
  }

  undo(): void {
    // 先移除
    this.collection.splice(this.toIndex, 1)
    // 再插入到原位置
    this.collection.splice(this.fromIndex, 0, this.item)
  }

  toString(): string {
    return this.description
  }
}

/**
 * 函数调用命令 - 通用的函数执行命令
 */
export class FunctionCommand implements ICommand {
  private executeFunction: () => void
  private undoFunction: () => void
  public description: string

  constructor(executeFunction: () => void, undoFunction: () => void, description?: string) {
    this.executeFunction = executeFunction
    this.undoFunction = undoFunction
    this.description = description || 'Function command'
  }

  execute(): void {
    this.executeFunction()
  }

  undo(): void {
    this.undoFunction()
  }

  toString(): string {
    return this.description
  }
}

/**
 * 异步命令包装器 - 将异步操作包装成同步命令
 */
export class AsyncCommandWrapper implements ICommand {
  private asyncExecute: () => Promise<void>
  private asyncUndo: () => Promise<void>
  public description: string
  private isExecuted: boolean = false

  constructor(
    asyncExecute: () => Promise<void>,
    asyncUndo: () => Promise<void>,
    description?: string
  ) {
    this.asyncExecute = asyncExecute
    this.asyncUndo = asyncUndo
    this.description = description || 'Async command'
  }

  execute(): void {
    if (!this.isExecuted) {
      this.asyncExecute()
        .then(() => {
          this.isExecuted = true
        })
        .catch(() => {})
    }
  }

  undo(): void {
    if (this.isExecuted) {
      this.asyncUndo()
        .then(() => {
          this.isExecuted = false
        })
        .catch(() => {})
    }
  }

  toString(): string {
    return `${this.description} (async)`
  }
}

/**
 * 复合命令 - 包含多个子命令的命令
 */
export class CompositeCommand implements ICommand {
  private commands: ICommand[] = []
  public description: string

  constructor(description: string = 'Composite Operation') {
    this.description = description
  }

  /**
   * 添加子命令
   */
  add(command: ICommand): void {
    this.commands.push(command)
  }

  /**
   * 执行所有子命令
   */
  execute(): void {
    for (const command of this.commands) {
      command.execute()
    }
  }

  /**
   * 按相反顺序撤销所有子命令
   */
  undo(): void {
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo()
    }
  }

  /**
   * 获取子命令数量
   */
  size(): number {
    return this.commands.length
  }

  /**
   * 检查是否为空
   */
  isEmpty(): boolean {
    return this.commands.length === 0
  }

  /**
   * 清空所有子命令
   */
  clear(): void {
    this.commands = []
  }

  toString(): string {
    return `${this.description} (${this.commands.length} commands)`
  }
}

/**
 * 命令构建器 - 便捷创建命令
 */
export const CommandBuilder = {
  changeProperty<T, K extends keyof T>(
    target: T,
    property: K,
    newValue: T[K],
    description?: string
  ): PropertyChangeCommand<T, K> {
    return new PropertyChangeCommand(target, property, newValue, description)
  },
  changeMultipleProperties<T>(target: T, description?: string): MultiPropertyChangeCommand<T> {
    return new MultiPropertyChangeCommand(target, description)
  },
  addToCollection<T>(
    collection: T[],
    item: T,
    index?: number,
    description?: string
  ): CollectionAddCommand<T> {
    return new CollectionAddCommand(collection, item, index, description)
  },
  removeFromCollection<T>(
    collection: T[],
    item: T,
    description?: string
  ): CollectionRemoveCommand<T> {
    return new CollectionRemoveCommand(collection, item, description)
  },
  moveInCollection<T>(
    collection: T[],
    fromIndex: number,
    toIndex: number,
    description?: string
  ): CollectionMoveCommand<T> {
    return new CollectionMoveCommand(collection, fromIndex, toIndex, description)
  },
  createFunction(
    executeFunction: () => void,
    undoFunction: () => void,
    description?: string
  ): FunctionCommand {
    return new FunctionCommand(executeFunction, undoFunction, description)
  },
  createComposite(description?: string): CompositeCommand {
    return new CompositeCommand(description)
  },
}
