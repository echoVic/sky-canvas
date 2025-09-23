/**
 * 主题 ViewModel - 简单模式
 * 直接使用 ThemeService，不需要 Manager
 */

import { proxy, snapshot } from 'valtio';
import { IThemeService, ThemeType, IThemeConfig } from '../services/theme/themeService';
import { IEventBusService } from '../services/eventBus/eventBusService';
import { IViewModel } from './types/IViewModel';

/**
 * 主题状态
 */
export interface IThemeState {
  currentTheme: ThemeType;
  config: IThemeConfig;
  availableThemes: ThemeType[];
  isDarkMode: boolean;
}

/**
 * 主题 ViewModel 接口
 */
export interface IThemeViewModel extends IViewModel {
  state: IThemeState;
  setTheme(theme: ThemeType): void;
  toggleTheme(): void;
  getCurrentColors(): any;
}

/**
 * 主题 ViewModel 实现
 */
export class ThemeViewModel implements IThemeViewModel {
  private readonly _state: IThemeState;

  constructor(
    private themeService: IThemeService,
    private eventBus: IEventBusService
  ) {
    // 使用 Valtio proxy 创建响应式状态
    this._state = proxy<IThemeState>({
      currentTheme: this.themeService.getCurrentTheme(),
      config: this.themeService.getThemeConfig(),
      availableThemes: this.themeService.getAvailableThemes(),
      isDarkMode: this.isDarkTheme(this.themeService.getCurrentTheme())
    });

    this.setupEventListeners();
  }

  get state(): IThemeState {
    return this._state;
  }

  async initialize(): Promise<void> {
    // 同步初始状态
    this.updateState();
    this.eventBus.emit('theme-viewmodel:initialized', {});
  }

  getSnapshot() {
    return snapshot(this._state);
  }

  dispose(): void {
    // ViewModels 通常不需要显式清理，因为它们是通过 DI 管理的
    this.eventBus.emit('theme-viewmodel:disposed', {});
  }

  /**
   * 设置主题
   */
  setTheme(theme: ThemeType): void {
    this.themeService.setTheme(theme);
  }

  /**
   * 切换主题
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  /**
   * 获取当前主题颜色
   */
  getCurrentColors(): any {
    return this.themeService.getThemeColors();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听主题服务的变化
    this.eventBus.on('theme:changed', () => {
      this.updateState();
    });
  }

  /**
   * 更新状态
   */
  private updateState(): void {
    const currentTheme = this.themeService.getCurrentTheme();
    this._state.currentTheme = currentTheme;
    this._state.config = this.themeService.getThemeConfig();
    this._state.isDarkMode = this.isDarkTheme(currentTheme);
  }

  /**
   * 判断是否为深色主题
   */
  private isDarkTheme(theme: ThemeType): boolean {
    if (theme === ThemeType.DARK) return true;
    if (theme === ThemeType.LIGHT) return false;
    // AUTO 模式需要检查系统设置
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }
}