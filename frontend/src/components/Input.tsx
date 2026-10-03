import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  helperText?: string;
  error?: string;
  isMonospace?: boolean;
}

export const Input: React.FC<InputProps> = ({
  id,
  label,
  helperText,
  error,
  isMonospace = false,
  required,
  disabled,
  style,
  ...props
}) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const helperId = `${inputId}-helper`;
  const errorId = `${inputId}-error`;

  return (
    <div className="form-group" style={style}>
      <label
        htmlFor={inputId}
        className={`form-label ${required ? 'form-label--required' : ''}`}
      >
        {label}
      </label>

      <input
        id={inputId}
        className={`form-input ${isMonospace ? 'form-input--mono' : ''}`}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        disabled={disabled}
        required={required}
        style={{
          borderColor: error ? 'var(--color-status-mismatch)' : undefined,
        }}
        {...props}
      />

      {error ? (
        <span
          id={errorId}
          style={{
            fontSize: '0.75rem',
            color: 'var(--color-status-mismatch)',
            marginTop: '2px',
          }}
          role="alert"
        >
          {error}
        </span>
      ) : helperText ? (
        <span id={helperId} className="form-helper">
          {helperText}
        </span>
      ) : null}
    </div>
  );
};
