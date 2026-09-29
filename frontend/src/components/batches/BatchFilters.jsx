import React from "react";

const BatchFilters = ({
  filters,
  courses,
  onChange,
  onReset,
}) => {
  return (
    <div className="batch-filters">
      <div className="batch-filter-field">
        <input
          type="text"
          name="search"
          value={
            filters.search
          }
          onChange={onChange}
          placeholder="Search batch..."
        />
      </div>

      <div className="batch-filter-field">
        <select
          name="course_id"
          value={
            filters.course_id
          }
          onChange={onChange}
        >
          <option value="">
            All Courses
          </option>

          {courses.map(
            (course) => (
              <option
                key={
                  course._id
                }
                value={
                  course._id
                }
              >
                {course.courseTitle}
              </option>
            )
          )}
        </select>
      </div>

      <div className="batch-filter-field">
        <select
          name="status"
          value={
            filters.status
          }
          onChange={onChange}
        >
          <option value="">
            All Status
          </option>

          <option value="Upcoming">
            Upcoming
          </option>

          <option value="Ongoing">
            Ongoing
          </option>

          <option value="Closed">
            Closed
          </option>
        </select>
      </div>

      <button
        type="button"
        className="batch-reset-button"
        onClick={onReset}
      >
        Reset
      </button>
    </div>
  );
};

export default BatchFilters;