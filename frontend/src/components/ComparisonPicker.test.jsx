import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import ComparisonPicker from './ComparisonPicker.jsx';
import * as adminComparisonService from '../services/adminComparisonService.js';

const comparisonA = { id: 1, title: 'Best Blenders' };
const comparisonB = { id: 2, title: 'Best Standing Desks' };

describe('ComparisonPicker', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads comparisons and adds a matching one to the selection', async () => {
    vi.spyOn(adminComparisonService, 'getComparisons').mockResolvedValue([comparisonA, comparisonB]);
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<ComparisonPicker selectedComparisons={[]} onChange={onChange} excludeId={null} />);

    await waitFor(() => expect(adminComparisonService.getComparisons).toHaveBeenCalled());
    await user.type(screen.getByLabelText('Related Comparisons'), 'blenders');
    await user.click(await screen.findByRole('button', { name: 'Best Blenders' }));

    expect(onChange).toHaveBeenCalledWith([comparisonA]);
  });

  it('excludes the comparison currently being edited from search results', async () => {
    vi.spyOn(adminComparisonService, 'getComparisons').mockResolvedValue([comparisonA, comparisonB]);
    const user = userEvent.setup();
    render(<ComparisonPicker selectedComparisons={[]} onChange={vi.fn()} excludeId={1} />);

    await waitFor(() => expect(adminComparisonService.getComparisons).toHaveBeenCalled());
    await user.type(screen.getByLabelText('Related Comparisons'), 'best');

    expect(screen.queryByRole('button', { name: 'Best Blenders' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Best Standing Desks' })).toBeInTheDocument();
  });
});
