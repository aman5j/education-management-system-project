
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiBookOpen,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiX,

} from "react-icons/fi";
import { FaRegCalendarAlt } from "react-icons/fa";
import { IoMdTime } from "react-icons/io";
import { IoBookOutline } from "react-icons/io5";
import { FaLayerGroup } from "react-icons/fa6";
import { FaBookOpen } from "react-icons/fa";
import { IoTimeSharp } from "react-icons/io5";




import { LuRefreshCcw } from "react-icons/lu";
import online from "../../assets/online.webp";
import offline from "../../assets/offline.webp";
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

const stripHtml = (html = "") => {
  const doc = new DOMParser().parseFromString(html, "text/html");

  return (doc.body.textContent || "")
    .replace(/\u00a0/g, " ")
    .trim();
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
    <article className={`sc-summary-card card-${color}`}>
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
  const navigate = useNavigate();


  const [courses, setCourses] = useState([]);
  const [recommendedCourses, setRecommendedCourses] = useState([]);
  const [dashboard, setDashboard] = useState(null);

  // const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);
  const [error, setError] = useState("");
  const [recommendationsError, setRecommendationsError] = useState("");

  const [activeTab, setActiveTab] = useState("active");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [imageErrors, setImageErrors] = useState({});

  const [enrollNotice, setEnrollNotice] = useState("");

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


  const upcomingExams = Array.isArray(dashboard?.upcomingExams)
    ? dashboard.upcomingExams
    : [];

  const studentName =
    dashboard?.student?.firstName ||
    dashboard?.student?.name ||
    "your";

  return (
    <section className="student-courses">
      <div className="page-header"><div><h1>My Courses</h1></div>

      </div>

      {/* <div className="sc-summary-grid">
        <SummaryCard
          icon={FiBookOpen}
          title="Active Courses"
          value={activeCourses.length}
          caption="Courses in progress"
          color="success"
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
      </div> */}


      <div className="filterheader">
        <div className="student-profile__tabs" role="tablist" aria-label="Course status">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "active"}
            className={activeTab === "active" ? "active" : ""}
            onClick={() => setActiveTab("active")}
          >
            Active Courses <span>{activeCourses.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "completed"}
            className={activeTab === "completed" ? "active" : ""}
            onClick={() => setActiveTab("completed")}
          >
            Completed Courses <span>{completedCourses.length}</span>
          </button>
        </div>

        <div className="right-filter">
          <div className="input-search ">

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

          </div>

          <div className="input-search ">

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

          </div>

          {/* <button
            type="button" className="themebtn themebtnline"
            onClick={() => {
              setCategoryFilter("all");
              setSearch("");
            }}
          >
            <LuRefreshCcw />

            Reset
          </button> */}
        </div>

      </div>




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
              <div className=" common-card  cardboxes" key={item.admissionId}>
                <div className="sc-course-card__cover-wrap">
                  <CourseImage
                    course={course}
                    imageKey={item.admissionId}
                    imageErrors={imageErrors}
                    setImageErrors={setImageErrors}
                  />
                  <span
                    className={`sc-status ${completed ? "sc-status--completed" : ""
                      }`}
                  >
                    {item.admissionStatus || "Active"}
                  </span>
                </div>

                <div className="cardbody course-details">
                  <div className="category-label">
                    {course.category && <span> {course.category}</span>}

                  </div>

                  {course.type && (
                    <img
                      src={course.type.toLowerCase() === "online" ? online : offline}
                      alt={course.type}
                      className="course-type-image"
                    />
                  )}

                  <h2>{course.title || "Course details unavailable"}</h2>
                  <p className="course-description">
                    {stripHtml(course.description)}
                  </p>
                  <ul>




                    <li>
                      <FaRegCalendarAlt />

                      <span> Admission:  {formatDate(item.admissionDate)}</span>
                    </li>
                    <li>
                      <IoTimeSharp />


                      <span>Duration: {course.duration || "Not specified"}  {course.durationUnit}</span>
                    </li>
                    <li>
                      <FaBookOpen />


                      <span>Lectures: {course.totalLectures || "Not specified"}</span>
                    </li>

                    <li>
                      <FaLayerGroup />

                      <span>Batch status: {item.batch?.status || "Not specified"}</span>
                    </li>

                  </ul>
                  <div className="sc-course-card__footer">

                    <label className="course-fee">{formatCurrency(fees.total)} <span className="wasprice">₹15000</span></label>

                    <button type="button" className="themebtn themebtn-outline"
                      onClick={() =>
                        navigate(`/student/courses/${item.admissionId}`)
                      }
                    >
                      View Details
                    </button>
                  </div>
                </div>


              </div>
            );
          })}
        </div>
      )}

      <div className="common-card">
        <div class="panel-header"><div><h3>Recommended Courses </h3>
          <p>
            Explore other published courses offered by your institute.
          </p>
        </div>
          <div className="sc-recommendations__heading">

            <span className="sc-recommendations__count">
              {recommendedCourses.length} available
            </span>
          </div>
        </div>

        <div className="cardbody">

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
            <div className="sc-course-grid">
              {recommendedCourses.map((course) => (
                <article className="common-card cardboxes" key={course.id}>
                  <div className="sc-course-card__cover-wrap">
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

                  <div className="cardbody course-details ">
                    <div className="category-label">
                      {course.category && <span>{course.category}</span>}
                      {/* {course.type && <span>{course.type}</span>} */}
                    </div>
                    <img
                      src={course.type.toLowerCase() === "online" ? online : offline}
                      alt={course.type}
                      className="course-type-image"
                    />
                    <h2>{course.title || "Course"}</h2>
                    <p className="course-description">
                      {plainText(course.description) ||
                        "Contact your institute to learn more about this course."}
                    </p>

                    <ul>


                      <li>
                        <IoTimeSharp />


                        <span>Duration:  {course.duration
                          ? `${course.duration} ${course.durationUnit || "Months"}`
                          : "Flexible duration"} </span>
                      </li>
                      <li>
                        <FaBookOpen />


                        <span>Lectures:   {Number(course.totalLectures) > 0 && (
                          <span>
                            {course.totalLectures}
                          </span>
                        )} </span>
                      </li>

                    </ul>


                    <div className="sc-course-card__footer">

                      <label className="course-fee">{formatCurrency(course.price)} <span className="wasprice"> {course.mrpVisible &&
                        Number(course.mrp) > Number(course.price) && (
                          <del>{formatCurrency(course.mrp)}</del>
                        )}</span></label>



                      <button
                        type="button"
                        className="themebtn themebtn-outline"
                        onClick={() => setEnrollNotice(course.id)}
                      >
                        Enroll Now <FiArrowRight />
                      </button>
                    </div>

                    {enrollNotice === course.id && (
                      <p className="sc-enroll-notice" role="status">
                        To enrol in {course.title}, please contact your institute
                        administrator. Your official admission record must be created
                        by the institute.
                      </p>
                    )}



                  </div>




                </article>
              ))}
            </div>
          )}
        </div>

      </div>

      {!loading && !error && courses.length > 0 && (
        <p className="sc-footnote">
          Your enrolled courses and fee information are linked to your own
          admission records.
        </p>
      )}


    </section>
  );
}
