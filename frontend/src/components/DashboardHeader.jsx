import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { ChevronDown, Download, Menu } from "lucide-react";
import { useAuth } from "../hooks/useAuth.js";
import { useToast } from "../hooks/useToast.js";
import { exportDashboardReport } from "../services/dashboardService.js";
import DashboardDateRangePicker from "./DashboardDateRangePicker.jsx";
import Button from "./Button.jsx";

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function DashboardHeader({ startDate, endDate, onRangeChange }) {
  const { onMenuClick } = useOutletContext() ?? {};
  const { user } = useAuth();
  const { showToast } = useToast();
  const fullName = user?.fullName ?? "Administrator";
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    const from = formatDate(startDate);
    const to = formatDate(endDate);
    setIsExporting(true);
    try {
      const blob = await exportDashboardReport({ from, to });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `dashboard-report_${from}_to_${to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Failed to export report. Please try again.", "error");
    } finally {
      setIsExporting(false);
    }
  }

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
          <h1 className="text-card-title text-heading">
            Welcome back, {fullName}! 👋
          </h1>
          <p className="mt-1 text-small text-muted">
            Here&apos;s what&apos;s happening with 2Go Findz today.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* <DashboardDateRangePicker startDate={startDate} endDate={endDate} onChange={onRangeChange} />
        <Button type="button" variant="secondary" size="sm" disabled={isExporting} onClick={handleExport} className="gap-2">
          <Download size={16} />
          {isExporting ? 'Exporting…' : 'Export Report'}
        </Button> */}
        {/* TODO(future development): stubbed trigger only — no dropdown (profile/logout) is wired up yet. */}
        {/* <button
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
        </button> */}
      </div>
    </div>
  );
}

export default DashboardHeader;
