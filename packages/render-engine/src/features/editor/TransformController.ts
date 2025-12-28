/**
 * 变换控制器
 */

import { IEventBus } from '../events/EventBus';
import { SceneObject, SceneHierarchy, TransformMode, EditorState, Vector3 } from './SceneEditorTypes';

export class TransformController {
  private isTransforming = false;
  private transformStart: Map<string, SceneObject['transform']> = new Map();

  constructor(
    private getScene: () => SceneHierarchy,
    private getState: () => EditorState,
    private setState: (state: EditorState) => void,
    private getSelectedIds: () => string[],
    private updateSelection: () => void,
    private addToHistory: (action: string, data: unknown) => void,
    private getEventBus: () => IEventBus | undefined
  ) {}

  /**
   * 开始变换操作
   */
  startTransform(mode: TransformMode): void {
    const selectedIds = this.getSelectedIds();
    if (selectedIds.length === 0 || this.isTransforming) return;

    const scene = this.getScene();
    const state = this.getState();

    this.isTransforming = true;
    this.setState({ ...state, transformMode: mode });
    this.transformStart.clear();

    for (const id of selectedIds) {
      const object = scene.objects[id];
      if (object) {
        this.transformStart.set(id, {
          position: { ...object.transform.position },
          rotation: { ...object.transform.rotation },
          scale: { ...object.transform.scale }
        });
      }
    }

    this.getEventBus()?.emit('transform-started', { objectIds: selectedIds, mode });
  }

  /**
   * 更新变换
   */
  updateTransform(delta: Vector3, mode?: TransformMode): void {
    if (!this.isTransforming) return;

    const scene = this.getScene();
    const state = this.getState();
    const selectedIds = this.getSelectedIds();
    const transforms: Array<{ id: string; transform: SceneObject['transform'] }> = [];
    const currentMode = mode || state.transformMode;

    for (const id of selectedIds) {
      const object = scene.objects[id];
      const startTransform = this.transformStart.get(id);

      if (object && startTransform) {
        const newTransform = this.applyTransformDelta(startTransform, delta, currentMode);
        object.transform = newTransform;
        transforms.push({ id, transform: newTransform });
      }
    }

    this.updateSelection();

    this.getEventBus()?.emit('transform-updated', { objectIds: selectedIds, transforms });
  }

  /**
   * 结束变换操作
   */
  endTransform(): void {
    if (!this.isTransforming) return;

    const scene = this.getScene();
    const selectedIds = this.getSelectedIds();
    const finalTransforms: Array<{ id: string; transform: SceneObject['transform'] }> = [];

    for (const id of selectedIds) {
      const object = scene.objects[id];
      if (object) {
        finalTransforms.push({
          id,
          transform: {
            position: { ...object.transform.position },
            rotation: { ...object.transform.rotation },
            scale: { ...object.transform.scale }
          }
        });
      }
    }

    this.addToHistory('transform', {
      objectIds: selectedIds,
      startTransforms: Array.from(this.transformStart.entries()),
      finalTransforms
    });

    this.isTransforming = false;
    this.transformStart.clear();

    this.getEventBus()?.emit('transform-ended', { objectIds: selectedIds, finalTransforms });
  }

  /**
   * 是否正在变换
   */
  getIsTransforming(): boolean {
    return this.isTransforming;
  }

  /**
   * 应用变换增量
   */
  private applyTransformDelta(
    startTransform: SceneObject['transform'],
    delta: Vector3,
    mode: TransformMode
  ): SceneObject['transform'] {
    const result = {
      position: { ...startTransform.position },
      rotation: { ...startTransform.rotation },
      scale: { ...startTransform.scale }
    };

    switch (mode.type) {
      case 'translate':
        if (mode.constraint === 'none' || mode.constraint.includes('x')) {
          result.position.x = startTransform.position.x + delta.x;
        }
        if (mode.constraint === 'none' || mode.constraint.includes('y')) {
          result.position.y = startTransform.position.y + delta.y;
        }
        if (mode.constraint === 'none' || mode.constraint.includes('z')) {
          result.position.z = startTransform.position.z + delta.z;
        }
        break;

      case 'rotate':
        if (mode.constraint === 'none' || mode.constraint.includes('x')) {
          result.rotation.x = startTransform.rotation.x + delta.x;
        }
        if (mode.constraint === 'none' || mode.constraint.includes('y')) {
          result.rotation.y = startTransform.rotation.y + delta.y;
        }
        if (mode.constraint === 'none' || mode.constraint.includes('z')) {
          result.rotation.z = startTransform.rotation.z + delta.z;
        }
        break;

      case 'scale':
        const scaleFactor = 1 + (delta.x + delta.y + delta.z) / 3;
        if (mode.constraint === 'none' || mode.constraint.includes('x')) {
          result.scale.x = Math.max(0.01, startTransform.scale.x * scaleFactor);
        }
        if (mode.constraint === 'none' || mode.constraint.includes('y')) {
          result.scale.y = Math.max(0.01, startTransform.scale.y * scaleFactor);
        }
        if (mode.constraint === 'none' || mode.constraint.includes('z')) {
          result.scale.z = Math.max(0.01, startTransform.scale.z * scaleFactor);
        }
        break;
    }

    return result;
  }
}
