import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { APP_NAME, NAV_LINKS } from '../lib/constants';

export const Header: React.FC = () => {
  const location = useLocation();

  return (
    <header
      style={{
        backgroundColor: 'var(--color-surface-default)',
        borderBottom: '1px solid var(--color-border-subtle)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '60px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none',
              color: 'var(--color-text-primary)',
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 32 32"
              fill="none"
              stroke="var(--color-brand-primary)"
              strokeWidth="2.5"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 4 L26 8.5 V16 C26 21.5 21.5 26.5 16 28 C10.5 26.5 6 21.5 6 16 V8.5 L16 4 Z" />
              <path d="M11 16 L14.5 19.5 L21 12" stroke="#F8FAFC" strokeLinecap="round" />
            </svg>
            <span
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-sans)',
              }}
            >
              {APP_NAME}
            </span>
          </Link>

          <span
            style={{
              fontSize: '0.6875rem',
              fontFamily: 'var(--font-mono)',
              padding: '2px 6px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-muted)',
            }}
          >
            Phase 0 Foundation
          </span>
        </div>

        <nav aria-label="Main Navigation">
          <ul
            style={{
              display: 'flex',
              alignItems: 'center',
              listStyle: 'none',
              gap: '8px',
            }}
          >
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    style={{
                      display: 'inline-block',
                      padding: '6px 12px',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-secondary)',
                      backgroundColor: isActive
                        ? 'var(--color-brand-subtle)'
                        : 'transparent',
                      borderRadius: 'var(--radius-md)',
                      border: isActive
                        ? '1px solid var(--color-brand-primary)'
                        : '1px solid transparent',
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
};
