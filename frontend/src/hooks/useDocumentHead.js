import { useEffect } from 'react';

export function useDocumentHead({ title, description, canonicalUrl, jsonLd }) {
  useEffect(() => {
    const previousTitle = document.title;
    if (title) {
      document.title = title;
    }

    let descriptionTag = null;
    if (description) {
      descriptionTag = document.createElement('meta');
      descriptionTag.setAttribute('name', 'description');
      descriptionTag.setAttribute('content', description);
      document.head.appendChild(descriptionTag);
    }

    let canonicalTag = null;
    if (canonicalUrl) {
      canonicalTag = document.createElement('link');
      canonicalTag.setAttribute('rel', 'canonical');
      canonicalTag.setAttribute('href', canonicalUrl);
      document.head.appendChild(canonicalTag);
    }

    const jsonLdTags = (jsonLd ?? []).map((schema) => {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
      return script;
    });

    return () => {
      document.title = previousTitle;
      descriptionTag?.remove();
      canonicalTag?.remove();
      jsonLdTags.forEach((tag) => tag.remove());
    };
  }, [title, description, canonicalUrl, jsonLd]);
}
