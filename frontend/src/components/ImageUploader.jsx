import { useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl.js';
import { uploadImage } from '../services/adminImageService.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function ImageUploader({ imageFileName, onChange, label = 'Product Image', variant = 'square', helperText }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const previewUrl = getImageUrl(imageFileName);
  const isWide = variant === 'wide';

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setError('');

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('Image must be 5MB or smaller.');
      return;
    }

    setIsUploading(true);
    try {
      const { filename } = await uploadImage(file);
      onChange(filename);
    } catch (err) {
      setError(err.message ?? 'Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-1 block text-small font-medium text-body">{label}</span>
      <div className={isWide ? 'flex flex-col gap-3' : 'flex items-center gap-4'}>
        <div
          className={
            isWide
              ? 'relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-card border border-border bg-surface-secondary'
              : 'flex h-24 w-24 items-center justify-center overflow-hidden rounded-card border border-border bg-surface-secondary'
          }
        >
          {previewUrl ? (
            <img src={previewUrl} alt="Product preview" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className={isWide ? 'h-10 w-10 text-slate-300' : 'h-8 w-8 text-slate-300'} />
          )}
          {isWide && previewUrl && (
            <button
              type="button"
              onClick={() => onChange(null)}
              aria-label="Remove image"
              className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-danger shadow hover:bg-white"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-btn border border-border px-4 py-2 text-sm font-medium text-body hover:bg-slate-50">
            <Upload size={16} />
            {isUploading ? 'Uploading...' : isWide && previewUrl ? 'Change Image' : 'Upload Image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
          </label>
          {helperText && <p className="mt-2 text-xs text-muted">{helperText}</p>}
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ImageUploader;
