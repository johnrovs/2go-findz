import { Fragment, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import ProductGrid from '../components/ProductGrid.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import LoadingSpinner from '../components/LoadingSpinner.jsx';
import ErrorState from '../components/ErrorState.jsx';
import { getComparisonBySlug } from '../services/comparisonService.js';
import { getSettings } from '../services/settingsService.js';
import { getImageUrl } from '../utils/imageUrl.js';

function groupSpecRows(specRows) {
  const groups = [];
  for (const row of specRows) {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.groupLabel === row.groupLabel) {
      lastGroup.rows.push(row);
    } else {
      groups.push({ groupLabel: row.groupLabel, rows: [row] });
    }
  }
  return groups;
}

function tierClassName(tier) {
  if (tier === 'BEST') return 'bg-emerald-50 text-emerald-800 font-semibold';
  if (tier === 'GOOD') return 'bg-amber-50 text-amber-800';
  return 'text-slate-700';
}

function splitLines(text) {
  return text.split('\n').filter((line) => line.trim());
}

function ComparisonDetailPage() {
  const { slug } = useParams();
  const [settings, setSettings] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    // Resetting loading/error state at the start of each fetch is the standard
    // reset-before-async-work pattern; it can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    getComparisonBySlug(slug)
      .then(setComparison)
      .catch((err) => setError(err.message ?? 'Comparison not found.'))
      .finally(() => setIsLoading(false));
  }, [slug]);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          {isLoading && <LoadingSpinner label="Loading comparison..." />}
          {!isLoading && error && <ErrorState message={error} />}
          {!isLoading && !error && comparison && (
            <>
              {getImageUrl(comparison.coverImageFilename) && (
                <img
                  src={getImageUrl(comparison.coverImageFilename)}
                  alt={comparison.title}
                  className="mb-6 aspect-video w-full rounded-xl object-cover"
                />
              )}
              <p className="mb-2 text-sm font-medium text-indigo-600">{comparison.categoryName}</p>
              <h1 className="mb-4 text-3xl font-bold text-slate-900">{comparison.title}</h1>
              <p className="mb-2 text-base leading-relaxed text-slate-700">{comparison.description}</p>
              <p className="text-xs text-slate-400">
                Last updated{' '}
                {new Date(comparison.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>

              {comparison.specRows.length > 0 && (
                <div className="mt-12">
                  <SectionHeading title="Comparison Table" />
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] table-fixed border-collapse text-left">
                      <thead>
                        <tr>
                          <th scope="col" className="w-40 p-3 text-sm font-medium text-slate-500"></th>
                          {comparison.products.map((cp) => (
                            <th key={cp.id} scope="col" className="p-3 text-sm font-semibold text-slate-900">
                              {cp.product.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {groupSpecRows(comparison.specRows).map((group) => (
                          <Fragment key={group.groupLabel}>
                            <tr>
                              <th
                                colSpan={comparison.products.length + 1}
                                scope="colgroup"
                                className="bg-slate-50 p-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                              >
                                {group.groupLabel}
                              </th>
                            </tr>
                            {group.rows.map((row) => (
                              <tr key={row.id}>
                                <th scope="row" className="p-3 text-sm font-medium text-slate-500">
                                  {row.rowLabel}
                                </th>
                                {comparison.products.map((cp) => {
                                  const value = row.values.find((v) => v.productId === cp.product.id);
                                  return (
                                    <td key={cp.id} className={`p-3 text-sm ${tierClassName(value?.tier)}`}>
                                      {value?.value ?? '—'}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-12">
                <SectionHeading title="Product Breakdown" />
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  {comparison.products.map((cp) => (
                    <div key={cp.id} className="rounded-xl border border-slate-200 p-6">
                      {cp.badge && (
                        <span className="mb-3 inline-block rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                          {cp.badge}
                        </span>
                      )}
                      <div className="mb-4 flex items-center gap-4">
                        <img
                          src={getImageUrl(cp.product.imageFileName)}
                          alt={cp.product.name}
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900">{cp.product.name}</h3>
                          {cp.editorsScore !== null && cp.editorsScore !== undefined && (
                            <span className="text-sm font-medium text-slate-600">
                              {cp.editorsScore.toFixed(1)} / 10
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mb-3 text-sm text-slate-700">{cp.recommendation}</p>
                      <dl className="mb-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                        <div>
                          <dt className="font-medium text-slate-500">Best For</dt>
                          <dd className="text-slate-700">{cp.bestFor}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-slate-500">Strength</dt>
                          <dd className="text-slate-700">{cp.mainStrength}</dd>
                        </div>
                        <div>
                          <dt className="font-medium text-slate-500">Weakness</dt>
                          <dd className="text-slate-700">{cp.mainWeakness}</dd>
                        </div>
                      </dl>
                      {cp.pros && cp.cons && (
                        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <h4 className="mb-1 text-sm font-semibold text-emerald-700">Pros</h4>
                            <ul className="list-inside list-disc text-sm text-slate-700">
                              {splitLines(cp.pros).map((line, index) => (
                                <li key={index}>{line}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="mb-1 text-sm font-semibold text-red-700">Cons</h4>
                            <ul className="list-inside list-disc text-sm text-slate-700">
                              {splitLines(cp.cons).map((line, index) => (
                                <li key={index}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                      <a
                        href={cp.product.productLink}
                        target="_blank"
                        rel="nofollow sponsored noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                      >
                        View on Amazon
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {comparison.sections.length > 0 && (
                <div className="mt-12 space-y-6">
                  {comparison.sections.map((section) => (
                    <div key={section.id}>
                      <h3 className="mb-2 text-xl font-semibold text-slate-900">{section.heading}</h3>
                      <p className="whitespace-pre-line text-base leading-relaxed text-slate-700">{section.body}</p>
                    </div>
                  ))}
                </div>
              )}

              {comparison.faqs.length > 0 && (
                <div className="mt-12">
                  <SectionHeading title="Frequently Asked Questions" />
                  <div className="space-y-4">
                    {comparison.faqs.map((faq) => (
                      <div key={faq.id}>
                        <h3 className="mb-1 text-base font-semibold text-slate-900">{faq.question}</h3>
                        <p className="text-sm text-slate-700">{faq.answer}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {comparison.relatedComparisons.length > 0 && (
                <div className="mt-12">
                  <SectionHeading title="Related Comparisons" />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {comparison.relatedComparisons.map((related) => (
                      <Link
                        key={related.id}
                        to={`/comparisons/${related.slug}`}
                        className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
                      >
                        <div className="aspect-video overflow-hidden bg-slate-100">
                          {getImageUrl(related.coverImageFilename) ? (
                            <img
                              src={getImageUrl(related.coverImageFilename)}
                              alt={related.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                              No image available
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="text-sm font-semibold text-slate-900">{related.title}</h4>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {!isLoading && !error && comparison && comparison.relatedProducts.length > 0 && (
          <div className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Related Products" />
            <ProductGrid products={comparison.relatedProducts} isLoading={false} error={null} />
          </div>
        )}
      </section>
      <Footer settings={settings} />
    </div>
  );
}

export default ComparisonDetailPage;
