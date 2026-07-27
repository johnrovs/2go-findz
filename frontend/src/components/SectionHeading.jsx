import { motion } from 'framer-motion';

function SectionHeading({ title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.3 }}
      className="mb-8 text-center"
    >
      <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">{description}</p>}
    </motion.div>
  );
}

export default SectionHeading;
