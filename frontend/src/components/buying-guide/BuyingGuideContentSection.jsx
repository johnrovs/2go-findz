import { useTranslation } from 'react-i18next';
import BuyingGuideContentCard from './BuyingGuideContentCard.jsx';

function BuyingGuideContentSection({ sections, number, guideId, onExpand }) {
  const { t } = useTranslation('guides');
  if (sections.length === 0) return null;

  return (
    <section aria-labelledby="buying-guide-content-heading" className="scroll-mt-24">
      <h2 id="buying-guide-content-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. {t('sections.buyingGuide')}
      </h2>
      <div className="space-y-4">
        {sections.map((section, index) => (
          <BuyingGuideContentCard
            key={section.anchorId}
            title={section.title}
            content={section.content}
            anchorId={section.anchorId}
            number={index + 1}
            onExpand={(title) => onExpand({ guideId, title })}
          />
        ))}
      </div>
    </section>
  );
}

export default BuyingGuideContentSection;
