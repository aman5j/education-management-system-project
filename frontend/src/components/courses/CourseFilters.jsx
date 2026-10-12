import React from "react";

const CourseFilters = ({
  filters,
  onChange,
  onReset,
}) => {
  return (
    <div className="course-filters">
      <div className="course-filter-group course-search">
        <label>Search Course</label>

        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={onChange}
          placeholder="Search course..."
        />
      </div>

      <div className="course-filter-group">
        <label>Status</label>

        <select
          name="status"
          value={filters.status}
          onChange={onChange}
        >
          <option value="">All Status</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      <div className="course-filter-group">
        <label htmlFor="courseType">Course Type</label>

        <select
          id="courseType"
          name="courseType"
          value={filters.courseType}
          onChange={onChange}
        >
          <option value="">All Types</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
        </select>
      </div>

      <div className="course-filter-group">
        <label>Category</label>

        <input
          type="text"
          name="courseCategory"
          value={filters.courseCategory}
          onChange={onChange}
          placeholder="Category"
        />
      </div>

      <button
        type="button"
        className="course-reset-btn"
        onClick={onReset}
      >
        Reset
      </button>
    </div>
  );
};

export default CourseFilters;