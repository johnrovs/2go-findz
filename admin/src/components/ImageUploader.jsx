import { useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl.js';
import { uploadImage } from '../services/adminImageService.js';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function ImageUploader({ imageFileName, onChange, label = 'Product Image', variant = 'square', helperText }) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const previewUrl = getImageUrl(imageFileName);
  const isWide = variant === 'wide';
  const isDropzone = variant === 'dropzone';

  async function processFile(file) {
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

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    await processFile(file);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragActive(true);
  }

  function handleDragLeave() {
    setIsDragActive(false);
  }

  async function handleDrop(event) {
    event.preventDefault();
    setIsDragActive(false);
    await processFile(event.dataTransfer.files?.[0]);
  }

  if (isDropzone) {
    return (
      <div>
        <span className="mb-1 block text-small font-medium text-body">{label}</span>
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed p-6 text-center transition-colors ${
            isDragActive
              ? 'border-dashboard-purple bg-dashboard-purpleLight'
              : 'border-dashboard-purple/40 bg-dashboard-purpleLight/40'
          }`}
        >
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Product preview" className="h-32 w-full rounded-btn object-cover" />
              <button
                type="button"
                onClick={() => onChange(null)}
                aria-label="Remove image"
                className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-danger shadow hover:bg-white"
              >
                <Trash2 size={16} />
              </button>
            </>
          ) : (
            <>
              <ImageIcon className="h-10 w-10 text-dashboard-purple" />
              <p className="text-small font-semibold text-heading">Upload product image</p>
              <p className="text-xs text-muted">PNG, JPG or WebP · Max 5MB</p>
            </>
          )}
          <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-btn border border-dashboard-purple px-4 py-2 text-sm font-medium text-dashboard-purple hover:bg-dashboard-purpleLight focus-within:ring-2 focus-within:ring-primary">
            <Upload size={16} />
            {isUploading ? 'Uploading...' : previewUrl ? 'Change Image' : 'Choose Image'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
              aria-label="Upload product image"
            />
          </label>
        </div>
        {helperText && <p className="mt-2 text-xs text-muted">{helperText}</p>}
        {error && (
          <p role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        )}
      </div>
    );
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
