import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ShieldCheck, Lock, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Alert } from '../components/Alert';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, user, authError, clearAuthError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // If already logged in, redirect to dashboard or target
  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  React.useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const handleToggleMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setValidationError(null);
    setInfoMessage(null);
    clearAuthError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setInfoMessage(null);
    clearAuthError();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setValidationError('Please provide a valid email address.');
      return;
    }

    if (!password) {
      setValidationError('Please enter your password.');
      return;
    }

    if (mode === 'signup') {
      if (password.length < 6) {
        setValidationError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setValidationError('Passwords do not match.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        await signIn(trimmedEmail, password);
        navigate(from, { replace: true });
      } else {
        const result = await signUp(trimmedEmail, password);
        if (result.needsEmailConfirmation) {
          setInfoMessage(
            'Account registration submitted. Please check your inbox if email confirmation is required, or sign in now.',
          );
          setMode('signin');
        } else {
          navigate(from, { replace: true });
        }
      }
    } catch {
      // Auth errors are captured and populated in AuthContext (authError)
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 220px)',
        padding: 'var(--space-6) 0',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border-subtle)',
              marginBottom: 'var(--space-3)',
            }}
          >
            <ShieldCheck size={28} style={{ color: 'var(--color-brand-primary)' }} />
          </div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.02em',
              marginBottom: 'var(--space-1)',
            }}
          >
            {mode === 'signin' ? 'Sign in to QRShield' : 'Register Merchant Account'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            {mode === 'signin'
              ? 'Access your protected merchant registry and trusted destinations.'
              : 'Create an authoritative merchant identity to safeguard your QR codes.'}
          </p>
        </div>

        <Card>
          {/* Mode Switcher Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--space-2)',
              marginBottom: 'var(--space-5)',
              padding: '4px',
              backgroundColor: 'var(--color-surface-raised)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => handleToggleMode('signin')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: '8px 12px',
                fontSize: '0.8125rem',
                fontWeight: mode === 'signin' ? 600 : 500,
                color:
                  mode === 'signin'
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-secondary)',
                backgroundColor:
                  mode === 'signin' ? 'var(--color-surface-default)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                border:
                  mode === 'signin'
                    ? '1px solid var(--color-border-subtle)'
                    : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <LogIn size={15} />
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode('signup')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: '8px 12px',
                fontSize: '0.8125rem',
                fontWeight: mode === 'signup' ? 600 : 500,
                color:
                  mode === 'signup'
                    ? 'var(--color-text-primary)'
                    : 'var(--color-text-secondary)',
                backgroundColor:
                  mode === 'signup' ? 'var(--color-surface-default)' : 'transparent',
                borderRadius: 'var(--radius-sm)',
                border:
                  mode === 'signup'
                    ? '1px solid var(--color-border-subtle)'
                    : '1px solid transparent',
                cursor: 'pointer',
                transition: 'all 150ms ease',
              }}
            >
              <UserPlus size={15} />
              Sign Up
            </button>
          </div>

          {/* Feedback Alerts */}
          {(validationError || authError) && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Alert
                variant="error"
                title="Authentication Error"
                onClose={() => {
                  setValidationError(null);
                  clearAuthError();
                }}
              >
                {validationError || authError}
              </Alert>
            </div>
          )}

          {infoMessage && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <Alert variant="info" title="Notice" onClose={() => setInfoMessage(null)}>
                {infoMessage}
              </Alert>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
          >
            <div>
              <Input
                label="Email Address"
                type="email"
                placeholder="merchant@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                helperText={mode === 'signup' ? 'Minimum 6 characters.' : undefined}
                disabled={isSubmitting}
                required
              />
            </div>

            {mode === 'signup' && (
              <div>
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={isSubmitting}
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              style={{ width: '100%', marginTop: 'var(--space-2)' }}
            >
              {isSubmitting ? (
                'Processing...'
              ) : mode === 'signin' ? (
                <span
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  Sign In <ArrowRight size={16} />
                </span>
              ) : (
                <span
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  Create Account <UserPlus size={16} />
                </span>
              )}
            </Button>
          </form>

          {/* Security & RLS notice */}
          <div
            style={{
              marginTop: 'var(--space-5)',
              paddingTop: 'var(--space-4)',
              borderTop: '1px solid var(--color-border-subtle)',
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            <Lock size={14} style={{ flexShrink: 0 }} />
            <span>
              Direct Supabase Auth connection. Credentials and sessions are encrypted and
              governed by Row Level Security.
            </span>
          </div>
        </Card>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
          <Link
            to="/verify"
            style={{
              fontSize: '0.8125rem',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
            }}
          >
            Looking to verify a QR code without signing in?{' '}
            <span style={{ color: 'var(--color-brand-primary)' }}>Go to Verify Scan</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
