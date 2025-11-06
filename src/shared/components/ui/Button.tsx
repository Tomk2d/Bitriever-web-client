'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';
import './Button.css';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const variantClass = `button-${variant}`;
    const sizeClass = `button-size-${size}`;

    return (
      <button
        ref={ref}
        className={`button ${variantClass} ${sizeClass} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

