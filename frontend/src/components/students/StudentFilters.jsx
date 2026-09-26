import {
  FiFilter,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";

const StudentFilters = ({
  filters,
  onChange,
  onReset,
}) => {
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

      <input
        className="student-filter-input"
        name="course"
        value={filters.course}
        onChange={onChange}
        placeholder="Course"
      />

      <input
        className="student-filter-input"
        name="batch"
        value={filters.batch}
        onChange={onChange}
        placeholder="Batch"
      />

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