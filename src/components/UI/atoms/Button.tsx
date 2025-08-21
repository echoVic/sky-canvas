import React, { forwardRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../../utils/cn';

// 按钮变体类型
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'glass';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

// 按钮样式映射
const buttonStyles = {
  base: [
    'inline-flex items-center justify-center',
    'font-medium transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'select-none relative overflow-hidden'
  ].join(' '),
  
  variants: {
    primary: [
      'bg-gradient-to-r from-blue-500 to-blue-600',
      'text-white shadow-lg shadow-blue-500/25',
      'hover:from-blue-600 hover:to-blue-700',
      'hover:shadow-xl hover:shadow-blue-500/30',
      'active:from-blue-700 active:to-blue-800',
      'focus:ring-blue-500'
    ].join(' '),
    
    secondary: [
      'bg-gradient-to-r from-gray-100 to-gray-200',
      'text-gray-700 border border-gray-300',
      'hover:from-gray-200 hover:to-gray-300',
      'hover:border-gray-400 hover:shadow-md',
      'active:from-gray-300 active:to-gray-400',
      'focus:ring-gray-500'
    ].join(' '),
    
    ghost: [
      'text-gray-600 hover:text-gray-900',
      'hover:bg-gray-100 active:bg-gray-200',
      'focus:ring-gray-500'
    ].join(' '),
    
    outline: [
      'border-2 border-gray-300 text-gray-700',
      'hover:border-blue-500 hover:text-blue-600',
      'hover:bg-blue-50 active:bg-blue-100',
      'focus:ring-blue-500'
    ].join(' '),
    
    glass: [
      'backdrop-blur-md bg-white/80 border border-white/30',
      'text-gray-700 shadow-lg',
      'hover:bg-white/90 hover:shadow-xl',
      'active:bg-white/95',
      'focus:ring-blue-500'
    ].join(' ')
  },
  
  sizes: {
    sm: 'px-3 py-1.5 text-sm rounded-lg gap-1.5',
    md: 'px-4 py-2 text-base rounded-xl gap-2',
    lg: 'px-6 py-3 text-lg rounded-2xl gap-3'
  }
};

// 加载动画组件
const LoadingSpinner: React.FC<{ size: ButtonSize }> = ({ size }) => {
  const sizeMap = { sm: 14, md: 16, lg: 20 };
  const spinnerSize = sizeMap[size];
  
  return (
    <motion.div
      className="border-2 border-current rounded-full border-t-transparent"
      style={{ width: spinnerSize, height: spinnerSize }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }}
    />
  );
};

// 涟漪效果组件
const RippleEffect: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none bg-white/30"
    style={{
      left: x - 10,
      top: y - 10,
      width: 20,
      height: 20
    }}
    initial={{ scale: 0, opacity: 1 }}
    animate={{ scale: 4, opacity: 0 }}
    transition={{ duration: 0.6, ease: 'easeOut' }}
  />
);

export const Button = forwardRef<HTMLButtonElement, ButtonProps>((
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    isDisabled = false,
    leftIcon,
    rightIcon,
    children,
    className,
    onClick,
    ...props
  },
  ref
) => {
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);
  
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled || isLoading) return;
    
    // 创建涟漪效果
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newRipple = {
      id: Date.now(),
      x,
      y
    };
    
    setRipples(prev => [...prev, newRipple]);
    
    // 清理涟漪
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);
    
    onClick?.(event);
  };
  
  const buttonClasses = cn(
    buttonStyles.base,
    buttonStyles.variants[variant],
    buttonStyles.sizes[size],
    className
  );
  
  return (
    <motion.button
      ref={ref}
      className={buttonClasses}
      disabled={isDisabled || isLoading}
      onClick={handleClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 17
      }}
      {...props}
    >
      {/* 涟漪效果 */}
      {ripples.map(ripple => (
        <RippleEffect key={ripple.id} x={ripple.x} y={ripple.y} />
      ))}
      
      {/* 左侧图标或加载动画 */}
      {isLoading ? (
        <LoadingSpinner size={size} />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      
      {/* 按钮文本 */}
      <span className={isLoading ? 'opacity-0' : 'opacity-100'}>
        {children}
      </span>
      
      {/* 右侧图标 */}
      {rightIcon && !isLoading && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </motion.button>
  );
});

Button.displayName = 'Button';

// 导出类型
export type { ButtonProps, ButtonVariant, ButtonSize };