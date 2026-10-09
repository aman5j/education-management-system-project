
import { FiRefreshCw, FiSearch } from "react-icons/fi";

const getCourseId = (course) => course?._id || course?.id || "";

const getCourseLabel = (course) =>
  course?.courseTitle ||
  course?.courseName ||
  course?.name ||
  course?.title ||
  course?.course_name ||
  course?.code ||
  "Unnamed course";

export default function SubjectFilters({
  filters,
  courses = [],
  onChange,
  onReset,
}) {
  const handleChange = (event) => {
    const { name, value } = event.target;
    onChange(name, value);
  };

  return (
    <div className="subject-filters">
      <div className="subject-filter-group subject-search">
        <label htmlFor="subject-search">Search</label>

        <div className="subject-search-box">
          <FiSearch aria-hidden="true" />

          <input
            id="subject-search"
            type="search"
            name="search"
            placeholder="Search by subject name or code"
            value={filters.search}
            onChange={handleChange}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="subject-filter-group">
        <label htmlFor="subject-course-filter">Course</label>

        <select
          id="subject-course-filter"
          name="course_id"
          value={filters.course_id}
          onChange={handleChange}
        >
          <option value="">All Courses</option>

          {courses.map((course) => {
            const courseId = getCourseId(course);

            if (!courseId) return null;

            return (
              <option key={courseId} value={courseId}>
                {getCourseLabel(course)}
                {course.courseType ? ` (${course.courseType})` : ""}
              </option>
            );
          })}
        </select>
      </div>

      <div className="subject-filter-group">
        <label htmlFor="subject-status-filter">Status</label>

        <select
          id="subject-status-filter"
          name="status"
          value={filters.status}
          onChange={handleChange}
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      <button
        type="button"
        className="subject-reset-btn"
        onClick={onReset}
      >
        <FiRefreshCw aria-hidden="true" />
        Reset
      </button>
    </div>
  );
}
