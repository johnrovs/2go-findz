import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BuyingGuideForm from '../../components/BuyingGuideForm.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useToast } from '../../hooks/useToast.js';
import { getBuyingGuideById, createBuyingGuide, updateBuyingGuide } from '../../services/adminBuyingGuideService.js';

function BuyingGuideFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = Boolean(id);

  const [guide, setGuide] = useState(null);
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

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        {isEditMode ? 'Edit Buying Guide' : 'Add Buying Guide'}
      </h1>

      {isLoading ? (
        <LoadingSpinner label="Loading buying guide..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <BuyingGuideForm guide={guide} onSubmit={handleSubmit} onCancel={() => navigate('/admin/buying-guides')} />
      )}
    </div>
  );
}

export default BuyingGuideFormPage;
