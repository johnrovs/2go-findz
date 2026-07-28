import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CatalogPage from '../components/CatalogPage.jsx';
import CategoryCard from '../components/CategoryCard.jsx';
import SectionHeading from '../components/SectionHeading.jsx';
import { getCategories } from '../services/categoryService.js';

function CategoriesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  function handleCategorySelect(categoryId) {
    const next = new URLSearchParams(searchParams);
    next.set('category', String(categoryId));
    setSearchParams(next);
  }

  return (
    <CatalogPage title="Categories" description="Browse curated recommendations by category.">
      {categories.length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionHeading title="Shop by Category" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} onClick={handleCategorySelect} />
              ))}
            </div>
          </div>
        </section>
      )}
    </CatalogPage>
  );
}

export default CategoriesPage;
