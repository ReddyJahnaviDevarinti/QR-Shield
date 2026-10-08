import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, Menu, X } from 'lucide-react';
import { APP_NAME, NAV_LINKS } from '../lib/constants';
import { useAuth } from '../context/AuthContext';

export const Header: React.FC = () => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, merchant, signOut } = useAuth();

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
          height: '56px',
        }}
      >
        {/* Brand & Compact Environment Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              textDecoration: 'none',
              color: 'var(--color-text-primary)',
            }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <ShieldCheck
              size={22}
              strokeWidth={2.2}
              style={{ color: 'var(--color-brand-primary)' }}
              aria-hidden="true"
            />
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--color-text-primary)',
                }}
              >
                {APP_NAME}
              </span>
              <span
                style={{
                  fontSize: '0.6875rem',
                  color: 'var(--color-text-muted)',
                  display: 'none',
                }}
                className="brand-descriptor"
              >
                Payment QR Verification
              </span>
            </div>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav
          aria-label="Main Navigation"
          style={{ display: 'none' }}
          className="desktop-nav"
        >
          <ul
            style={{
              display: 'flex',
              alignItems: 'center',
              listStyle: 'none',
              gap: 'var(--space-1)',
            }}
          >
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '6px 12px',
                      fontSize: '0.8125rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-secondary)',
                      backgroundColor: isActive
                        ? 'var(--color-surface-raised)'
                        : 'transparent',
                      borderRadius: 'var(--radius-sm)',
                      border: isActive
                        ? '1px solid var(--color-border-subtle)'
                        : '1px solid transparent',
                      transition: 'color 150ms, background-color 150ms',
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}

            {/* Auth Action */}
            <li style={{ marginLeft: 'var(--space-2)' }}>
              {user ? (
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                      maxWidth: '140px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={user.email || undefined}
                  >
                    {merchant?.business_name || user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => signOut()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: '4px 10px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: 'var(--color-text-secondary)',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    color: 'var(--color-brand-primary)',
                    backgroundColor: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    transition: 'all 150ms ease',
                  }}
                >
                  Sign In
                </Link>
              )}
            </li>
          </ul>
        </nav>

        {/* Mobile Menu Button */}
        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-nav-toggle"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-text-secondary)',
            cursor: 'pointer',
            padding: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 'var(--radius-sm)',
          }}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            backgroundColor: 'var(--color-surface-default)',
            borderTop: '1px solid var(--color-border-subtle)',
            padding: 'var(--space-3) var(--space-4)',
          }}
          className="mobile-nav-drawer"
        >
          <ul
            style={{
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-1)',
            }}
          >
            {NAV_LINKS.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'block',
                      padding: '8px 12px',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 600 : 500,
                      color: isActive
                        ? 'var(--color-text-primary)'
                        : 'var(--color-text-secondary)',
                      backgroundColor: isActive
                        ? 'var(--color-surface-raised)'
                        : 'transparent',
                      borderRadius: 'var(--radius-sm)',
                      border: isActive
                        ? '1px solid var(--color-border-subtle)'
                        : '1px solid transparent',
                    }}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
            {user ? (
              <li
                style={{
                  paddingTop: 'var(--space-2)',
                  borderTop: '1px solid var(--color-border-subtle)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    Signed in as: {merchant?.business_name || user.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      signOut();
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--color-text-secondary)',
                      backgroundColor: 'transparent',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </li>
            ) : (
              <li
                style={{
                  paddingTop: 'var(--space-2)',
                  borderTop: '1px solid var(--color-border-subtle)',
                }}
              >
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'block',
                    padding: '8px 12px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-brand-primary)',
                    backgroundColor: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  Sign In
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      <style>{`
        @media (min-width: 640px) {
          .desktop-nav {
            display: block !important;
          }
          .mobile-nav-toggle {
            display: none !important;
          }
          .mobile-nav-drawer {
            display: none !important;
          }
          .brand-descriptor {
            display: inline !important;
          }
        }
      `}</style>
    </header>
  );
};
