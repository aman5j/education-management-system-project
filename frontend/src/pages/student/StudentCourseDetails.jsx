
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiRefreshCw,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import "./StudentCourseDetails.css";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

/**
 * Convert stored rich-text HTML to readable text.
 * This extracts text only; it never injects stored HTML into the page.
 */
function readableText(value) {
  if (!value) return "";

  const source = String(value);

  if (typeof window === "undefined") {
    return source.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }

  const documentNode = new DOMParser().parseFromString(
    source,
    "text/html"
  );

  documentNode.querySelectorAll("script, style, noscript").forEach((node) =>
    node.remove()
  );

  documentNode.querySelectorAll("br").forEach((node) =>
    node.replaceWith("\n")
  );

  documentNode.querySelectorAll("p, div, li, h1, h2, h3, h4, tr").forEach(
    (node) => node.append("\n")
  );

  return (documentNode.body.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ContentSection({ title, value, emptyText }) {
  const text = readableText(value);

  return (
    <section className="student-course-details__content-section">
      <h3>{title}</h3>
      {text ? (
        <div className="student-course-details__readable-text">{text}</div>
      ) : (
        <p className="student-course-details__muted">{emptyText}</p>
      )}
    </section>
  );
}

export default function StudentCourseDetails() {
  const { admissionId } = useParams();
  const navigate = useNavigate();

  const [courseRecord, setCourseRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("overview");

  const loadCourse = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await studentPortalService.getMyCourses();
      const records = response?.data?.courses || [];

      const matched = records.find(
        (item) => item.admissionId === admissionId
      );

      if (!matched) {
        setCourseRecord(null);
        setError(
          "This admission could not be found in your account. Return to My Courses and select one of your listed admissions."
        );
      } else {
        setCourseRecord(matched);
      }
    } catch (err) {
      setCourseRecord(null);
      setError(
        err?.response?.data?.message ||
          "Unable to load the course details. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [admissionId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  if (loading) {
    return (
      <main className="student-course-details">
        <div className="student-course-details__state">
          <FiRefreshCw className="student-course-details__spin" />
          <h2>Loading course details</h2>
          <p>Retrieving your admission information.</p>
        </div>
      </main>
    );
  }

  if (error || !courseRecord) {
    return (
      <main className="student-course-details">
        <button
          className="student-course-details__back"
          onClick={() => navigate("/student/courses")}
        >
          <FiArrowLeft /> Back to My Courses
        </button>

        <div className="student-course-details__state">
          <h2>Course details unavailable</h2>
          <p>{error || "No matching admission was found."}</p>
          <button onClick={loadCourse}>Try again</button>
        </div>
      </main>
    );
  }

  const course = courseRecord.course || {};
  const batch = courseRecord.batch || {};
  const fees = courseRecord.fees || {};
  const subjects = course.subjects || [];

  return (
    <main className="student-course-details">
      <button
        type="button"
        className="student-course-details__back"
        onClick={() => navigate("/student/courses")}
      >
        <FiArrowLeft /> Back to My Courses
      </button>

      <header className="student-course-details__heading">
        <div>
          <span className="student-course-details__eyebrow">
            MY LEARNING / COURSE DETAILS
          </span>
          <h1>{course.title || "Course details"}</h1>
          <p>
            Review your course information, admission, syllabus, and subjects.
          </p>
        </div>

        <span className="student-course-details__status">
          {courseRecord.admissionStatus || "Unknown"}
        </span>
      </header>

      <section className="student-course-details__summary">
        <div className="student-course-details__summary-icon">
          <FiBookOpen />
        </div>
        <div className="student-course-details__summary-main">
          <h2>{course.title || "Course"}</h2>
          <p>
            {[course.category, course.type].filter(Boolean).join(" · ") ||
              "Course information"}
          </p>
          <div className="student-course-details__chips">
            <span>{batch.name || "Batch not available"}</span>
            {batch.status && <span>Batch: {batch.status}</span>}
            {course.duration > 0 && (
              <span>
                {course.duration} {course.durationUnit || ""}
              </span>
            )}
          </div>
        </div>
      </section>

      <nav className="student-course-details__tabs" aria-label="Course information">
        <button
          className={tab === "overview" ? "is-active" : ""}
          onClick={() => setTab("overview")}
        >
          <FiBookOpen /> Overview
        </button>
        <button
          className={tab === "syllabus" ? "is-active" : ""}
          onClick={() => setTab("syllabus")}
        >
          <FiFileText /> Syllabus
        </button>
        <button
          className={tab === "subjects" ? "is-active" : ""}
          onClick={() => setTab("subjects")}
        >
          <FiCheckCircle /> Subjects
        </button>
      </nav>

      {tab === "overview" && (
        <div className="student-course-details__grid">
          <section className="student-course-details__panel">
            <ContentSection
              title="About this course"
              value={course.description}
              emptyText="No course description has been added."
            />

            <ContentSection
              title="Eligibility"
              value={course.eligibility}
              emptyText="Eligibility information is not available."
            />
          </section>

          <section className="student-course-details__panel">
            <h2>Admission information</h2>
            <dl className="student-course-details__facts">
              <div>
                <dt>Admission date</dt>
                <dd><FiCalendar /> {formatDate(courseRecord.admissionDate)}</dd>
              </div>
              <div>
                <dt>Course type</dt>
                <dd>{course.type || "Not specified"}</dd>
              </div>
              <div>
                <dt>Batch</dt>
                <dd>{batch.name || "Not available"}</dd>
              </div>
              <div>
                <dt>Batch status</dt>
                <dd>{batch.status || "Not specified"}</dd>
              </div>
              <div>
                <dt>Course duration</dt>
                <dd>
                  {course.duration > 0
                    ? `${course.duration} ${course.durationUnit || ""}`
                    : "Not specified"}
                </dd>
              </div>
              <div>
                <dt>Total lectures</dt>
                <dd>{course.totalLectures || "Not specified"}</dd>
              </div>
            </dl>
          </section>

          <section className="student-course-details__panel student-course-details__panel--wide">
            <h2>Fee summary</h2>
            <div className="student-course-details__fee-grid">
              <div>
                <span>Total fees</span>
                <strong>{formatCurrency(fees.total)}</strong>
              </div>
              <div>
                <span>Paid</span>
                <strong className="is-paid">{formatCurrency(fees.paid)}</strong>
              </div>
              <div>
                <span>Outstanding</span>
                <strong className="is-due">
                  {formatCurrency(fees.outstanding)}
                </strong>
              </div>
            </div>

            <div className="student-course-details__progress">
              <span
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, Number(fees.paymentPercentage || 0))
                  )}%`,
                }}
              />
            </div>
            <p className="student-course-details__muted">
              {Number(fees.paymentPercentage || 0)}% of the admission fees paid.
            </p>
          </section>
        </div>
      )}

      {tab === "syllabus" && (
        <section className="student-course-details__panel">
          <ContentSection
            title="Course syllabus"
            value={course.syllabus}
            emptyText="The institute has not added a syllabus yet."
          />
        </section>
      )}

      {tab === "subjects" && (
        <section className="student-course-details__panel">
          <h2>Course subjects</h2>
          {subjects.length ? (
            <div className="student-course-details__subjects">
              {subjects.map((subject) => (
                <article key={subject.id}>
                  <FiBookOpen />
                  <div>
                    <h3>{subject.name}</h3>
                    {subject.code && <span>{subject.code}</span>}
                    {subject.description && (
                      <p>{readableText(subject.description)}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="student-course-details__empty">
              <FiBookOpen />
              <h3>No subjects linked yet</h3>
              <p>
                Subject information will appear here when available for this
                course.
              </p>
            </div>
          )}
        </section>
      )}

      <p className="student-course-details__footnote">
        <FiClock /> Details shown are linked to your selected admission record.
      </p>
    </main>
  );
}
