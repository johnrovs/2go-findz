import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ComparisonForm from '../../components/ComparisonForm.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useToast } from '../../hooks/useToast.js';
import { getComparisonById, createComparison, updateComparison } from '../../services/adminComparisonService.js';
import { getCategories } from '../../services/adminCategoryService.js';

function ComparisonFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = Boolean(id);

  const [comparison, setComparison] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [error, setError] = useState(null);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    // Resetting loading/error state at the start of each fetch is the standard
    // reset-before-async-work pattern; it can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);
    getComparisonById(id)
      .then(setComparison)
      .catch((err) => setError(err.message ?? 'Failed to load comparison.'))
      .finally(() => setIsLoading(false));
  }, [id, isEditMode]);

  async function handleSubmit(payload) {
    if (isEditMode) {
      await updateComparison(id, payload);
      showToast('Comparison updated successfully.');
    } else {
      await createComparison(payload);
      showToast('Comparison created successfully.');
    }
    navigate('/comparisons');
  }

  return (
    <div>
      <h1 className="mb-6 text-page-heading text-heading">
        {isEditMode ? 'Edit Comparison' : 'Add Comparison'}
      </h1>

      {isLoading ? (
        <LoadingSpinner label="Loading comparison..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <ComparisonForm
          comparison={comparison}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/comparisons')}
        />
      )}
    </div>
  );
}

export default ComparisonFormPage;
