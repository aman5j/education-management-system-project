import React from "react";

const CategoryFilters = ({
  filters,
  onChange,
  onReset,
}) => {
  return (
    <div className="category-filters">
      <div className="category-filter-field">
        <input
          type="text"
          name="search"
          value={
            filters.search
          }
          onChange={onChange}
          placeholder="Search category..."
        />
      </div>

      <div className="category-filter-field">
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

          <option value="Active">
            Active
          </option>

          <option value="Inactive">
            Inactive
          </option>
        </select>
      </div>

      <button
        type="button"
        className="category-reset-button"
        onClick={onReset}
      >
        Reset
      </button>
    </div>
  );
};

export default CategoryFilters;