import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CategoryForm from '../../components/CategoryForm.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useToast } from '../../hooks/useToast.js';
import { getCategories, createCategory, updateCategory } from '../../services/adminCategoryService.js';

function CategoryFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = Boolean(id);

  const [category, setCategory] = useState(null);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isEditMode) return;
    // Resetting loading/error state at the start of each fetch is the standard
    // reset-before-async-work pattern; it can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    getCategories()
      .then((allCategories) => {
        const match = allCategories.find((item) => item.id === Number(id));
        if (match) {
          setCategory(match);
        } else {
          setError('Category not found.');
        }
      })
      .catch((err) => setError(err.message ?? 'Failed to load category.'))
      .finally(() => setIsLoading(false));
  }, [id, isEditMode]);

  async function handleSubmit(payload) {
    if (isEditMode) {
      await updateCategory(id, payload);
      showToast('Category updated successfully.');
    } else {
      await createCategory(payload);
      showToast('Category created successfully.');
    }
    navigate('/categories');
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/categories')}
        className="mb-4 inline-flex items-center gap-2 text-small font-medium text-dashboard-purple hover:underline"
      >
        <ArrowLeft size={16} />
        Back to Categories
      </button>

      <h1 className="text-page-heading text-heading">{isEditMode ? 'Edit Category' : 'Add Category'}</h1>
      <p className="mb-6 mt-1 text-small text-muted">
        {isEditMode ? "Update this category's details." : 'Create a new category to organize your storefront.'}
      </p>

      {isLoading ? (
        <LoadingSpinner label="Loading category..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <CategoryForm
          category={category}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/categories')}
        />
      )}
    </div>
  );
}

export default CategoryFormPage;
