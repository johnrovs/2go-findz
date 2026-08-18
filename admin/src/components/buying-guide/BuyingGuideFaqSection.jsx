import { useTranslation } from 'react-i18next';
import BuyingGuideFaqAccordion from './BuyingGuideFaqAccordion.jsx';

function BuyingGuideFaqSection({ faqs, number, guideId, onExpand }) {
  const { t } = useTranslation('guides');
  if (faqs.length === 0) return null;

  return (
    <section aria-labelledby="faq-heading" className="scroll-mt-24">
      <h2 id="faq-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
        {number}. {t('sections.faqs')}
      </h2>
      <BuyingGuideFaqAccordion faqs={faqs} onExpand={(question) => onExpand({ guideId, question })} />
    </section>
  );
}

export default BuyingGuideFaqSection;
