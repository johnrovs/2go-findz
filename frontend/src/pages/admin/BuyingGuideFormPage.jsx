import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BuyingGuideForm from '../../components/BuyingGuideForm.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useToast } from '../../hooks/useToast.js';
import { getBuyingGuideById, createBuyingGuide, updateBuyingGuide } from '../../services/adminBuyingGuideService.js';
import { getCategories } from '../../services/adminCategoryService.js';

function BuyingGuideFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = Boolean(id);

  const [guide, setGuide] = useState(null);
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
    getBuyingGuideById(id)
      .then(setGuide)
      .catch((err) => setError(err.message ?? 'Failed to load buying guide.'))
      .finally(() => setIsLoading(false));
  }, [id, isEditMode]);

  async function handleSubmit(payload) {
    if (isEditMode) {
      await updateBuyingGuide(id, payload);
      showToast('Buying guide updated successfully.');
    } else {
      await createBuyingGuide(payload);
      showToast('Buying guide created successfully.');
    }
    navigate('/admin/buying-guides');
  }

  if (isLoading) return <LoadingSpinner label="Loading buying guide..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <BuyingGuideForm
      guide={guide}
      categories={categories}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/admin/buying-guides')}
    />
  );
}

export default BuyingGuideFormPage;
