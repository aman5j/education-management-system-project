import {
  FiFilter,
  FiRefreshCw,
  FiSearch,
} from "react-icons/fi";

const AdmissionFilters = ({
  filters,
  onChange,
  onReset,
}) => {
  return (
    <div className="admission-filters">
      <div className="admission-search">
        <FiSearch />

        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={onChange}
          placeholder="Search by student, roll no, course..."
        />
      </div>

      <div className="admission-filter-field">
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

          <option value="cancelled">
            Cancelled
          </option>
        </select>
      </div>

      <input
        type="text"
        name="course"
        value={filters.course}
        onChange={onChange}
        placeholder="Course"
      />

      <input
        type="text"
        name="batch"
        value={filters.batch}
        onChange={onChange}
        placeholder="Batch"
      />

      <input
        type="date"
        name="admittedFrom"
        value={filters.admittedFrom}
        onChange={onChange}
        title="Admitted From"
      />

      <input
        type="date"
        name="admittedTo"
        value={filters.admittedTo}
        onChange={onChange}
        title="Admitted To"
      />

      <button
        type="button"
        className="admission-reset-button"
        onClick={onReset}
      >
        <FiRefreshCw />
        Reset
      </button>
    </div>
  );
};

export default AdmissionFilters;