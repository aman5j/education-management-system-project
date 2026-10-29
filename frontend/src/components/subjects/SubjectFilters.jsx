
import { FiRefreshCw, FiSearch } from "react-icons/fi";

export default function SubjectFilters({ filters, onChange, onReset }) {
  const handleChange = (event) => {
    onChange(event.target.name, event.target.value);
  };

  return (
    <div className="common-card-filters">
      <div className="input-search">
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

      <div className="input-search">
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

      <button type="button" className="themebtn themebtnline" onClick={onReset}>
        <FiRefreshCw aria-hidden="true" />
        Reset
      </button>
    </div>
  );
}
