import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-heading font-semibold rounded-2xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-4 hover:-translate-y-0.5';

  const variants = {
    primary: 'bg-brand text-white hover:bg-brand-dark focus:ring-brand-soft focus-visible:ring-brand-soft shadow-md hover:shadow-lg',
    secondary: 'bg-white text-ink hover:bg-brand-tint focus:ring-brand-soft focus-visible:ring-brand-soft border border-line shadow-sm hover:border-brand-soft',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300 focus-visible:ring-red-300 shadow-md hover:shadow-lg',
    ghost: 'text-ink-soft hover:bg-brand-tint hover:text-brand focus:ring-brand-soft focus-visible:ring-brand-soft',
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}