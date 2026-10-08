import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { router } from './router';

describe('Router & Deep Links (/ , /verify , /sample-lab , /login , /dashboard , /privacy , /terms)', () => {
  const routes = [
    { path: '/', expectedText: /Verify that a payment QR matches a trusted registered destination/i },
    { path: '/verify', expectedText: /QR Verification Console/i },
    { path: '/sample-lab', expectedText: /Evaluator Sample Lab/i },
    { path: '/login', expectedText: /Sign in to QRShield/i },
    { path: '/dashboard', expectedText: /Sign in to QRShield/i }, // ProtectedRoute redirects unauthenticated user to /login
    { path: '/privacy', expectedText: /Privacy Policy/i },
    { path: '/terms', expectedText: /Terms of Service/i },
  ];

  routes.forEach(({ path, expectedText }) => {
    it(`navigates and renders ${path} correctly`, () => {
      // Re-create router at initial entry
      const testRouter = createMemoryRouter(router.routes, {
        initialEntries: [path],
      });

      render(<RouterProvider router={testRouter} />);

      const elements = screen.getAllByText(expectedText);
      expect(elements.length).toBeGreaterThan(0);
    });
  });
});
