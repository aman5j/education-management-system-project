import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiBookOpen,
  FiCalendar,
  FiRefreshCw,
  FiSearch,
  FiClock,
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

  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [recommendationsError, setRecommendationsError] = useState("");

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


  const loadRecommendations = useCallback(async () => {
  setRecommendationsLoading(true);
  setRecommendationsError("");

  try {
    const response =
      await studentPortalService.getRecommendedCourses();

    setRecommendedCourses(
      Array.isArray(response?.data?.courses)
        ? response.data.courses
        : []
    );
  } catch (err) {
    setRecommendedCourses([]);
    setRecommendationsError(
      err?.response?.data?.message ||
        "Unable to load recommended courses."
    );
  } finally {
    setRecommendationsLoading(false);
  }
}, []);


  useEffect(() => {
    loadCourses();
    loadRecommendations();
  }, [loadCourses, loadRecommendations]);

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
          onClick={() => {
            loadCourses();
            loadRecommendations();
          }}
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

      <section className="student-recommendations">
        <div className="student-recommendations__heading">
          <div>
            <span className="student-courses__eyebrow">
              DISCOVER
            </span>
            <h2>Recommended Courses</h2>
            <p>
              Explore other courses offered by your institute.
            </p>
          </div>

          <span className="student-recommendations__count">
            {recommendedCourses.length} available
          </span>
        </div>

        {recommendationsError && (
          <div className="student-courses__error" role="alert">
            <div>
              <strong>Recommendations unavailable</strong>
              <p>{recommendationsError}</p>
            </div>

            <button
              type="button"
              onClick={loadRecommendations}
              disabled={recommendationsLoading}
            >
              Try again
            </button>
          </div>
        )}

        {recommendationsLoading ? (
          <div className="student-recommendations__message">
            <FiRefreshCw className="student-courses__spin" />
            <span>Finding courses for you...</span>
          </div>
        ) : !recommendationsError &&
          recommendedCourses.length === 0 ? (
          <div className="student-recommendations__message">
            <FiBookOpen />
            <span>
              You’re all caught up! No additional published courses
              are available right now.
            </span>
          </div>
        ) : (
          <div className="student-recommendations__grid">
            {recommendedCourses.map((course) => {
              const imageUrl = course.image
                ? getAssetUrl(course.image)
                : "";

              const imageKey = `recommended-${course.id}`;
              const imageFailed = Boolean(imageErrors[imageKey]);

              return (
                <article
                  className="student-recommendation-card"
                  key={course.id}
                >
                  <div className="student-recommendation-card__cover">
                    {imageUrl && !imageFailed ? (
                      <img
                        src={imageUrl}
                        alt={`${course.title} course`}
                        loading="lazy"
                        onError={() =>
                          setImageErrors((previous) => ({
                            ...previous,
                            [imageKey]: true,
                          }))
                        }
                      />
                    ) : (
                      <div className="student-course-card__cover-fallback">
                        <FiBookOpen />
                      </div>
                    )}

                    {course.popular && (
                      <span className="student-recommendation-card__badge">
                        Popular
                      </span>
                    )}
                  </div>

                  <div className="student-recommendation-card__body">
                    <div className="student-course-card__meta">
                      {course.category && <span>{course.category}</span>}
                      {course.type && <span>{course.type}</span>}
                    </div>

                    <h3>{course.title}</h3>

                    <p className="student-recommendation-card__description">
                      {course.description
                        ? course.description
                            .replace(/<[^>]*>/g, " ")
                            .replace(/&nbsp;/gi, " ")
                            .replace(/&amp;/gi, "&")
                            .replace(/&lt;/gi, "<")
                            .replace(/&gt;/gi, ">")
                            .replace(/&#39;|&apos;/gi, "'")
                            .replace(/&quot;/gi, '"')
                            .replace(/\s+/g, " ")
                            .trim()
                        : "Contact your institute to learn more about this course."}
                    </p>

                    <div className="student-recommendation-card__details">
                      <span>
                        <FiClock />
                        {course.duration
                          ? `${course.duration} ${course.durationUnit || "Months"}`
                          : "Flexible duration"}
                      </span>

                      {course.totalLectures > 0 && (
                        <span>
                          <FiBookOpen />
                          {course.totalLectures} lectures
                        </span>
                      )}
                    </div>

                    <div className="student-recommendation-card__price">
                      <strong>
                        {formatCurrency(course.price)}
                      </strong>

                      {course.mrpVisible &&
                        course.mrp > course.price && (
                          <del>{formatCurrency(course.mrp)}</del>
                        )}
                    </div>

                    <p className="student-recommendation-card__note">
                      Available through your institute
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>


      {!loading && !error && courses.length > 0 && (
        <p className="student-courses__footnote">
          Showing your own admission-linked course records. Course content
          appears when it is available in the institute's records.
        </p>
      )}

      


    </section>
  );
}