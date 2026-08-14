import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import PublicFooter from '../components/PublicFooter.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorState from '../components/ErrorState.jsx';
import BuyingGuideBreadcrumbs from '../components/buying-guide/BuyingGuideBreadcrumbs.jsx';
import BuyingGuideHero from '../components/buying-guide/BuyingGuideHero.jsx';
import GuideTableOfContents from '../components/buying-guide/GuideTableOfContents.jsx';
import QuickRecommendationsSection from '../components/buying-guide/QuickRecommendationsSection.jsx';
import ProductComparisonSection from '../components/buying-guide/ProductComparisonSection.jsx';
import TopPickSection from '../components/buying-guide/TopPickSection.jsx';
import RunnerUpsSection from '../components/buying-guide/RunnerUpsSection.jsx';
import BuyingGuideContentSection from '../components/buying-guide/BuyingGuideContentSection.jsx';
import BuyingGuideFaqSection from '../components/buying-guide/BuyingGuideFaqSection.jsx';
import FinalRecommendationSection from '../components/buying-guide/FinalRecommendationSection.jsx';
import { getBuyingGuideBySlug } from '../services/buyingGuideService.js';
import { getSettings } from '../services/settingsService.js';
import { recordGuideView } from '../services/trackingService.js';
import { useDocumentHead } from '../hooks/useDocumentHead.js';
import { trackEvent } from '../hooks/useAnalytics.js';
import { computeGuideSectionNumbers } from '../utils/computeGuideSectionNumbers.js';
import { buildFaqJsonLd } from '../utils/faqJsonLd.js';
import { buildGuideUrl, getSiteUrl } from '../utils/siteUrl.js';
import { getImageUrl } from '../utils/imageUrl.js';
import { uniqueSlug } from '../utils/slugify.js';

function buildJsonLd(guide, { homeLabel, buyingGuidesLabel }) {
  const origin = getSiteUrl();
  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: homeLabel, item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: buyingGuidesLabel, item: `${origin}/buying-guides` },
        { '@type': 'ListItem', position: 3, name: guide.title, item: buildGuideUrl(guide.slug) },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: guide.title,
      description: guide.excerpt,
      image: getImageUrl(guide.coverImageFilename) ?? undefined,
      datePublished: guide.publishedAt ?? guide.createdAt,
      dateModified: guide.updatedAt ?? guide.createdAt,
      author: { '@type': 'Organization', name: '2Go Findz' },
    },
  ];
  const faqSchema = buildFaqJsonLd(guide.faqs);
  if (faqSchema) schemas.push(faqSchema);
  return schemas;
}

function PublishedBuyingGuidePage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation(['guides', 'common']);
  const [settings, setSettings] = useState(null);
  const [guide, setGuide] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState(null);
  const hasTrackedView = useRef(false);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    setGuide(null);
    hasTrackedView.current = false;
    getBuyingGuideBySlug(slug)
      .then(setGuide)
      .catch((err) => setError(err.message ?? t('detail.notFound')))
      .finally(() => setIsLoading(false));
  }, [slug, t]);

  useEffect(() => {
    if (!guide || hasTrackedView.current) return;
    hasTrackedView.current = true;
    trackEvent('guide_view', { guideId: guide.id });
    const sessionId = sessionStorage.getItem('sessionId');
    recordGuideView(guide.id, sessionId).catch(() => {
      // View tracking is best-effort; never block rendering on a tracking failure.
    });
  }, [guide]);

  const customSectionsWithAnchors = useMemo(() => {
    if (!guide) return [];
    const usedAnchors = new Set();
    return guide.tocEntries
      .filter((entry) => !entry.sectionKey && entry.title?.trim() && entry.content?.replace(/<[^>]*>/g, '').trim())
      .map((entry) => ({ title: entry.title, content: entry.content, anchorId: uniqueSlug(entry.title, usedAnchors) }));
  }, [guide]);

  const sectionNumbers = useMemo(() => {
    if (!guide) return {};
    return computeGuideSectionNumbers(guide.tocEntries, {
      hasQuickRecommendations: guide.quickRecommendations.length > 0,
      hasComparison: Boolean(guide.comparisonTable),
      hasTopPick: Boolean(guide.topPick),
      hasRunnerUps: guide.runnerUps.length > 0,
      hasBuyingGuideContent: customSectionsWithAnchors.length > 0,
      hasFaqs: guide.faqs.length > 0,
      hasFinalRecommendation: Boolean(guide.topPick),
    });
  }, [guide, customSectionsWithAnchors]);

  const structuralLabels = {
    QUICK_RECOMMENDATIONS: t('sections.quickRecommendations'),
    COMPARISON_TABLE: t('sections.comparisonTable'),
    TOP_PICK: t('sections.topPick'),
    RUNNER_UPS: t('sections.runnerUps'),
    FAQS: t('sections.faqs'),
  };

  const tocItems = useMemo(() => {
    if (!guide) return [];
    const items = [];
    guide.tocEntries.forEach((entry) => {
      if (entry.sectionKey) {
        const number = sectionNumbers[entry.sectionKey];
        if (number) {
          const anchorId = entry.sectionKey === 'QUICK_RECOMMENDATIONS' ? 'quick-recommendations'
            : entry.sectionKey === 'COMPARISON_TABLE' ? 'product-comparison'
            : entry.sectionKey === 'TOP_PICK' ? 'top-pick'
            : entry.sectionKey === 'RUNNER_UPS' ? 'runner-ups'
            : 'faq';
          items.push({ id: entry.sectionKey, number, label: structuralLabels[entry.sectionKey], anchorId });
        }
        return;
      }
      if (sectionNumbers.BUYING_GUIDE && !items.some((item) => item.id === 'BUYING_GUIDE')) {
        items.push({ id: 'BUYING_GUIDE', number: sectionNumbers.BUYING_GUIDE, label: t('sections.buyingGuide'), anchorId: 'buying-guide' });
      }
    });
    if (sectionNumbers.FINAL_RECOMMENDATION) {
      items.push({ id: 'FINAL_RECOMMENDATION', number: sectionNumbers.FINAL_RECOMMENDATION, label: t('sections.finalRecommendation'), anchorId: 'final-recommendation' });
    }
    return items;
    // i18n.language is a real dependency despite the lint rule's "unnecessary"
    // warning: structuralLabels' translated content changes when the language
    // changes even though neither its nor t's own reference does, and the
    // linter can't see that through the t(...) calls that built it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide, sectionNumbers, structuralLabels, t, i18n.language]);

  useEffect(() => {
    if (tocItems.length === 0) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveSectionId(visible.target.dataset.tocId);
      },
      { rootMargin: '-96px 0px -70% 0px' }
    );
    tocItems.forEach((item) => {
      const el = document.getElementById(item.anchorId);
      if (el) {
        el.dataset.tocId = item.id;
        observer.observe(el);
      }
    });
    return () => observer.disconnect();
  }, [tocItems]);

  const handleNavigate = useCallback((item) => {
    const el = document.getElementById(item.anchorId);
    if (!el) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
    window.history.replaceState(null, '', `#${item.anchorId}`);
    trackEvent('toc_click', { guideId: guide?.id, section: item.id });
  }, [guide]);

  // useDocumentHead must run on every render, including the loading/error
  // ones below — calling a hook only after an early return would violate
  // the Rules of Hooks (a hook can't be conditionally skipped between
  // renders). Every value here is guide-guarded instead: when guide is
  // null the hook receives undefined for each field, and its existing
  // `if (title) {...}` -style guards (see useDocumentHead.js) already no-op cleanly.
  const seoTitle = guide ? guide.seoTitle || guide.title : undefined;
  const seoDescription = guide ? guide.seoDescription || guide.excerpt : undefined;
  const canonicalUrl = guide ? guide.canonicalUrl || buildGuideUrl(guide.slug) : undefined;
  const ogImage = guide ? getImageUrl(guide.openGraphImageFilename || guide.coverImageFilename) : undefined;
  // buildJsonLd(guide) must stay referentially stable across re-renders that
  // don't change guide (e.g. settings resolving, activeSectionId updating) —
  // otherwise useDocumentHead's effect (keyed on jsonLd) tears down and
  // rebuilds the <script> tags on every render instead of only when the
  // guide itself changes.
  const jsonLd = useMemo(
    () =>
      guide
        ? buildJsonLd(guide, { homeLabel: t('common:nav.home'), buyingGuidesLabel: t('common:nav.buyingGuides') })
        : undefined,
    // i18n.language is a real dependency despite the lint rule's "unnecessary"
    // warning: t's translated output changes when the language changes even
    // though t's own reference doesn't, and the linter can't see that through
    // the t('common:nav.home') calls above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [guide, t, i18n.language]
  );

  useDocumentHead({
    title: seoTitle,
    description: seoDescription,
    canonicalUrl,
    robots: guide ? `${guide.robotsIndex ? 'index' : 'noindex'},${guide.robotsFollow ? 'follow' : 'nofollow'}` : undefined,
    ogTitle: guide ? guide.openGraphTitle || seoTitle : undefined,
    ogDescription: guide ? guide.openGraphDescription || seoDescription : undefined,
    ogImage,
    ogType: guide ? 'article' : undefined,
    ogUrl: canonicalUrl,
    twitterCard: guide ? guide.twitterCardType || 'summary_large_image' : undefined,
    twitterTitle: guide ? guide.openGraphTitle || seoTitle : undefined,
    twitterDescription: guide ? guide.openGraphDescription || seoDescription : undefined,
    twitterImage: ogImage,
    jsonLd,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <LoadingSpinner label={t('detail.loading')} />
        </div>
        <PublicFooter settings={settings} />
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <ErrorState message={error ?? t('detail.notFound')} />
        </div>
        <PublicFooter settings={settings} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
      >
        {t('detail.skipToContent')}
      </a>
      <Navbar />
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <BuyingGuideBreadcrumbs title={guide.title} />

        <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
          <BuyingGuideHero
            title={guide.title}
            excerpt={guide.excerpt}
            coverImageFilename={guide.coverImageFilename}
            updatedAt={guide.updatedAt}
            affiliateDisclosure={settings?.affiliateDisclosure}
          />
          <GuideTableOfContents items={tocItems} activeId={activeSectionId} onNavigate={handleNavigate} />
        </div>

        <div className="mt-6 space-y-10">
          <div id="quick-recommendations">
            <QuickRecommendationsSection
              quickRecommendations={guide.quickRecommendations}
              number={sectionNumbers.QUICK_RECOMMENDATIONS}
              guideId={guide.id}
              onAffiliateClick={(payload) => trackEvent('quick_pick_affiliate_click', payload)}
            />
          </div>
          <div id="product-comparison">
            <ProductComparisonSection
              comparisonTable={guide.comparisonTable}
              number={sectionNumbers.COMPARISON_TABLE}
              guideId={guide.id}
              onProductClick={(payload) => trackEvent('comparison_product_click', payload)}
            />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div id="top-pick">
              <TopPickSection
                topPick={guide.topPick}
                number={sectionNumbers.TOP_PICK}
                guideId={guide.id}
                onAffiliateClick={(payload) => trackEvent('top_pick_affiliate_click', payload)}
              />
            </div>
            <div id="runner-ups">
              <RunnerUpsSection
                runnerUps={guide.runnerUps}
                number={sectionNumbers.RUNNER_UPS}
                guideId={guide.id}
                onAffiliateClick={(payload) => trackEvent('runner_up_affiliate_click', payload)}
              />
            </div>
          </div>
          <div id="buying-guide">
            <BuyingGuideContentSection
              sections={customSectionsWithAnchors}
              number={sectionNumbers.BUYING_GUIDE}
              guideId={guide.id}
              onExpand={(payload) => trackEvent('buying_guide_expand', payload)}
            />
          </div>
          <div id="faq">
            <BuyingGuideFaqSection
              faqs={guide.faqs}
              number={sectionNumbers.FAQS}
              guideId={guide.id}
              onExpand={(payload) => trackEvent('faq_expand', payload)}
            />
          </div>
          <div id="final-recommendation">
            <FinalRecommendationSection
              topPick={guide.topPick}
              number={sectionNumbers.FINAL_RECOMMENDATION}
              guideId={guide.id}
              onAffiliateClick={(payload) => trackEvent('final_recommendation_click', payload)}
            />
          </div>
        </div>
      </main>
      <PublicFooter settings={settings} />
    </div>
  );
}

export default PublishedBuyingGuidePage;
