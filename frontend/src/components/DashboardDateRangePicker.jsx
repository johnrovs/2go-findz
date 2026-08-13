import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function DashboardDateRangePicker({ id = 'dashboard-date-range', startDate, endDate, onChange }) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Date range
      </label>
      <DatePicker
        id={id}
        selectsRange
        startDate={startDate}
        endDate={endDate}
        onChange={([nextStart, nextEnd]) => {
          if (!nextStart || !nextEnd) return;
          onChange(nextStart, nextEnd);
        }}
        dateFormat="MMM d, yyyy"
        className="w-[230px] rounded-btn border border-border px-3 py-2 text-small text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  );
}

export default DashboardDateRangePicker;
