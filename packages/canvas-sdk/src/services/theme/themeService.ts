/**
 * 主题服务 - 处理主题切换功能
 * 功能单一：只负责主题配置和切换
 */

import { createServiceIdentifier, injectable, inject } from '../../di/ServiceIdentifier';
import { IEventBusService } from '../eventBus/eventBusService';
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
  // 背景色
  background: string;
  surface: string;
  
  // 文字色
  primary: string;
  secondary: string;
  
  // 边框色
  border: string;
  divider: string;
  
  // 状态色
  success: string;
  warning: string;
  error: string;
  info: string;
  
  // 画布特定色
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
  getCurrentTheme(): ThemeType;
  getThemeConfig(): IThemeConfig;
  setTheme(theme: ThemeType): void;
  toggleTheme(): void;
  getAvailableThemes(): ThemeType[];
  getThemeColors(): IThemeColors;
  registerCustomTheme(name: string, config: IThemeConfig): void;
  removeCustomTheme(name: string): void;
}

/**
 * 主题服务标识符
 */
export const IThemeService = createServiceIdentifier<IThemeService>('ThemeService');

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
    colors: {} as IThemeColors // 会动态设置
  }
};

/**
 * 主题服务实现
 */
@injectable
export class ThemeService implements IThemeService {
  private currentTheme: ThemeType;
  private customThemes = new Map<string, IThemeConfig>();

  constructor(
    @inject(IEventBusService) private eventBus: IEventBusService,
    @inject(IConfigurationService) private configService: IConfigurationService
  ) {
    // 从配置中读取保存的主题，默认为浅色主题
    this.currentTheme = this.configService.get<ThemeType>('theme.current') || ThemeType.LIGHT;
    this.initializeAutoTheme();
  }

  getCurrentTheme(): ThemeType {
    return this.currentTheme;
  }

  getThemeConfig(): IThemeConfig {
    if (this.currentTheme === ThemeType.AUTO) {
      // 自动主题根据系统设置决定
      const systemPrefersDark = this.getSystemThemePreference() === ThemeType.DARK;
      return systemPrefersDark ? THEME_CONFIGS[ThemeType.DARK] : THEME_CONFIGS[ThemeType.LIGHT];
    }
    
    return THEME_CONFIGS[this.currentTheme] || THEME_CONFIGS[ThemeType.LIGHT];
  }

  setTheme(theme: ThemeType): void {
    if (this.currentTheme === theme) return;

    const previousTheme = this.currentTheme;
    this.currentTheme = theme;
    
    // 保存到配置
    this.configService.set('theme.current', theme);

    // 发布主题变化事件
    this.eventBus.emit<IThemeChangeData>('theme:changed', {
      previousTheme,
      currentTheme: theme,
      config: this.getThemeConfig()
    });
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
    this.eventBus.emit('theme:custom-registered', { name, config });
  }

  removeCustomTheme(name: string): void {
    if (this.customThemes.delete(name)) {
      this.eventBus.emit('theme:custom-removed', { name });
    }
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
      
      // 监听系统主题变化
      mediaQuery.addEventListener('change', () => {
        if (this.currentTheme === ThemeType.AUTO) {
          this.eventBus.emit<IThemeChangeData>('theme:changed', {
            previousTheme: this.currentTheme,
            currentTheme: this.currentTheme,
            config: this.getThemeConfig()
          });
        }
      });
    }
  }
}