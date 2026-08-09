import { Link } from 'react-router-dom';
import { Baby, Dumbbell, Home as HomeIcon, Laptop, Shirt, Sparkles, Tag, Utensils } from 'lucide-react';
import { getImageUrl } from '../../utils/imageUrl.js';

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
  const imageUrl = getImageUrl(category.imageFileName);

  return (
    <Link
      to={`/categories?category=${category.id}`}
      className="group flex flex-col items-center gap-3 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="aspect-square w-full overflow-hidden rounded-card bg-slate-100">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-primary">
            {renderCategoryIcon(category.productCategoryName)}
          </span>
        )}
      </span>
      <span className="text-small font-semibold text-heading">{category.productCategoryName}</span>
    </Link>
  );
}

export default HomeCategoryCard;
