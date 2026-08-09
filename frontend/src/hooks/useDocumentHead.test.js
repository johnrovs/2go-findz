import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDocumentHead } from './useDocumentHead.js';

function resetDocumentHead() {
  document.title = '';
  document
    .querySelectorAll(
      'meta[name="description"], link[rel="canonical"], script[type="application/ld+json"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"]'
    )
    .forEach((el) => el.remove());
}

describe('useDocumentHead', () => {
  afterEach(() => {
    resetDocumentHead();
  });

  it('sets the document title, description, and canonical URL', () => {
    renderHook(() =>
      useDocumentHead({
        title: 'Test Title',
        description: 'Test description.',
        canonicalUrl: 'https://example.com/test',
      })
    );

    expect(document.title).toBe('Test Title');
    expect(document.querySelector('meta[name="description"]').getAttribute('content')).toBe('Test description.');
    expect(document.querySelector('link[rel="canonical"]').getAttribute('href')).toBe('https://example.com/test');
  });

  it('injects a JSON-LD script tag for each schema provided', () => {
    renderHook(() =>
      useDocumentHead({
        title: 'Test',
        jsonLd: [{ '@type': 'BreadcrumbList' }, { '@type': 'FAQPage' }],
      })
    );

    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(2);
    expect(JSON.parse(scripts[0].textContent)).toEqual({ '@type': 'BreadcrumbList' });
    expect(JSON.parse(scripts[1].textContent)).toEqual({ '@type': 'FAQPage' });
  });

  it('updates the title when props change', () => {
    const { rerender } = renderHook(({ title }) => useDocumentHead({ title }), {
      initialProps: { title: 'First' },
    });
    expect(document.title).toBe('First');

    rerender({ title: 'Second' });
    expect(document.title).toBe('Second');
  });

  it('removes injected tags and resets the title on unmount', () => {
    const { unmount } = renderHook(() =>
      useDocumentHead({
        title: 'Test',
        description: 'Test description.',
        canonicalUrl: 'https://example.com/test',
        jsonLd: [{ '@type': 'BreadcrumbList' }],
      })
    );

    unmount();

    expect(document.title).toBe('');
    expect(document.querySelector('meta[name="description"]')).toBeNull();
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(document.querySelector('script[type="application/ld+json"]')).toBeNull();
  });

  it('sets robots, Open Graph, and Twitter Card meta tags', () => {
    renderHook(() =>
      useDocumentHead({
        title: 'Test',
        robots: 'noindex,nofollow',
        ogTitle: 'OG Title',
        ogDescription: 'OG Description.',
        ogImage: 'https://example.com/og.png',
        ogType: 'article',
        ogUrl: 'https://example.com/page',
        twitterCard: 'summary_large_image',
        twitterTitle: 'Twitter Title',
        twitterDescription: 'Twitter Description.',
        twitterImage: 'https://example.com/twitter.png',
      })
    );

    expect(document.querySelector('meta[name="robots"]').getAttribute('content')).toBe('noindex,nofollow');
    expect(document.querySelector('meta[property="og:title"]').getAttribute('content')).toBe('OG Title');
    expect(document.querySelector('meta[property="og:description"]').getAttribute('content')).toBe('OG Description.');
    expect(document.querySelector('meta[property="og:image"]').getAttribute('content')).toBe('https://example.com/og.png');
    expect(document.querySelector('meta[property="og:type"]').getAttribute('content')).toBe('article');
    expect(document.querySelector('meta[property="og:url"]').getAttribute('content')).toBe('https://example.com/page');
    expect(document.querySelector('meta[name="twitter:card"]').getAttribute('content')).toBe('summary_large_image');
    expect(document.querySelector('meta[name="twitter:title"]').getAttribute('content')).toBe('Twitter Title');
    expect(document.querySelector('meta[name="twitter:description"]').getAttribute('content')).toBe('Twitter Description.');
    expect(document.querySelector('meta[name="twitter:image"]').getAttribute('content')).toBe('https://example.com/twitter.png');
  });

  it('removes robots, Open Graph, and Twitter tags on unmount', () => {
    const { unmount } = renderHook(() =>
      useDocumentHead({ title: 'Test', robots: 'index,follow', ogTitle: 'OG Title', twitterCard: 'summary' })
    );

    unmount();

    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.querySelector('meta[name="twitter:card"]')).toBeNull();
  });

  it('omits tags whose value is not provided', () => {
    renderHook(() => useDocumentHead({ title: 'Test' }));

    expect(document.querySelector('meta[name="robots"]')).toBeNull();
    expect(document.querySelector('meta[property="og:title"]')).toBeNull();
    expect(document.querySelector('meta[name="twitter:card"]')).toBeNull();
  });
});
