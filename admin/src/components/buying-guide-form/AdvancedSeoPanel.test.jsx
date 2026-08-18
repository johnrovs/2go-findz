import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import AdvancedSeoPanel from './AdvancedSeoPanel.jsx';

const baseValues = {
  robotsIndex: true,
  robotsFollow: true,
  openGraphTitle: '',
  openGraphDescription: '',
  openGraphImageFilename: null,
  twitterCardType: 'summary_large_image',
};

describe('AdvancedSeoPanel', () => {
  it('is collapsed by default', () => {
    render(
      <AdvancedSeoPanel
        values={baseValues}
        onChange={vi.fn()}
        seoTitleFallback=""
        metaDescriptionFallback=""
        coverImageFilenameFallback={null}
      />
    );
    expect(screen.queryByLabelText('Open Graph Title')).not.toBeInTheDocument();
  });

  it('expands to show fields when the header is clicked', async () => {
    const user = userEvent.setup();
    render(
      <AdvancedSeoPanel
        values={baseValues}
        onChange={vi.fn()}
        seoTitleFallback=""
        metaDescriptionFallback=""
        coverImageFilenameFallback={null}
      />
    );

    await user.click(screen.getByRole('button', { name: /Advanced SEO/ }));

    expect(screen.getByLabelText('Open Graph Title')).toBeInTheDocument();
  });

  it('toggles the robots index checkbox', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdvancedSeoPanel
        values={baseValues}
        onChange={onChange}
        seoTitleFallback=""
        metaDescriptionFallback=""
        coverImageFilenameFallback={null}
      />
    );
    await user.click(screen.getByRole('button', { name: /Advanced SEO/ }));

    await user.click(screen.getByLabelText(/Allow search engines to index/));

    expect(onChange).toHaveBeenCalledWith({ ...baseValues, robotsIndex: false });
  });

  it('calls onChange when the Twitter card type changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <AdvancedSeoPanel
        values={baseValues}
        onChange={onChange}
        seoTitleFallback=""
        metaDescriptionFallback=""
        coverImageFilenameFallback={null}
      />
    );
    await user.click(screen.getByRole('button', { name: /Advanced SEO/ }));

    await user.selectOptions(screen.getByLabelText(/Twitter Card Type/), 'summary');

    expect(onChange).toHaveBeenCalledWith({ ...baseValues, twitterCardType: 'summary' });
  });
});
