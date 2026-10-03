import React from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

export interface TextLinkProps {
  to?: string;
  href?: string;
  external?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
}

export const TextLink: React.FC<TextLinkProps> = ({
  to,
  href,
  external = false,
  children,
  icon,
  style,
  className = '',
}) => {
  const commonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.875rem',
    color: 'var(--color-brand-focus)',
    textDecoration: 'none',
    fontWeight: 500,
    cursor: 'pointer',
    ...style,
  };

  if (href || external) {
    return (
      <a
        href={href || to}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        style={commonStyle}
        className={className}
      >
        {icon}
        <span>{children}</span>
        {external && <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />}
      </a>
    );
  }

  return (
    <Link to={to || '#'} style={commonStyle} className={className}>
      {icon}
      <span>{children}</span>
    </Link>
  );
};
