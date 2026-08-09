import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import PrivacyPolicyPage from './PrivacyPolicyPage.jsx';
import { CompareProvider } from '../context/CompareContext.jsx';

describe('PrivacyPolicyPage', () => {
  it('renders the Privacy Policy heading and real content', () => {
    render(
      <MemoryRouter>
        <CompareProvider>
          <PrivacyPolicyPage />
        </CompareProvider>
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByText(/anonymous session identifier/i)).toBeInTheDocument();
  });
});
