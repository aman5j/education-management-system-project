import {
  useMemo,
} from "react";

import {
  FiFilter,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";

const StudentFilters = ({
  filters,
  courses = [],
  batches = [],
  onChange,
  onReset,
}) => {
  const availableBatches =
    useMemo(() => {
      if (!filters.course_id) {
        return batches;
      }

      return batches.filter(
        (batch) => {
          const batchCourseId =
            batch?.course_id?._id ||
            batch?.course_id;

          return (
            String(batchCourseId) ===
            String(filters.course_id)
          );
        }
      );
    }, [
      filters.course_id,
      batches,
    ]);

  return (
    <div className="student-filters">

      <div className="student-search">
        <FiSearch />

        <input
          type="search"
          name="search"
          value={filters.search}
          onChange={onChange}
          placeholder="Search by name, roll no, mobile or email..."
        />
      </div>

      <div className="student-filter-field">
        <FiFilter />

        <select
          name="status"
          value={filters.status}
          onChange={onChange}
        >
          <option value="">
            All Status
          </option>

          <option value="active">
            Active
          </option>

          <option value="inactive">
            Inactive
          </option>

          <option value="suspended">
            Suspended
          </option>
        </select>
      </div>

      {/* COURSE */}
      <select
        className="student-filter-input"
        name="course_id"
        value={filters.course_id}
        onChange={onChange}
      >
        <option value="">
          All Courses
        </option>

        {courses.map((course) => (
          <option
            key={course._id}
            value={course._id}
          >
            {course.courseTitle}
          </option>
        ))}
      </select>

      {/* BATCH */}
      <select
        className="student-filter-input"
        name="batch_id"
        value={filters.batch_id}
        onChange={onChange}
        disabled={
          Boolean(filters.course_id) &&
          !availableBatches.length
        }
      >
        <option value="">
          All Batches
        </option>

        {availableBatches.map(
          (batch) => (
            <option
              key={batch._id}
              value={batch._id}
            >
              {batch.batch_name}
            </option>
          )
        )}
      </select>

      <button
        type="button"
        className="student-reset-button"
        onClick={onReset}
        title="Reset filters"
      >
        <FiRefreshCw />
        Reset
      </button>
    </div>
  );
};

export default StudentFilters;