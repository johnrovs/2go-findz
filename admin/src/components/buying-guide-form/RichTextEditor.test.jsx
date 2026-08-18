import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RichTextEditor, { wordCount } from './RichTextEditor.jsx';

describe('wordCount', () => {
  it('counts words in plain HTML', () => {
    expect(wordCount('<p>Hello world</p>')).toBe(2);
  });

  it('returns 0 for empty content', () => {
    expect(wordCount('')).toBe(0);
  });
});

describe('RichTextEditor', () => {
  it('renders existing content', () => {
    render(<RichTextEditor label="Section Content" value="<p>Hello world</p>" onChange={vi.fn()} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows a word count derived from the content', () => {
    render(<RichTextEditor label="Section Content" value="<p>Hello world</p>" onChange={vi.fn()} />);
    expect(screen.getByText('Words: 2')).toBeInTheDocument();
  });

  it('shows 0 words for empty content', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} />);
    expect(screen.getByText('Words: 0')).toBeInTheDocument();
  });

  it('shows a validation error when provided', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} error="Content is required." />);
    expect(screen.getByText('Content is required.')).toBeInTheDocument();
  });

  it('renders the label as plain text when no id is provided', () => {
    const { container } = render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} />);
    expect(screen.queryByText('Section Content')?.tagName).toBe('SPAN');
    expect(container.querySelector('label')).not.toBeInTheDocument();
  });

  it('renders an associated label when an id is provided', () => {
    render(<RichTextEditor id="why-1" label="Why We Recommend It" value="" onChange={vi.fn()} />);
    expect(screen.getByText('Why We Recommend It').tagName).toBe('LABEL');
  });

  it('always renders the base formatting toolbar', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Underline' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bullet list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Numbered list' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Align left' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert link' })).toBeInTheDocument();
  });

  it('omits Undo/Redo, Insert image, and Insert video/embed by default', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Redo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Insert image' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Insert video' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Insert embed' })).not.toBeInTheDocument();
  });

  it('renders Undo/Redo when withUndoRedo is set', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} withUndoRedo />);
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
  });

  it('renders Insert image when withImage is set', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} withImage />);
    expect(screen.getByRole('button', { name: 'Insert image' })).toBeInTheDocument();
  });

  it('renders Insert video and Insert embed when withVideoEmbedPlaceholders is set', () => {
    render(<RichTextEditor label="Section Content" value="" onChange={vi.fn()} withVideoEmbedPlaceholders />);
    expect(screen.getByRole('button', { name: 'Insert video' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert embed' })).toBeInTheDocument();
  });
});
