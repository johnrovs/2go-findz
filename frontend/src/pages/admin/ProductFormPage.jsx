import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProductForm from '../../components/ProductForm.jsx';
import LoadingSpinner from '../../components/LoadingSpinner.jsx';
import ErrorState from '../../components/ErrorState.jsx';
import { useToast } from '../../hooks/useToast.js';
import { getProductById, createProduct, updateProduct } from '../../services/adminProductService.js';
import { getCategories } from '../../services/adminCategoryService.js';

function ProductFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const isEditMode = Boolean(id);

  const [categories, setCategories] = useState([]);
  const [product, setProduct] = useState(null);
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
    getProductById(id)
      .then(setProduct)
      .catch((err) => setError(err.message ?? 'Failed to load product.'))
      .finally(() => setIsLoading(false));
  }, [id, isEditMode]);

  async function handleSubmit(payload) {
    if (isEditMode) {
      await updateProduct(id, payload);
      showToast('Product updated successfully.');
    } else {
      await createProduct(payload);
      showToast('Product created successfully.');
    }
    navigate('/admin/products');
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Product' : 'Add Product'}</h1>

      {isLoading ? (
        <LoadingSpinner label="Loading product..." />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <ProductForm
          product={product}
          categories={categories}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/admin/products')}
        />
      )}
    </div>
  );
}

export default ProductFormPage;
