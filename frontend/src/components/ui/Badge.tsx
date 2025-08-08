'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ 
    className, 
    variant = 'default', 
    size = 'md',
    dot = false,
    children, 
    ...props 
  }, ref) => {
    const baseClasses = 'inline-flex items-center font-medium rounded-full'
    
    const variants = {
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    }
    
    const sizes = {
      sm: dot ? 'w-2 h-2' : 'px-2 py-0.5 text-xs',
      md: dot ? 'w-3 h-3' : 'px-2.5 py-0.5 text-sm',
      lg: dot ? 'w-4 h-4' : 'px-3 py-1 text-base'
    }

    if (dot) {
      return (
        <span
          className={clsx(
            'rounded-full',
            variants[variant],
            sizes[size],
            className
          )}
          ref={ref}
          {...props}
        />
      )
    }

    return (
      <span
        className={clsx(
          baseClasses,
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export default Badge

