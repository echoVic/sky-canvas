/**
 * 选择管理器实现
 */
import { ISelectionManager, SelectionMode } from './types';
import { EventDispatcher, EventType } from './EventSystem';

/**
 * 选择管理器
 */
export class SelectionManager extends EventDispatcher implements ISelectionManager {
  private selectedItems = new Set<any>();
  public enabled = true;

  select(target: any | any[], mode: SelectionMode = SelectionMode.SINGLE): boolean {
    if (!this.enabled) return false;

    const targets = Array.isArray(target) ? target : [target];
    const previousSelection = new Set(this.selectedItems);
    let changed = false;

    switch (mode) {
      case SelectionMode.SINGLE:
        // 单选：清空现有选择，选择新目标
        this.selectedItems.clear();
        if (targets.length > 0) {
          this.selectedItems.add(targets[0]);
          changed = true;
        }
        break;

      case SelectionMode.MULTIPLE:
        // 多选：清空现有选择，选择所有新目标
        this.selectedItems.clear();
        targets.forEach(item => this.selectedItems.add(item));
        changed = true;
        break;

      case SelectionMode.ADDITIVE:
        // 添加式：保持现有选择，添加新目标
        targets.forEach(item => {
          if (!this.selectedItems.has(item)) {
            this.selectedItems.add(item);
            changed = true;
          }
        });
        break;

      case SelectionMode.TOGGLE:
        // 切换：如果已选择则取消，否则添加
        targets.forEach(item => {
          if (this.selectedItems.has(item)) {
            this.selectedItems.delete(item);
            changed = true;
          } else {
            this.selectedItems.add(item);
            changed = true;
          }
        });
        break;
    }

    if (changed) {
      this.dispatchSelectionChangeEvent(previousSelection);
    }

    return changed;
  }

  deselect(target: any | any[]): boolean {
    if (!this.enabled) return false;

    const targets = Array.isArray(target) ? target : [target];
    const previousSelection = new Set(this.selectedItems);
    let changed = false;

    targets.forEach(item => {
      if (this.selectedItems.has(item)) {
        this.selectedItems.delete(item);
        changed = true;
      }
    });

    if (changed) {
      this.dispatchSelectionChangeEvent(previousSelection);
    }

    return changed;
  }

  clearSelection(): boolean {
    if (!this.enabled) return false;

    if (this.selectedItems.size === 0) {
      return false;
    }

    const previousSelection = new Set(this.selectedItems);
    this.selectedItems.clear();
    this.dispatchSelectionChangeEvent(previousSelection);
    return true;
  }

  getSelectedItems(): any[] {
    return Array.from(this.selectedItems);
  }

  isSelected(target: any): boolean {
    return this.selectedItems.has(target);
  }

  getSelectionCount(): number {
    return this.selectedItems.size;
  }

  private dispatchSelectionChangeEvent(previousSelection: Set<any>): void {
    const currentSelection = new Set(this.selectedItems);
    
    const added = Array.from(currentSelection).filter(item => !previousSelection.has(item));
    const removed = Array.from(previousSelection).filter(item => !currentSelection.has(item));

    const event = {
      type: EventType.SELECTION_CHANGE,
      selected: Array.from(currentSelection),
      added,
      removed,
      timestamp: Date.now()
    };

    this.dispatchEvent(event);
  }
}