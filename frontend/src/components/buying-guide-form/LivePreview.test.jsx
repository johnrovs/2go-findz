import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import LivePreview from './LivePreview.jsx';

const tocEntries = [
  { clientId: 'QUICK_RECOMMENDATIONS', sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '', visible: true },
  { clientId: 'custom-1', sectionKey: null, title: 'Warranty Info', content: 'Details.', visible: true },
  { clientId: 'FAQS', sectionKey: 'FAQS', title: '', content: '', visible: false },
];

describe('LivePreview', () => {
  it('reflects typed-in title and excerpt without a save', () => {
    render(<LivePreview title="Best Blenders 2026" excerpt="A quick roundup." coverImageFilename={null} tocEntries={[]} settings={null} />);
    expect(screen.getByText('Best Blenders 2026')).toBeInTheDocument();
    expect(screen.getByText('A quick roundup.')).toBeInTheDocument();
  });

  it('lists only visible TOC entries, showing derived labels for structural rows', () => {
    render(<LivePreview title="Guide" excerpt="Excerpt" coverImageFilename={null} tocEntries={tocEntries} settings={null} />);
    const tocList = screen.getByRole('list', { name: 'Table of contents' });
    expect(within(tocList).getByText('Quick Recommendations')).toBeInTheDocument();
    expect(within(tocList).getByText('Warranty Info')).toBeInTheDocument();
    expect(within(tocList).queryByText('FAQs')).not.toBeInTheDocument();
  });

  it('renders the affiliate disclosure from settings', () => {
    render(
      <LivePreview
        title="Guide"
        excerpt="Excerpt"
        coverImageFilename={null}
        tocEntries={[]}
        settings={{ affiliateDisclosure: 'Custom disclosure text.' }}
      />
    );
    expect(screen.getByText('Custom disclosure text.')).toBeInTheDocument();
  });

  it('falls back to the default disclosure when settings have not loaded', () => {
    render(<LivePreview title="Guide" excerpt="Excerpt" coverImageFilename={null} tocEntries={[]} settings={null} />);
    expect(screen.getByText(/as an amazon associate/i)).toBeInTheDocument();
  });

  it('constrains the panel width when toggled to mobile', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LivePreview title="Guide" excerpt="Excerpt" coverImageFilename={null} tocEntries={[]} settings={null} />
    );
    expect(container.firstChild).not.toHaveClass('max-w-[375px]');

    await user.click(screen.getByRole('button', { name: 'Preview on mobile' }));

    expect(container.firstChild).toHaveClass('max-w-[375px]');

    await user.click(screen.getByRole('button', { name: 'Preview on desktop' }));

    expect(container.firstChild).not.toHaveClass('max-w-[375px]');
  });

  it('renders the Quick Recommendations section when quick picks exist', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[]}
        settings={null}
        quickRecommendations={[
          {
            product: { id: 1, name: 'Soundcore Liberty 4 NC', productPrice: '69.99', productLink: 'https://amazon.com/dp/a', imageFileName: null },
            badgeName: 'Best Overall',
          },
        ]}
      />
    );

    expect(screen.getByText('1. Quick Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /view on amazon/i });
    expect(cta).toHaveAttribute('href', 'https://amazon.com/dp/a');
    expect(cta).toHaveAttribute('rel', 'nofollow sponsored noopener noreferrer');
  });

  it('omits the Quick Recommendations section when there are no quick picks', () => {
    render(
      <LivePreview title="Best Earbuds" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} quickRecommendations={[]} />
    );
    expect(screen.queryByText(/quick recommendations/i)).not.toBeInTheDocument();
  });

  it('renders the Comparison Table section with formatted values', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[]}
        settings={null}
        comparisonProducts={[
          { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null },
          { id: 2, name: 'TOZO NC9 Hybrid Active', imageFileName: null },
        ]}
        comparisonSpecs={[
          {
            clientId: 'spec-1',
            specificationName: 'Active Noise Cancellation',
            values: [
              { productId: 1, value: 'Yes' },
              { productId: 2, value: 'No' },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText('2. Comparison Table')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Active Noise Cancellation')).toBeInTheDocument();
    expect(within(table).getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(within(table).getByText('Yes')).toHaveClass('sr-only');
    expect(within(table).getByText('No')).toHaveClass('sr-only');
  });

  it('omits the Comparison Table section when there are no specs', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[]}
        settings={null}
        comparisonProducts={[{ id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null }]}
        comparisonSpecs={[]}
      />
    );
    expect(screen.queryByText(/comparison table/i)).not.toBeInTheDocument();
  });
});
