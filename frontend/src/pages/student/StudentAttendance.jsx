
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiRefreshCw,
  FiCheckCircle,
  FiXCircle,
  FiCoffee,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import "./StudentAttendance.css";

const STATUS_META = {
  Present: { label: "Present", className: "present" },
  Absent: { label: "Absent", className: "absent" },
  Leave: { label: "Leave", className: "leave" },
  Late: { label: "Late", className: "late" },
};

const EMPTY_SUMMARY = {
  totalRecords: 0,
  attendedRecords: 0,
  attendancePercentage: 0,
  Present: 0,
  Absent: 0,
  Leave: 0,
  Late: 0,
};

const getMonthString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatDate = (value) => {
  if (!value) return "Date not available";

  const datePart = String(value).slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) return "Date not available";

  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMonthTitle = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
};

function SummaryCard({ icon: Icon, title, value, caption, tone }) {
  return (
    <article className={`sa-summary sa-summary--${tone}`}>
      <div className="sa-summary__icon">
        <Icon aria-hidden="true" />
      </div>
      <div className="sa-summary__text">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </article>
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || {
    label: status || "Unknown",
    className: "unknown",
  };

  return (
    <span className={`sa-status sa-status--${meta.className}`}>
      {meta.label}
    </span>
  );
}

export default function StudentAttendance() {
  const [month, setMonth] = useState(() => getMonthString(new Date()));
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [courseStats, setCourseStats] = useState([]);
  const [calendarDays, setCalendarDays] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const loadAttendance = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await studentPortalService.getMyAttendance(month);

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to load attendance."
        );
      }

      const data = response.data || {};

      setSummary({ ...EMPTY_SUMMARY, ...(data.summary || {}) });
      setCourseStats(
        Array.isArray(data.courseStats) ? data.courseStats : []
      );
      setCalendarDays(
        Array.isArray(data.calendar?.days) ? data.calendar.days : []
      );
      setRecentRecords(
        Array.isArray(data.recentRecords) ? data.recentRecords : []
      );
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load attendance. Please try again."
      );
      setSummary(EMPTY_SUMMARY);
      setCourseStats([]);
      setCalendarDays([]);
      setRecentRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [month]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  useEffect(() => {
    setSelectedDate("");
  }, [month]);

  const calendarCells = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const firstDay = new Date(year, monthNumber - 1, 1);
    const daysInMonth = new Date(year, monthNumber, 0).getDate();

    // Monday-first calendar.
    const leadingBlanks = (firstDay.getDay() + 6) % 7;
    const cells = [];

    for (let i = 0; i < leadingBlanks; i += 1) {
      cells.push({ key: `blank-${i}`, blank: true });
    }

    const recordsByDate = new Map();

    calendarDays.forEach((record) => {
      const dateKey = String(record.date || "").slice(0, 10);
      if (dateKey) recordsByDate.set(dateKey, record);
    });

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = `${month}-${String(day).padStart(2, "0")}`;

      cells.push({
        key: dateKey,
        day,
        dateKey,
        record: recordsByDate.get(dateKey) || null,
      });
    }

    return cells;
  }, [month, calendarDays]);

  const displayedRecords = useMemo(() => {
    if (!selectedDate) return recentRecords;

    const matchingRecord = calendarDays.find(
      (record) => String(record.date || "").slice(0, 10) === selectedDate
    );

    return matchingRecord ? [matchingRecord] : [];
  }, [selectedDate, recentRecords, calendarDays]);

  const moveMonth = (amount) => {
    const [year, monthNumber] = month.split("-").map(Number);
    const nextDate = new Date(year, monthNumber - 1 + amount, 1);
    setMonth(getMonthString(nextDate));
  };

  const goToCurrentMonth = () => {
    setMonth(getMonthString(new Date()));
  };

  return (
    <div className="student-attendance">
      <header className="sa-page-header">
        <div>
          <span className="sa-eyebrow">STUDENT PORTAL</span>
          <h1>My Attendance</h1>
          <p>
            Review your attendance record, monthly calendar, and
            course-wise attendance.
          </p>
        </div>

        <button
          type="button"
          className="sa-refresh"
          onClick={() => loadAttendance(true)}
          disabled={loading || refreshing}
        >
          <FiRefreshCw className={refreshing ? "sa-spinning" : ""} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {error && (
        <div className="sa-error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          <button type="button" onClick={() => loadAttendance(true)}>
            Try again
          </button>
        </div>
      )}

      <section className="sa-summary-grid" aria-label="Attendance summary">
        <SummaryCard
          icon={FiActivity}
          title="Overall Attendance"
          value={`${summary.attendancePercentage}%`}
          caption={`${summary.totalRecords} recorded sessions`}
          tone="blue"
        />
        <SummaryCard
          icon={FiCheckCircle}
          title="Present"
          value={summary.Present}
          caption="Present records"
          tone="green"
        />
        <SummaryCard
          icon={FiXCircle}
          title="Absent"
          value={summary.Absent}
          caption="Absent records"
          tone="red"
        />
        <SummaryCard
          icon={FiCoffee}
          title="Leave"
          value={summary.Leave}
          caption="Leave records"
          tone="orange"
        />
        <SummaryCard
          icon={FiClock}
          title="Late"
          value={summary.Late}
          caption="Late arrivals"
          tone="purple"
        />
      </section>

      <section className="sa-main-grid">
        <article className="sa-panel sa-calendar-panel">
          <div className="sa-panel-heading">
            <div>
              <h2>Attendance Calendar</h2>
              <p>Select a day to view its recorded attendance.</p>
            </div>

            <div className="sa-month-controls">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => moveMonth(-1)}
              >
                <FiChevronLeft />
              </button>
              <strong>{formatMonthTitle(month)}</strong>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => moveMonth(1)}
              >
                <FiChevronRight />
              </button>
            </div>
          </div>

          <div className="sa-calendar">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
              (day) => (
                <div className="sa-calendar__weekday" key={day}>
                  {day}
                </div>
              )
            )}

            {calendarCells.map((cell) => {
              if (cell.blank) {
                return (
                  <div
                    className="sa-calendar__empty"
                    key={cell.key}
                    aria-hidden="true"
                  />
                );
              }

              const statusClass = cell.record
                ? STATUS_META[cell.record.status]?.className || "unknown"
                : "";

              return (
                <button
                  type="button"
                  key={cell.key}
                  className={[
                    "sa-calendar__day",
                    statusClass ? `sa-calendar__day--${statusClass}` : "",
                    selectedDate === cell.dateKey
                      ? "sa-calendar__day--selected"
                      : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() =>
                    setSelectedDate((previous) =>
                      previous === cell.dateKey ? "" : cell.dateKey
                    )
                  }
                  title={
                    cell.record
                      ? `${cell.dateKey}: ${cell.record.status}`
                      : `${cell.dateKey}: No attendance recorded`
                  }
                  aria-label={
                    cell.record
                      ? `${cell.day}, ${cell.record.status}`
                      : `${cell.day}, no attendance recorded`
                  }
                  aria-pressed={selectedDate === cell.dateKey}
                >
                  {cell.day}
                  {cell.record && (
                    <span className="sa-calendar__dot" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="sa-calendar-legend">
            {Object.entries(STATUS_META).map(([status, meta]) => (
              <span key={status}>
                <i className={`sa-legend-dot sa-legend-dot--${meta.className}`} />
                {meta.label}
              </span>
            ))}
          </div>

          <div className="sa-calendar-footer">
            <span>
              {selectedDate
                ? `Selected: ${formatDate(selectedDate)}`
                : `Showing ${formatMonthTitle(month)}`}
            </span>
            {selectedDate && (
              <button type="button" onClick={() => setSelectedDate("")}>
                Clear selection
              </button>
            )}
            <button type="button" onClick={goToCurrentMonth}>
              Current month
            </button>
          </div>
        </article>

        <article className="sa-panel sa-course-panel">
          <div className="sa-panel-heading">
            <div>
              <h2>Course-wise Attendance</h2>
              <p>Attendance rate across your recorded sessions.</p>
            </div>
            <FiActivity className="sa-heading-icon" />
          </div>

          {loading ? (
            <div className="sa-inline-state">Loading course attendance...</div>
          ) : courseStats.length === 0 ? (
            <div className="sa-empty">
              <FiCalendar />
              <strong>No course attendance yet</strong>
              <span>Your course-wise records will appear here.</span>
            </div>
          ) : (
            <div className="sa-course-list">
              {courseStats.map((course) => (
                <div className="sa-course-row" key={course.courseId}>
                  <div className="sa-course-row__top">
                    <strong title={course.course}>{course.course}</strong>
                    <span>{course.percentage}%</span>
                  </div>
                  <div
                    className="sa-progress"
                    role="progressbar"
                    aria-label={`${course.course} attendance`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={course.percentage}
                  >
                    <span style={{ width: `${course.percentage}%` }} />
                  </div>
                  <small>
                    {course.attended} attended of {course.total} recorded
                    sessions
                  </small>
                </div>
              ))}
            </div>
          )}

          <div className="sa-course-note">
            Attendance rate counts both Present and Late as attended.
            Leave is shown separately.
          </div>
        </article>
      </section>

      <section className="sa-panel sa-recent-panel">
        <div className="sa-panel-heading">
          <div>
            <h2>{selectedDate ? "Selected Day" : "Recent Records"}</h2>
            <p>
              {selectedDate
                ? `Attendance recorded on ${formatDate(selectedDate)}.`
                : "Your latest attendance entries."}
            </p>
          </div>
          <FiCalendar className="sa-heading-icon" />
        </div>

        {loading ? (
          <div className="sa-inline-state">Loading attendance records...</div>
        ) : displayedRecords.length === 0 ? (
          <div className="sa-empty sa-empty--compact">
            <FiCalendar />
            <strong>
              {selectedDate
                ? "No attendance recorded for this day"
                : "No attendance records found"}
            </strong>
            <span>
              {selectedDate
                ? "Choose another day on the calendar."
                : "Your attendance will appear here after it is recorded by your institute."}
            </span>
          </div>
        ) : (
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Course</th>
                  <th>Batch</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                {displayedRecords.map((record) => (
                  <tr key={record.id || `${record.date}-${record.course}`}>
                    <td>{formatDate(record.date)}</td>
                    <td>{record.course || "—"}</td>
                    <td>{record.batch || "—"}</td>
                    <td><StatusBadge status={record.status} /></td>
                    <td>{record.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!selectedDate && recentRecords.length > 0 && (
          <div className="sa-recent-footer">
            Showing the latest {recentRecords.length} records.
          </div>
        )}
      </section>

      <p className="sa-privacy-note">
        Your attendance is linked to your student account. If a record appears
        incorrect, contact your institute administrator.
      </p>
    </div>
  );
}
