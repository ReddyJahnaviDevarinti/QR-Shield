import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../components/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // In production, structured error telemetry would be recorded here
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-bg-base)',
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: '540px',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-status-mismatch-bg)',
                  border: '1px solid var(--color-status-mismatch-border)',
                  color: 'var(--color-status-mismatch)',
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                }}
              >
                !
              </span>
              <div>
                <h2>Application Error</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>
                  An unexpected exception occurred during execution.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
              QRShield encountered a runtime condition that prevented this view from
              rendering. No personal data or payment credentials were compromised.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <pre
                style={{
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-bg-base)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-status-mismatch)',
                  fontSize: '0.75rem',
                  overflowX: 'auto',
                }}
              >
                {this.state.error.message}
              </pre>
            )}

            <div>
              <Button variant="primary" onClick={this.handleReset}>
                Return to Overview
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
