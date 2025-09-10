/**
 * UI组件库
 * 提供常用的UI组件，用于构建用户界面
 */

import { IEventBus } from '../events/EventBus';

export interface ComponentProps {
  id?: string;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  disabled?: boolean;
  visible?: boolean;
  [key: string]: any;
}

export interface ButtonProps extends ComponentProps {
  label: string;
  type?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  onClick?: (event: MouseEvent) => void;
}

export interface InputProps extends ComponentProps {
  type?: 'text' | 'number' | 'email' | 'password';
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string | number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

export interface SliderProps extends ComponentProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  label?: string;
  onChange?: (value: number) => void;
}

/**
 * 基础UI组件类
 */
export abstract class UIComponent<T extends ComponentProps = ComponentProps> {
  protected element: HTMLElement;
  protected props: T;
  protected eventBus?: IEventBus;

  constructor(props: T) {
    this.props = props;
    this.element = this.createElement();
    this.applyProps();
    this.bindEvents();
  }

  protected abstract createElement(): HTMLElement;
  
  protected applyProps(): void {
    if (this.props.id) {
      this.element.id = this.props.id;
    }
    
    if (this.props.className) {
      this.element.className = this.props.className;
    }
    
    if (this.props.style) {
      Object.assign(this.element.style, this.props.style);
    }
    
    if (this.props.visible === false) {
      this.element.style.display = 'none';
    }
    
    if (this.props.disabled) {
      this.element.setAttribute('disabled', 'true');
    }
  }
  
  protected bindEvents(): void {}
  
  public getElement(): HTMLElement {
    return this.element;
  }
  
  public updateProps(newProps: Partial<T>): void {
    this.props = { ...this.props, ...newProps };
    this.applyProps();
  }
  
  public setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus;
  }
  
  public destroy(): void {
    if (this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}

/**
 * 按钮组件
 */
export class Button extends UIComponent<ButtonProps> {
  protected createElement(): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ui-button';
    return button;
  }
  
  protected applyProps(): void {
    super.applyProps();
    
    const button = this.element as HTMLButtonElement;
    button.textContent = this.props.label;
    
    // 设置类型样式
    button.className = `ui-button ui-button--${this.props.type || 'primary'}`;
    
    // 设置尺寸
    if (this.props.size) {
      button.classList.add(`ui-button--${this.props.size}`);
    }
    
    // 设置图标
    if (this.props.icon) {
      const icon = document.createElement('i');
      icon.className = `icon icon--${this.props.icon}`;
      button.insertBefore(icon, button.firstChild);
    }
  }
  
  protected bindEvents(): void {
    if (this.props.onClick) {
      this.element.addEventListener('click', this.props.onClick);
    }
  }
}

/**
 * 输入框组件
 */
export class Input extends UIComponent<InputProps> {
  protected createElement(): HTMLElement {
    const input = document.createElement('input');
    input.className = 'ui-input';
    return input;
  }
  
  protected applyProps(): void {
    super.applyProps();
    
    const input = this.element as HTMLInputElement;
    input.type = this.props.type || 'text';
    input.placeholder = this.props.placeholder || '';
    
    if (this.props.value !== undefined) {
      input.value = String(this.props.value);
    }
  }
  
  protected bindEvents(): void {
    const input = this.element as HTMLInputElement;
    
    if (this.props.onChange) {
      input.addEventListener('input', () => {
        const value = input.type === 'number' ? parseFloat(input.value) : input.value;
        this.props.onChange!(value);
      });
    }
    
    if (this.props.onFocus) {
      input.addEventListener('focus', this.props.onFocus);
    }
    
    if (this.props.onBlur) {
      input.addEventListener('blur', this.props.onBlur);
    }
  }
  
  public getValue(): string | number {
    const input = this.element as HTMLInputElement;
    return input.type === 'number' ? parseFloat(input.value) : input.value;
  }
  
  public setValue(value: string | number): void {
    const input = this.element as HTMLInputElement;
    input.value = String(value);
  }
}

/**
 * 滑块组件
 */
export class Slider extends UIComponent<SliderProps> {
  private slider!: HTMLInputElement;
  private label!: HTMLLabelElement;
  private valueDisplay!: HTMLSpanElement;

  protected createElement(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'ui-slider';
    
    this.label = document.createElement('label');
    this.label.className = 'ui-slider__label';
    
    this.slider = document.createElement('input');
    this.slider.type = 'range';
    this.slider.className = 'ui-slider__input';
    
    this.valueDisplay = document.createElement('span');
    this.valueDisplay.className = 'ui-slider__value';
    
    container.appendChild(this.label);
    container.appendChild(this.slider);
    container.appendChild(this.valueDisplay);
    
    return container;
  }
  
  protected applyProps(): void {
    super.applyProps();
    
    this.slider.min = String(this.props.min);
    this.slider.max = String(this.props.max);
    this.slider.step = String(this.props.step || 1);
    this.slider.value = String(this.props.value);
    
    this.label.textContent = this.props.label || '';
    this.valueDisplay.textContent = String(this.props.value);
  }
  
  protected bindEvents(): void {
    if (this.props.onChange) {
      this.slider.addEventListener('input', () => {
        const value = parseFloat(this.slider.value);
        this.valueDisplay.textContent = String(value);
        this.props.onChange!(value);
      });
    }
  }
  
  public getValue(): number {
    return parseFloat(this.slider.value);
  }
  
  public setValue(value: number): void {
    this.slider.value = String(value);
    this.valueDisplay.textContent = String(value);
  }
}

/**
 * 面板组件
 */
export class Panel extends UIComponent {
  private header!: HTMLElement;
  private body!: HTMLElement;
  
  protected createElement(): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'ui-panel';
    
    this.header = document.createElement('div');
    this.header.className = 'ui-panel__header';
    
    this.body = document.createElement('div');
    this.body.className = 'ui-panel__body';
    
    panel.appendChild(this.header);
    panel.appendChild(this.body);
    
    return panel;
  }
  
  public setTitle(title: string): void {
    this.header.textContent = title;
  }
  
  public setContent(content: HTMLElement | string): void {
    if (typeof content === 'string') {
      this.body.innerHTML = content;
    } else {
      this.body.innerHTML = '';
      this.body.appendChild(content);
    }
  }
  
  public addChild(child: UIComponent): void {
    this.body.appendChild(child.getElement());
  }
}

/**
 * 工具栏组件
 */
export class Toolbar extends UIComponent {
  private tools: Map<string, Button> = new Map();
  
  protected createElement(): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = 'ui-toolbar';
    return toolbar;
  }
  
  public addTool(id: string, props: ButtonProps): Button {
    const button = new Button(props);
    this.tools.set(id, button);
    this.element.appendChild(button.getElement());
    return button;
  }
  
  public removeTool(id: string): boolean {
    const button = this.tools.get(id);
    if (button) {
      button.destroy();
      this.tools.delete(id);
      return true;
    }
    return false;
  }
  
  public getTool(id: string): Button | undefined {
    return this.tools.get(id);
  }
}