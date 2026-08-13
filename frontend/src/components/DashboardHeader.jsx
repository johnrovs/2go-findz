import { useOutletContext } from 'react-router-dom';
import { ChevronDown, Download, Menu } from 'lucide-react';
import { useAuth } from '../hooks/useAuth.js';
import DashboardDateRangePicker from './DashboardDateRangePicker.jsx';
import Button from './Button.jsx';

function DashboardHeader({ startDate, endDate, onRangeChange }) {
  const { onMenuClick } = useOutletContext() ?? {};
  const { user } = useAuth();
  const fullName = user?.fullName ?? 'Administrator';

  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 md:hidden"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-card-title text-heading">Welcome back, {fullName}! 👋</h1>
          <p className="mt-1 text-small text-muted">Here&apos;s what&apos;s happening with 2Go Findz today.</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DashboardDateRangePicker startDate={startDate} endDate={endDate} onChange={onRangeChange} />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled
          title="Export Report is coming soon"
          className="gap-2"
        >
          <Download size={16} />
          Export Report
        </Button>
        <button
          type="button"
          className="flex items-center gap-2 rounded-btn border border-border px-2 py-1.5 hover:bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-haspopup="menu"
          aria-expanded="false"
          aria-label={`${fullName} account menu`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-dashboard-purpleLight text-small font-semibold text-dashboard-purple">
            {fullName.charAt(0)}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block text-small font-semibold text-heading">{fullName}</span>
            <span className="block text-[11px] text-muted">{user?.role ?? 'Administrator'}</span>
          </span>
          <ChevronDown size={16} className="text-muted" />
        </button>
      </div>
    </div>
  );
}

export default DashboardHeader;
