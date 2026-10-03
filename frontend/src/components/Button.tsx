import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
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
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: 'var(--color-text-secondary)',
          border: '1px solid transparent',
        };
    }
  };

  const getHeight = () => {
    switch (size) {
      case 'sm':
        return '32px';
      case 'lg':
        return '44px';
      default:
        return '38px';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return '0 12px';
      case 'lg':
        return '0 20px';
      default:
        return '0 16px';
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return '0.8125rem';
      case 'lg':
        return '0.9375rem';
      default:
        return '0.875rem';
    }
  };

  const variantStyle = getVariantStyles();

  return (
    <button
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        height: getHeight(),
        padding: getPadding(),
        fontSize: getFontSize(),
        fontWeight: 500,
        fontFamily: 'inherit',
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition:
          'background-color 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out',
        ...variantStyle,
        ...style,
      }}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === 'left' && (
        <span style={{ display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{children}</span>
      {icon && iconPosition === 'right' && (
        <span style={{ display: 'inline-flex', alignItems: 'center' }} aria-hidden="true">
          {icon}
        </span>
      )}
    </button>
  );
};
