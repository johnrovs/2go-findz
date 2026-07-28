import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useDocumentHead } from './useDocumentHead.js';

function resetDocumentHead() {
  document.title = '';
  document
    .querySelectorAll('meta[name="description"], link[rel="canonical"], script[type="application/ld+json"]')
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
});
