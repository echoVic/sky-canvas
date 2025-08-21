import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/cn';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type IconVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';

interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  variant?: IconVariant;
  className?: string;
  animate?: boolean;
  onClick?: () => void;
}

const iconSizes = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8'
};

const iconVariants = {
  default: 'text-gray-600',
  primary: 'text-blue-600',
  secondary: 'text-gray-500',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  error: 'text-red-600'
};

export const Icon: React.FC<IconProps> = ({
  icon: IconComponent,
  size = 'md',
  variant = 'default',
  className,
  animate = false,
  onClick
}) => {
  const iconClasses = cn(
    iconSizes[size],
    iconVariants[variant],
    onClick && 'cursor-pointer hover:opacity-75 transition-opacity',
    className
  );

  const iconElement = (
    <IconComponent 
      className={iconClasses}
      onClick={onClick}
    />
  );

  if (animate) {
    return (
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {iconElement}
      </motion.div>
    );
  }

  return iconElement;
};

export type { IconProps, IconSize, IconVariant };