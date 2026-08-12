# i18n: Buying Guides Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate all static UI text on the public Buying Guides listing page, the guide detail page, and their 14 shared display components into the 5 launch locales, reusing the `i18next` infrastructure from the Phase 1 frontend-foundation plan.

**Architecture:** A new `guides` namespace (`src/i18n/locales/<locale>/guides.json`) holds every string specific to the buying-guide pages; breadcrumb/heading text that duplicates existing Navbar/Footer copy reuses `common.json`'s `nav.home`/`nav.buyingGuides` keys instead of being redefined. Every migrated file that needs both namespaces calls `useTranslation(['guides', 'common'])` — **`guides` first, so it's the default namespace for unprefixed keys**; common keys are referenced with the explicit `common:` prefix (e.g. `t('common:nav.home')`). Section headings that today exist in two hardcoded places (the sidebar TOC label map and each section's own `<h2>`) are unified to read from the same `guides.sections.*` keys.

**Tech Stack:** React 18.3, `react-i18next` (already installed by the Phase 1 plan), Vitest, Testing Library.

## Global Constraints

- Namespace convention for every file in this plan: `useTranslation(['guides', 'common'])` when both namespaces are needed, `useTranslation('guides')` when only guides strings are used. Never the reverse order — `guides` must be the default namespace.
- Common-namespace keys are referenced with the `common:` prefix (i18next's default namespace separator is `:`), e.g. `t('common:nav.buyingGuides')`.
- Interpolation variable names avoid i18next's reserved `count` keyword (which triggers automatic pluralization key suffixing, e.g. `key_other`) — use `total` instead where a quantity is interpolated.
- No machine-placeholder translations — every string in every locale file is a complete, natural translation, matching Phase 1's standard.
- Admin's `buying-guide-form/` wizard, `pages/admin/BuyingGuideFormPage.jsx`, and `LivePreview.jsx`'s own hardcoded section headings are out of scope and untouched. `ComparisonTable.jsx` and `RecommendationCard.jsx` ARE migrated even though `LivePreview.jsx` also renders them — an accepted, disclosed side effect (see spec).
- Database-driven guide content (titles, excerpts, pros/cons text, FAQ Q&A, comparison spec names/values, quick-pick badge names) is never translated by this plan — only static UI chrome around that content.
- Spec reference: `docs/superpowers/specs/2026-08-12-i18n-buying-guides-design.md`.

---

### Task 1: `guides.json` for all 5 launch locales

**Files:**
- Create: `frontend/src/i18n/locales/en-US/guides.json`
- Create: `frontend/src/i18n/locales/es-US/guides.json`
- Create: `frontend/src/i18n/locales/fil-PH/guides.json`
- Create: `frontend/src/i18n/locales/zh-Hans/guides.json`
- Create: `frontend/src/i18n/locales/vi/guides.json`
- Modify: `frontend/src/i18n/localeKeyParity.test.js`

**Interfaces:**
- Produces: the `guides` namespace's full key set (`listing.*`, `detail.*`, `sections.*`, `hero.*`, `content.*`, `faq.*`, `comparison.*`, `recommendation.*`, `runnerUps.*`), consumed by every later task in this plan.

- [ ] **Step 1: Extend the key-parity test to cover the guides namespace**

Read `frontend/src/i18n/localeKeyParity.test.js` (from the Phase 1 plan) and replace its contents in full with:

```js
import { describe, expect, it } from 'vitest';
import commonEnUS from './locales/en-US/common.json';
import commonEsUS from './locales/es-US/common.json';
import commonFilPH from './locales/fil-PH/common.json';
import commonZhHans from './locales/zh-Hans/common.json';
import commonVi from './locales/vi/common.json';
import guidesEnUS from './locales/en-US/guides.json';
import guidesEsUS from './locales/es-US/guides.json';
import guidesFilPH from './locales/fil-PH/guides.json';
import guidesZhHans from './locales/zh-Hans/guides.json';
import guidesVi from './locales/vi/guides.json';

function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null ? flattenKeys(value, path) : [path];
  });
}

function describeParity(namespace, enUS, translations) {
  describe(`${namespace}.json locale key parity`, () => {
    const englishKeys = flattenKeys(enUS).sort();

    it.each(translations)('%s has exactly the same keys as en-US', (_locale, resource) => {
      expect(flattenKeys(resource).sort()).toEqual(englishKeys);
    });
  });
}

describeParity('common', commonEnUS, [
  ['es-US', commonEsUS],
  ['fil-PH', commonFilPH],
  ['zh-Hans', commonZhHans],
  ['vi', commonVi],
]);

describeParity('guides', guidesEnUS, [
  ['es-US', guidesEsUS],
  ['fil-PH', guidesFilPH],
  ['zh-Hans', guidesZhHans],
  ['vi', guidesVi],
]);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- localeKeyParity` (from `frontend/`)
Expected: FAIL — none of the 5 `guides.json` files exist yet.

- [ ] **Step 3: Create `frontend/src/i18n/locales/en-US/guides.json`**

```json
{
  "listing": {
    "description": "Curated advice to help you choose the right products.",
    "loading": "Loading buying guides...",
    "emptyTitle": "No buying guides yet",
    "emptyDescription": "Check back soon for curated buying advice.",
    "noImageAvailable": "No image available",
    "loadError": "Failed to load buying guides."
  },
  "detail": {
    "loading": "Loading buying guide...",
    "notFound": "Buying guide not found.",
    "skipToContent": "Skip to content",
    "tableOfContents": "Table of Contents",
    "tableOfContentsAriaLabel": "Table of contents",
    "breadcrumbAriaLabel": "Breadcrumb"
  },
  "sections": {
    "quickRecommendations": "Quick Recommendations",
    "comparisonTable": "Product Comparison",
    "topPick": "Our Top Pick",
    "runnerUps": "Runner-Ups",
    "buyingGuide": "Buying Guide",
    "faqs": "Frequently Asked Questions",
    "finalRecommendation": "Final Recommendation"
  },
  "hero": {
    "badge": "BUYING GUIDE",
    "byline": "By 2Go Findz Team",
    "updatedOn": "Updated {{date}}"
  },
  "content": {
    "showLess": "Show less",
    "readMore": "Read more"
  },
  "faq": {
    "showFewer": "Show fewer questions",
    "viewAll": "View all {{total}} questions"
  },
  "comparison": {
    "productColumn": "Product",
    "yes": "Yes",
    "no": "No",
    "caption": "Comparison of {{names}}",
    "priceDisclaimer": "* Prices and availability may change after publication."
  },
  "recommendation": {
    "untitledBadge": "Untitled Badge",
    "whyWeRecommendIt": "Why We Recommend It",
    "pros": "Pros",
    "cons": "Cons",
    "bestFor": "Best For",
    "viewOnAmazon": "View on Amazon",
    "viewProductOnAmazon": "View {{productName}} on Amazon"
  },
  "runnerUps": {
    "showFewer": "Show fewer runner-ups",
    "seeAll": "See all reviewed products"
  }
}
```

- [ ] **Step 4: Create `frontend/src/i18n/locales/es-US/guides.json`**

```json
{
  "listing": {
    "description": "Consejos seleccionados para ayudarte a elegir los productos correctos.",
    "loading": "Cargando guías de compra...",
    "emptyTitle": "Aún no hay guías de compra",
    "emptyDescription": "Vuelve pronto para ver consejos de compra seleccionados.",
    "noImageAvailable": "Imagen no disponible",
    "loadError": "No se pudieron cargar las guías de compra."
  },
  "detail": {
    "loading": "Cargando guía de compra...",
    "notFound": "Guía de compra no encontrada.",
    "skipToContent": "Saltar al contenido",
    "tableOfContents": "Tabla de contenido",
    "tableOfContentsAriaLabel": "Tabla de contenido",
    "breadcrumbAriaLabel": "Ruta de navegación"
  },
  "sections": {
    "quickRecommendations": "Recomendaciones rápidas",
    "comparisonTable": "Comparación de productos",
    "topPick": "Nuestra mejor opción",
    "runnerUps": "Otras opciones",
    "buyingGuide": "Guía de compra",
    "faqs": "Preguntas frecuentes",
    "finalRecommendation": "Recomendación final"
  },
  "hero": {
    "badge": "GUÍA DE COMPRA",
    "byline": "Por el equipo de 2Go Findz",
    "updatedOn": "Actualizado el {{date}}"
  },
  "content": {
    "showLess": "Ver menos",
    "readMore": "Leer más"
  },
  "faq": {
    "showFewer": "Mostrar menos preguntas",
    "viewAll": "Ver las {{total}} preguntas"
  },
  "comparison": {
    "productColumn": "Producto",
    "yes": "Sí",
    "no": "No",
    "caption": "Comparación de {{names}}",
    "priceDisclaimer": "* Los precios y la disponibilidad pueden cambiar después de la publicación."
  },
  "recommendation": {
    "untitledBadge": "Insignia sin título",
    "whyWeRecommendIt": "Por qué lo recomendamos",
    "pros": "Ventajas",
    "cons": "Desventajas",
    "bestFor": "Ideal para",
    "viewOnAmazon": "Ver en Amazon",
    "viewProductOnAmazon": "Ver {{productName}} en Amazon"
  },
  "runnerUps": {
    "showFewer": "Mostrar menos opciones",
    "seeAll": "Ver todos los productos analizados"
  }
}
```

- [ ] **Step 5: Create `frontend/src/i18n/locales/fil-PH/guides.json`**

```json
{
  "listing": {
    "description": "Piniling payo para matulungan kang pumili ng tamang produkto.",
    "loading": "Naglo-load ng mga gabay sa pamimili...",
    "emptyTitle": "Wala pang mga gabay sa pamimili",
    "emptyDescription": "Bumalik ulit sa lalong madaling panahon para sa piniling payo sa pamimili.",
    "noImageAvailable": "Walang available na larawan",
    "loadError": "Hindi na-load ang mga gabay sa pamimili."
  },
  "detail": {
    "loading": "Naglo-load ng gabay sa pamimili...",
    "notFound": "Hindi nahanap ang gabay sa pamimili.",
    "skipToContent": "Lumaktaw sa content",
    "tableOfContents": "Talaan ng Nilalaman",
    "tableOfContentsAriaLabel": "Talaan ng nilalaman",
    "breadcrumbAriaLabel": "Breadcrumb"
  },
  "sections": {
    "quickRecommendations": "Mabilisang Rekomendasyon",
    "comparisonTable": "Paghahambing ng Produkto",
    "topPick": "Aming Top Pick",
    "runnerUps": "Iba Pang Pagpipilian",
    "buyingGuide": "Gabay sa Pamimili",
    "faqs": "Mga Madalas Itanong",
    "finalRecommendation": "Panghuling Rekomendasyon"
  },
  "hero": {
    "badge": "GABAY SA PAMIMILI",
    "byline": "Mula sa 2Go Findz Team",
    "updatedOn": "Na-update noong {{date}}"
  },
  "content": {
    "showLess": "Ipakita ang mas kaunti",
    "readMore": "Magbasa pa"
  },
  "faq": {
    "showFewer": "Ipakita ang mas kaunting tanong",
    "viewAll": "Tingnan lahat ng {{total}} tanong"
  },
  "comparison": {
    "productColumn": "Produkto",
    "yes": "Oo",
    "no": "Hindi",
    "caption": "Paghahambing ng {{names}}",
    "priceDisclaimer": "* Maaaring magbago ang presyo at availability pagkatapos mailathala."
  },
  "recommendation": {
    "untitledBadge": "Walang Pamagat na Badge",
    "whyWeRecommendIt": "Bakit Namin Ito Rekomendado",
    "pros": "Mga Bentahe",
    "cons": "Mga Disbentahe",
    "bestFor": "Pinakamainam Para Sa",
    "viewOnAmazon": "Tingnan sa Amazon",
    "viewProductOnAmazon": "Tingnan ang {{productName}} sa Amazon"
  },
  "runnerUps": {
    "showFewer": "Ipakita ang mas kaunting pagpipilian",
    "seeAll": "Tingnan lahat ng nasuring produkto"
  }
}
```

- [ ] **Step 6: Create `frontend/src/i18n/locales/zh-Hans/guides.json`**

```json
{
  "listing": {
    "description": "精选购物建议,帮助您选择合适的产品。",
    "loading": "购买指南加载中...",
    "emptyTitle": "暂无购买指南",
    "emptyDescription": "请稍后再来查看精选购物建议。",
    "noImageAvailable": "暂无图片",
    "loadError": "购买指南加载失败。"
  },
  "detail": {
    "loading": "购买指南加载中...",
    "notFound": "未找到该购买指南。",
    "skipToContent": "跳至内容",
    "tableOfContents": "目录",
    "tableOfContentsAriaLabel": "目录",
    "breadcrumbAriaLabel": "面包屑导航"
  },
  "sections": {
    "quickRecommendations": "快速推荐",
    "comparisonTable": "产品对比",
    "topPick": "我们的首选",
    "runnerUps": "其他推荐",
    "buyingGuide": "购买指南",
    "faqs": "常见问题",
    "finalRecommendation": "最终推荐"
  },
  "hero": {
    "badge": "购买指南",
    "byline": "2Go Findz 团队撰写",
    "updatedOn": "更新于 {{date}}"
  },
  "content": {
    "showLess": "收起",
    "readMore": "阅读更多"
  },
  "faq": {
    "showFewer": "收起问题",
    "viewAll": "查看全部 {{total}} 个问题"
  },
  "comparison": {
    "productColumn": "产品",
    "yes": "是",
    "no": "否",
    "caption": "{{names}} 的对比",
    "priceDisclaimer": "* 价格和库存情况可能在发布后发生变化。"
  },
  "recommendation": {
    "untitledBadge": "未命名徽章",
    "whyWeRecommendIt": "推荐理由",
    "pros": "优点",
    "cons": "缺点",
    "bestFor": "适合人群",
    "viewOnAmazon": "在亚马逊查看",
    "viewProductOnAmazon": "在亚马逊查看 {{productName}}"
  },
  "runnerUps": {
    "showFewer": "收起其他推荐",
    "seeAll": "查看全部测评产品"
  }
}
```

- [ ] **Step 7: Create `frontend/src/i18n/locales/vi/guides.json`**

```json
{
  "listing": {
    "description": "Lời khuyên chọn lọc giúp bạn chọn đúng sản phẩm.",
    "loading": "Đang tải hướng dẫn mua hàng...",
    "emptyTitle": "Chưa có hướng dẫn mua hàng nào",
    "emptyDescription": "Hãy quay lại sau để xem các lời khuyên mua sắm được chọn lọc.",
    "noImageAvailable": "Không có hình ảnh",
    "loadError": "Không thể tải hướng dẫn mua hàng."
  },
  "detail": {
    "loading": "Đang tải hướng dẫn mua hàng...",
    "notFound": "Không tìm thấy hướng dẫn mua hàng.",
    "skipToContent": "Bỏ qua đến nội dung",
    "tableOfContents": "Mục lục",
    "tableOfContentsAriaLabel": "Mục lục",
    "breadcrumbAriaLabel": "Đường dẫn điều hướng"
  },
  "sections": {
    "quickRecommendations": "Gợi ý nhanh",
    "comparisonTable": "So sánh sản phẩm",
    "topPick": "Lựa chọn hàng đầu của chúng tôi",
    "runnerUps": "Các lựa chọn khác",
    "buyingGuide": "Hướng dẫn mua hàng",
    "faqs": "Câu hỏi thường gặp",
    "finalRecommendation": "Đề xuất cuối cùng"
  },
  "hero": {
    "badge": "HƯỚNG DẪN MUA HÀNG",
    "byline": "Bởi đội ngũ 2Go Findz",
    "updatedOn": "Cập nhật {{date}}"
  },
  "content": {
    "showLess": "Thu gọn",
    "readMore": "Đọc thêm"
  },
  "faq": {
    "showFewer": "Thu gọn câu hỏi",
    "viewAll": "Xem tất cả {{total}} câu hỏi"
  },
  "comparison": {
    "productColumn": "Sản phẩm",
    "yes": "Có",
    "no": "Không",
    "caption": "So sánh {{names}}",
    "priceDisclaimer": "* Giá và tình trạng còn hàng có thể thay đổi sau khi đăng."
  },
  "recommendation": {
    "untitledBadge": "Huy hiệu chưa đặt tên",
    "whyWeRecommendIt": "Vì sao chúng tôi đề xuất",
    "pros": "Ưu điểm",
    "cons": "Nhược điểm",
    "bestFor": "Phù hợp cho",
    "viewOnAmazon": "Xem trên Amazon",
    "viewProductOnAmazon": "Xem {{productName}} trên Amazon"
  },
  "runnerUps": {
    "showFewer": "Thu gọn các lựa chọn khác",
    "seeAll": "Xem tất cả sản phẩm đã đánh giá"
  }
}
```

- [ ] **Step 8: Run the key-parity test to verify it passes**

Run: `npm test -- localeKeyParity`
Expected: PASS (both `common` and `guides` parity blocks).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/i18n/locales frontend/src/i18n/localeKeyParity.test.js
git commit -m "feat(i18n): add guides namespace translations for all 5 launch locales"
```

---

### Task 2: Unify section headings

**Files:**
- Modify: `frontend/src/pages/PublishedBuyingGuidePage.jsx`
- Modify: `frontend/src/components/buying-guide/QuickRecommendationsSection.jsx`
- Modify: `frontend/src/components/buying-guide/ProductComparisonSection.jsx`
- Modify: `frontend/src/components/buying-guide/TopPickSection.jsx`
- Modify: `frontend/src/components/buying-guide/RunnerUpsSection.jsx`
- Modify: `frontend/src/components/buying-guide/BuyingGuideContentSection.jsx`
- Modify: `frontend/src/components/buying-guide/BuyingGuideFaqSection.jsx`
- Modify: `frontend/src/components/buying-guide/FinalRecommendationSection.jsx`
- Test: existing test files for each of the above (read and re-run; see Step 10)

**Interfaces:**
- Consumes: `guides.sections.*` keys (Task 1).
- Produces: every section heading (TOC label and `<h2>`) reads from the same 7 keys — no more risk of the two drifting apart.

- [ ] **Step 1: Replace `STRUCTURAL_LABELS` with translated labels in `PublishedBuyingGuidePage.jsx`**

Remove the module-level constant:

```js
const STRUCTURAL_LABELS = {
  QUICK_RECOMMENDATIONS: 'Quick Recommendations',
  COMPARISON_TABLE: 'Product Comparison',
  TOP_PICK: 'Our Top Pick',
  RUNNER_UPS: 'Runner-Ups',
  FAQS: 'Frequently Asked Questions',
};
```

Add the import (near the other imports) and hook (inside `PublishedBuyingGuidePage`, right after the `const { slug } = useParams();` line):

```js
import { useTranslation } from 'react-i18next';
```

```js
const { t, i18n } = useTranslation(['guides', 'common']);
```

Inside the component body, right before the `tocItems` `useMemo` (which needs it), add:

```js
const structuralLabels = {
  QUICK_RECOMMENDATIONS: t('sections.quickRecommendations'),
  COMPARISON_TABLE: t('sections.comparisonTable'),
  TOP_PICK: t('sections.topPick'),
  RUNNER_UPS: t('sections.runnerUps'),
  FAQS: t('sections.faqs'),
};
```

- [ ] **Step 2: Update `tocItems` to use the translated labels**

Replace the `tocItems` `useMemo` body's label references and dependency array:

```js
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
}, [guide, sectionNumbers, t, i18n.language]);
```

`i18n.language` is added to the dependency array so `tocItems` recomputes (with newly translated labels) when the user switches language — `t`'s function reference alone does not reliably change on every language switch, but `i18n.language` always does.

- [ ] **Step 3: Update the 7 section-wrapper headings**

In `frontend/src/components/buying-guide/QuickRecommendationsSection.jsx`, add the import and hook, and change the heading:

```js
import { useTranslation } from 'react-i18next';
```

```js
function QuickRecommendationsSection({ quickRecommendations, number, guideId, onAffiliateClick }) {
  const { t } = useTranslation('guides');
  if (quickRecommendations.length === 0) return null;
```

```jsx
<h2 id="quick-recommendations-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
  {number}. {t('sections.quickRecommendations')}
</h2>
```

In `frontend/src/components/buying-guide/ProductComparisonSection.jsx`:

```js
import { useTranslation } from 'react-i18next';
```

```js
function ProductComparisonSection({ comparisonTable, number, guideId, onProductClick }) {
  const { t } = useTranslation('guides');
  if (!comparisonTable || comparisonTable.rows.length === 0) return null;
```

```jsx
<h2 id="product-comparison-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
  {number}. {t('sections.comparisonTable')}
</h2>
```

In `frontend/src/components/buying-guide/TopPickSection.jsx`:

```js
import { useTranslation } from 'react-i18next';
```

```js
function TopPickSection({ topPick, number, guideId, onAffiliateClick }) {
  const { t } = useTranslation('guides');
  if (!topPick) return null;
```

```jsx
<h2 id="top-pick-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
  {number}. {t('sections.topPick')}
</h2>
```

In `frontend/src/components/buying-guide/RunnerUpsSection.jsx`:

```js
import { useTranslation } from 'react-i18next';
```

```js
function RunnerUpsSection({ runnerUps, number, guideId, onAffiliateClick }) {
  const { t } = useTranslation('guides');
  const [showAll, setShowAll] = useState(false);
  if (runnerUps.length === 0) return null;
```

```jsx
<h2 id="runner-ups-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
  {number}. {t('sections.runnerUps')}
</h2>
```

(The "Show fewer runner-ups"/"See all reviewed products" toggle text in this same file is handled in Task 10 — leave it as-is for now.)

In `frontend/src/components/buying-guide/BuyingGuideContentSection.jsx`:

```js
import { useTranslation } from 'react-i18next';
```

```js
function BuyingGuideContentSection({ sections, number, guideId, onExpand }) {
  const { t } = useTranslation('guides');
  if (sections.length === 0) return null;
```

```jsx
<h2 id="buying-guide-content-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
  {number}. {t('sections.buyingGuide')}
</h2>
```

In `frontend/src/components/buying-guide/BuyingGuideFaqSection.jsx`:

```js
import { useTranslation } from 'react-i18next';
```

```js
function BuyingGuideFaqSection({ faqs, number, guideId, onExpand }) {
  const { t } = useTranslation('guides');
  if (faqs.length === 0) return null;
```

```jsx
<h2 id="faq-heading" className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">
  {number}. {t('sections.faqs')}
</h2>
```

In `frontend/src/components/buying-guide/FinalRecommendationSection.jsx`:

```js
import { useTranslation } from 'react-i18next';
```

```js
function FinalRecommendationSection({ topPick, number, guideId, onAffiliateClick }) {
  const { t } = useTranslation('guides');
  if (!topPick) return null;
  const summary = summarize(topPick.whyRecommended ?? '');
```

```jsx
<h2 id="final-recommendation-heading" className="mb-1 text-card-title text-heading">
  {number}. {t('sections.finalRecommendation')}
</h2>
```

- [ ] **Step 4: Run each touched file's existing test**

Run: `npm test -- PublishedBuyingGuidePage.test QuickRecommendationsSection.test ProductComparisonSection.test TopPickSection.test RunnerUpsSection.test BuyingGuideContentSection.test BuyingGuideFaqSection.test FinalRecommendationSection.test`

- [ ] **Step 5: Fix any failures**

`en-US` values are copied verbatim from the strings each test currently asserts against, so most assertions should pass unchanged. `RunnerUpsSection.test.jsx` and `PublishedBuyingGuidePage.test.jsx` are the most likely to need a look — if either asserts against the literal module-level `STRUCTURAL_LABELS` object (which no longer exists) rather than rendered text, update the assertion to check rendered output instead; do not change the underlying English copy.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/PublishedBuyingGuidePage.jsx frontend/src/components/buying-guide/QuickRecommendationsSection.jsx frontend/src/components/buying-guide/ProductComparisonSection.jsx frontend/src/components/buying-guide/TopPickSection.jsx frontend/src/components/buying-guide/RunnerUpsSection.jsx frontend/src/components/buying-guide/BuyingGuideContentSection.jsx frontend/src/components/buying-guide/BuyingGuideFaqSection.jsx frontend/src/components/buying-guide/FinalRecommendationSection.jsx
git commit -m "feat(i18n): unify buying-guide section headings behind shared translation keys"
```

---

### Task 3: Detail page shell — loading/not-found/skip-link/JSON-LD, breadcrumbs, table of contents

**Files:**
- Modify: `frontend/src/pages/PublishedBuyingGuidePage.jsx`
- Modify: `frontend/src/components/buying-guide/BuyingGuideBreadcrumbs.jsx`
- Modify: `frontend/src/components/buying-guide/GuideTableOfContents.jsx`
- Test: existing test files for the above (read and re-run; see Step 5)

**Interfaces:**
- Consumes: `guides.detail.*` (Task 1), `common.nav.home` / `common.nav.buyingGuides` (Phase 1).

- [ ] **Step 1: Translate `PublishedBuyingGuidePage.jsx`'s remaining shell strings**

The `t`/`i18n` hook already exists from Task 2. Update `buildJsonLd` to accept translated breadcrumb labels instead of hardcoding them:

```js
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
```

Update the `jsonLd` `useMemo` call site to pass the translated labels and depend on `i18n.language`:

```js
const jsonLd = useMemo(
  () =>
    guide
      ? buildJsonLd(guide, { homeLabel: t('common:nav.home'), buyingGuidesLabel: t('common:nav.buyingGuides') })
      : undefined,
  [guide, t, i18n.language]
);
```

Update the error-fallback string in the guide-fetch `catch`:

```js
.catch((err) => setError(err.message ?? t('detail.notFound')))
```

Update the loading/error/skip-link JSX:

```jsx
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
```

```jsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-btn focus:bg-primary focus:px-4 focus:py-2 focus:text-white"
>
  {t('detail.skipToContent')}
</a>
```

- [ ] **Step 2: Translate `BuyingGuideBreadcrumbs.jsx`**

Replace the file in full:

```jsx
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function BuyingGuideBreadcrumbs({ title }) {
  const { t } = useTranslation(['guides', 'common']);

  return (
    <nav aria-label={t('detail.breadcrumbAriaLabel')} className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        <li>
          <Link to="/" className="hover:text-primary">
            {t('common:nav.home')}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li>
          <Link to="/buying-guides" className="hover:text-primary">
            {t('common:nav.buyingGuides')}
          </Link>
        </li>
        <li aria-hidden="true">/</li>
        <li className="min-w-0">
          <span aria-current="page" className="block max-w-[220px] truncate text-body sm:max-w-xs">
            {title}
          </span>
        </li>
      </ol>
    </nav>
  );
}

export default BuyingGuideBreadcrumbs;
```

- [ ] **Step 3: Translate `GuideTableOfContents.jsx`**

Replace the file in full:

```jsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function GuideTableOfContents({ items, activeId, onNavigate }) {
  const { t } = useTranslation('guides');
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  if (items.length === 0) return null;

  return (
    <nav aria-label={t('detail.tableOfContentsAriaLabel')} className="rounded-card border border-border bg-white p-4 xl:sticky xl:top-16 xl:self-start">
      <button
        type="button"
        onClick={() => setIsMobileOpen((open) => !open)}
        aria-expanded={isMobileOpen}
        aria-controls="guide-toc-list"
        className="flex w-full items-center justify-between text-sm font-semibold text-heading xl:hidden"
      >
        {t('detail.tableOfContents')}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 transition-transform motion-reduce:transition-none ${isMobileOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <span className="mb-2 hidden text-xs font-semibold uppercase tracking-wide text-muted xl:block">{t('detail.tableOfContents')}</span>
      <ul id="guide-toc-list" className={`space-y-1 ${isMobileOpen ? 'mt-3 block' : 'hidden'} xl:mt-0 xl:block`}>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.anchorId}`}
              aria-current={activeId === item.id ? 'true' : undefined}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item);
              }}
              className={`flex items-center gap-2 rounded-btn px-2 py-1.5 text-sm ${
                activeId === item.id ? 'bg-primary/10 font-semibold text-primary' : 'text-body hover:text-primary'
              }`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {item.number}
              </span>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default GuideTableOfContents;
```

- [ ] **Step 4: Run each touched file's existing test**

Run: `npm test -- PublishedBuyingGuidePage.test BuyingGuideBreadcrumbs.test GuideTableOfContents.test`

- [ ] **Step 5: Fix any failures**

Check failures against the `en-US` values in `guides.json`/`common.json`; fix assertions only, not the underlying English copy.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/PublishedBuyingGuidePage.jsx frontend/src/components/buying-guide/BuyingGuideBreadcrumbs.jsx frontend/src/components/buying-guide/GuideTableOfContents.jsx
git commit -m "feat(i18n): translate buying guide detail page shell, breadcrumbs, and table of contents"
```

---

### Task 4: `BuyingGuidesPage.jsx` (listing page)

**Files:**
- Modify: `frontend/src/pages/BuyingGuidesPage.jsx`
- Test: existing test file (read and re-run; see Step 3)

**Interfaces:**
- Consumes: `guides.listing.*` (Task 1), `common.nav.buyingGuides` (Phase 1).

- [ ] **Step 1: Replace the file contents**

Replace `frontend/src/pages/BuyingGuidesPage.jsx` in full:

```jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar.jsx';
import PublicFooter from '../components/PublicFooter.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import EmptyState from '../components/EmptyState.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { getBuyingGuides } from '../services/buyingGuideService.js';
import { getSettings } from '../services/settingsService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function BuyingGuidesPage() {
  const { t } = useTranslation(['guides', 'common']);
  const [settings, setSettings] = useState(null);
  const [guides, setGuides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    getBuyingGuides()
      .then(setGuides)
      .catch((err) => setError(err.message ?? t('listing.loadError')))
      .finally(() => setIsLoading(false));
  }, [t]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title={t('common:nav.buyingGuides')} description={t('listing.description')} />

          {isLoading && <LoadingSpinner label={t('listing.loading')} />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && guides.length === 0 && (
            <EmptyState title={t('listing.emptyTitle')} description={t('listing.emptyDescription')} />
          )}
          {!isLoading && !error && guides.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((guide) => (
                <Link
                  key={guide.id}
                  to={`/buying-guides/${guide.slug}`}
                  className="group flex flex-col overflow-hidden rounded-card border border-slate-200 bg-white shadow-card transition-shadow duration-200 hover:shadow-card-hover"
                >
                  <div className="aspect-video overflow-hidden bg-slate-100">
                    {getImageUrl(guide.coverImageFilename) ? (
                      <img
                        src={getImageUrl(guide.coverImageFilename)}
                        alt={guide.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                        {t('listing.noImageAvailable')}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-card-title text-heading">{guide.title}</h3>
                    <p className="line-clamp-2 text-small text-body">{guide.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
      <PublicFooter settings={settings} />
    </div>
  );
}

export default BuyingGuidesPage;
```

`t` is added to the guides-fetch effect's dependency array since the effect's `catch` now calls `t(...)`; this does not cause a refetch loop in practice since `t`'s identity is stable across re-renders that don't change the loaded language, but including it keeps the lint rule (`react-hooks/exhaustive-deps`) satisfied.

- [ ] **Step 2: Run the existing test file**

Run: `npm test -- BuyingGuidesPage.test`

- [ ] **Step 3: Fix any failures**

Check against `guides.json`'s `listing.*` and `common.json`'s `nav.buyingGuides`; fix assertions only.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/BuyingGuidesPage.jsx
git commit -m "feat(i18n): translate Buying Guides listing page"
```

---

### Task 5: `BuyingGuideHero.jsx` — translation and locale-aware date

**Files:**
- Modify: `frontend/src/components/buying-guide/BuyingGuideHero.jsx`
- Test: existing test file (read and re-run; see Step 3)

**Interfaces:**
- Consumes: `guides.hero.*` (Task 1).

- [ ] **Step 1: Replace the file contents**

Replace `frontend/src/components/buying-guide/BuyingGuideHero.jsx` in full:

```jsx
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getImageUrl } from '../../utils/imageUrl.js';
import AffiliateDisclosure from '../AffiliateDisclosure.jsx';

function formatUpdatedDate(updatedAt, locale) {
  if (!updatedAt) return null;
  return new Date(updatedAt).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
}

function BuyingGuideHero({ title, excerpt, coverImageFilename, updatedAt, affiliateDisclosure }) {
  const { t, i18n } = useTranslation('guides');
  const imageUrl = getImageUrl(coverImageFilename);
  const formattedDate = formatUpdatedDate(updatedAt, i18n.language);

  return (
    <div className="rounded-card border border-border bg-white p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col justify-center">
          <span className="mb-3 inline-block self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wide text-primary">
            {t('hero.badge')}
          </span>
          <h1 className="mb-3 text-page-heading text-heading">{title}</h1>
          {excerpt && <p className="mb-4 text-body">{excerpt}</p>}
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-white">
              2G
            </span>
            <span>
              {t('hero.byline')}{formattedDate ? ` · ${t('hero.updatedOn', { date: formattedDate })}` : ''}
            </span>
          </div>
          <div className="mt-4 inline-flex items-start gap-2 rounded-lg bg-surface-secondary px-3 py-2">
            <Info size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <AffiliateDisclosure text={affiliateDisclosure} className="text-xs leading-relaxed text-muted" />
          </div>
        </div>
        {imageUrl && (
          <div className="aspect-[3/4] h-full overflow-hidden rounded-image bg-surface-secondary">
            <img src={imageUrl} alt={title} loading="eager" className="h-full w-full object-cover" />
          </div>
        )}
      </div>
    </div>
  );
}

export default BuyingGuideHero;
```

- [ ] **Step 2: Run the existing test file**

Run: `npm test -- BuyingGuideHero.test`

- [ ] **Step 3: Fix any failures**

If the existing test asserts a specific formatted date string (e.g. `"Updated Jan 5, 2026"`), it should still pass since the test environment's i18n defaults to `en-US` and `formatUpdatedDate(updatedAt, 'en-US')` produces the same output as the previous hardcoded `'en-US'` call. If any assertion fails, check it against `guides.json`'s `hero.*` keys and fix the assertion only.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/BuyingGuideHero.jsx
git commit -m "feat(i18n): translate BuyingGuideHero and make the updated-date locale-aware"
```

---

### Task 6: `BuyingGuideContentCard.jsx`

**Files:**
- Modify: `frontend/src/components/buying-guide/BuyingGuideContentCard.jsx`
- Test: existing test file (read and re-run; see Step 3)

**Interfaces:**
- Consumes: `guides.content.*` (Task 1).

- [ ] **Step 1: Replace the file contents**

Replace `frontend/src/components/buying-guide/BuyingGuideContentCard.jsx` in full:

```jsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { wordCount } from '../../utils/wordCount.js';

const CONTENT_PREVIEW_WORD_LIMIT = 40;

function BuyingGuideContentCard({ title, content, anchorId, number, onExpand }) {
  const { t } = useTranslation('guides');
  const [isExpanded, setIsExpanded] = useState(false);
  const isLong = wordCount(content) > CONTENT_PREVIEW_WORD_LIMIT;

  function toggle() {
    const willExpand = !isExpanded;
    setIsExpanded(willExpand);
    if (willExpand) onExpand?.(title);
  }

  return (
    <div id={anchorId} className="scroll-mt-24 rounded-card border border-border bg-white p-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-muted">
          {number}
        </span>
        <h3 className="text-card-title text-heading">{title}</h3>
      </div>
      <div
        className={`prose prose-sm max-w-none text-body ${!isExpanded && isLong ? 'line-clamp-4' : ''}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
      {isLong && (
        <button type="button" onClick={toggle} className="mt-2 text-sm font-semibold text-primary hover:underline">
          {isExpanded ? t('content.showLess') : t('content.readMore')}
        </button>
      )}
    </div>
  );
}

export default BuyingGuideContentCard;
```

- [ ] **Step 2: Run the existing test file**

Run: `npm test -- BuyingGuideContentCard.test`

- [ ] **Step 3: Fix any failures**

Check against `guides.json`'s `content.*`; fix assertions only.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/BuyingGuideContentCard.jsx
git commit -m "feat(i18n): translate BuyingGuideContentCard"
```

---

### Task 7: `BuyingGuideFaqAccordion.jsx`

**Files:**
- Modify: `frontend/src/components/buying-guide/BuyingGuideFaqAccordion.jsx`
- Test: existing test file (read and re-run; see Step 3)

**Interfaces:**
- Consumes: `guides.faq.*` (Task 1).

- [ ] **Step 1: Replace the file contents**

Replace `frontend/src/components/buying-guide/BuyingGuideFaqAccordion.jsx` in full:

```jsx
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const FAQ_PREVIEW_LIMIT = 5;

function BuyingGuideFaqAccordion({ faqs, onExpand }) {
  const { t } = useTranslation('guides');
  const [expandedIndexes, setExpandedIndexes] = useState(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const visibleFaqs = showAll ? faqs : faqs.slice(0, FAQ_PREVIEW_LIMIT);

  function toggle(index, question) {
    setExpandedIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
        onExpand?.(question);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {visibleFaqs.map((faq, index) => {
        const isExpanded = expandedIndexes.has(index);
        const answerId = `faq-answer-${index}`;
        return (
          <div key={index} className="rounded-card border border-border p-4">
            <button
              type="button"
              onClick={() => toggle(index, faq.question)}
              aria-expanded={isExpanded}
              aria-controls={answerId}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span className="text-sm font-semibold text-heading">{faq.question}</span>
              <ChevronDown
                size={18}
                aria-hidden="true"
                className={`shrink-0 text-muted transition-transform motion-reduce:transition-none ${isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            {isExpanded && (
              <p id={answerId} className="mt-2 whitespace-pre-line text-sm text-body">
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
      {faqs.length > FAQ_PREVIEW_LIMIT && (
        <button type="button" onClick={() => setShowAll((prev) => !prev)} className="text-sm font-semibold text-primary hover:underline">
          {showAll ? t('faq.showFewer') : t('faq.viewAll', { total: faqs.length })}
        </button>
      )}
    </div>
  );
}

export default BuyingGuideFaqAccordion;
```

- [ ] **Step 2: Run the existing test file**

Run: `npm test -- BuyingGuideFaqAccordion.test`

- [ ] **Step 3: Fix any failures**

Check against `guides.json`'s `faq.*`; fix assertions only. If a test asserts `"View all 7 questions"`-style text, it should keep passing since `t('faq.viewAll', { total: 7 })` resolves to the identical `en-US` string.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/BuyingGuideFaqAccordion.jsx
git commit -m "feat(i18n): translate BuyingGuideFaqAccordion"
```

---

### Task 8: `ComparisonTable.jsx` and the price disclaimer

**Files:**
- Modify: `frontend/src/components/buying-guide/ComparisonTable.jsx`
- Modify: `frontend/src/components/buying-guide/ProductComparisonSection.jsx`
- Test: existing test files for both, plus `frontend/src/components/buying-guide-form/LivePreview.test.jsx` (read and re-run; see Step 4 — `LivePreview.jsx` imports `ComparisonTable.jsx` directly, a consumer noted in Phase 1's own retrospective as easy to miss)

**Interfaces:**
- Consumes: `guides.comparison.*` (Task 1).

- [ ] **Step 1: Replace `ComparisonTable.jsx`**

Replace `frontend/src/components/buying-guide/ComparisonTable.jsx` in full:

```jsx
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function renderCellValue(rawValue, t) {
  const value = (rawValue ?? '').trim();
  if (!value) return <span aria-hidden="true">&mdash;</span>;
  const lower = value.toLowerCase();
  if (lower === 'yes') {
    return (
      <span className="inline-flex items-center gap-1 text-success">
        <Check size={16} aria-hidden="true" />
        {t('comparison.yes')}
      </span>
    );
  }
  if (lower === 'no') {
    return (
      <span className="inline-flex items-center gap-1 text-danger">
        <X size={16} aria-hidden="true" />
        {t('comparison.no')}
      </span>
    );
  }
  return value;
}

const HEADER_CELL_CLASSES = 'p-3 text-left text-xs font-semibold uppercase tracking-wide text-white';
const DATA_CELL_CLASSES = 'border-b border-border p-3 text-left text-sm text-body';

function ComparisonTable({ comparisonTable, renderProductName }) {
  const { t } = useTranslation('guides');
  if (!comparisonTable || comparisonTable.rows.length === 0) return null;
  const { specificationNames, rows } = comparisonTable;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{t('comparison.caption', { names: rows.map((row) => row.product.name).join(', ') })}</caption>
        <thead className="bg-navy-950">
          <tr>
            <th scope="col" className={HEADER_CELL_CLASSES}>
              {t('comparison.productColumn')}
            </th>
            {specificationNames.map((name) => (
              <th key={name} scope="col" className={HEADER_CELL_CLASSES}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.product.id}>
              <th scope="row" className="border-b border-border p-3 text-left text-sm font-medium text-heading">
                {renderProductName ? renderProductName(row.product) : row.product.name}
              </th>
              {specificationNames.map((name, index) => (
                <td key={name} className={DATA_CELL_CLASSES}>
                  {renderCellValue(row.specificationValues[index], t)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ComparisonTable;
```

- [ ] **Step 2: Translate the price disclaimer in `ProductComparisonSection.jsx`**

The `useTranslation('guides')` hook already exists in this file from Task 2. Update the disclaimer line:

```jsx
{hasPrice && <p className="mt-2 text-xs text-muted">{t('comparison.priceDisclaimer')}</p>}
```

- [ ] **Step 3: Run the existing test files**

Run: `npm test -- ComparisonTable.test ProductComparisonSection.test LivePreview.test`

- [ ] **Step 4: Fix any failures**

Check against `guides.json`'s `comparison.*`; fix assertions only. `LivePreview.test.jsx` is the file Phase 1's retrospective flagged as an easy-to-miss consumer of `ComparisonTable.jsx` — run it explicitly even though `LivePreview.jsx` itself isn't modified by this plan, since its rendered output changes through the shared component.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/buying-guide/ComparisonTable.jsx frontend/src/components/buying-guide/ProductComparisonSection.jsx
git commit -m "feat(i18n): translate ComparisonTable and the price disclaimer"
```

---

### Task 9: `RecommendationCard.jsx`

**Files:**
- Modify: `frontend/src/components/buying-guide/RecommendationCard.jsx`
- Test: existing test file, plus `frontend/src/components/buying-guide-form/LivePreview.test.jsx` (read and re-run; see Step 3 — same shared-component reasoning as Task 8)

**Interfaces:**
- Consumes: `guides.recommendation.*` (Task 1).

- [ ] **Step 1: Replace the file contents**

Replace `frontend/src/components/buying-guide/RecommendationCard.jsx` in full:

```jsx
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import QuickPickBadge from '../buying-guide-form/QuickPickBadge.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';
import { isSupportedAmazonUrl } from '../../utils/amazonLink.js';

function RecommendationCard({ recommendation, badgeIndex = 0, compact = false, onAffiliateClick }) {
  const { t } = useTranslation('guides');
  const { product, sectionLabel, whyRecommended, pros, cons, bestFor } = recommendation;
  const imageUrl = getImageUrl(product.imageFileName);
  const isLink = isSupportedAmazonUrl(product.productLink);

  return (
    <div className="rounded-card border border-border bg-white p-5">
      <div className="mb-3 flex justify-end">
        <QuickPickBadge label={sectionLabel || t('recommendation.untitledBadge')} index={badgeIndex} />
      </div>

      <div className="mb-3 flex items-center gap-4">
        <div
          className={`shrink-0 overflow-hidden rounded-md bg-surface-secondary ${compact ? 'h-16 w-16' : 'h-24 w-24'}`}
        >
          {imageUrl && (
            <img src={imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="text-card-title">
            {isLink ? (
              <a
                href={product.productLink}
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                onClick={onAffiliateClick}
                className="font-semibold text-primary hover:underline"
              >
                {product.name}
              </a>
            ) : (
              <span className="font-semibold text-heading">{product.name}</span>
            )}
          </h3>
        </div>
      </div>

      {whyRecommended && (
        <div className="mb-3">
          <span className="text-sm font-semibold text-heading">{t('recommendation.whyWeRecommendIt')}</span>
          <div
            className="prose prose-sm mt-1 max-w-none text-body"
            dangerouslySetInnerHTML={{ __html: whyRecommended }}
          />
        </div>
      )}

      {(pros.length > 0 || cons.length > 0 || bestFor.length > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {pros.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-success">{t('recommendation.pros')}</span>
              <ul className="mt-1 space-y-1">
                {pros.map((item, index) => (
                  <li key={index} className="flex items-start gap-1.5 text-sm text-body">
                    <Check size={14} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {cons.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-danger">{t('recommendation.cons')}</span>
              <ul className="mt-1 space-y-1">
                {cons.map((item, index) => (
                  <li key={index} className="flex items-start gap-1.5 text-sm text-body">
                    <X size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bestFor.length > 0 && (
            <div>
              <span className="text-sm font-semibold text-primary">{t('recommendation.bestFor')}</span>
              <ul className="mt-1 list-disc pl-5 text-sm text-body">
                {bestFor.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RecommendationCard;
```

- [ ] **Step 2: Run the existing test files**

Run: `npm test -- RecommendationCard.test LivePreview.test`

- [ ] **Step 3: Fix any failures**

Check against `guides.json`'s `recommendation.*`; fix assertions only.

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/buying-guide/RecommendationCard.jsx
git commit -m "feat(i18n): translate RecommendationCard"
```

---

### Task 10: Remaining section-specific strings — Quick Recommendations, Runner-Ups, Final Recommendation

**Files:**
- Modify: `frontend/src/components/buying-guide/QuickRecommendationsSection.jsx`
- Modify: `frontend/src/components/buying-guide/RunnerUpsSection.jsx`
- Modify: `frontend/src/components/buying-guide/FinalRecommendationSection.jsx`
- Test: existing test files for the above (read and re-run; see Step 4)

**Interfaces:**
- Consumes: `guides.recommendation.untitledBadge`, `guides.recommendation.viewOnAmazon`, `guides.recommendation.viewProductOnAmazon`, `guides.runnerUps.*` (Task 1).

- [ ] **Step 1: Translate the remaining strings in `QuickRecommendationsSection.jsx`**

The `useTranslation('guides')` hook already exists from Task 2. Update the badge fallback and button text:

```jsx
<QuickPickBadge label={badgeName || t('recommendation.untitledBadge')} index={index} className="self-center" />
```

```jsx
<AmazonAffiliateButton
  productName={product.name}
  url={product.productLink}
  className="mt-auto"
  onClick={() =>
    onAffiliateClick({
      guideId,
      productId: product.id,
      section: 'quick_recommendations',
      placement: index,
      marketplace: getAmazonMarketplace(product.productLink),
    })
  }
>
  <ShoppingCart size={16} aria-hidden="true" />
  {t('recommendation.viewOnAmazon')}
</AmazonAffiliateButton>
```

- [ ] **Step 2: Translate the remaining strings in `RunnerUpsSection.jsx`**

The `useTranslation('guides')` hook already exists from Task 2. Update the toggle button:

```jsx
{runnerUps.length > INITIAL_VISIBLE_COUNT && (
  <button
    type="button"
    onClick={() => setShowAll((prev) => !prev)}
    aria-expanded={showAll}
    className="mt-4 text-sm font-semibold text-primary hover:underline"
  >
    {showAll ? t('runnerUps.showFewer') : t('runnerUps.seeAll')}
  </button>
)}
```

- [ ] **Step 3: Translate the remaining string in `FinalRecommendationSection.jsx`**

The `useTranslation('guides')` hook already exists from Task 2. Update the button:

```jsx
<AmazonAffiliateButton
  productName={topPick.product.name}
  url={topPick.product.productLink}
  onClick={() =>
    onAffiliateClick({
      guideId,
      productId: topPick.product.id,
      section: 'final_recommendation',
      marketplace: getAmazonMarketplace(topPick.product.productLink),
    })
  }
>
  {t('recommendation.viewProductOnAmazon', { productName: topPick.product.name })}
</AmazonAffiliateButton>
```

- [ ] **Step 4: Run the existing test files**

Run: `npm test -- QuickRecommendationsSection.test RunnerUpsSection.test FinalRecommendationSection.test`

- [ ] **Step 5: Fix any failures**

Check against `guides.json`'s `recommendation.*`/`runnerUps.*`; fix assertions only.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/buying-guide/QuickRecommendationsSection.jsx frontend/src/components/buying-guide/RunnerUpsSection.jsx frontend/src/components/buying-guide/FinalRecommendationSection.jsx
git commit -m "feat(i18n): translate remaining Quick Recommendations, Runner-Ups, and Final Recommendation strings"
```

---

### Task 11: Full verification and manual multi-language check

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm test` (from `frontend/`)
Expected: PASS, 0 failures.

- [ ] **Step 2: Run lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 4: Manual verification — start the dev server**

Run: `npm run dev` (or reuse an already-running instance).

- [ ] **Step 5: Manual verification — listing page, all 5 languages**

Visit `/buying-guides`, switch through all 5 languages via the selector, and confirm: the heading, description, and card copy (no-image fallback) switch immediately; no layout overflow from longer Spanish/Filipino strings.

- [ ] **Step 6: Manual verification — detail page, all 5 languages**

Visit a published guide detail page and confirm, per language: the sidebar TOC labels and each section's own `<h2>` show the identical translated text (the Task 2 unification actually holds); the hero's "BUYING GUIDE" badge, byline, and "Updated" date (in the correct per-locale date format) render correctly; the comparison table's "Product" header and Yes/No cells translate; the FAQ accordion's "View all N questions"/"Show fewer questions" toggle translates with the correct count; the Quick Recommendations "View on Amazon" button and the Final Recommendation's "View {product name} on Amazon" button both translate correctly, keeping the real product name interpolated; the Runner-Ups "See all reviewed products" toggle translates.

- [ ] **Step 7: Write the completion note**

Summarize in your final report: what shipped (guides namespace across 16 files, section-heading unification, locale-aware hero date, JSON-LD breadcrumb name localization), confirmation that full suite + lint + build passed, and that DB-driven guide content (titles, excerpts, pros/cons, FAQ text, comparison spec values, quick-pick badge names) remains untranslated — that is Phase 3/4's responsibility (backend translation tables), not this plan's.

---

## Self-Review Notes

- **Spec coverage:** namespace/key structure (Task 1), section-heading unification (Task 2), detail-page shell + breadcrumbs + TOC (Task 3), listing page (Task 4), hero + locale-aware date fix (Task 5), content card (Task 6), FAQ accordion (Task 7), comparison table + price disclaimer (Task 8), recommendation card (Task 9), remaining Quick Recommendations/Runner-Ups/Final Recommendation strings (Task 10), shared-component scope decision explicitly called out in Tasks 8/9's `LivePreview.test.jsx` re-run step, JSON-LD breadcrumb localization (Task 3), testing plan (every task's own tests + Task 11's full suite/lint/build/manual) — all covered.
- **Placeholder scan:** no TBD/TODO; every translation string is a complete, natural translation.
- **Type consistency:** every `t('sections.x')`/`t('listing.x')`/`t('detail.x')`/`t('hero.x')`/`t('content.x')`/`t('faq.x')`/`t('comparison.x')`/`t('recommendation.x')`/`t('runnerUps.x')` key path used across all 11 tasks matches exactly what Task 1 creates in `guides.json`. `buildJsonLd(guide, { homeLabel, buyingGuidesLabel })`'s new signature (Task 3) is used consistently at its one call site. `formatUpdatedDate(updatedAt, locale)`'s new second parameter (Task 5) is used consistently at its one call site.
