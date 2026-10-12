
import { FiRefreshCw, FiSearch } from "react-icons/fi";

export default function SubjectFilters({ filters, onChange, onReset }) {
  const handleChange = (event) => {
    onChange(event.target.name, event.target.value);
  };

  return (
    <div className="subject-filters subject-filters-independent">
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

      <button type="button" className="subject-reset-btn" onClick={onReset}>
        <FiRefreshCw aria-hidden="true" />
        Reset
      </button>
    </div>
  );
}
