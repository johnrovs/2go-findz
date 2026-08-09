import { Link } from 'react-router-dom';
import { Baby, Dumbbell, Home as HomeIcon, Laptop, Shirt, Sparkles, Tag, Utensils } from 'lucide-react';

const KEYWORD_ICONS = [
  { keywords: ['electronic', 'tech', 'computer', 'laptop'], icon: Laptop },
  { keywords: ['kitchen', 'dining', 'cook'], icon: Utensils },
  { keywords: ['home', 'furniture'], icon: HomeIcon },
  { keywords: ['fashion', 'clothing', 'apparel', 'wear'], icon: Shirt },
  { keywords: ['fitness', 'sport', 'outdoor'], icon: Dumbbell },
  { keywords: ['baby', 'kid', 'toy'], icon: Baby },
  { keywords: ['beauty', 'health', 'personal care'], icon: Sparkles },
];

function renderCategoryIcon(name = '') {
  const lower = name.toLowerCase();
  const match = KEYWORD_ICONS.find(({ keywords }) => keywords.some((keyword) => lower.includes(keyword)));
  const IconComponent = match ? match.icon : Tag;
  return <IconComponent size={24} aria-hidden="true" />;
}

function HomeCategoryCard({ category }) {
  return (
    <Link
      to={`/categories?category=${category.id}`}
      className="flex flex-col items-center gap-3 rounded-card border border-slate-200 bg-white px-6 py-8 text-center shadow-card transition hover:-translate-y-1 hover:shadow-card-hover focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        {renderCategoryIcon(category.productCategoryName)}
      </span>
      <span className="text-card-title text-heading">{category.productCategoryName}</span>
    </Link>
  );
}

export default HomeCategoryCard;
