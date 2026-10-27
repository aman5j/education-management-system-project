import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiLogOut,
  FiUser,
  FiAlertCircle,
  FiRefreshCw,
} from "react-icons/fi";

import { useAuth } from "../../context/AuthContext";
import studentPortalService from "../../services/studentPortalService";

import "./StudentDashboard.css";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const StudentDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await studentPortalService.getDashboard();
      setDashboard(response.data);
    } catch (err) {
      setDashboard(null);
      setError(
        err.response?.data?.message ||
          "Unable to load your student dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <main className="student-portal">
        <div className="student-portal__state">
          <FiRefreshCw className="student-portal__spinner" />
          <h2>Loading your dashboard</h2>
          <p>Please wait while we securely load your student information.</p>
        </div>
      </main>
    );
  }

  if (error || !dashboard) {
    const accountNotLinked =
      error.toLowerCase().includes("not linked");

    return (
      <main className="student-portal">
        <section className="student-portal__state student-portal__state--error">
          <FiAlertCircle className="student-portal__state-icon" />
          <h1>
            {accountNotLinked
              ? "Student account setup required"
              : "Dashboard unavailable"}
          </h1>

          <p>{error || "Your dashboard could not be loaded."}</p>

          {accountNotLinked && (
            <p className="student-portal__help">
              Please contact your institute administrator and ask them to
              link your login account to your student record.
            </p>
          )}

          <div className="student-portal__state-actions">
            <button
              type="button"
              className="student-portal__button student-portal__button--primary"
              onClick={loadDashboard}
            >
              Try again
            </button>

            <button
              type="button"
              className="student-portal__button student-portal__button--secondary"
              onClick={handleLogout}
            >
              Sign out
            </button>
          </div>
        </section>
      </main>
    );
  }

  const {
    student,
    summary,
    attendance,
    admissions,
    upcomingExams,
    recentResults,
  } = dashboard;

  const attendanceTotal = Object.values(attendance || {}).reduce(
    (total, count) => total + Number(count || 0),
    0
  );

  return (
    <main className="student-portal">
      <header className="student-portal__header">
        <div className="student-portal__brand">
          <span className="student-portal__brand-icon">
            <FiBookOpen />
          </span>
          <div>
            <strong>Student Portal</strong>
            <span>Education Management System</span>
          </div>
        </div>

        <button
          type="button"
          className="student-portal__logout"
          onClick={handleLogout}
        >
          <FiLogOut />
          <span>Sign out</span>
        </button>
      </header>

      <div className="student-portal__content">
        <section className="student-portal__welcome">
          <div>
            <p className="student-portal__eyebrow">STUDENT DASHBOARD</p>
            <h1>Welcome back, {student.firstName || student.name}</h1>
            <p>
              View your admissions, fees, attendance, upcoming exams and
              published results in one place.
            </p>
          </div>

          <div className="student-portal__identity">
            <div className="student-portal__avatar">
              {student.name?.trim()?.charAt(0)?.toUpperCase() || <FiUser />}
            </div>
            <div>
              <strong>{student.name}</strong>
              <span>Roll No: {student.rollNo || "Not assigned"}</span>
              <span className="student-portal__status">
                {student.status || "Status unavailable"}
              </span>
            </div>
          </div>
        </section>

        <section className="student-portal__stats" aria-label="Student summary">
          <article className="student-portal__stat">
            <span className="student-portal__stat-icon student-portal__stat-icon--blue">
              <FiBookOpen />
            </span>
            <div>
              <span>Active Admissions</span>
              <strong>{summary.activeAdmissions}</strong>
              <small>{summary.totalAdmissions} total admission(s)</small>
            </div>
          </article>

          <article className="student-portal__stat">
            <span className="student-portal__stat-icon student-portal__stat-icon--green">
              <FiCreditCard />
            </span>
            <div>
              <span>Total Fees Paid</span>
              <strong>{formatCurrency(summary.totalPaid)}</strong>
              <small>Across your admissions</small>
            </div>
          </article>

          <article className="student-portal__stat">
            <span className="student-portal__stat-icon student-portal__stat-icon--orange">
              <FiClock />
            </span>
            <div>
              <span>Outstanding Fees</span>
              <strong>{formatCurrency(summary.outstandingFees)}</strong>
              <small>Remaining admission balance</small>
            </div>
          </article>

          <article className="student-portal__stat">
            <span className="student-portal__stat-icon student-portal__stat-icon--purple">
              <FiCheckCircle />
            </span>
            <div>
              <span>Attendance Records</span>
              <strong>{attendanceTotal}</strong>
              <small>
                {attendance.Present || 0} present · {attendance.Absent || 0} absent
              </small>
            </div>
          </article>
        </section>

        <section className="student-portal__panel">
          <div className="student-portal__panel-heading">
            <div>
              <h2>My Admissions</h2>
              <p>Your course, batch and admission fee details.</p>
            </div>
            <FiBookOpen />
          </div>

          {admissions.length === 0 ? (
            <div className="student-portal__empty">
              No admission records are available for your account.
            </div>
          ) : (
            <div className="student-portal__table-wrap">
              <table className="student-portal__table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Batch</th>
                    <th>Admission Date</th>
                    <th>Total Fees</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((admission) => (
                    <tr key={admission.id}>
                      <td>
                        <strong>{admission.course}</strong>
                        {admission.courseType && (
                          <small>{admission.courseType}</small>
                        )}
                      </td>
                      <td>{admission.batch}</td>
                      <td>{formatDate(admission.admissionDate)}</td>
                      <td>{formatCurrency(admission.finalAmount)}</td>
                      <td>{formatCurrency(admission.paidAmount)}</td>
                      <td>{formatCurrency(admission.remainingAmount)}</td>
                      <td>
                        <span
                          className={`student-portal__badge ${
                            admission.status === "Active"
                              ? "student-portal__badge--active"
                              : "student-portal__badge--neutral"
                          }`}
                        >
                          {admission.status || "Unknown"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="student-portal__two-column">
          <section className="student-portal__panel">
            <div className="student-portal__panel-heading">
              <div>
                <h2>Upcoming Exams</h2>
                <p>Your active hall tickets for upcoming exams.</p>
              </div>
              <FiCalendar />
            </div>

            {upcomingExams.length === 0 ? (
              <div className="student-portal__empty">
                No upcoming exam or active hall ticket is available.
              </div>
            ) : (
              <div className="student-portal__list">
                {upcomingExams.map((exam) => (
                  <article className="student-portal__list-item" key={exam.id}>
                    <span className="student-portal__list-icon">
                      <FiCalendar />
                    </span>
                    <div className="student-portal__list-main">
                      <strong>{exam.course}</strong>
                      <span>
                        {formatDate(exam.examDate)} · {exam.startTime}–{exam.endTime}
                      </span>
                      <small>
                        Reporting: {exam.reportingTime || "Not specified"}
                      </small>
                      <small>Hall Ticket: {exam.hallTicketNo}</small>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="student-portal__panel">
            <div className="student-portal__panel-heading">
              <div>
                <h2>Published Results</h2>
                <p>Results released by your institute.</p>
              </div>
              <FiFileText />
            </div>

            {recentResults.length === 0 ? (
              <div className="student-portal__empty">
                No published results are available yet.
              </div>
            ) : (
              <div className="student-portal__list">
                {recentResults.map((result) => (
                  <article className="student-portal__list-item" key={result.id}>
                    <span className="student-portal__list-icon">
                      <FiFileText />
                    </span>
                    <div className="student-portal__list-main">
                      <strong>{result.course}</strong>
                      <span>
                        {/* {formatCurrency(0).replace("₹", "") && ""} */}
                        Marks: {result.obtainedMarks} / {result.totalMarks}
                      </span>
                      <small>
                        {Number(result.percentage || 0).toFixed(2)}% · Grade{" "}
                        {result.grade || "—"}
                      </small>
                      <span
                        className={`student-portal__badge ${
                          result.passStatus === "Pass"
                            ? "student-portal__badge--active"
                            : "student-portal__badge--neutral"
                        }`}
                      >
                        {result.passStatus || "Result published"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <section className="student-portal__panel">
          <div className="student-portal__panel-heading">
            <div>
              <h2>Attendance Overview</h2>
              <p>Attendance records available in the current system.</p>
            </div>
            <FiCheckCircle />
          </div>

          <div className="student-portal__attendance">
            {[
              ["Present", attendance.Present, "present"],
              ["Absent", attendance.Absent, "absent"],
              ["Leave", attendance.Leave, "leave"],
              ["Late", attendance.Late, "late"],
            ].map(([label, count, variant]) => (
              <div className="student-portal__attendance-item" key={label}>
                <span className={`student-portal__attendance-dot student-portal__attendance-dot--${variant}`} />
                <span>{label}</span>
                <strong>{count || 0}</strong>
              </div>
            ))}
          </div>
        </section>

        <footer className="student-portal__footer">
          Signed in as {user?.email || "Student"} · Keep your login credentials private.
        </footer>
      </div>
    </main>
  );
};

export default StudentDashboard;