import { useEffect, useState } from 'react';
import { getSummary, getAnalytics } from '../services/dashboardService.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function formatComparisonDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function defaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return date;
}

function computePreviousRange(startDate, endDate) {
  const rangeMs = endDate.getTime() - startDate.getTime();
  const previousEnd = new Date(startDate.getTime() - MS_PER_DAY);
  const previousStart = new Date(previousEnd.getTime() - rangeMs);
  return { previousStart, previousEnd };
}

export function useDashboardData() {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(() => new Date());
  const [summary, setSummary] = useState(null);
  const [previousSummary, setPreviousSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const from = formatDate(startDate);
  const to = formatDate(endDate);
  const { previousStart, previousEnd } = computePreviousRange(startDate, endDate);
  const previousFrom = formatDate(previousStart);
  const previousTo = formatDate(previousEnd);

  const comparisonLabel = `vs ${formatComparisonDate(previousStart)} – ${formatComparisonDate(previousEnd)}`;

  useEffect(() => {
    let isCancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setError(null);

    Promise.all([
      getSummary({ from, to }),
      getAnalytics({ from, to }),
      getSummary({ from: previousFrom, to: previousTo }),
    ])
      .then(([summaryData, analyticsData, previousSummaryData]) => {
        if (isCancelled) return;
        setSummary(summaryData);
        setAnalytics(analyticsData);
        setPreviousSummary(previousSummaryData);
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
  }, [from, to, previousFrom, previousTo, refreshIndex]);

  function setRange(nextStart, nextEnd) {
    if (!nextStart || !nextEnd) return;
    setStartDate(nextStart);
    setEndDate(nextEnd);
  }

  return {
    summary,
    previousSummary,
    analytics,
    isLoading,
    error,
    startDate,
    endDate,
    comparisonLabel,
    setRange,
    reload: () => setRefreshIndex((n) => n + 1),
  };
}
