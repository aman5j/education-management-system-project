
import "./Pagination.css";

const Pagination = ({
  page = 1,
  totalPages = 0,
  total = 0,
  itemCount = 0,
  itemLabel = "records",
  limit = 10,
  loading = false,
  onPageChange,
  onLimitChange,
}) => {
  const safeTotalPages = Math.max(Number(totalPages) || 0, 0);
  const safePage = Math.max(Number(page) || 1, 1);

  const pageNumbers = Array.from(
    { length: safeTotalPages },
    (_, index) => index + 1
  ).slice(
    Math.max(safePage - 3, 0),
    Math.min(safePage + 2, safeTotalPages)
  );

  return (
    <div className="ems-pagination-footer">
      <div className="ems-pagination-count">
        Showing {itemCount} of {total} {itemLabel}
      </div>

      <div className="ems-pagination-buttons">
        <button
          type="button"
          disabled={loading || safePage <= 1}
          onClick={() => onPageChange?.(safePage - 1)}
        >
          Previous
        </button>

        {pageNumbers.map((pageNumber) => (
          <button
            type="button"
            key={pageNumber}
            className={
              pageNumber === safePage
                ? "ems-pagination-active"
                : ""
            }
            aria-current={
              pageNumber === safePage ? "page" : undefined
            }
            disabled={loading}
            onClick={() => onPageChange?.(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}

        <button
          type="button"
          disabled={loading || safePage >= safeTotalPages}
          onClick={() => onPageChange?.(safePage + 1)}
        >
          Next
        </button>
      </div>

      <select
        value={limit}
        disabled={loading}
        onChange={(event) =>
          onLimitChange?.(Number(event.target.value))
        }
        aria-label="Records per page"
      >
        <option value={10}>10 / page</option>
        <option value={25}>25 / page</option>
        <option value={50}>50 / page</option>
      </select>
    </div>
  );
};

export default Pagination;
