'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outlined' | 'elevated'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className, 
    variant = 'default', 
    padding = 'md',
    children, 
    ...props 
  }, ref) => {
    const variants = {
      default: 'card',
      outlined: 'border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800',
      elevated: 'card shadow-xl'
    }
    
    const paddings = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    }

    return (
      <div
        className={clsx(
          variants[variant],
          paddings[padding],
          className
        )}
        ref={ref}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

// Sub-components
interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => (
    <div
      className={clsx('card-header', className)}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
)

CardHeader.displayName = 'CardHeader'

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(
  ({ className, children, ...props }, ref) => (
    <div
      className={clsx('card-body', className)}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
)

CardBody.displayName = 'CardBody'

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      className={clsx('card-footer', className)}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
)

CardFooter.displayName = 'CardFooter'

export default Card
export { CardHeader, CardBody, CardFooter }

