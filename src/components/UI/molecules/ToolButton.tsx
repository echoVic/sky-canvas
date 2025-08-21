import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { Icon } from '../atoms/Icon';

interface ToolButtonProps {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  isDisabled?: boolean;
  shortcut?: string;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: {
    button: 'w-8 h-8 p-1.5',
    icon: 'xs' as const,
    text: 'text-xs'
  },
  md: {
    button: 'w-10 h-10 p-2',
    icon: 'sm' as const,
    text: 'text-sm'
  },
  lg: {
    button: 'w-12 h-12 p-2.5',
    icon: 'md' as const,
    text: 'text-base'
  }
};

export const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  isActive = false,
  isDisabled = false,
  shortcut,
  onClick,
  className,
  size = 'md'
}) => {
  const sizeConfig = sizeStyles[size];
  
  const buttonClasses = cn(
    // 基础样式
    'relative group flex items-center justify-center',
    'rounded-xl transition-all duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:ring-offset-2',
    sizeConfig.button,
    
    // 状态样式
    isActive ? [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'text-white shadow-lg shadow-blue-500/25',
      'border border-blue-400/50'
    ] : [
      'bg-white/80 backdrop-blur-sm',
      'text-gray-600 hover:text-gray-800',
      'border border-gray-200/60',
      'hover:bg-white/90 hover:shadow-md',
      'hover:border-gray-300/60'
    ],
    
    // 禁用状态
    isDisabled && [
      'opacity-50 cursor-not-allowed',
      'hover:bg-white/80 hover:shadow-none'
    ],
    
    className
  );

  return (
    <div className="relative">
      <motion.button
        className={buttonClasses}
        onClick={onClick}
        disabled={isDisabled}
        whileHover={!isDisabled ? { scale: 1.05, y: -1 } : {}}
        whileTap={!isDisabled ? { scale: 0.95 } : {}}
        transition={{
          type: 'spring',
          stiffness: 400,
          damping: 17
        }}
      >
        {/* 活跃状态的背景光晕 */}
        {isActive && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl opacity-20 blur-sm"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.2 }}
            transition={{ duration: 0.3 }}
          />
        )}
        
        {/* 图标 */}
        <Icon
          icon={icon}
          size={sizeConfig.icon}
          variant={isActive ? 'default' : 'default'}
          className={isActive ? 'text-white' : ''}
        />
        
        {/* 快捷键提示 */}
        {shortcut && (
          <div className="absolute -top-1 -right-1 bg-gray-800 text-white text-xs px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {shortcut}
          </div>
        )}
      </motion.button>
      
      {/* 工具提示 */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
        {label}
        {shortcut && (
          <span className="ml-2 text-gray-300">({shortcut})</span>
        )}
      </div>
    </div>
  );
};

export type { ToolButtonProps };