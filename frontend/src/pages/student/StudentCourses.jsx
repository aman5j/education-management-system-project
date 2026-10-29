
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiFilter,
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

const plainText = (value = "") => {
  if (!value) return "";
  return String(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) =>
      String.fromCharCode(Number(code))
    )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .trim();
};

const admissionStatus = (item) =>
  String(item?.admissionStatus || "").trim().toLowerCase();

const isCompleted = (item) =>
  ["completed", "complete"].includes(admissionStatus(item));

function SummaryCard({ icon: Icon, title, value, caption, color }) {
  return (
    <article className={`sc-summary-card sc-summary-card--${color}`}>
      <div className="sc-summary-card__icon">
        <Icon aria-hidden="true" />
      </div>
      <div className="sc-summary-card__content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </article>
  );
}

function CourseImage({ course, imageKey, imageErrors, setImageErrors }) {
  const image = course?.image ? getAssetUrl(course.image) : "";
  const failed = Boolean(imageErrors[imageKey]);

  return (
    <div className="sc-course-cover">
      {image && !failed ? (
        <img
          src={image}
          alt={`${course?.title || "Course"} cover`}
          loading="lazy"
          onError={() =>
            setImageErrors((previous) => ({
              ...previous,
              [imageKey]: true,
            }))
          }
        />
      ) : (
        <div className="sc-course-cover__fallback">
          <FiBookOpen />
          <span>{course?.title || "Learning course"}</span>
        </div>
      )}
    </div>
  );
}

export default function StudentCourses() {
  const [courses, setCourses] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [error, setError] = useState("");
  const [recommendationsError, setRecommendationsError] = useState("");

  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [detailsTab, setDetailsTab] = useState("overview");

  const loadCourses = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await studentPortalService.getMyCourses();
      const list = response?.data?.courses;
      setCourses(Array.isArray(list) ? list : []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Unable to load your enrolled courses. Please try again."
      );
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRecommendations = useCallback(async () => {
    setRecommendationsLoading(true);
    setRecommendationsError("");

    try {
      const response =
        await studentPortalService.getRecommendedCourses();
      const list = response?.data?.courses;
      setRecommendedCourses(Array.isArray(list) ? list : []);
    } catch (err) {
      setRecommendationsError(
        err?.response?.data?.message ||
          "Unable to load recommended courses."
      );
      setRecommendedCourses([]);
    } finally {
      setRecommendationsLoading(false);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await studentPortalService.getDashboard();
      setDashboard(response?.data || null);
    } catch {
      // Course browsing still works if dashboard metrics are unavailable.
      setDashboard(null);
    }
  }, []);

  const refreshAll = useCallback(() => {
    loadCourses();
    loadRecommendations();
    loadDashboard();
  }, [loadCourses, loadRecommendations, loadDashboard]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedCourse(null);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const activeCourses = useMemo(
    () => courses.filter((item) => !isCompleted(item)),
    [courses]
  );

  const completedCourses = useMemo(
    () => courses.filter(isCompleted),
    [courses]
  );

  const categories = useMemo(() => {
    const values = courses
      .map((item) => item.course?.category)
      .filter(Boolean);
    return [...new Set(values)].sort((a, b) => a.localeCompare(b));
  }, [courses]);

  const visibleCourses = useMemo(() => {
    const source =
      activeTab === "completed" ? completedCourses : activeCourses;
    const query = search.trim().toLowerCase();

    return source.filter((item) => {
      const course = item.course || {};
      const batch = item.batch || {};
      const matchesSearch = !query ||
        [
          course.title,
          course.category,
          course.type,
          batch.name,
          batch.status,
          item.admissionStatus,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);

      const matchesCategory =
        categoryFilter === "all" || course.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [
    activeTab,
    activeCourses,
    completedCourses,
    search,
    categoryFilter,
  ]);

  const openDetails = (item) => {
    setSelectedCourse(item);
    setDetailsTab("overview");
  };

  const closeDetails = () => setSelectedCourse(null);

  const upcomingExams = Array.isArray(dashboard?.upcomingExams)
    ? dashboard.upcomingExams
    : [];

  const studentName =
    dashboard?.student?.firstName ||
    dashboard?.student?.name ||
    "your";

  return (
    <section className="student-courses">
      <header className="sc-heading">
        <div>
          <span className="sc-eyebrow">LEARNING</span>
          <h1>My Courses</h1>
          <p>
            View your enrolled courses, batch information, syllabus, and fee
            summary.
          </p>
        </div>

        <button
          type="button"
          className="sc-refresh"
          onClick={refreshAll}
          disabled={loading || recommendationsLoading}
        >
          <FiRefreshCw
            className={
              loading || recommendationsLoading ? "sc-spin" : ""
            }
          />
          Refresh
        </button>
      </header>

      <div className="sc-summary-grid">
        <SummaryCard
          icon={FiBookOpen}
          title="Active Courses"
          value={activeCourses.length}
          caption="Courses in progress"
          color="blue"
        />
        <SummaryCard
          icon={FiCheckCircle}
          title="Completed Courses"
          value={completedCourses.length}
          caption="Successfully completed"
          color="green"
        />
        <SummaryCard
          icon={FiClock}
          title="Upcoming Exams"
          value={upcomingExams.length}
          caption={
            upcomingExams.length === 5
              ? "Upcoming exams preview"
              : "Active hall tickets"
          }
          color="orange"
        />
        <SummaryCard
          icon={FiFileText}
          title="Certificates"
          value="—"
          caption="Certificate count not available yet"
          color="purple"
        />
      </div>

      <div className="sc-toolbar">
        <div className="sc-tabs" role="tablist" aria-label="Course status">
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

        <div className="sc-toolbar__actions">
          <label className="sc-search">
            <FiSearch />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search courses or batches..."
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

          <button
            type="button"
            className={`sc-filter-button ${showFilters ? "is-active" : ""}`}
            onClick={() => setShowFilters((value) => !value)}
            aria-expanded={showFilters}
          >
            <FiFilter /> Filter
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="sc-filter-panel">
          <label>
            Course category
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setCategoryFilter("all");
              setSearch("");
            }}
          >
            Reset filters
          </button>
        </div>
      )}

      {error && (
        <div className="sc-error" role="alert">
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
        <div className="sc-state">
          <FiRefreshCw className="sc-spin" />
          <h2>Loading your courses</h2>
          <p>Retrieving your admission records securely.</p>
        </div>
      ) : !error && visibleCourses.length === 0 ? (
        <div className="sc-state">
          <FiBookOpen />
          <h2>
            {search || categoryFilter !== "all"
              ? "No matching courses"
              : activeTab === "completed"
                ? "No completed courses yet"
                : "No active courses found"}
          </h2>
          <p>
            {search || categoryFilter !== "all"
              ? "Try changing your search or filters."
              : "Your admission-linked courses will appear here. Contact your institute if you believe a course is missing."}
          </p>
          {(search || categoryFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategoryFilter("all");
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="sc-course-grid">
          {visibleCourses.map((item) => {
            const course = item.course || {};
            const fees = item.fees || {};
            const completed = isCompleted(item);
            const percentage = Math.min(
              100,
              Math.max(0, Number(fees.paymentPercentage || 0))
            );

            return (
              <article className="sc-course-card" key={item.admissionId}>
                <div className="sc-course-card__cover-wrap">
                  <CourseImage
                    course={course}
                    imageKey={item.admissionId}
                    imageErrors={imageErrors}
                    setImageErrors={setImageErrors}
                  />
                  <span
                    className={`sc-status ${
                      completed ? "sc-status--completed" : ""
                    }`}
                  >
                    {item.admissionStatus || "Active"}
                  </span>
                </div>

                <div className="sc-course-card__body">
                  <div className="sc-meta">
                    {course.category && <span>{course.category}</span>}
                    {course.type && <span>{course.type}</span>}
                  </div>

                  <h2>{course.title || "Course details unavailable"}</h2>

                  <div className="sc-batch">
                    <FiBookOpen />
                    <span>{item.batch?.name || "Batch not available"}</span>
                  </div>

                  <p className="sc-batch-status">
                    Batch status: {item.batch?.status || "Not specified"}
                  </p>

                  <div className="sc-fee">
                    <div className="sc-fee__line">
                      <span>Fee paid</span>
                      <strong>{percentage}%</strong>
                    </div>
                    <div
                      className="sc-progress"
                      role="progressbar"
                      aria-label="Course fees paid"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percentage}
                    >
                      <span style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="sc-fee__line sc-fee__values">
                      <span>Paid {formatCurrency(fees.paid)}</span>
                      <strong>
                        {Number(fees.outstanding || 0) > 0
                          ? `${formatCurrency(fees.outstanding)} due`
                          : "No outstanding fees"}
                      </strong>
                    </div>
                  </div>

                  <div className="sc-course-card__footer">
                    <span>
                      <FiCalendar />
                      {formatDate(item.admissionDate)}
                    </span>
                    <button type="button" onClick={() => openDetails(item)}>
                      View Details <FiArrowRight />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <section className="sc-recommendations">
        <div className="sc-recommendations__heading">
          <div>
            <span className="sc-eyebrow">DISCOVER</span>
            <h2>Recommended Courses</h2>
            <p>
              Explore other published courses offered by your institute.
            </p>
          </div>
          <span className="sc-recommendations__count">
            {recommendedCourses.length} available
          </span>
        </div>

        {recommendationsError && (
          <div className="sc-error" role="alert">
            <div>
              <strong>Recommendations unavailable</strong>
              <p>{recommendationsError}</p>
            </div>
            <button type="button" onClick={loadRecommendations}>
              Try again
            </button>
          </div>
        )}

        {recommendationsLoading ? (
          <div className="sc-recommendations__message">
            <FiRefreshCw className="sc-spin" />
            Finding published courses...
          </div>
        ) : recommendationsError ? null : recommendedCourses.length === 0 ? (
          <div className="sc-recommendations__message">
            No additional published courses are available right now.
          </div>
        ) : (
          <div className="sc-recommendation-grid">
            {recommendedCourses.map((course) => (
              <article className="sc-recommendation-card" key={course.id}>
                <div className="sc-recommendation-card__cover">
                  <CourseImage
                    course={course}
                    imageKey={`recommended-${course.id}`}
                    imageErrors={imageErrors}
                    setImageErrors={setImageErrors}
                  />
                  {course.popular && (
                    <span className="sc-popular-badge">Popular</span>
                  )}
                </div>

                <div className="sc-recommendation-card__body">
                  <div className="sc-meta">
                    {course.category && <span>{course.category}</span>}
                    {course.type && <span>{course.type}</span>}
                  </div>
                  <h3>{course.title || "Course"}</h3>
                  <p className="sc-recommendation-description">
                    {plainText(course.description) ||
                      "Contact your institute to learn more about this course."}
                  </p>
                  <div className="sc-recommendation-details">
                    <span>
                      <FiClock />
                      {course.duration
                        ? `${course.duration} ${course.durationUnit || "Months"}`
                        : "Flexible duration"}
                    </span>
                    {Number(course.totalLectures) > 0 && (
                      <span>
                        <FiBookOpen /> {course.totalLectures} lectures
                      </span>
                    )}
                  </div>
                  <div className="sc-recommendation-price">
                    <strong>{formatCurrency(course.price)}</strong>
                    {course.mrpVisible &&
                      Number(course.mrp) > Number(course.price) && (
                        <del>{formatCurrency(course.mrp)}</del>
                      )}
                  </div>
                  <p className="sc-recommendation-note">
                    Contact the institute to enquire or enrol.
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {!loading && !error && courses.length > 0 && (
        <p className="sc-footnote">
          Your enrolled courses and fee information are linked to your own
          admission records.
        </p>
      )}

      {selectedCourse && (
        <div
          className="sc-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails();
          }}
        >
          <section
            className="sc-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sc-modal-title"
          >
            <header className="sc-modal__header">
              <div>
                <span className="sc-eyebrow">COURSE DETAILS</span>
                <h2 id="sc-modal-title">
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

            <div className="sc-modal__tabs" role="tablist">
              {[
                ["overview", "Overview"],
                ["syllabus", "Syllabus"],
                ["subjects", "Subjects"],
              ].map(([key, label]) => (
                <button
                  type="button"
                  key={key}
                  role="tab"
                  aria-selected={detailsTab === key}
                  className={detailsTab === key ? "is-active" : ""}
                  onClick={() => setDetailsTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="sc-modal__content">
              {detailsTab === "overview" && (
                <>
                  <p className="sc-modal__description">
                    {plainText(selectedCourse.course?.description) ||
                      "No course description has been provided."}
                  </p>
                  <div className="sc-modal__facts">
                    <div>
                      <span>Batch</span>
                      <strong>{selectedCourse.batch?.name || "—"}</strong>
                    </div>
                    <div>
                      <span>Course type</span>
                      <strong>{selectedCourse.course?.type || "—"}</strong>
                    </div>
                    <div>
                      <span>Duration</span>
                      <strong>
                        {selectedCourse.course?.duration
                          ? `${selectedCourse.course.duration} ${
                              selectedCourse.course.durationUnit || "Months"
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
                  <div className="sc-modal__section">
                    <h3>Eligibility</h3>
                    <p>
                      {plainText(selectedCourse.course?.eligibility) ||
                        "No eligibility information has been provided."}
                    </p>
                  </div>
                </>
              )}

              {detailsTab === "syllabus" && (
                <div className="sc-modal__text">
                  {plainText(selectedCourse.course?.syllabus) ? (
                    <p>{plainText(selectedCourse.course.syllabus)}</p>
                  ) : (
                    <p>Syllabus details have not been added yet.</p>
                  )}
                </div>
              )}

              {detailsTab === "subjects" && (
                Array.isArray(selectedCourse.course?.subjects) &&
                selectedCourse.course.subjects.length > 0 ? (
                  <div className="sc-modal__subjects">
                    {selectedCourse.course.subjects.map((subject) => (
                      <article key={subject.id}>
                        <span className="sc-subject-icon">
                          <FiBookOpen />
                        </span>
                        <div>
                          <strong>{subject.name || "Subject"}</strong>
                          {subject.code && <small>{subject.code}</small>}
                          {plainText(subject.description) && (
                            <p>{plainText(subject.description)}</p>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="sc-modal__empty">
                    <FiBookOpen />
                    <h3>No subjects linked</h3>
                    <p>
                      Subject details will appear here when they are linked to
                      this course in the institute records.
                    </p>
                  </div>
                )
              )}
            </div>

            <footer className="sc-modal__footer">
              <span>
                Admission status: {selectedCourse.admissionStatus || "—"}
              </span>
              <button type="button" onClick={closeDetails}>
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  );
}
