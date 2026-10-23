
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiUser,
  FiBookOpen,
  FiAward,
  FiCalendar,
  FiMail,
  FiPhone,
  FiMapPin,
  FiRefreshCw,
} from "react-icons/fi";

import api from "../../../services/api";
import { getAssetUrl } from "../../../utils/assetUrl";

import "../../../styles/StudentDetails.css";

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response;

const getRows = (data, key) => {
  if (Array.isArray(data)) return data;
  return Array.isArray(data?.[key]) ? data[key] : [];
};

const fullName = (student) =>
  [student?.firstName, student?.surname].filter(Boolean).join(" ") ||
  "Student";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const date = (value) => {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : parsed.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const value = (item) =>
  item === null || item === undefined || item === "" ? "—" : item;

function Section({ title, icon: Icon, children, className = "" }) {
  return (
    <section className={`student-details-section ${className}`}>
      <div className="student-details-section-heading">
        <span className="student-details-section-icon">
          <Icon />
        </span>
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div className="student-details-field">
      <span>{label}</span>
      <strong>{value(children)}</strong>
    </div>
  );
}

export default function StudentDetails() {
  const { id } = useParams();

  const [student, setStudent] = useState(null);
  const [admissions, setAdmissions] = useState([]);
  const [results, setResults] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [studentError, setStudentError] = useState("");
  const [sectionErrors, setSectionErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setStudentError("");
      setSectionErrors({});
      setStudent(null);
      setAdmissions([]);
      setResults([]);
      setAttendance([]);

      try {
        const response = await api.get(`/students/${id}`);
        const record = unwrap(response);

        if (!record?._id) {
          throw new Error("Student record was not found.");
        }

        if (cancelled) return;
        setStudent(record);

        const tasks = [
          {
            key: "admissions",
            run: () =>
              api.get("/admissions", {
                params: {
                  student_id: id,
                  page: 1,
                  limit: 100,
                  sortBy: "admission_date",
                  sortOrder: "desc",
                },
              }),
            save: (data) => setAdmissions(getRows(data, "admissions")),
          },
          {
            key: "results",
            run: () =>
              api.get("/exam-results", {
                params: { page: 1, limit: 100 },
              }),
            save: (data) => {
              const rows = getRows(data, "results");
              setResults(
                rows.filter(
                  (result) =>
                    String(
                      result.student_id?._id || result.student_id
                    ) === String(id)
                )
              );
            },
          },
        
            {
            key: "attendance",
            run: () =>
                api.get("/attendance", {
                params: {
                    student_id: id,
                    page: 1,
                    limit: 100,
                },
                }),
            save: (data) => {
                // The backend returns records under data.records.
                const rows = getRows(data, "records");

                setAttendance(rows);
            },
            },

        ];

        await Promise.all(
          tasks.map(async (task) => {
            try {
              const result = await task.run();
              if (cancelled) return;
              task.save(unwrap(result));
            } catch (error) {
              if (cancelled) return;
              setSectionErrors((previous) => ({
                ...previous,
                [task.key]:
                  error.response?.data?.message ||
                  `Unable to load ${task.key}. Your account may not have permission to view this section.`,
              }));
            }
          })
        );
      } catch (error) {
        if (!cancelled) {
          setStudentError(
            error.response?.data?.message ||
              error.message ||
              "Unable to load this student's details."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id, refreshKey]);

  if (loading) {
    return (
      <main className="student-details-page">
        <div className="student-details-state">Loading student details...</div>
      </main>
    );
  }

  if (studentError || !student) {
    return (
      <main className="student-details-page">
        <Link className="student-details-back" to="/admin/dashboard">
          <FiArrowLeft /> Back to Dashboard
        </Link>
        <div className="student-details-state student-details-error" role="alert">
          <h2>Unable to open student profile</h2>
          <p>{studentError || "Student not found."}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((current) => current + 1)}
          >
            <FiRefreshCw /> Try again
          </button>
        </div>
      </main>
    );
  }

  const admissionCount = admissions.length;

  return (
    <main className="student-details-page">
      <header className="student-details-topbar">
        <div>
          <Link className="student-details-back" to="/admin/dashboard">
            <FiArrowLeft /> Back to Dashboard
          </Link>
          <h1>Student Profile</h1>
          <p>Student information, admissions, results and attendance</p>
        </div>

        <button
          type="button"
          className="student-details-refresh"
          onClick={() => setRefreshKey((current) => current + 1)}
        >
          <FiRefreshCw /> Refresh
        </button>
      </header>

      <section className="student-details-hero">
        <div className="student-details-avatar">
          {student.profileImage ? (
            <img
              src={getAssetUrl(student.profileImage)}
              alt={fullName(student)}
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            fullName(student).charAt(0).toUpperCase()
          )}
        </div>

        <div className="student-details-hero-info">
          <h2>{fullName(student)}</h2>
          <div className="student-details-hero-meta">
            <span><FiUser /> {value(student.rollNo)}</span>
            <span><FiMail /> {value(student.email)}</span>
            <span><FiPhone /> {value(student.mobile)}</span>
            <span>{value(student.gender)}</span>
          </div>
        </div>

        <span className={`student-details-status status-${String(student.status || "").toLowerCase()}`}>
          {value(student.status)}
        </span>
      </section>

      <Section title="Personal Details" icon={FiUser}>
        <div className="student-details-grid">
          <Field label="Full Name">{fullName(student)}</Field>
          <Field label="Roll Number">{student.rollNo}</Field>
          <Field label="Email Address">{student.email}</Field>
          <Field label="Mobile Number">{student.mobile}</Field>
          <Field label="Alternate Mobile">{student.alternateMobile}</Field>
          <Field label="Father / Guardian Name">{student.fatherName}</Field>
          <Field label="Mother Name">{student.motherName}</Field>
          <Field label="Gender">{student.gender}</Field>
          <Field label="Date of Birth">{date(student.dob)}</Field>
          {/* <Field label="Course">{student.course_id?.courseTitle}</Field>
          <Field label="Batch">{student.batch_id?.batch_name}</Field> */}
          <Field label="Pincode">{student.pincode}</Field>
          <Field label="Address">
            {student.address ? (
              <span className="student-details-address">
                <FiMapPin /> {student.address}
              </span>
            ) : "—"}
          </Field>
        </div>

        {student.signature && (
          <div className="student-details-signature">
            <span>Signature</span>
            <img src={getAssetUrl(student.signature)} alt="Student signature" />
          </div>
        )}
      </Section>

      <Section title="Admission Details" icon={FiBookOpen}>
        {sectionErrors.admissions && (
          <p className="student-details-section-error" role="alert">
            {sectionErrors.admissions}
          </p>
        )}

        <div className="student-details-count">
          <strong>{admissionCount}</strong>
          <span>Total Admissions</span>
        </div>

        {!sectionErrors.admissions && admissions.length === 0 ? (
          <p className="student-details-empty">No admission records found.</p>
        ) : (
          admissions.map((admission) => {
            const finalAmount = Number(admission.final_amount || 0);
            const paidAmount = Number(admission.paid_amount || 0);
            const remaining = Math.max(0, finalAmount - paidAmount);
            const progress =
              finalAmount > 0
                ? Math.min(100, (paidAmount / finalAmount) * 100)
                : 0;

            return (
              <article className="student-details-admission" key={admission._id}>
                <div className="student-details-admission-heading">
                  <h3>{admission.course_id?.courseTitle || "Course"}</h3>
                  <span>{value(admission.status)}</span>
                </div>

                <p className="student-details-muted">
                <FiCalendar /> Admitted on {date(admission.admission_date)}
                </p>

                <p className="student-details-muted">
                Course: {admission.course_id?.courseTitle || "—"}
                {" · "}
                Batch: {admission.batch_id?.batch_name || "—"}
                </p>

                <div className="student-details-amount-grid">
                  <div><span>Total Amount</span><strong>{money(finalAmount)}</strong></div>
                  <div><span>Paid Amount</span><strong className="amount-paid">{money(paidAmount)}</strong></div>
                  <div><span>Discount</span><strong>{money(admission.discount_amount)}</strong></div>
                  <div><span>Remaining</span><strong className="amount-due">{money(remaining)}</strong></div>
                </div>

                <div className="student-details-progress-label">
                  <span>Fee payment progress</span>
                  <strong>{progress.toFixed(1)}%</strong>
                </div>
                <div
                  className="student-details-progress"
                  role="progressbar"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span style={{ width: `${progress}%` }} />
                </div>
              </article>
            );
          })
        )}
      </Section>

      <Section title="Examination Results" icon={FiAward}>
        {sectionErrors.results && (
          <p className="student-details-section-error" role="alert">
            {sectionErrors.results}
          </p>
        )}

        {!sectionErrors.results && results.length === 0 ? (
          <p className="student-details-empty">No examination results found.</p>
        ) : (
          results.map((result) => (
            <article className="student-details-result" key={result._id}>
              <div className="student-details-admission-heading">
                <h3>{result.course_id?.courseTitle || "Examination"}</h3>
                <span>{result.resultStatus || "—"}</span>
              </div>

              <div className="student-details-amount-grid">
                <div><span>Total Marks</span><strong>{value(result.totalMarks)}</strong></div>
                <div><span>Obtained Marks</span><strong>{value(result.obtainedMarks)}</strong></div>
                <div><span>Percentage</span><strong>{Number(result.percentage || 0).toFixed(2)}%</strong></div>
                <div><span>Grade</span><strong>{value(result.grade)}</strong></div>
              </div>

              <p className="student-details-muted">
                Status: {value(result.passStatus)} · Updated: {date(result.updatedAt)}
              </p>
            </article>
          ))
        )}
      </Section>

      <Section title="Attendance Report" icon={FiCalendar}>
        {sectionErrors.attendance && (
          <p className="student-details-section-error" role="alert">
            {sectionErrors.attendance}
          </p>
        )}

        {!sectionErrors.attendance && attendance.length === 0 ? (
          <p className="student-details-empty">
            No attendance records found for this student.
          </p>
        ) : (
          <div className="student-details-table-wrap">
            <table className="student-details-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Course</th>
                  <th>Batch</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => (
                  <tr key={record._id}>
                    <td>
                    {date(
                        record.attendance_date ||
                        record.date ||
                        record.attendanceDate
                    )}
                    </td>
                    <td>{record.course_id?.courseTitle || "—"}</td>
                    <td>{record.batch_id?.batch_name || "—"}</td>
                    <td>{value(record.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </main>
  );
}
