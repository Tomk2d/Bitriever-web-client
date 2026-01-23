'use client';

import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium mb-1">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full px-3 py-2 border rounded transition-colors ${error ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:border-[var(--main-color)] focus:ring-1 focus:ring-[var(--main-color)] ${className}`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

