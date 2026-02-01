/**
 * 选择管理器
 */

import type { EditorState, SceneHierarchy, SceneObject, SelectionInfo } from './SceneEditorTypes'

export class SelectionManager {
  constructor(
    private getScene: () => SceneHierarchy,
    private getState: () => EditorState,
    private setState: (state: EditorState) => void
  ) {}

  /**
   * 选择对象
   */
  selectObjects(objectIds: string[], additive: boolean = false): string[] {
    const scene = this.getScene()

    if (!additive) {
      this.clearSelection()
    }

    const validIds = objectIds.filter((id) => scene.objects[id])

    for (const id of validIds) {
      const object = scene.objects[id]
      if (object && !object.selected) {
        object.selected = true
      }
    }

    this.updateSelection()
    return validIds
  }

  /**
   * 从选择中移除对象
   */
  removeFromSelection(objectIds: string[]): void {
    const scene = this.getScene()

    for (const id of objectIds) {
      const object = scene.objects[id]
      if (object) {
        object.selected = false
      }
    }

    this.updateSelection()
  }

  /**
   * 清除选择
   */
  clearSelection(): void {
    const scene = this.getScene()

    for (const object of Object.values(scene.objects)) {
      object.selected = false
    }

    this.updateSelection()
  }

  /**
   * 获取选择信息
   */
  getSelection(): SelectionInfo {
    return { ...this.getState().selection }
  }

  /**
   * 获取选中对象ID列表
   */
  getSelectedObjectIds(): string[] {
    const scene = this.getScene()
    return Object.values(scene.objects)
      .filter((obj) => obj.selected)
      .map((obj) => obj.id)
  }

  /**
   * 更新选择信息
   */
  updateSelection(): void {
    const scene = this.getScene()
    const state = this.getState()
    const selectedIds = this.getSelectedObjectIds()

    if (selectedIds.length === 0) {
      this.setState({ ...state, selection: { objects: [] } })
      return
    }

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity

    for (const id of selectedIds) {
      const object = scene.objects[id]
      if (object) {
        const pos = object.transform.position
        const scale = object.transform.scale

        minX = Math.min(minX, pos.x - scale.x / 2)
        minY = Math.min(minY, pos.y - scale.y / 2)
        minZ = Math.min(minZ, pos.z - scale.z / 2)

        maxX = Math.max(maxX, pos.x + scale.x / 2)
        maxY = Math.max(maxY, pos.y + scale.y / 2)
        maxZ = Math.max(maxZ, pos.z + scale.z / 2)
      }
    }

    this.setState({
      ...state,
      selection: {
        objects: selectedIds,
        boundingBox: {
          min: { x: minX, y: minY, z: minZ },
          max: { x: maxX, y: maxY, z: maxZ },
          center: {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
            z: (minZ + maxZ) / 2,
          },
        },
      },
    })
  }

  /**
   * 复制选中对象
   */
  copySelectedObjects(): SceneObject[] {
    const scene = this.getScene()
    const selectedIds = this.getSelectedObjectIds()

    return selectedIds
      .map((id) => {
        const object = scene.objects[id]
        return object ? { ...object } : null
      })
      .filter((obj): obj is SceneObject => obj !== null)
  }
}
