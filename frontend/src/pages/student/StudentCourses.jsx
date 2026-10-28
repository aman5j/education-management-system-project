import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiRefreshCw,
  FiSearch,
  FiX,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import { getAssetUrl } from "../../utils/assetUrl";
import "./StudentCourses.css";

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "Date not recorded";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date not recorded";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getAdmissionStatus = (course) =>
  String(course?.admissionStatus || "").toLowerCase();

export default function StudentCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [imageErrors, setImageErrors] = useState({});

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await studentPortalService.getMyCourses();
      setCourses(
        Array.isArray(response?.data?.courses)
          ? response.data.courses
          : []
      );
    } catch (err) {
      setCourses([]);
      setError(
        err?.response?.data?.message ||
          "Unable to load your courses. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const activeCourses = useMemo(
    () =>
      courses.filter(
        (item) => getAdmissionStatus(item) === "active"
      ),
    [courses]
  );

  const completedCourses = useMemo(
    () =>
      courses.filter(
        (item) => getAdmissionStatus(item) === "completed"
      ),
    [courses]
  );

  const visibleCourses = useMemo(() => {
    const source =
      activeTab === "completed" ? completedCourses : activeCourses;
    const query = search.trim().toLowerCase();

    if (!query) return source;

    return source.filter((item) => {
      const searchable = [
        item.course?.title,
        item.course?.category,
        item.course?.type,
        item.batch?.name,
        item.batch?.status,
        item.admissionStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [activeTab, activeCourses, completedCourses, search]);

  const openDetails = (course) => {
    setSelectedCourse(course);
    setDetailsTab("overview");
  };

  const closeDetails = () => setSelectedCourse(null);

  return (
    <section className="student-courses">
      <header className="student-courses__heading">
        <div>
          <span className="student-courses__eyebrow">LEARNING</span>
          <h1>My Courses</h1>
          <p>
            View your enrolled courses, batch information, syllabus, and fee
            summary.
          </p>
        </div>

        <button
          type="button"
          className="student-courses__refresh"
          onClick={loadCourses}
          disabled={loading}
        >
          <FiRefreshCw className={loading ? "student-courses__spin" : ""} />
          Refresh
        </button>
      </header>

      <div className="student-courses__toolbar">
        <div className="student-courses__tabs" role="tablist" aria-label="Course status">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "active"}
            className={activeTab === "active" ? "is-active" : ""}
            onClick={() => setActiveTab("active")}
          >
            Active Courses <span>{activeCourses.length}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "completed"}
            className={activeTab === "completed" ? "is-active" : ""}
            onClick={() => setActiveTab("completed")}
          >
            Completed Courses <span>{completedCourses.length}</span>
          </button>
        </div>

        <label className="student-courses__search">
          <FiSearch />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search courses or batches"
            aria-label="Search courses or batches"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <FiX />
            </button>
          )}
        </label>
      </div>

      {error && (
        <div className="student-courses__error" role="alert">
          <div>
            <strong>Courses could not be loaded</strong>
            <p>{error}</p>
          </div>
          <button type="button" onClick={loadCourses}>
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="student-courses__state">
          <FiRefreshCw className="student-courses__spin" />
          <h2>Loading your courses</h2>
          <p>Retrieving your admission records securely.</p>
        </div>
      ) : !error && visibleCourses.length === 0 ? (
        <div className="student-courses__empty">
          <span className="student-courses__empty-icon">
            <FiBookOpen />
          </span>
          <h2>
            {search
              ? "No matching courses"
              : activeTab === "completed"
                ? "No completed courses yet"
                : "No active courses found"}
          </h2>
          <p>
            {search
              ? "Try a different course name or batch name."
              : "Courses linked to your admissions will appear here. If this doesn't look right, contact your institute administrator."}
          </p>
          {search && (
            <button type="button" onClick={() => setSearch("")}>
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="student-courses__grid">
          {visibleCourses.map((item) => {
            const course = item.course || {};
            const fees = item.fees || {};
            const imageUrl = course.image
              ? getAssetUrl(course.image)
              : "";

            const imageFailed = Boolean(imageErrors[item.admissionId]);
            const isCompleted =
              getAdmissionStatus(item) === "completed";

            return (
              <article
                className="student-course-card"
                key={item.admissionId}
              >
                <div className="student-course-card__cover">
                  {imageUrl && !imageFailed ? (
                    <img
                      src={imageUrl}
                      alt={`${course.title || "Course"} cover`}
                      onError={() =>
                        setImageErrors((previous) => ({
                          ...previous,
                          [item.admissionId]: true,
                        }))
                      }
                    />
                  ) : (
                    <div className="student-course-card__cover-fallback">
                      <FiBookOpen />
                    </div>
                  )}

                  <span
                    className={[
                      "student-course-card__status",
                      isCompleted ? "is-completed" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    {item.admissionStatus || "Unknown"}
                  </span>
                </div>

                <div className="student-course-card__body">
                  <div className="student-course-card__meta">
                    {course.category && <span>{course.category}</span>}
                    {course.type && <span>{course.type}</span>}
                  </div>

                  <h2>{course.title || "Course details unavailable"}</h2>

                  <div className="student-course-card__batch">
                    <FiBookOpen />
                    <span>{item.batch?.name || "Batch not available"}</span>
                  </div>

                  {item.batch?.status && (
                    <p className="student-course-card__batch-status">
                      Batch status: {item.batch.status}
                    </p>
                  )}

                  <div className="student-course-card__fee">
                    <div className="student-course-card__fee-heading">
                      <span>Fee paid</span>
                      <strong>
                        {Number(fees.paymentPercentage || 0)}%
                      </strong>
                    </div>

                    <div
                      className="student-course-card__progress"
                      role="progressbar"
                      aria-label="Course fees paid"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Number(fees.paymentPercentage || 0)}
                    >
                      <span
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(0, Number(fees.paymentPercentage || 0))
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="student-course-card__fee-values">
                      <span>Paid {formatCurrency(fees.paid)}</span>
                      <strong>
                        {Number(fees.outstanding || 0) > 0
                          ? `${formatCurrency(fees.outstanding)} due`
                          : "No outstanding fees"}
                      </strong>
                    </div>
                  </div>

                  <div className="student-course-card__footer">
                    <span>
                      <FiCalendar />
                      {formatDate(item.admissionDate)}
                    </span>

                    <button
                        type="button"
                        onClick={() =>
                            navigate(`/student/courses/${item.admissionId}`)
                        }
                        >
                        View Details <FiArrowRight />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {!loading && !error && courses.length > 0 && (
        <p className="student-courses__footnote">
          Showing your own admission-linked course records. Course content
          appears when it is available in the institute's records.
        </p>
      )}

      {/* {selectedCourse && (
        <div
          className="student-course-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails();
          }}
        >
          <section
            className="student-course-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-course-modal-title"
          >
            <header className="student-course-modal__header">
              <div>
                <span>COURSE DETAILS</span>
                <h2 id="student-course-modal-title">
                  {selectedCourse.course?.title || "Course details"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDetails}
                aria-label="Close course details"
              >
                <FiX />
              </button>
            </header>

            <nav className="student-course-modal__tabs" aria-label="Course details tabs">
              <button
                type="button"
                className={detailsTab === "overview" ? "is-active" : ""}
                onClick={() => setDetailsTab("overview")}
              >
                <FiBookOpen /> Overview
              </button>
              <button
                type="button"
                className={detailsTab === "syllabus" ? "is-active" : ""}
                onClick={() => setDetailsTab("syllabus")}
              >
                <FiFileText /> Syllabus
              </button>
              <button
                type="button"
                className={detailsTab === "subjects" ? "is-active" : ""}
                onClick={() => setDetailsTab("subjects")}
              >
                <FiCheckCircle /> Subjects
              </button>
            </nav>

            <div className="student-course-modal__content">
              {detailsTab === "overview" && (
                <div className="student-course-modal__overview">
                  <p>
                    {selectedCourse.course?.description ||
                      "No course description has been added yet."}
                  </p>

                  <div className="student-course-modal__facts">
                    <div>
                      <span>Batch</span>
                      <strong>
                        {selectedCourse.batch?.name || "Not available"}
                      </strong>
                    </div>
                    <div>
                      <span>Course type</span>
                      <strong>
                        {selectedCourse.course?.type || "Not specified"}
                      </strong>
                    </div>
                    <div>
                      <span>Duration</span>
                      <strong>
                        {selectedCourse.course?.duration
                          ? `${selectedCourse.course.duration} ${
                              selectedCourse.course.durationUnit || ""
                            }`
                          : "Not specified"}
                      </strong>
                    </div>
                    <div>
                      <span>Admission date</span>
                      <strong>{formatDate(selectedCourse.admissionDate)}</strong>
                    </div>
                    <div>
                      <span>Total fees</span>
                      <strong>
                        {formatCurrency(selectedCourse.fees?.total)}
                      </strong>
                    </div>
                    <div>
                      <span>Outstanding</span>
                      <strong>
                        {formatCurrency(selectedCourse.fees?.outstanding)}
                      </strong>
                    </div>
                  </div>

                  {selectedCourse.course?.eligibility && (
                    <div className="student-course-modal__section">
                      <h3>Eligibility</h3>
                      <p>{selectedCourse.course.eligibility}</p>
                    </div>
                  )}
                </div>
              )}

              {detailsTab === "syllabus" && (
                <div className="student-course-modal__text">
                  {selectedCourse.course?.syllabus?.trim() ? (
                    <p>{selectedCourse.course.syllabus}</p>
                  ) : (
                    <div className="student-course-modal__empty">
                      <FiFileText />
                      <h3>Syllabus not available</h3>
                      <p>
                        The institute has not added syllabus details for this
                        course yet.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {detailsTab === "subjects" && (
                <div className="student-course-modal__subjects">
                  {selectedCourse.course?.subjects?.length ? (
                    selectedCourse.course.subjects.map((subject) => (
                      <article key={subject.id}>
                        <span className="student-course-modal__subject-icon">
                          <FiBookOpen />
                        </span>
                        <div>
                          <strong>{subject.name}</strong>
                          {subject.code && <small>{subject.code}</small>}
                          {subject.description && (
                            <p>{subject.description}</p>
                          )}
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="student-course-modal__empty">
                      <FiBookOpen />
                      <h3>No subjects linked</h3>
                      <p>
                        Subjects will appear here when they are linked to this
                        course in the institute's course settings.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <footer className="student-course-modal__footer">
              <span>
                <FiClock />
                Admission: {selectedCourse.admissionStatus || "Unknown"}
              </span>
              <button type="button" onClick={closeDetails}>
                Close
              </button>
            </footer>
          </section>
        </div>
      )} */}

    </section>
  );
}