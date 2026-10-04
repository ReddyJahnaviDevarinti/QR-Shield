import React, { useState } from 'react';
import {
  Building2,
  QrCode,
  History,
  Settings,
  CreditCard,
  LogOut,
  Plus,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ShieldCheck,
  Edit2,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { DataRow } from '../components/DataRow';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Alert } from '../components/Alert';
import { Select } from '../components/Select';

export const DashboardPage: React.FC = () => {
  const {
    user,
    merchant,
    destinations,
    isMerchantLoading,
    authError,
    signOut,
    createMerchantProfile,
    registerDestination,
    updateDestination,
    refreshMerchantData,
    clearAuthError,
  } = useAuth();

  // Onboarding state
  const [businessName, setBusinessName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // New destination form state
  const [showAddDestForm, setShowAddDestForm] = useState(false);
  const [destType, setDestType] = useState<'VPA' | 'URL' | 'ACCOUNT'>('VPA');
  const [destValue, setDestValue] = useState('');
  const [destActive, setDestActive] = useState(true);
  const [isRegisteringDest, setIsRegisteringDest] = useState(false);
  const [destError, setDestError] = useState<string | null>(null);
  const [destSuccess, setDestSuccess] = useState<string | null>(null);

  // Destination edit state
  const [editingDestId, setEditingDestId] = useState<string | null>(null);
  const [editDestValue, setEditDestValue] = useState('');
  const [editDestActive, setEditDestActive] = useState(true);
  const [isUpdatingDest, setIsUpdatingDest] = useState(false);

  // Handle Merchant Profile Creation
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    clearAuthError();

    const trimmedName = businessName.trim();
    if (!trimmedName) {
      setProfileError('Please enter your business or legal merchant name.');
      return;
    }

    setIsCreatingProfile(true);
    try {
      await createMerchantProfile(
        trimmedName,
        contactEmail.trim() || user?.email || undefined,
      );
      setBusinessName('');
      setContactEmail('');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to register merchant profile.';
      setProfileError(msg);
    } finally {
      setIsCreatingProfile(false);
    }
  };

  // Handle Add Destination
  const handleRegisterDestination = async (e: React.FormEvent) => {
    e.preventDefault();
    setDestError(null);
    setDestSuccess(null);
    clearAuthError();

    const trimmedValue = destValue.trim();
    if (!trimmedValue) {
      setDestError('Destination value is required.');
      return;
    }

    if (destType === 'VPA') {
      if (!trimmedValue.includes('@')) {
        setDestError(
          'Virtual Payment Address (VPA) must include "@" (e.g. merchant@icici).',
        );
        return;
      }
      if (trimmedValue.includes(' ')) {
        setDestError('VPA cannot contain spaces.');
        return;
      }
    }

    setIsRegisteringDest(true);
    try {
      await registerDestination(destType, trimmedValue, destActive);
      setDestSuccess(`Trusted ${destType} destination registered successfully.`);
      setDestValue('');
      setShowAddDestForm(false);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to register payment destination.';
      setDestError(msg);
    } finally {
      setIsRegisteringDest(false);
    }
  };

  // Handle Edit Destination
  const handleStartEdit = (d: {
    id: string;
    destination_value: string;
    is_active: boolean;
  }) => {
    setEditingDestId(d.id);
    setEditDestValue(d.destination_value);
    setEditDestActive(d.is_active);
    setDestError(null);
    setDestSuccess(null);
  };

  const handleSaveEdit = async (destinationId: string) => {
    setDestError(null);
    setDestSuccess(null);
    clearAuthError();

    const trimmedValue = editDestValue.trim();
    if (!trimmedValue) {
      setDestError('Destination value cannot be empty.');
      return;
    }

    setIsUpdatingDest(true);
    try {
      await updateDestination(destinationId, {
        destination_value: trimmedValue,
        is_active: editDestActive,
      });
      setDestSuccess('Payment destination updated successfully.');
      setEditingDestId(null);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Failed to update payment destination.';
      setDestError(msg);
    } finally {
      setIsUpdatingDest(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Page Header */}
      <PageHeader
        badge="Merchant Console"
        title="Merchant Registry Workspace"
        description="Authoritative identity and trusted payment destination registry. Records registered here govern automated destination parity verification."
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refreshMerchantData()}
              disabled={isMerchantLoading}
              title="Refresh Registry Data"
            >
              <RefreshCw
                size={14}
                className={isMerchantLoading ? 'animate-spin' : undefined}
              />
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => signOut()} title="Sign Out">
              <LogOut size={14} />
              Sign Out
            </Button>
          </div>
        }
      />

      {/* Global Alerts */}
      {authError && (
        <Alert variant="error" title="Database Error" onClose={clearAuthError}>
          {authError}
        </Alert>
      )}

      {/* ================================================== */}
      {/* Onboarding State: No Merchant Profile Yet          */}
      {/* ================================================== */}
      {!merchant && (
        <Card
          title="Merchant Profile Onboarding"
          subtitle="Complete your business profile to activate trusted destination protection"
          badge={<Building2 size={18} style={{ color: 'var(--color-brand-primary)' }} />}
        >
          <div style={{ maxWidth: '580px' }}>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                lineHeight: 1.5,
                marginBottom: 'var(--space-4)',
              }}
            >
              Your authenticated account (<strong>{user?.email}</strong>) does not have a
              registered merchant profile yet. Register your business name below to
              establish your authoritative trusted registry.
            </p>

            {profileError && (
              <div style={{ marginBottom: 'var(--space-4)' }}>
                <Alert
                  variant="error"
                  title="Profile Creation Error"
                  onClose={() => setProfileError(null)}
                >
                  {profileError}
                </Alert>
              </div>
            )}

            <form
              onSubmit={handleCreateProfile}
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
            >
              <Input
                label="Legal / Business Name"
                placeholder="e.g. Apex Retail Services"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={isCreatingProfile}
                required
                helperText="The authoritative business name displayed on payment counters."
              />

              <Input
                label="Contact Email"
                placeholder="contact@business.com"
                value={contactEmail || user?.email || ''}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={isCreatingProfile}
                helperText="Primary notification email for security alerts."
              />

              <div
                style={{
                  display: 'flex',
                  gap: 'var(--space-3)',
                  marginTop: 'var(--space-2)',
                }}
              >
                <Button type="submit" variant="primary" disabled={isCreatingProfile}>
                  {isCreatingProfile ? 'Registering...' : 'Create Merchant Profile'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* ================================================== */}
      {/* Active Merchant Workspace                          */}
      {/* ================================================== */}
      {merchant && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--space-6)',
            alignItems: 'start',
          }}
        >
          {/* ================================================== */}
          {/* 1. Merchant Identity                               */}
          {/* ================================================== */}
          <Card
            title="1. Merchant Identity"
            subtitle="Registered business credentials and verification authority"
            badge={
              <Building2
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-brand-primary)' }}
                aria-hidden="true"
              />
            }
          >
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}
            >
              <DataRow
                label="Business Name"
                value={merchant.business_name}
                isMonospace={false}
              />
              <DataRow
                label="Authenticated User"
                value={user?.email || '—'}
                isMonospace
              />
              <DataRow label="Merchant Identifier" value={merchant.id} isMonospace />
              <DataRow
                label="Contact Email"
                value={merchant.contact_email || '—'}
                isMonospace
              />
              <DataRow
                label="Registered Since"
                value={new Date(merchant.created_at).toLocaleDateString()}
                isMonospace
              />

              <div
                style={{
                  marginTop: 'var(--space-3)',
                  padding: 'var(--space-3)',
                  backgroundColor: 'var(--color-surface-raised)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-subtle)',
                  fontSize: '0.75rem',
                  color: 'var(--color-text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <ShieldCheck
                  size={16}
                  style={{ color: 'var(--color-status-verified)', flexShrink: 0 }}
                />
                <span>
                  Authoritative Profile Active. Scans verifying against ID{' '}
                  <code
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    {merchant.id.slice(0, 8)}...
                  </code>{' '}
                  will check against this merchant's trusted destinations.
                </span>
              </div>
            </div>
          </Card>

          {/* ================================================== */}
          {/* 2. Trusted Payment Destinations                   */}
          {/* ================================================== */}
          <Card
            title="2. Trusted Payment Destinations"
            subtitle="Authoritative payment targets (VPAs / URLs) protected by QRShield"
            badge={
              <CreditCard
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-brand-primary)' }}
                aria-hidden="true"
              />
            }
            actions={
              !showAddDestForm && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddDestForm(true)}
                >
                  <Plus size={14} />
                  Add Destination
                </Button>
              )
            }
          >
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
            >
              {/* Feedback Alerts */}
              {destError && (
                <Alert
                  variant="error"
                  title="Destination Error"
                  onClose={() => setDestError(null)}
                >
                  {destError}
                </Alert>
              )}
              {destSuccess && (
                <Alert
                  variant="success"
                  title="Success"
                  onClose={() => setDestSuccess(null)}
                >
                  {destSuccess}
                </Alert>
              )}

              {/* Add Destination Form */}
              {showAddDestForm && (
                <div
                  style={{
                    padding: 'var(--space-4)',
                    backgroundColor: 'var(--color-surface-raised)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 'var(--space-3)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--color-text-primary)',
                      }}
                    >
                      Register New Trusted Destination
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddDestForm(false)}
                    >
                      Cancel
                    </Button>
                  </div>

                  <form
                    onSubmit={handleRegisterDestination}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <Select
                      label="Destination Type"
                      value={destType}
                      onChange={(e) =>
                        setDestType(e.target.value as 'VPA' | 'URL' | 'ACCOUNT')
                      }
                      options={[
                        { value: 'VPA', label: 'UPI VPA (Virtual Payment Address)' },
                        { value: 'URL', label: 'Payment Gateway URL' },
                        { value: 'ACCOUNT', label: 'Direct Account Identifier' },
                      ]}
                    />

                    <Input
                      label="Destination Value"
                      placeholder={
                        destType === 'VPA'
                          ? 'e.g. storename@icici or merchant@upi'
                          : 'e.g. https://pay.merchant.com/checkout'
                      }
                      value={destValue}
                      onChange={(e) => setDestValue(e.target.value)}
                      disabled={isRegisteringDest}
                      isMonospace
                      required
                      helperText={
                        destType === 'VPA'
                          ? 'The exact UPI payee address (pa) encoded into your genuine QR code.'
                          : 'The exact destination URL.'
                      }
                    />

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <input
                        type="checkbox"
                        id="dest-active-checkbox"
                        checked={destActive}
                        onChange={(e) => setDestActive(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <label
                        htmlFor="dest-active-checkbox"
                        style={{
                          fontSize: '0.8125rem',
                          color: 'var(--color-text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        Active destination (enabled for verification matching)
                      </label>
                    </div>

                    <div
                      style={{
                        padding: 'var(--space-2)',
                        backgroundColor: 'var(--color-surface-default)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.6875rem',
                        color: 'var(--color-text-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      Notice: Registration establishes trusted parity baseline in
                      QRShield's registry. It does not verify external banking credentials
                      or guarantee transaction execution.
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: 'var(--space-2)',
                        marginTop: 'var(--space-1)',
                      }}
                    >
                      <Button
                        type="submit"
                        variant="primary"
                        size="sm"
                        disabled={isRegisteringDest}
                      >
                        {isRegisteringDest
                          ? 'Registering...'
                          : 'Confirm & Save Destination'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Destination List */}
              {destinations.length === 0 ? (
                <EmptyState
                  icon={<CreditCard size={20} />}
                  title="No trusted destinations registered yet."
                  description="Register the authoritative payment target (such as your merchant UPI VPA) to enable automated destination parity checking."
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowAddDestForm(true)}
                    >
                      Register First Destination
                    </Button>
                  }
                />
              ) : (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-3)',
                  }}
                >
                  {destinations.map((d) => (
                    <div
                      key={d.id}
                      style={{
                        padding: 'var(--space-3)',
                        backgroundColor: 'var(--color-surface-raised)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border-subtle)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-2)',
                      }}
                    >
                      {editingDestId === d.id ? (
                        /* Edit mode */
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 'var(--space-2)',
                          }}
                        >
                          <Input
                            label={`Edit ${d.destination_type} Value`}
                            value={editDestValue}
                            onChange={(e) => setEditDestValue(e.target.value)}
                            isMonospace
                            disabled={isUpdatingDest}
                          />
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 'var(--space-2)',
                            }}
                          >
                            <input
                              type="checkbox"
                              id={`edit-active-${d.id}`}
                              checked={editDestActive}
                              onChange={(e) => setEditDestActive(e.target.checked)}
                            />
                            <label
                              htmlFor={`edit-active-${d.id}`}
                              style={{
                                fontSize: '0.8125rem',
                                color: 'var(--color-text-secondary)',
                              }}
                            >
                              Destination Active
                            </label>
                          </div>
                          <div
                            style={{
                              display: 'flex',
                              gap: 'var(--space-2)',
                              marginTop: 'var(--space-1)',
                            }}
                          >
                            <Button
                              variant="primary"
                              size="sm"
                              disabled={isUpdatingDest}
                              onClick={() => handleSaveEdit(d.id)}
                            >
                              {isUpdatingDest ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isUpdatingDest}
                              onClick={() => setEditingDestId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        /* Read-only view */
                        <>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 'var(--space-2)',
                            }}
                          >
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '0.6875rem',
                                  fontFamily: 'var(--font-mono)',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-sm)',
                                  backgroundColor: 'var(--color-surface-default)',
                                  border: '1px solid var(--color-border-subtle)',
                                  color: 'var(--color-text-secondary)',
                                }}
                              >
                                {d.destination_type}
                              </span>
                              <span
                                style={{
                                  fontSize: '0.875rem',
                                  fontFamily: 'var(--font-mono)',
                                  fontWeight: 600,
                                  color: 'var(--color-text-primary)',
                                }}
                              >
                                {d.destination_value}
                              </span>
                            </div>

                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                              }}
                            >
                              {d.is_active ? (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.6875rem',
                                    fontFamily: 'var(--font-mono)',
                                    color: 'var(--color-status-verified)',
                                  }}
                                >
                                  <CheckCircle2 size={12} />
                                  ACTIVE
                                </span>
                              ) : (
                                <span
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '0.6875rem',
                                    fontFamily: 'var(--font-mono)',
                                    color: 'var(--color-text-muted)',
                                  }}
                                >
                                  <XCircle size={12} />
                                  INACTIVE
                                </span>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartEdit(d)}
                                title="Edit Destination"
                              >
                                <Edit2 size={12} />
                              </Button>
                            </div>
                          </div>

                          <div
                            style={{
                              fontSize: '0.6875rem',
                              color: 'var(--color-text-muted)',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            Registered: {new Date(d.registered_at).toLocaleString()}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* ================================================== */}
          {/* 3. Registered Reference QR Assets                  */}
          {/* ================================================== */}
          <Card
            title="3. Registered Reference QR Assets"
            subtitle="Baseline visual references for physical tamper inspection"
            badge={
              <QrCode
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-text-muted)' }}
                aria-hidden="true"
              />
            }
          >
            <EmptyState
              icon={<QrCode size={20} />}
              title="Reference asset storage pending Phase 3."
              description="Upload an official high-resolution reference photo of your counter stand to enable physical sticker overlay detection. Reference QR Storage integration scheduled for the next milestone."
            />
          </Card>

          {/* ================================================== */}
          {/* 4. Verification History                            */}
          {/* ================================================== */}
          <Card
            title="4. Verification History"
            subtitle="Chronological audit records of scans evaluated against this merchant"
            badge={
              <History
                size={16}
                strokeWidth={1.75}
                style={{ color: 'var(--color-text-muted)' }}
                aria-hidden="true"
              />
            }
          >
            <EmptyState
              icon={<History size={20} />}
              title="Verification audit logging scheduled for Phase 10."
              description="Audit logging records will persist chronological scan results and tamper verdicts once the audit logging table pipeline is activated."
            />
          </Card>

          {/* ================================================== */}
          {/* 5. Configuration & Verification Policies           */}
          {/* ================================================== */}
          <div style={{ gridColumn: '1 / -1' }}>
            <Card
              title="5. Verification Policies & Configuration"
              subtitle="Threshold sensitivities and security dispatch rules"
              badge={
                <Settings
                  size={16}
                  strokeWidth={1.75}
                  style={{ color: 'var(--color-text-muted)' }}
                  aria-hidden="true"
                />
              }
            >
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 'var(--space-4)',
                }}
              >
                <div
                  style={{
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--color-surface-raised)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Strict Destination Matching
                  </div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    Require exact string parity on payee VPA (`pa`) and handle domain.
                  </p>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-status-verified)',
                    }}
                  >
                    ENFORCED (Default)
                  </span>
                </div>

                <div
                  style={{
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--color-surface-raised)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                    Visual Anomaly Sensitivity
                  </div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginTop: '2px',
                      marginBottom: 'var(--space-2)',
                    }}
                  >
                    Flag candidate sticker seams and border deviations against reference
                    assets.
                  </p>
                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    MEDIUM THRESHOLD (Active)
                  </span>
                </div>

                <div
                  style={{
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--color-surface-raised)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-subtle)',
                  }}
                >
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      marginBottom: 'var(--space-1)',
                    }}
                  >
                    Quick QR Verification Test
                  </div>
                  <p
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--color-text-muted)',
                      marginBottom: 'var(--space-3)',
                    }}
                  >
                    Test an uploaded QR image directly against this merchant's registered
                    destination.
                  </p>
                  <Link
                    to="/verify"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: 'var(--color-brand-primary)',
                      textDecoration: 'none',
                    }}
                  >
                    Open Verify Console <ExternalLink size={14} />
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
