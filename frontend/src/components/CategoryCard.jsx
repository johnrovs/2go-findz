import { motion } from 'framer-motion';

function CategoryCard({ category, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={() => onClick(category.id)}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      <span className="text-base font-semibold text-slate-900">{category.productCategoryName}</span>
    </motion.button>
  );
}

export default CategoryCard;
