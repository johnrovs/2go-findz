import HomeCategoryCard from './HomeCategoryCard.jsx';

function CategoryGridSection({ categories }) {
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {categories.map((category) => (
        <HomeCategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}

export default CategoryGridSection;
