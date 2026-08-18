import { useCallback, useEffect, useState } from 'react';
import EntityPicker from './EntityPicker.jsx';
import { getComparisons } from '../services/adminComparisonService.js';

function getComparisonLabel(comparison) {
  return comparison.title;
}

function ComparisonPicker({ selectedComparisons, onChange, excludeId }) {
  const [allComparisons, setAllComparisons] = useState([]);

  useEffect(() => {
    getComparisons()
      .then(setAllComparisons)
      .catch(() => setAllComparisons([]));
  }, []);

  const search = useCallback(
    (query) => {
      const lower = query.toLowerCase();
      return Promise.resolve(
        allComparisons.filter(
          (comparison) => comparison.id !== excludeId && comparison.title.toLowerCase().includes(lower)
        )
      );
    },
    [allComparisons, excludeId]
  );

  return (
    <EntityPicker
      label="Related Comparisons"
      inputId="comparisonSearch"
      searchPlaceholder="Search comparisons to add..."
      selectedItems={selectedComparisons}
      onChange={onChange}
      search={search}
      getItemLabel={getComparisonLabel}
    />
  );
}

export default ComparisonPicker;
