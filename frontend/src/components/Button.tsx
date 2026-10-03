import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  style,
  disabled,
  ...props
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: 'var(--color-brand-primary)',
          color: '#ffffff',
          border: '1px solid var(--color-brand-primary)',
        };
      case 'secondary':
        return {
          backgroundColor: 'var(--color-surface-raised)',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-subtle)',
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-text-primary)',
          border: '1px solid var(--color-border-strong)',
        };
      case 'danger':
        return {
          backgroundColor: 'var(--color-status-mismatch-bg)',
          color: 'var(--color-status-mismatch)',
          border: '1px solid var(--color-status-mismatch-border)',
        };
    }
  };

  const variantStyle = getVariantStyles();
  const height = size === 'sm' ? '32px' : '38px';
  const padding = size === 'sm' ? '0 12px' : '0 16px';
  const fontSize = size === 'sm' ? '0.8125rem' : '0.875rem';

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        padding,
        fontSize,
        fontWeight: 500,
        fontFamily: 'inherit',
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'background-color 150ms ease-out, border-color 150ms ease-out',
        ...variantStyle,
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
