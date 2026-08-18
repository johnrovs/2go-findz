import { useState } from 'react';
import { Image as ImageIcon, Star } from 'lucide-react';
import Modal from '../Modal.jsx';
import Button from '../Button.jsx';
import EmptyState from '../EmptyState.jsx';
import { getImageUrl } from '../../utils/imageUrl.js';

function AddQuickPickDialog({ isOpen, onClose, eligibleProducts, onAdd }) {
  const [search, setSearch] = useState('');

  const filtered = eligibleProducts.filter((product) =>
    product.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  function handleAdd(product) {
    onAdd(product);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Quick Pick">
      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search products..."
        aria-label="Search eligible products"
        className="mb-4 w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />

      {eligibleProducts.length === 0 ? (
        <EmptyState
          title="No eligible products"
          description="Every product in this guide is already a Quick Pick. Add more products in the Products step first."
        />
      ) : filtered.length === 0 ? (
        <EmptyState title="No products found" description="Try a different search term." />
      ) : (
        <ul className="max-h-96 space-y-2 overflow-y-auto">
          {filtered.map((product) => {
            const imageUrl = getImageUrl(product.imageFileName);
            return (
              <li key={product.id} className="flex items-center justify-between gap-3 rounded-btn border border-border p-3">
                <div className="flex min-w-0 items-center gap-3">
                  {imageUrl ? (
                    <img src={imageUrl} alt={product.name} className="h-12 w-12 shrink-0 rounded-md object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-slate-100">
                      <ImageIcon className="h-5 w-5 text-slate-300" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-body">{product.name}</p>
                    <p className="truncate text-xs text-muted">
                      {product.brand || '—'} · ${Number(product.productPrice).toFixed(2)}
                      {product.rating != null && (
                        <>
                          {' '}
                          · <Star size={12} className="inline fill-star text-star" /> {product.rating} (
                          {product.reviewCount?.toLocaleString() ?? 0})
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={() => handleAdd(product)}>
                  Add
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-6 flex justify-end">
        <Button type="button" variant="secondary" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}

export default AddQuickPickDialog;
