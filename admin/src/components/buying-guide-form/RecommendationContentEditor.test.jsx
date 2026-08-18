import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RecommendationContentEditor from './RecommendationContentEditor.jsx';

describe('RecommendationContentEditor', () => {
  it('renders the current content and word count', () => {
    render(
      <RecommendationContentEditor id="why-1" value="<p>Great sound and battery life.</p>" onChange={vi.fn()} error={null} />
    );
    expect(screen.getByText('Great sound and battery life.')).toBeInTheDocument();
    expect(screen.getByText('Words: 5')).toBeInTheDocument();
  });

  it('shows 0 words for empty content', () => {
    render(<RecommendationContentEditor id="why-1" value="" onChange={vi.fn()} error={null} />);
    expect(screen.getByText('Words: 0')).toBeInTheDocument();
  });

  it('shows an inline error when provided', () => {
    render(<RecommendationContentEditor id="why-1" value="" onChange={vi.fn()} error="At least 10 words are required." />);
    expect(screen.getByText('At least 10 words are required.')).toBeInTheDocument();
  });

  it('exposes bold, italic, underline, and undo/redo toolbar buttons', () => {
    render(<RecommendationContentEditor id="why-1" value="<p>Text</p>" onChange={vi.fn()} error={null} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Underline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Insert image' })).not.toBeInTheDocument();
  });
});
