import { useEffect, useState } from 'react';
import { getSummary, getAnalytics } from '../services/dashboardService.js';

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function computeRange(preset, customFrom, customTo) {
  const today = new Date();
  if (preset === 'custom') {
    return { from: customFrom || undefined, to: customTo || undefined };
  }
  if (preset === 'today') {
    const todayStr = formatDate(today);
    return { from: todayStr, to: todayStr };
  }
  if (preset === 'last7') {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: formatDate(from), to: formatDate(today) };
  }
  if (preset === 'last30') {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: formatDate(from), to: formatDate(today) };
  }
  if (preset === 'currentMonth') {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: formatDate(from), to: formatDate(today) };
  }
  return { from: undefined, to: undefined };
}

export function useDashboardData() {
  const [preset, setPreset] = useState('last30');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const { from, to } = computeRange(preset, customFrom, customTo);

  useEffect(() => {
    let isCancelled = false;
    // Resetting loading/error state at the start of each fetch is the standard
    // reset-before-async-work pattern; it can't cascade since neither value
    // is a dependency of this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    Promise.all([getSummary({ from, to }), getAnalytics({ from, to })])
      .then(([summaryData, analyticsData]) => {
        if (isCancelled) return;
        setSummary(summaryData);
        setAnalytics(analyticsData);
      })
      .catch((err) => {
        if (isCancelled) return;
        setError(err.message ?? 'Failed to load dashboard data.');
      })
      .finally(() => {
        if (isCancelled) return;
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [from, to, refreshIndex]);

  return {
    summary,
    analytics,
    isLoading,
    error,
    preset,
    customFrom,
    customTo,
    setPreset,
    setCustomFrom,
    setCustomTo,
    reload: () => setRefreshIndex((n) => n + 1),
  };
}
