import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import IntroductionEditor from './IntroductionEditor.jsx';

describe('IntroductionEditor', () => {
  it('renders existing content', () => {
    render(<IntroductionEditor value="<p>Hello world</p>" onChange={vi.fn()} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows a word count derived from the content', () => {
    render(<IntroductionEditor value="<p>Hello world</p>" onChange={vi.fn()} />);
    expect(screen.getByText('Words: 2')).toBeInTheDocument();
  });

  it('shows 0 words for empty content', () => {
    render(<IntroductionEditor value="" onChange={vi.fn()} />);
    expect(screen.getByText('Words: 0')).toBeInTheDocument();
  });

  it('shows a validation error when provided', () => {
    render(<IntroductionEditor value="" onChange={vi.fn()} error="Introduction is required." />);
    expect(screen.getByText('Introduction is required.')).toBeInTheDocument();
  });

  it('renders toolbar buttons with accessible labels', () => {
    render(<IntroductionEditor value="" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Underline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bullet list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Numbered list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Align left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert link' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert image' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert video' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert embed' })).toBeInTheDocument();
  });
});
