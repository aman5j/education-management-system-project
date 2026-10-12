import React, { useEffect, useState } from "react";
import { getCategories } from "../../services/categoryService";

const CourseFilters = ({
  filters,
  onChange,
  onReset,
}) => {
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setCategoriesLoading(true);
      setCategoriesError("");

      try {
        const response = await getCategories({
          status: "Active",
          limit: 100,
          sortBy: "categoryName",
          sortOrder: "asc",
        });

        const payload = response?.data;

        const categoryList = Array.isArray(payload?.data?.categories)
          ? payload.data.categories
          : Array.isArray(payload?.data)
            ? payload.data
            : [];

        if (!cancelled) {
          setCategories(categoryList);
        }
      } catch (error) {
        if (!cancelled) {
          setCategoriesError(
            error?.response?.data?.message ||
              "Unable to load course categories."
          );
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    };

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="course-filters">
      {/* Search */}
      <div className="course-filter-group course-search">
        <label htmlFor="course-filter-search">Search Course</label>

        <input
          id="course-filter-search"
          type="text"
          name="search"
          value={filters.search || ""}
          onChange={onChange}
          placeholder="Search course..."
        />
      </div>

      {/* Status */}
      <div className="course-filter-group">
        <label htmlFor="course-filter-status">Status</label>

        <select
          id="course-filter-status"
          name="status"
          value={filters.status || ""}
          onChange={onChange}
        >
          <option value="">All Status</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
          <option value="Archived">Archived</option>
        </select>
      </div>

      {/* Course Type */}
      <div className="course-filter-group">
        <label htmlFor="course-filter-type">Course Type</label>

        <select
          id="course-filter-type"
          name="courseType"
          value={filters.courseType || ""}
          onChange={onChange}
        >
          <option value="">All Types</option>
          <option value="Online">Online</option>
          <option value="Offline">Offline</option>
        </select>
      </div>

      {/* Database-driven Course Category */}
      <div className="course-filter-group">
        <label htmlFor="course-filter-category">
          Course Category
        </label>

        <select
          id="course-filter-category"
          name="courseCategory"
          value={filters.courseCategory || ""}
          onChange={onChange}
          disabled={categoriesLoading}
        >
          <option value="">
            {categoriesLoading
              ? "Loading categories..."
              : "All Categories"}
          </option>

          {categories.map((category) => (
            <option
              key={category._id}
              value={category.categoryName}
            >
              {category.categoryName}
            </option>
          ))}
        </select>

        {categoriesError && (
          <small className="course-field-error" role="alert">
            {categoriesError}
          </small>
        )}
      </div>

      {/* Reset */}
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
