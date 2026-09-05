import React, { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Mail, Lock, Search, User } from 'lucide-react';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: string | ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, icon, className, id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const renderIcon = () => {
      if (!icon) return null;
      if (typeof icon !== 'string') {
        return <span className="absolute left-3 text-outline pointer-events-none flex items-center">{icon}</span>;
      }
      if (icon === 'mail') return <Mail className="w-5 h-5 text-outline absolute left-3 pointer-events-none" />;
      if (icon === 'lock') return <Lock className="w-5 h-5 text-outline absolute left-3 pointer-events-none" />;
      if (icon === 'search') return <Search className="w-5 h-5 text-outline absolute left-3 pointer-events-none" />;
      if (icon === 'user') return <User className="w-5 h-5 text-outline absolute left-3 pointer-events-none" />;
      return (
        <span className="material-symbols-outlined absolute left-3 text-outline text-xl pointer-events-none">
          {icon}
        </span>
      );
    };

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-label-sm text-on-surface font-semibold">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {renderIcon()}
          <input
            ref={ref}
            id={inputId}
            className={twMerge(
              clsx(
                'w-full bg-white border border-outline-variant text-on-surface placeholder:text-outline/70 text-sm rounded px-3.5 py-2.5 transition-colors focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary',
                icon && 'pl-10',
                error && 'border-error focus:border-error focus:ring-error',
                className
              )
            )}
            {...props}
          />
        </div>
        {error ? (
          <p className="text-xs text-error font-medium">{error}</p>
        ) : helperText ? (
          <p className="text-xs text-on-surface-variant">{helperText}</p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
