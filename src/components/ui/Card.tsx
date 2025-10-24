import { HTMLAttributes, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  glass?: boolean;
}

export const Card = ({ children, hover = false, glass = false, className = '', ...props }: CardProps) => {
  const baseStyles = 'rounded-xl border transition-all duration-300';
  const glassStyles = glass
    ? 'bg-white/50 dark:bg-gray-900/50 backdrop-blur-lg border-white/20 dark:border-gray-700/30 shadow-xl'
    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg';
  const hoverStyles = hover ? 'hover:shadow-2xl hover:scale-[1.02] cursor-pointer' : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${baseStyles} ${glassStyles} ${hoverStyles} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader = ({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 border-b border-gray-200 dark:border-gray-700 ${className}`} {...props}>
    {children}
  </div>
);

export const CardContent = ({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ children, className = '', ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 border-t border-gray-200 dark:border-gray-700 ${className}`} {...props}>
    {children}
  </div>
);
