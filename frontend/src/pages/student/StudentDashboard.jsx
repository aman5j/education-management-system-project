import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiCreditCard,
  FiFileText,
  FiRefreshCw,
  FiClock,
  FiAward,
} from "react-icons/fi";
import {
  FiPhone,
  FiUser,
  FiMail,
  FiMapPin,
  FiBookOpen
} from "react-icons/fi";
import { getAssetUrl } from "../../utils/assetUrl";
import studentPortalService from "../../services/studentPortalService";
import "./StudentDashboard.css";
import { FaBookOpen } from "react-icons/fa6";
import { IoWalletSharp } from "react-icons/io5";

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
      ? Math.round((Number(attendance.Present || 0) / attendanceTotal) * 100)
      : 0;

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

  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

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
      {/* Welcome banner */}
      <section className="student-dashboard__welcome student-profile-banner">

        {/* Background Decoration */}
        <div className="student-profile-banner__shape"></div>

        {/* Left Content */}
        <div className="student-profile-banner__content">

          {/* <div className="student-profile-banner__label">
      <FiBookOpen />
      <span>STUDENT PROFILE</span>
    </div> */}

          <h1>
            Good morning,{" "}
            <span>{student.firstName || studentName}!</span>
          </h1>

          <p className="student-profile-banner__subtitle">
            Welcome back. Here is your academic overview and latest institute information.
          </p>



          {/* Student Information */}
          <div className="student-profile-details">

            <div className="student-profile-details__top">

              <div className="student-profile-info">
                <div className="student-profile-info__icon phone">
                  <FiPhone />
                </div>

                <div>
                  <span>Contact Number</span>
                  <strong>
                    {student.contactNumber ||
                      student.phone ||
                      student.mobile ||
                      "-"}
                  </strong>
                </div>
              </div>

              <div className="student-profile-info">
                <div className="student-profile-info__icon gender">
                  <FiUser />
                </div>

                <div>
                  <span>Roll No.</span>
                  <strong>{student.rollNo || "-"}</strong>
                </div>
              </div>

              <div className="student-profile-info">
                <div className="student-profile-info__icon email">
                  <FiMail />
                </div>

                <div>
                  <span>Email ID</span>
                  <strong title={student.email || ""}>
                    {student.email || "-"}
                  </strong>
                </div>
              </div>

            </div>

            {/* Address */}
            <div className="student-profile-details__address">

              <div className="student-profile-info__icon address">
                <FiBookOpen />
              </div>

              <div>
                <span>Course {Number(summary.activeAdmissions ?? activeAdmissions)}</span>



                <div className="student-dashboard__course-list profilecourseslist">
                  {admissions.slice(0, 3).map((item) => {
                    const total = Number(item.finalAmount || 0);
                    const paid = Number(item.paidAmount || 0);
                    const feeProgress =
                      total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
                    const isActive = String(item.status || "").toLowerCase().includes("active");

                    return (
                      <div className="student-dashboard__course" key={item.id}>
                        <div className="student-dashboard__course-content">
                          <div className="student-dashboard__course-title">
                            <div>
                              <strong>{item.course || "Course"}</strong>
                              {/* <small>{item.batch || "Batch not assigned"}</small> */}
                            </div>

                          </div>


                        </div>
                      </div>
                    );
                  })}

                </div>
              </div>

            </div>

          </div>
        </div>

        {/* Right Profile Image */}
        <div className="student-profile-banner__image">

          <div className="student-profile-banner__image-ring">
            <img
              src={getAssetUrl(student.profileImage)}
              alt="Student Profile"
            />

            <div className="student-profile-signature">
              <img
                src="https://education-management-backend-79g1.onrender.com/uploads/students/1792320172416-images.png"
                alt="Student Signature"
              />
            </div>


          </div>

          {/* <div className="student-profile-banner__image-badge">
      <FiBookOpen />
    </div> */}

        </div>

      </section>
<div className="common-card">
  <div className="card-body"> 
      {/* Summary cards */}
      <section className="student-dashboard__stats" aria-label="Student summary">
       

      

          <article class="dashboard-stat-card card-success">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-success">
             <FaBookOpen /> 
            </div>
          </div>
          <div class="stat-card-body">
            <span class="stat-card-title">Active Courses</span>
            <strong class="stat-card-value">{Number(summary.activeAdmissions ?? activeAdmissions)}</strong>
          </div>
        </article>

          <article class="dashboard-stat-card card-purple">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-purple">
            <FiActivity />
            </div>
          </div>
          <div class="stat-card-body">
            <span class="stat-card-title">Attendance</span>
            <strong class="stat-card-value">{attendanceTotal ? `${attendancePercentage}%` : "—"}</strong>
          </div>
        </article>

          <article class="dashboard-stat-card card-danger">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-danger">
           <IoWalletSharp />

            </div>
          </div>
          <div class="stat-card-body">
            <span class="stat-card-title">Fee Pending</span>
            <strong class="stat-card-value">{formatCurrency(summary.outstandingFees)}</strong>
          </div>
        </article>


        <article class="dashboard-stat-card card-warning">
          <div class="stat-card-top">
            <div class="stat-icon stat-icon-warning">
          <FiCalendar />
            </div>
          </div>
          <div class="stat-card-body">
            <span class="stat-card-title">Upcoming Exams</span>
            <strong class="stat-card-value">{exams.length}</strong>
          </div>
        </article>

       
      </section>
      </div>

</div>
      {/* Main dashboard grid */}
      <div className="common-card">
              <section className="student-dashboard__main-grid">
        <article className="student-dashboard__panel" id="student-dashboard-courses">
          <div className="student-dashboard__panel-heading">
            <div>
              <h2>My Courses</h2>
              <p>Your enrolled courses and fee progress.</p>
            </div>
            <span className="student-dashboard__heading-icon"><FiBookOpen /></span>
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
                const isActive = String(item.status || "").toLowerCase().includes("active");

                return (
                  <div className="student-dashboard__course" key={item.id}>
                    <div className="student-dashboard__course-icon"><FiBookOpen /></div>
                    <div className="student-dashboard__course-content">
                      <div className="student-dashboard__course-title">
                        <div>
                          <strong>{item.course || "Course"}</strong>
                          <small>{item.batch || "Batch not assigned"}</small>
                        </div>
                        <span className={`student-dashboard__status ${isActive ? "student-dashboard__status--active" : ""}`}>
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
                  Showing 3 of {admissions.length} admissions.
                </p>
              )}
            </div>
          )}
          <div className="student-dashboard__panel-footer">
            <button type="button" className="student-dashboard-button" onClick={() => goToSection("student-dashboard-courses")}>
              Course overview <FiArrowRight />
            </button>
          </div>
        </article>

        <article className="student-dashboard__panel student-dashboard__attendance-panel" id="student-dashboard-attendance">
          <div className="student-dashboard__panel-heading">
            <div>
              <span className="student-dashboard__section-kicker">ATTENDANCE RECORD</span>
              <h2>Attendance Overview</h2>
              <p>Your recorded attendance summary.</p>
            </div>
            <span className="student-dashboard__heading-icon"><FiActivity /></span>
          </div>

          <div className="student-dashboard__attendance-overview">
            <div
              className="student-dashboard__attendance-ring"
              style={{ "--attendance-value": `${attendancePercentage}%` }}
              role="img"
              aria-label={`Attendance ${attendancePercentage}%`}
            >
              <div>
                <strong>{attendanceTotal ? `${attendancePercentage}%` : "—"}</strong>
                <span>Attendance</span>
              </div>
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
          </div>
        </article>
      </section>
      </div>
    

      {/* Lower cards */}
      <section className="student-dashboard__lower-grid">
        <article className="student-dashboard__panel" id="student-dashboard-exams">
          <div className="student-dashboard__panel-heading">
            <div>
              <span className="student-dashboard__section-kicker">STAY PREPARED</span>
              <h2>Upcoming Exams</h2>
              <p>Exams with active hall tickets.</p>
            </div>
            <span className="student-dashboard__heading-icon"><FiCalendar /></span>
          </div>

          {exams.length === 0 ? (
            <div className="student-dashboard__empty student-dashboard__empty--compact">
              <FiCalendar />
              <strong>No upcoming exams</strong>
              <p>Your scheduled exams will appear here when an active hall ticket is available.</p>
            </div>
          ) : (
            <div className="student-dashboard__exam-list">
              {exams.slice(0, 4).map((exam) => (
                <div className="student-dashboard__exam" key={exam.id}>
                  <span className="student-dashboard__exam-date"><FiCalendar /> {formatDate(exam.examDate)}</span>
                  <strong>{exam.course || "Scheduled exam"}</strong>
                  <small><FiClock /> {exam.startTime || "Time TBA"}{exam.endTime ? ` – ${exam.endTime}` : ""}</small>
                  <span className="student-dashboard__exam-ticket">Hall ticket: {exam.hallTicketNo || "Not available"}</span>
                </div>
              ))}
            </div>
          )}
          <div className="student-dashboard__panel-footer">
            <button type="button" className="student-dashboard-button" onClick={() => goToSection("student-dashboard-exams")}>
              Exam overview <FiArrowRight />
            </button>
          </div>
        </article>

        <article className="student-dashboard__panel" id="student-dashboard-fees">
          <div className="student-dashboard__panel-heading">
            <div>
              <span className="student-dashboard__section-kicker">PAYMENT INFORMATION</span>
              <h2>Fee Summary</h2>
              <p>Totals from your admission records.</p>
            </div>
            <span className="student-dashboard__heading-icon"><FiCreditCard /></span>
          </div>
          <div className="student-dashboard__fee-total">
            <span>Total outstanding</span>
            <strong>{formatCurrency(summary.outstandingFees)}</strong>
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
          <div className="student-dashboard__fee-note">
            <FiFileText />
            <span>For payment clarification, please contact your institute office.</span>
          </div>
        </article>

        <article className="student-dashboard__panel student-dashboard__quick-panel">
          <div className="student-dashboard__panel-heading">
            <div>
              <span className="student-dashboard__section-kicker">PORTAL SHORTCUTS</span>
              <h2>Quick Links</h2>
              <p>Access frequently used sections.</p>
            </div>
            <span className="student-dashboard__heading-icon"><FiArrowRight /></span>
          </div>
          <div className="student-dashboard__quick-grid">
            <button type="button" onClick={() => goToSection("student-dashboard-courses")}>
              <FiBookOpen /><span>My Courses</span><FiArrowRight />
            </button>
            <button type="button" onClick={() => goToSection("student-dashboard-attendance")}>
              <FiActivity /><span>Attendance</span><FiArrowRight />
            </button>
            <button type="button" onClick={() => goToSection("student-dashboard-fees")}>
              <FiCreditCard /><span>Fees Overview</span><FiArrowRight />
            </button>
            <button type="button" onClick={() => goToSection("student-dashboard-exams")}>
              <FiCalendar /><span>Exam Schedule</span><FiArrowRight />
            </button>
          </div>
        </article>
      </section>

      <div className="student-dashboard__closing-note">
        <span><FiAward /></span>
        <p>Your dashboard displays information linked to your student account. If any detail appears incorrect, please contact your institute administrator.</p>
      </div>


    </div>
  );
};

export default StudentDashboard;
