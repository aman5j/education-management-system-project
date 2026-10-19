import React from "react";
import { FiSearch } from "react-icons/fi";

const CategoryFilters = ({
  filters,
  onChange,
  onReset,
}) => {
  return (
    <div className="common-card-filters">
      <div className="input-search">
        <input
          type="text"
          name="search"
          value={
            filters.search
          }
          onChange={onChange}
          placeholder="Search category..."
        />
         <FiSearch />

      </div>

      <div className="input-search">
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
        className="admission-reset-button"
        onClick={onReset}
      >
        Reset
      </button>
    </div>
  );
};

export default CategoryFilters;