
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiRefreshCw,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import { getAssetUrl } from "../../utils/assetUrl";

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

const getStatusClass = (status = "") => {
  const normalized = String(status).toLowerCase();

  if (["active", "published", "pass", "present"].some((v) => normalized.includes(v))) {
    return "student-home__badge student-home__badge--success";
  }

  if (["pending", "upcoming", "draft"].some((v) => normalized.includes(v))) {
    return "student-home__badge student-home__badge--warning";
  }

  return "student-home__badge";
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
        err.response?.data?.message ||
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
  const results = Array.isArray(data.recentResults) ? data.recentResults : [];

  const attendanceTotal = useMemo(
    () =>
      ["Present", "Absent", "Leave", "Late"].reduce(
        (sum, key) => sum + Number(attendance[key] || 0),
        0
      ),
    [attendance]
  );

  const attendancePercentage =
    attendanceTotal > 0
      ? Math.round((Number(attendance.Present || 0) / attendanceTotal) * 100)
      : null;

  const activeAdmissions = admissions.filter((item) =>
    String(item.status || "").toLowerCase().includes("active")
  ).length;

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  if (loading) {
    return (
      <main className="student-home__state">
        <FiRefreshCw className="student-home__spinner" />
        <h2>Preparing your dashboard</h2>
        <p>Loading your latest student information securely.</p>
      </main>
    );
  }

  if (error || !dashboard) {
    const notLinked = error.toLowerCase().includes("not linked");

    return (
      <main className="student-home__state">
        <FiAlertCircle className="student-home__state-icon" />
        <h2>{notLinked ? "Student account setup required" : "Dashboard unavailable"}</h2>
        <p>{error || "No dashboard data was returned."}</p>
        {notLinked && (
          <p>
            Please ask your institute administrator to link your login to your
            correct student record.
          </p>
        )}
        <button type="button" className="student-home__primary-button" onClick={loadDashboard}>
          <FiRefreshCw /> Try again
        </button>
      </main>
    );
  }

  const studentName =
    student.name ||
    [student.firstName, student.surname].filter(Boolean).join(" ") ||
    "Student";

  const avatarUrl = getAssetUrl(student.profileImage);

  return (
    <main className="student-home">
      <section className="student-home__welcome">
        <div>
          <span className="student-home__eyebrow">STUDENT OVERVIEW</span>
          <h1>Good to see you, {student.firstName || studentName}!</h1>
          <p>Here’s what’s happening with your studies today.</p>
        </div>

        <div className="student-home__student-chip">
          {avatarUrl ? (
            <img src={avatarUrl} alt={`${studentName} profile`} />
          ) : (
            <span className="student-home__avatar-fallback">
              {studentName.charAt(0).toUpperCase()}
            </span>
          )}
          <span>
            <strong>{studentName}</strong>
            <small>Roll No: {student.rollNo || "Not assigned"}</small>
          </span>
        </div>
      </section>

      <section className="student-home__stats" aria-label="Student summary">
        <article className="student-home__stat student-home__stat--blue">
          <span className="student-home__stat-icon"><FiBookOpen /></span>
          <div>
            <small>Active Courses</small>
            <strong>{Number(summary.activeAdmissions ?? activeAdmissions)}</strong>
            <span>{Number(summary.totalAdmissions || admissions.length)} total admission(s)</span>
          </div>
        </article>

        <article className="student-home__stat student-home__stat--green">
          <span className="student-home__stat-icon"><FiActivity /></span>
          <div>
            <small>Attendance</small>
            <strong>{attendancePercentage === null ? "—" : `${attendancePercentage}%`}</strong>
            <span>
              {attendanceTotal
                ? `${attendance.Present || 0} present records`
                : "No attendance records yet"}
            </span>
          </div>
        </article>

        <article className="student-home__stat student-home__stat--orange">
          <span className="student-home__stat-icon"><FiCreditCard /></span>
          <div>
            <small>Fees Pending</small>
            <strong>{formatCurrency(summary.outstandingFees)}</strong>
            <span>Outstanding admission balance</span>
          </div>
        </article>

        <article className="student-home__stat student-home__stat--purple">
          <span className="student-home__stat-icon"><FiCalendar /></span>
          <div>
            <small>Upcoming Exams</small>
            <strong>{exams.length}</strong>
            <span>Active upcoming hall tickets</span>
          </div>
        </article>
      </section>

      <section className="student-home__main-grid">
        <article className="student-home__panel student-home__progress-panel">
          <div className="student-home__panel-heading">
            <div>
              <h2>My Course & Admission Progress</h2>
              <p>Your current enrolled courses and fee status.</p>
            </div>
            <FiBookOpen />
          </div>

          {admissions.length === 0 ? (
            <div className="student-home__empty">
              <FiBookOpen />
              <strong>No admission found yet</strong>
              <p>Your course details will appear here after your institute records an admission.</p>
            </div>
          ) : (
            <div className="student-home__admission-list">
              {admissions.slice(0, 3).map((item) => {
                const total = Number(item.finalAmount || 0);
                const paid = Number(item.paidAmount || 0);
                const feeProgress =
                  total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : null;

                return (
                  <div className="student-home__admission" key={item.id}>
                    <div className="student-home__admission-icon"><FiBookOpen /></div>
                    <div className="student-home__admission-body">
                      <div className="student-home__admission-title">
                        <div>
                          <strong>{item.course || "Course"}</strong>
                          <small>{item.batch || "Batch not assigned"}</small>
                        </div>
                        <span className={getStatusClass(item.status)}>{item.status || "Status unavailable"}</span>
                      </div>

                      <div className="student-home__fee-progress">
                        <span style={{ width: `${feeProgress ?? 0}%` }} />
                      </div>

                      <div className="student-home__progress-caption">
                        <span>
                          {feeProgress === null
                            ? "Fee progress unavailable"
                            : `${feeProgress}% of fees paid`}
                        </span>
                        <strong>{formatCurrency(item.remainingAmount)} due</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
              {admissions.length > 3 && (
                <p className="student-home__more-note">
                  Showing 3 of {admissions.length} admissions.
                  Full course details are coming in Phase 3.
                </p>
              )}
            </div>
          )}

          <div className="student-home__panel-actions">
            <button type="button" className="student-home__secondary-button" onClick={() => scrollToSection("student-home-admissions")}>
              View admission details <FiArrowRight />
            </button>
          </div>
        </article>

        <article className="student-home__panel student-home__next-exam-panel">
          <div className="student-home__panel-heading">
            <div>
              <h2>Upcoming Exams</h2>
              <p>Prepare for your next scheduled exam.</p>
            </div>
            <FiCalendar />
          </div>

          {exams.length === 0 ? (
            <div className="student-home__empty student-home__empty--compact">
              <FiCalendar />
              <strong>No upcoming exams</strong>
              <p>Upcoming exams appear here when an active hall ticket is available.</p>
            </div>
          ) : (
            <div className="student-home__exam-list">
              {exams.slice(0, 3).map((exam) => (
                <div className="student-home__exam" key={exam.id}>
                  <div className="student-home__exam-date">
                    <FiCalendar />
                    <span>{formatDate(exam.examDate)}</span>
                  </div>
                  <strong>{exam.course || "Scheduled exam"}</strong>
                  <small>
                    {exam.startTime || "Time TBA"}
                    {exam.endTime ? ` – ${exam.endTime}` : ""}
                  </small>
                  <span className="student-home__exam-ticket">
                    Hall ticket: {exam.hallTicketNo || "Not available"}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="student-home__panel-actions">
            <button type="button" className="student-home__secondary-button" onClick={() => scrollToSection("student-home-exams")}>
              Exam overview <FiArrowRight />
            </button>
          </div>
        </article>
      </section>

      <section className="student-home__lower-grid">
        <article className="student-home__panel" id="student-home-attendance">
          <div className="student-home__panel-heading">
            <div>
              <h2>Attendance Overview</h2>
              <p>Summary of the records available to you.</p>
            </div>
            <FiActivity />
          </div>

          <div className="student-home__attendance-list">
            {[
              ["Present", attendance.Present, "green"],
              ["Absent", attendance.Absent, "red"],
              ["Leave", attendance.Leave, "orange"],
              ["Late", attendance.Late, "purple"],
            ].map(([label, count, color]) => (
              <div className="student-home__attendance-row" key={label}>
                <span className={`student-home__attendance-dot student-home__attendance-dot--${color}`} />
                <span>{label}</span>
                <strong>{Number(count || 0)}</strong>
              </div>
            ))}
          </div>

          <div className="student-home__panel-actions">
            <button type="button" className="student-home__secondary-button" onClick={() => scrollToSection("student-home-results")}>
              View published results <FiArrowRight />
            </button>
          </div>
        </article>

        <article className="student-home__panel" id="student-home-fees">
          <div className="student-home__panel-heading">
            <div>
              <h2>Fees & Payments</h2>
              <p>A quick look at your admission fee totals.</p>
            </div>
            <FiCreditCard />
          </div>

          <div className="student-home__fee-summary">
            <div>
              <span>Total fees</span>
              <strong>{formatCurrency(summary.totalFees)}</strong>
            </div>
            <div>
              <span>Total paid</span>
              <strong className="student-home__positive">{formatCurrency(summary.totalPaid)}</strong>
            </div>
            <div>
              <span>Outstanding</span>
              <strong className="student-home__negative">{formatCurrency(summary.outstandingFees)}</strong>
            </div>
          </div>

          <div className="student-home__panel-actions">
            <button type="button" className="student-home__secondary-button" onClick={() => scrollToSection("student-home-admissions")}>
              Review fee details <FiArrowRight />
            </button>
          </div>
        </article>

        <article className="student-home__panel" id="student-home-results">
          <div className="student-home__panel-heading">
            <div>
              <h2>Recent Results</h2>
              <p>Results published by your institute.</p>
            </div>
            <FiFileText />
          </div>

          {results.length === 0 ? (
            <div className="student-home__empty student-home__empty--compact">
              <FiFileText />
              <strong>No published results yet</strong>
              <p>Your results will show here once published.</p>
            </div>
          ) : (
            <div className="student-home__result-list">
              {results.slice(0, 3).map((result) => (
                <div className="student-home__result" key={result.id}>
                  <span className="student-home__result-icon"><FiCheckCircle /></span>
                  <div>
                    <strong>{result.course || "Exam result"}</strong>
                    <small>
                      Marks: {result.obtainedMarks ?? "—"} / {result.totalMarks ?? "—"}
                      {" · "}
                      {Number(result.percentage || 0).toFixed(1)}%
                    </small>
                  </div>
                  <span className={getStatusClass(result.passStatus)}>{result.passStatus || "Published"}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="student-home__panel" id="student-home-admissions">
        <div className="student-home__panel-heading">
          <div>
            <h2>Admission Summary</h2>
            <p>Course, batch, and financial information recorded by the institute.</p>
          </div>
          <FiFileText />
        </div>

        {admissions.length === 0 ? (
          <div className="student-home__empty">No admission records are available.</div>
        ) : (
          <div className="student-home__table-wrap">
            <table className="student-home__table">
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
                {admissions.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.course || "—"}</strong><small>{item.courseType || ""}</small></td>
                    <td>{item.batch || "—"}</td>
                    <td>{formatDate(item.admissionDate)}</td>
                    <td>{formatCurrency(item.finalAmount)}</td>
                    <td>{formatCurrency(item.paidAmount)}</td>
                    <td>{formatCurrency(item.remainingAmount)}</td>
                    <td><span className={getStatusClass(item.status)}>{item.status || "Unknown"}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="student-home__panel" id="student-home-exams">
        <div className="student-home__panel-heading">
          <div>
            <h2>Exam Schedule</h2>
            <p>Only exams associated with your active hall tickets are shown.</p>
          </div>
          <FiCalendar />
        </div>
        {exams.length === 0 ? (
          <div className="student-home__empty">There are no upcoming exams available right now.</div>
        ) : (
          <div className="student-home__table-wrap">
            <table className="student-home__table">
              <thead>
                <tr><th>Course</th><th>Date</th><th>Time</th><th>Reporting</th><th>Hall Ticket</th></tr>
              </thead>
              <tbody>
                {exams.map((exam) => (
                  <tr key={exam.id}>
                    <td><strong>{exam.course || "—"}</strong></td>
                    <td>{formatDate(exam.examDate)}</td>
                    <td>{exam.startTime || "TBA"}{exam.endTime ? ` – ${exam.endTime}` : ""}</td>
                    <td>{exam.reportingTime || "—"}</td>
                    <td>{exam.hallTicketNo || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="student-home__quick-actions">
        <h2>Quick Actions</h2>
        <p>Jump to the information currently available in your portal.</p>
        <div className="student-home__action-grid">
          <button type="button" onClick={() => scrollToSection("student-home-admissions")}>
            <FiBookOpen /><span><strong>Admission details</strong><small>View your course and batch</small></span><FiArrowRight />
          </button>
          <button type="button" onClick={() => scrollToSection("student-home-fees")}>
            <FiCreditCard /><span><strong>Fees overview</strong><small>Check paid and pending fees</small></span><FiArrowRight />
          </button>
          <button type="button" onClick={() => scrollToSection("student-home-attendance")}>
            <FiUsers /><span><strong>Attendance summary</strong><small>Review attendance records</small></span><FiArrowRight />
          </button>
          <button type="button" onClick={() => scrollToSection("student-home-exams")}>
            <FiCalendar /><span><strong>Exam schedule</strong><small>Check upcoming exams</small></span><FiArrowRight />
          </button>
        </div>
      </section>

      <div className="student-home__footer">
        Student information is shown from your linked student record. If anything looks incorrect, contact your institute administrator.
      </div>
    </main>
  );
};

export default StudentDashboard;
