import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  helperText?: string;
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  label,
  options,
  helperText,
  error,
  required,
  disabled,
  style,
  ...props
}) => {
  const generatedId = React.useId();
  const selectId = id || generatedId;
  const helperId = `${selectId}-helper`;
  const errorId = `${selectId}-error`;

  return (
    <div className="form-group" style={style}>
      <label
        htmlFor={selectId}
        className={`form-label ${required ? 'form-label--required' : ''}`}
      >
        {label}
      </label>

      <select
        id={selectId}
        className="form-input"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        disabled={disabled}
        required={required}
        style={{
          borderColor: error ? 'var(--color-status-mismatch)' : undefined,
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23718096' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          paddingRight: '36px',
        }}
        {...props}
      >
        {options.map((opt) => (
          <option
            key={opt.value}
            value={opt.value}
            style={{
              backgroundColor: 'var(--color-surface-raised)',
              color: 'var(--color-text-primary)',
            }}
          >
            {opt.label}
          </option>
        ))}
      </select>

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
