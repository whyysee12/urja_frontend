import React, { ButtonHTMLAttributes, ReactNode } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2, LogIn, Check, ArrowRight, Plus, RefreshCw } from 'lucide-react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: string | ReactNode;
  iconTrailing?: string | ReactNode;
  children?: ReactNode;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconTrailing,
  children,
  loading = false,
  className,
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-label-bold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded cursor-pointer';

  const variantStyles = {
    primary:
      'bg-primary text-on-primary hover:bg-on-primary-fixed-variant shadow-sm active:translate-y-[1px]',
    secondary:
      'bg-secondary-container text-on-secondary-container hover:bg-secondary-fixed active:translate-y-[1px]',
    outline:
      'border border-outline-variant text-primary bg-white hover:bg-primary-container/10 active:translate-y-[1px]',
    ghost:
      'text-on-surface-variant hover:text-primary hover:bg-surface-container-low active:translate-y-[1px]',
    danger:
      'bg-error text-white hover:bg-on-error-container active:translate-y-[1px]',
  };

  const sizeStyles = {
    sm: 'text-label-sm px-3 py-1.5 gap-1.5 text-xs',
    md: 'text-label-bold px-5 py-2.5 gap-2 text-sm',
    lg: 'text-label-bold px-6 py-3.5 gap-2.5 text-base',
  };

  const renderIconItem = (item?: string | ReactNode) => {
    if (!item) return null;
    if (typeof item !== 'string') return item;
    if (item === 'login') return <LogIn className="w-4 h-4" />;
    if (item === 'check') return <Check className="w-4 h-4" />;
    if (item === 'arrow_forward') return <ArrowRight className="w-4 h-4" />;
    if (item === 'add') return <Plus className="w-4 h-4" />;
    if (item === 'refresh') return <RefreshCw className="w-4 h-4" />;
    return <span className="material-symbols-outlined text-lg">{item}</span>;
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, variantStyles[variant], sizeStyles[size], className))}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        renderIconItem(icon)
      )}
      {children}
      {iconTrailing && !loading && renderIconItem(iconTrailing)}
    </button>
  );
};
