import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminBrandingPanel from './AdminBrandingPanel.jsx';

describe('AdminBrandingPanel', () => {
  it('renders the branding image with descriptive alt text and the correct src', () => {
    render(<AdminBrandingPanel />);

    const image = screen.getByAltText(/2Go Findz Admin Command Center/);
    expect(image).toHaveAttribute('src', '/images/login_left_image_panel.png');
  });
});
