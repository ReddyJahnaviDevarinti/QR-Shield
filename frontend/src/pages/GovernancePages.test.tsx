import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PrivacyPage } from './PrivacyPage';
import { TermsPage } from './TermsPage';

describe('Governance Pages (/privacy & /terms)', () => {
  it('renders PrivacyPage with all required sections and principles', () => {
    render(
      <MemoryRouter>
        <PrivacyPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /Privacy Policy/i }),
    ).toBeDefined();
    expect(screen.getByText(/Core Principles & Non-Financial Scope/i)).toBeDefined();
    expect(screen.getByText(/Information Collected During Account Usage/i)).toBeDefined();
    expect(screen.getByText(/Third-Party Services & Infrastructure/i)).toBeDefined();
    expect(screen.getByText(/Security & Data Retention Principles/i)).toBeDefined();
    expect(screen.getByText(/No Banking Ledger Access/i)).toBeDefined();
    expect(screen.getByText(/No Payment Processing/i)).toBeDefined();
    expect(
      screen.getByText(/github\.com\/ReddyJahnaviDevarinti\/QR-Shield/i),
    ).toBeDefined();
  });

  it('renders TermsPage with all required limitations and disclosures', () => {
    render(
      <MemoryRouter>
        <TermsPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', { level: 1, name: /Terms of Service/i }),
    ).toBeDefined();
    expect(screen.getByText(/1\. Intended Use/i)).toBeDefined();
    expect(screen.getByText(/2\. Acceptable Use/i)).toBeDefined();
    expect(
      screen.getByText(/3\. Distinction Between Verification & Fraud Detection/i),
    ).toBeDefined();
    expect(
      screen.getByText(/4\. Limitations of QR Verification & User Responsibility/i),
    ).toBeDefined();
    expect(
      screen.getByText(/5\. Service Availability & Intellectual Property/i),
    ).toBeDefined();
    expect(screen.getByText(/UNVERIFIED Does Not Mean Fraudulent/i)).toBeDefined();
    expect(screen.getByText(/VERIFIED Is Not a Solvency Guarantee/i)).toBeDefined();
    expect(
      screen.getByText(/github\.com\/ReddyJahnaviDevarinti\/QR-Shield/i),
    ).toBeDefined();
  });
});
