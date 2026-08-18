import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
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

  it('calls onRequestDesktopModal instead of changing local state when provided', async () => {
    const user = userEvent.setup();
    const onRequestDesktopModal = vi.fn();
    const { container } = render(
      <LivePreview
        title="Guide"
        excerpt="Excerpt"
        coverImageFilename={null}
        tocEntries={[]}
        settings={null}
        onRequestDesktopModal={onRequestDesktopModal}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Preview on mobile' }));
    expect(container.firstChild).toHaveClass('max-w-[375px]');

    await user.click(screen.getByRole('button', { name: 'Preview on desktop' }));

    expect(onRequestDesktopModal).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toHaveClass('max-w-[375px]');
  });

  it('renders the Quick Recommendations section when quick picks exist', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[{ clientId: 'QUICK_RECOMMENDATIONS', sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '', visible: true }]}
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
        tocEntries={[{ clientId: 'COMPARISON_TABLE', sectionKey: 'COMPARISON_TABLE', title: '', content: '', visible: true }]}
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

    // Only Comparison Table's own TOC entry is present in this fixture, so it's the
    // first (and only) numbered section here -- dynamic numbering, not a fixed "2.".
    expect(screen.getByText('1. Comparison Table')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Active Noise Cancellation')).toBeInTheDocument();
    expect(within(table).getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(within(table).getByText('Yes')).toBeInTheDocument();
    expect(within(table).getByText('No')).toBeInTheDocument();
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

  const topPickSection = {
    clientId: 'tp-1',
    product: { id: 1, name: 'Soundcore Liberty 4 NC', imageFileName: null, productPrice: '69.99', productLink: 'https://amazon.com/dp/a', rating: 4.8, reviewCount: 12850 },
    recommendationType: 'TOP_PICK',
    sectionLabel: 'Best Overall',
    whyRecommended: '<p>Great sound and battery life.</p>',
    pros: [{ clientId: 'p1', content: 'Great sound' }],
    cons: [{ clientId: 'c1', content: 'Pricey' }],
    bestFor: [{ clientId: 'b1', content: 'Daily commuters' }],
  };

  const runnerUpSection = {
    clientId: 'ru-1',
    product: { id: 2, name: 'TOZO NC9', imageFileName: null, productPrice: '39.99', productLink: 'https://amazon.com/dp/b', rating: 4.2, reviewCount: 500 },
    recommendationType: 'RUNNER_UP',
    sectionLabel: 'Best Budget Alternative',
    whyRecommended: '<p>Solid value for the price.</p>',
    pros: [{ clientId: 'p2', content: 'Affordable' }],
    cons: [{ clientId: 'c2', content: 'Fewer features' }],
    bestFor: [{ clientId: 'b2', content: 'Budget shoppers' }],
  };

  it('renders the Top Pick and Runner-Ups sections with content', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[]}
        settings={null}
        recommendationSections={[topPickSection, runnerUpSection]}
      />
    );

    expect(screen.getByText(/our top pick/i)).toBeInTheDocument();
    expect(screen.getByText('Best Overall')).toBeInTheDocument();
    expect(screen.getByText('Soundcore Liberty 4 NC')).toBeInTheDocument();
    expect(screen.getByText('Great sound')).toBeInTheDocument();
    expect(screen.getByText(/runner-ups/i)).toBeInTheDocument();
    expect(screen.getByText('Best Budget Alternative')).toBeInTheDocument();
    expect(screen.getByText('TOZO NC9')).toBeInTheDocument();
  });

  it('omits the Top Pick and Runner-Ups sections when there are none', () => {
    render(
      <LivePreview title="Best Earbuds" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} recommendationSections={[]} />
    );
    expect(screen.queryByText(/our top pick/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/runner-ups/i)).not.toBeInTheDocument();
  });

  it('numbers sections dynamically based on visible TOC order, skipping empty sections', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[
          { clientId: 'QUICK_RECOMMENDATIONS', sectionKey: 'QUICK_RECOMMENDATIONS', title: '', content: '', visible: false },
          { clientId: 'COMPARISON_TABLE', sectionKey: 'COMPARISON_TABLE', title: '', content: '', visible: true },
          { clientId: 'TOP_PICK', sectionKey: 'TOP_PICK', title: '', content: '', visible: true },
          { clientId: 'RUNNER_UPS', sectionKey: 'RUNNER_UPS', title: '', content: '', visible: true },
        ]}
        settings={null}
        quickRecommendations={[
          { product: { id: 9, name: 'Hidden Product', productPrice: '9.99', productLink: 'https://amazon.com/dp/z', imageFileName: null }, badgeName: 'Hidden' },
        ]}
        comparisonSpecs={[]}
        comparisonProducts={[]}
        recommendationSections={[topPickSection, runnerUpSection]}
      />
    );

    // Quick Recommendations is hidden in the TOC and Comparison has no specs, so
    // Top Pick becomes "1." and Runner-Ups becomes "2." even though they are the
    // third and fourth structural sections overall.
    expect(screen.getByText(/1\. our top pick/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. runner-ups/i)).toBeInTheDocument();
  });

  const customSectionEntry = {
    clientId: 'custom-1',
    sectionKey: null,
    title: 'How We Tested',
    content: '<p>We tested every product for a full week in real-world conditions to see how it performed.</p>',
    visible: true,
  };

  it('renders the Buying Guide section with custom section content', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[customSectionEntry]}
        settings={null}
      />
    );

    expect(screen.getByText(/1\. buying guide/i)).toBeInTheDocument();
    // The section's title renders twice (once as the TOC link, once as the card heading) --
    // getAllByText avoids the "multiple matches" throw getByText would raise here.
    expect(screen.getAllByText('How We Tested').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/we tested every product/i)).toBeInTheDocument();
  });

  // NOTE: the preview's breadcrumb ("Home / Buying Guides / {title}") always contains the
  // substring "Buying Guide" (as part of "Buying Guides"), so every assertion below anchors
  // on a leading number + period ("1. Buying Guide") to target only the dynamic section
  // heading -- a bare /buying guide/i would false-match the breadcrumb on every render.

  it('omits the Buying Guide section when there are no custom sections with content', () => {
    render(<LivePreview title="Best Earbuds" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} />);
    expect(screen.queryByText(/\d+\.\s*buying guide/i)).not.toBeInTheDocument();
  });

  it('omits the Buying Guide section when a custom entry is hidden', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[{ ...customSectionEntry, visible: false }]}
        settings={null}
      />
    );
    expect(screen.queryByText(/\d+\.\s*buying guide/i)).not.toBeInTheDocument();
  });

  it('groups multiple custom sections under one dynamically-numbered Buying Guide heading, numbered locally', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[
          { ...customSectionEntry, clientId: 'custom-1', title: 'How We Tested' },
          { ...customSectionEntry, clientId: 'custom-2', title: 'What to Look For' },
        ]}
        settings={null}
      />
    );

    expect(screen.getAllByText(/\d+\.\s*buying guide/i)).toHaveLength(1);
    // Each title also renders twice (TOC link + card heading) -- see note above.
    expect(screen.getAllByText('How We Tested').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('What to Look For').length).toBeGreaterThanOrEqual(1);
  });

  it('numbers Buying Guide after other present dynamic sections', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[
          { clientId: 'COMPARISON_TABLE', sectionKey: 'COMPARISON_TABLE', title: '', content: '', visible: true },
          customSectionEntry,
        ]}
        settings={null}
        comparisonProducts={[{ id: 1, name: 'Product A', imageFileName: null }]}
        comparisonSpecs={[{ clientId: 'spec-1', specificationName: 'Weight', values: [{ productId: 1, value: '1kg' }] }]}
      />
    );

    expect(screen.getByText('1. Comparison Table')).toBeInTheDocument();
    expect(screen.getByText(/2\. buying guide/i)).toBeInTheDocument();
  });

  it('shows a Read more toggle for long section content and expands on click', async () => {
    const user = userEvent.setup();
    const longContent = `<p>${Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ')}</p>`;
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[{ ...customSectionEntry, content: longContent }]}
        settings={null}
      />
    );

    const readMoreButton = screen.getByRole('button', { name: 'Read more' });
    expect(readMoreButton).toBeInTheDocument();

    await user.click(readMoreButton);

    expect(screen.getByRole('button', { name: 'Show less' })).toBeInTheDocument();
  });

  it('does not show a Read more toggle for short section content', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[customSectionEntry]}
        settings={null}
      />
    );
    expect(screen.queryByRole('button', { name: 'Read more' })).not.toBeInTheDocument();
  });

  it('gives a custom TOC entry a real anchor link to its own section', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[customSectionEntry]}
        settings={null}
      />
    );
    const tocList = screen.getByRole('list', { name: 'Table of contents' });
    const link = within(tocList).getByRole('link', { name: 'How We Tested' });
    expect(link).toHaveAttribute('href', '#how-we-tested');
  });

  it('still lists each custom entry by its own title in the TOC, not a combined label', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[
          { ...customSectionEntry, clientId: 'custom-1', title: 'How We Tested' },
          { ...customSectionEntry, clientId: 'custom-2', title: 'What to Look For' },
        ]}
        settings={null}
      />
    );
    const tocList = screen.getByRole('list', { name: 'Table of contents' });
    expect(within(tocList).getByText('How We Tested')).toBeInTheDocument();
    expect(within(tocList).getByText('What to Look For')).toBeInTheDocument();
  });

  const faqOne = { clientId: 'faq-1', question: 'Is it worth it?', answer: 'Yes, absolutely worth it for the price.' };
  const faqTwo = { clientId: 'faq-2', question: 'How long does the battery last?', answer: 'About 8 hours per charge.' };

  it('renders the FAQs section as an accordion when FAQs exist', () => {
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[{ clientId: 'FAQS', sectionKey: 'FAQS', title: '', content: '', visible: true }]}
        settings={null}
        faqs={[faqOne]}
      />
    );

    expect(screen.getByText(/1\. frequently asked questions/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /is it worth it/i })).toBeInTheDocument();
  });

  it('omits the FAQs section when there are no FAQs', () => {
    render(<LivePreview title="Best Earbuds" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} faqs={[]} />);
    expect(screen.queryByText(/frequently asked questions/i)).not.toBeInTheDocument();
  });

  it('expands and collapses an FAQ answer independently via its own accordion button', async () => {
    const user = userEvent.setup();
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[{ clientId: 'FAQS', sectionKey: 'FAQS', title: '', content: '', visible: true }]}
        settings={null}
        faqs={[faqOne, faqTwo]}
      />
    );

    const trigger = screen.getByRole('button', { name: /is it worth it/i });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Yes, absolutely worth it for the price.')).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Yes, absolutely worth it for the price.')).toBeInTheDocument();
    expect(screen.queryByText('About 8 hours per charge.')).not.toBeInTheDocument();
  });

  it('shows View all N questions when more than 5 FAQs exist, and expands the rest on click', async () => {
    const user = userEvent.setup();
    const faqs = Array.from({ length: 7 }, (_, i) => ({ clientId: `faq-${i}`, question: `Question ${i}?`, answer: `Answer ${i}.` }));
    render(
      <LivePreview
        title="Best Earbuds"
        excerpt=""
        coverImageFilename={null}
        tocEntries={[{ clientId: 'FAQS', sectionKey: 'FAQS', title: '', content: '', visible: true }]}
        settings={null}
        faqs={faqs}
      />
    );

    expect(screen.getByRole('button', { name: /question 4\?/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /question 5\?/i })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'View all 7 questions' }));

    expect(screen.getByRole('button', { name: /question 5\?/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show fewer questions' })).toBeInTheDocument();
  });

  it('does not show View all when 5 or fewer FAQs exist', () => {
    const faqs = Array.from({ length: 5 }, (_, i) => ({ clientId: `faq-${i}`, question: `Question ${i}?`, answer: `Answer ${i}.` }));
    render(<LivePreview title="Best Earbuds" excerpt="" coverImageFilename={null} tocEntries={[]} settings={null} faqs={faqs} />);
    expect(screen.queryByText(/view all/i)).not.toBeInTheDocument();
  });
});
