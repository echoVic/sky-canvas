/**
 * 主题服务 - 处理主题切换功能
 * 功能单一：只负责主题配置和切换
 */

import { createDecorator } from '../../di';
import { IConfigurationService } from '../configuration/configurationService';

/**
 * 主题类型
 */
export enum ThemeType {
  LIGHT = 'light',
  DARK = 'dark',
  AUTO = 'auto'
}

/**
 * 主题颜色配置
 */
export interface IThemeColors {
  background: string;
  surface: string;
  
  primary: string;
  secondary: string;
  
  border: string;
  divider: string;
  
  success: string;
  warning: string;
  error: string;
  info: string;
  
  canvasBackground: string;
  gridColor: string;
  selectionColor: string;
}

/**
 * 主题配置
 */
export interface IThemeConfig {
  type: ThemeType;
  colors: IThemeColors;
  name: string;
}

/**
 * 主题变化事件数据
 */
export interface IThemeChangeData {
  previousTheme: ThemeType;
  currentTheme: ThemeType;
  config: IThemeConfig;
}

/**
 * 主题服务接口
 */
export interface IThemeService {
  readonly _serviceBrand: undefined;
  getCurrentTheme(): ThemeType;
  getThemeConfig(): IThemeConfig;
  setTheme(theme: ThemeType): void;
  toggleTheme(): void;
  getAvailableThemes(): ThemeType[];
  getThemeColors(): IThemeColors;
  registerCustomTheme(name: string, config: IThemeConfig): void;
  removeCustomTheme(name: string): void;
  dispose(): void;
}

/**
 * 主题服务标识符
 */
export const IThemeService = createDecorator<IThemeService>('ThemeService');

/**
 * 预定义主题配置
 */
const THEME_CONFIGS: Record<ThemeType, IThemeConfig> = {
  [ThemeType.LIGHT]: {
    type: ThemeType.LIGHT,
    name: 'Light',
    colors: {
      background: '#ffffff',
      surface: '#f8f9fa',
      primary: '#1f2937',
      secondary: '#6b7280',
      border: '#e5e7eb',
      divider: '#f3f4f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      canvasBackground: '#ffffff',
      gridColor: '#f3f4f6',
      selectionColor: '#3b82f6'
    }
  },
  [ThemeType.DARK]: {
    type: ThemeType.DARK,
    name: 'Dark',
    colors: {
      background: '#111827',
      surface: '#1f2937',
      primary: '#f9fafb',
      secondary: '#d1d5db',
      border: '#374151',
      divider: '#4b5563',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
      canvasBackground: '#1f2937',
      gridColor: '#374151',
      selectionColor: '#60a5fa'
    }
  },
  [ThemeType.AUTO]: {
    type: ThemeType.AUTO,
    name: 'Auto',
    colors: {} as IThemeColors
  }
};

/**
 * 主题服务实现
 */
export class ThemeService implements IThemeService {
  readonly _serviceBrand: undefined;
  private currentTheme: ThemeType;
  private customThemes = new Map<string, IThemeConfig>();

  constructor(
    @IConfigurationService private configService: IConfigurationService
  ) {
    this.currentTheme = this.configService.get<ThemeType>('theme.current') || ThemeType.LIGHT;
    this.initializeAutoTheme();
  }

  getCurrentTheme(): ThemeType {
    return this.currentTheme;
  }

  getThemeConfig(): IThemeConfig {
    if (this.currentTheme === ThemeType.AUTO) {
      const systemPrefersDark = this.getSystemThemePreference() === ThemeType.DARK;
      return systemPrefersDark ? THEME_CONFIGS[ThemeType.DARK] : THEME_CONFIGS[ThemeType.LIGHT];
    }
    
    return THEME_CONFIGS[this.currentTheme] || THEME_CONFIGS[ThemeType.LIGHT];
  }

  setTheme(theme: ThemeType): void {
    if (this.currentTheme === theme) return;

    this.currentTheme = theme;
    
    this.configService.set('theme.current', theme);
  }

  toggleTheme(): void {
    const newTheme = this.currentTheme === ThemeType.LIGHT 
      ? ThemeType.DARK 
      : ThemeType.LIGHT;
    this.setTheme(newTheme);
  }

  getAvailableThemes(): ThemeType[] {
    return Object.values(ThemeType);
  }

  getThemeColors(): IThemeColors {
    return this.getThemeConfig().colors;
  }

  registerCustomTheme(name: string, config: IThemeConfig): void {
    this.customThemes.set(name, config);
  }

  removeCustomTheme(name: string): void {
    this.customThemes.delete(name);
  }

  dispose(): void {
    this.customThemes.clear();
  }

  /**
   * 获取系统主题偏好
   */
  private getSystemThemePreference(): ThemeType {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches 
        ? ThemeType.DARK 
        : ThemeType.LIGHT;
    }
    return ThemeType.LIGHT;
  }

  /**
   * 初始化自动主题
   */
  private initializeAutoTheme(): void {
    if (typeof window !== 'undefined' && window.matchMedia && this.currentTheme === ThemeType.AUTO) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      mediaQuery.addEventListener('change', () => {
        if (this.currentTheme === ThemeType.AUTO) {
        }
      });
    }
  }
}
