
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiCreditCard,
  FiRefreshCw,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import "./StudentDashboard.css";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return "Date not announced";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not announced";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const StudentDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await studentPortalService.getDashboard();
      setDashboard(response?.data || null);
    } catch (err) {
      setDashboard(null);
      setError(
        err?.response?.data?.message ||
          "Unable to load your dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const data = dashboard || {};
  const student = data.student || {};
  const summary = data.summary || {};
  const attendance = data.attendance || {};
  const admissions = Array.isArray(data.admissions) ? data.admissions : [];
  const exams = Array.isArray(data.upcomingExams) ? data.upcomingExams : [];

  const attendanceTotal = useMemo(
    () =>
      ["Present", "Absent", "Leave", "Late"].reduce(
        (total, key) => total + Number(attendance[key] || 0),
        0
      ),
    [attendance]
  );

  const attendancePercentage =
    attendanceTotal > 0
      ? Math.round(
          (Number(attendance.Present || 0) / attendanceTotal) * 100
        )
      : null;

  const activeAdmissions = admissions.filter((item) =>
    String(item.status || "").toLowerCase().includes("active")
  ).length;

  const studentName =
    student.name ||
    [student.firstName, student.surname].filter(Boolean).join(" ") ||
    "Student";

  const goToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (loading) {
    return (
      <div className="student-dashboard-state">
        <FiRefreshCw className="student-dashboard-spinner" />
        <h2>Loading your dashboard</h2>
        <p>Fetching the latest information from your student record.</p>
      </div>
    );
  }

  if (error || !dashboard) {
    const notLinked = error.toLowerCase().includes("not linked");

    return (
      <div className="student-dashboard-state">
        <FiAlertCircle className="student-dashboard-state-icon" />
        <h2>{notLinked ? "Student account setup required" : "Dashboard unavailable"}</h2>
        <p>{error || "No dashboard information was returned."}</p>
        {notLinked && (
          <p>Please contact your institute administrator to link your login to the correct student record.</p>
        )}
        <button
          type="button"
          className="student-dashboard-button student-dashboard-button--primary"
          onClick={loadDashboard}
        >
          <FiRefreshCw /> Try again
        </button>
      </div>
    );
  }

  return (
    <div className="student-dashboard">
      <section className="student-dashboard__welcome">
        <div>
          <span className="student-dashboard__eyebrow">STUDENT PORTAL</span>
          <h1>Good morning, {student.firstName || studentName}!</h1>
          <p>Here’s a quick overview of your learning and upcoming activities.</p>
        </div>

        <div className="student-dashboard__date">
          <FiCalendar />
          <span>
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      </section>

      <section className="student-dashboard__stats" aria-label="Student summary">
        <article className="student-dashboard__stat student-dashboard__stat--blue">
          <span className="student-dashboard__stat-icon"><FiBookOpen /></span>
          <div>
            <small>Active Courses</small>
            <strong>{Number(summary.activeAdmissions ?? activeAdmissions)}</strong>
            <span>{Number(summary.totalAdmissions ?? admissions.length)} total admission(s)</span>
          </div>
        </article>

        <article className="student-dashboard__stat student-dashboard__stat--green">
          <span className="student-dashboard__stat-icon"><FiActivity /></span>
          <div>
            <small>Attendance</small>
            <strong>{attendancePercentage === null ? "—" : `${attendancePercentage}%`}</strong>
            <span>{attendanceTotal ? `${attendance.Present || 0} present records` : "No attendance yet"}</span>
          </div>
        </article>

        <article className="student-dashboard__stat student-dashboard__stat--orange">
          <span className="student-dashboard__stat-icon"><FiCreditCard /></span>
          <div>
            <small>Fee Pending</small>
            <strong>{formatCurrency(summary.outstandingFees)}</strong>
            <span>Outstanding balance</span>
          </div>
        </article>

        <article className="student-dashboard__stat student-dashboard__stat--purple">
          <span className="student-dashboard__stat-icon"><FiCalendar /></span>
          <div>
            <small>Upcoming Exams</small>
            <strong>{exams.length}</strong>
            <span>Active upcoming hall tickets</span>
          </div>
        </article>
      </section>

      <section className="student-dashboard__main-grid">
        <article className="student-dashboard__panel" id="student-dashboard-courses">
          <div className="student-dashboard__panel-heading">
            <div>
              <h2>Current Courses</h2>
              <p>Your course and batch information from admissions.</p>
            </div>
            <FiBookOpen />
          </div>

          {admissions.length === 0 ? (
            <div className="student-dashboard__empty">
              <FiBookOpen />
              <strong>No course admission yet</strong>
              <p>Your course information will appear here after your institute records an admission.</p>
            </div>
          ) : (
            <div className="student-dashboard__course-list">
              {admissions.slice(0, 3).map((item) => {
                const total = Number(item.finalAmount || 0);
                const paid = Number(item.paidAmount || 0);
                const feeProgress =
                  total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                return (
                  <div className="student-dashboard__course" key={item.id}>
                    <div className="student-dashboard__course-icon"><FiBookOpen /></div>
                    <div className="student-dashboard__course-content">
                      <div className="student-dashboard__course-title">
                        <div>
                          <strong>{item.course || "Course"}</strong>
                          <small>{item.batch || "Batch not assigned"}</small>
                        </div>
                        <span className={`student-dashboard__status ${
                          String(item.status || "").toLowerCase().includes("active")
                            ? "student-dashboard__status--active"
                            : ""
                        }`}>
                          {item.status || "Status unavailable"}
                        </span>
                      </div>

                      <div
                        className="student-dashboard__progress"
                        role="progressbar"
                        aria-label={`Fee payment progress for ${item.course || "course"}`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={feeProgress}
                      >
                        <span style={{ width: `${feeProgress}%` }} />
                      </div>

                      <div className="student-dashboard__course-meta">
                        <span>{feeProgress}% fees paid</span>
                        <strong>{formatCurrency(item.remainingAmount)} due</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
              {admissions.length > 3 && (
                <p className="student-dashboard__hint">
                  Showing 3 of {admissions.length} admissions. Full course management is coming in Phase 3.
                </p>
              )}
            </div>
          )}

          <div className="student-dashboard__panel-footer">
            <button
              type="button"
              className="student-dashboard-button"
              onClick={() => goToSection("student-dashboard-courses")}
              title="Current course overview"
            >
              Course overview <FiArrowRight />
            </button>
          </div>
        </article>

        <article className="student-dashboard__panel" id="student-dashboard-exams">
          <div className="student-dashboard__panel-heading">
            <div>
              <h2>Upcoming Exams</h2>
              <p>Exams with active hall tickets.</p>
            </div>
            <FiCalendar />
          </div>

          {exams.length === 0 ? (
            <div className="student-dashboard__empty">
              <FiCalendar />
              <strong>No upcoming exams</strong>
              <p>Your scheduled exams will appear here when an active hall ticket is available.</p>
            </div>
          ) : (
            <div className="student-dashboard__exam-list">
              {exams.slice(0, 4).map((exam) => (
                <div className="student-dashboard__exam" key={exam.id}>
                  <span className="student-dashboard__exam-date">
                    <FiCalendar /> {formatDate(exam.examDate)}
                  </span>
                  <strong>{exam.course || "Scheduled exam"}</strong>
                  <small>
                    {exam.startTime || "Time TBA"}
                    {exam.endTime ? ` – ${exam.endTime}` : ""}
                  </small>
                  <span className="student-dashboard__exam-ticket">
                    Hall ticket: {exam.hallTicketNo || "Not available"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="student-dashboard__panel-footer">
            <button
              type="button"
              className="student-dashboard-button"
              onClick={() => goToSection("student-dashboard-exams")}
            >
              Exam overview <FiArrowRight />
            </button>
          </div>
        </article>
      </section>

      <section className="student-dashboard__quick-panel">
        <div className="student-dashboard__panel-heading">
          <div>
            <h2>Quick Actions</h2>
            <p>Quickly jump to the information available on this dashboard.</p>
          </div>
        </div>

        <div className="student-dashboard__quick-grid">
          <button type="button" onClick={() => goToSection("student-dashboard-courses")}>
            <FiBookOpen />
            <span><strong>My Courses</strong><small>View current admissions</small></span>
            <FiArrowRight />
          </button>

          <button type="button" onClick={() => goToSection("student-dashboard-attendance")}>
            <FiActivity />
            <span><strong>Attendance</strong><small>See your attendance summary</small></span>
            <FiArrowRight />
          </button>

          <button type="button" onClick={() => goToSection("student-dashboard-fees")}>
            <FiCreditCard />
            <span><strong>Fees Overview</strong><small>Review pending fees</small></span>
            <FiArrowRight />
          </button>

          <button type="button" onClick={() => goToSection("student-dashboard-exams")}>
            <FiCalendar />
            <span><strong>Exam Schedule</strong><small>Check upcoming exams</small></span>
            <FiArrowRight />
          </button>
        </div>
      </section>

      <section className="student-dashboard__bottom-grid">
        <article className="student-dashboard__mini-panel" id="student-dashboard-attendance">
          <div className="student-dashboard__panel-heading">
            <div>
              <h2>Attendance Snapshot</h2>
              <p>Recorded attendance counts.</p>
            </div>
            <FiActivity />
          </div>

          <div className="student-dashboard__attendance-list">
            {[
              ["Present", attendance.Present, "green"],
              ["Absent", attendance.Absent, "red"],
              ["Leave", attendance.Leave, "orange"],
              ["Late", attendance.Late, "purple"],
            ].map(([label, count, color]) => (
              <div className="student-dashboard__attendance-row" key={label}>
                <span className={`student-dashboard__dot student-dashboard__dot--${color}`} />
                <span>{label}</span>
                <strong>{Number(count || 0)}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="student-dashboard__mini-panel" id="student-dashboard-fees">
          <div className="student-dashboard__panel-heading">
            <div>
              <h2>Fee Summary</h2>
              <p>Totals from your admission records.</p>
            </div>
            <FiCreditCard />
          </div>

          <div className="student-dashboard__fee-row">
            <span>Total fees</span><strong>{formatCurrency(summary.totalFees)}</strong>
          </div>
          <div className="student-dashboard__fee-row">
            <span>Total paid</span><strong className="is-positive">{formatCurrency(summary.totalPaid)}</strong>
          </div>
          <div className="student-dashboard__fee-row">
            <span>Outstanding</span><strong className="is-negative">{formatCurrency(summary.outstandingFees)}</strong>
          </div>
        </article>
      </section>

      <p className="student-dashboard__footer-note">
        Your dashboard shows information linked to your student account. Contact your institute administrator if anything looks incorrect.
      </p>
    </div>
  );
};

export default StudentDashboard;
