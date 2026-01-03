/**
 * 主题 ViewModel - 简单模式
 * 直接使用 ThemeService，不需要 Manager
 */

import { proxy, snapshot } from 'valtio';
import { IThemeService, ThemeType, IThemeConfig, IThemeColors } from '../services/theme/themeService';
import { IViewModel } from './interfaces/IViewModel';

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
  getCurrentColors(): IThemeColors;
}

/**
 * 主题 ViewModel 实现
 */
export class ThemeViewModel implements IThemeViewModel {
  private readonly _state: IThemeState;

  constructor(
    private themeService: IThemeService
  ) {
    this._state = proxy<IThemeState>({
      currentTheme: this.themeService.getCurrentTheme(),
      config: this.themeService.getThemeConfig(),
      availableThemes: this.themeService.getAvailableThemes(),
      isDarkMode: this.isDarkTheme(this.themeService.getCurrentTheme())
    });
  }

  get state(): IThemeState {
    return this._state;
  }

  async initialize(): Promise<void> {
    this.updateState();
  }

  getSnapshot() {
    return snapshot(this._state);
  }

  dispose(): void {
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
  getCurrentColors(): IThemeColors {
    return this.themeService.getThemeColors();
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
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }
}
