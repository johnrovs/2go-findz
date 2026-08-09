import { useEffect } from 'react';

const OG_PROPERTIES = {
  ogTitle: 'og:title',
  ogDescription: 'og:description',
  ogImage: 'og:image',
  ogType: 'og:type',
  ogUrl: 'og:url',
};

const TWITTER_NAMES = {
  twitterCard: 'twitter:card',
  twitterTitle: 'twitter:title',
  twitterDescription: 'twitter:description',
  twitterImage: 'twitter:image',
};

export function useDocumentHead({
  title,
  description,
  canonicalUrl,
  robots,
  ogTitle,
  ogDescription,
  ogImage,
  ogType,
  ogUrl,
  twitterCard,
  twitterTitle,
  twitterDescription,
  twitterImage,
  jsonLd,
}) {
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

    let robotsTag = null;
    if (robots) {
      robotsTag = document.createElement('meta');
      robotsTag.setAttribute('name', 'robots');
      robotsTag.setAttribute('content', robots);
      document.head.appendChild(robotsTag);
    }

    const ogValues = { ogTitle, ogDescription, ogImage, ogType, ogUrl };
    const ogTags = Object.entries(OG_PROPERTIES)
      .filter(([key]) => ogValues[key])
      .map(([key, property]) => {
        const tag = document.createElement('meta');
        tag.setAttribute('property', property);
        tag.setAttribute('content', ogValues[key]);
        document.head.appendChild(tag);
        return tag;
      });

    const twitterValues = { twitterCard, twitterTitle, twitterDescription, twitterImage };
    const twitterTags = Object.entries(TWITTER_NAMES)
      .filter(([key]) => twitterValues[key])
      .map(([key, name]) => {
        const tag = document.createElement('meta');
        tag.setAttribute('name', name);
        tag.setAttribute('content', twitterValues[key]);
        document.head.appendChild(tag);
        return tag;
      });

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
      robotsTag?.remove();
      ogTags.forEach((tag) => tag.remove());
      twitterTags.forEach((tag) => tag.remove());
      jsonLdTags.forEach((tag) => tag.remove());
    };
  }, [
    title,
    description,
    canonicalUrl,
    robots,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    ogUrl,
    twitterCard,
    twitterTitle,
    twitterDescription,
    twitterImage,
    jsonLd,
  ]);
}
