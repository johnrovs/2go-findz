import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

function pad(n) {
  return String(n).padStart(2, '0');
}

// react-datepicker works with real Date objects, but the rest of this form
// (validate(), buildPayload() in BuyingGuideForm.jsx) treats scheduledPublishAt
// as a naive local-time string ("YYYY-MM-DDTHH:mm", no timezone) matching the
// backend's LocalDateTime -- these two functions convert at the boundary using
// local getters/setters only, never toISOString(), so the value never shifts
// to UTC (the same naive-local-time convention ProductForm's schedule switch
// already established).
function parseNaiveLocalDateTime(value) {
  if (!value) return null;
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hours, minutes] = (timePart ?? '00:00').split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function formatNaiveLocalDateTime(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function PublishDatePicker({ id, value, onChange, error }) {
  return (
    <div>
      <DatePicker
        id={id}
        selected={parseNaiveLocalDateTime(value)}
        onChange={(date) => onChange(formatNaiveLocalDateTime(date))}
        showTimeSelect
        timeIntervals={15}
        dateFormat="MM/dd/yyyy h:mm aa"
        placeholderText="Select date and time"
        className="w-full rounded-btn border border-border px-3 py-2 text-slate-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export default PublishDatePicker;
