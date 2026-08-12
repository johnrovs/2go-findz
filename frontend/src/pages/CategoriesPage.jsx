import { useEffect, useState } from 'react';
import { LayoutGrid } from 'lucide-react';
import CatalogPage from '../components/CatalogPage.jsx';
import HomeSectionCard from '../components/home/HomeSectionCard.jsx';
import CategoryGridSection from '../components/home/CategoryGridSection.jsx';
import { getCategories } from '../services/categoryService.js';

function CategoriesPage() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  return (
    <CatalogPage title="Categories" description="Browse curated recommendations by category.">
      {categories.length > 0 && (
        <section className="py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <HomeSectionCard
              icon={LayoutGrid}
              title="Shop by Category"
              description="Browse curated recommendations by category."
            >
              <CategoryGridSection categories={categories} />
            </HomeSectionCard>
          </div>
        </section>
      )}
    </CatalogPage>
  );
}

export default CategoriesPage;
