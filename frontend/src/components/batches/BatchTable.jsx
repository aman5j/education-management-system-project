
import React from "react";
import { Link, useLocation } from "react-router-dom";

const BatchTable = ({
  batches = [],
  onDelete,
  canView = false,
  canEdit = false,
  canDelete = false,
}) => {
  const location = useLocation();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/batches"
    : "/admin/batches";

  if (!Array.isArray(batches) || batches.length === 0) {
    return (
      <div className="batch-empty">
        No batches found.
      </div>
    );
  }

  return (
    <div className="batch-table-wrapper">
      <table className="batch-table">
        <thead>
          <tr>
            <th>Batch Name</th>
            <th>Course</th>
            <th>Max Seats</th>
            <th>Available Seats</th>
            <th>Filled</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {batches.map((batch) => {
            const maxSeats = Number(batch.max_seats) || 0;
            const availableSeats = Number(batch.available_seats) || 0;
            const occupiedSeats = Math.max(
              maxSeats - availableSeats,
              0
            );

            const status = String(batch.status || "Upcoming");

            return (
              <tr key={batch._id}>
                <td>
                  <strong>{batch.batch_name || "—"}</strong>
                </td>

                <td>
                  {batch.course_id?.courseTitle || "—"}
                </td>

                <td>{maxSeats}</td>

                <td>
                  <span className="batch-available-seats">
                    {availableSeats}
                  </span>
                </td>

                <td>{occupiedSeats}</td>

                <td>
                  <span
                    className={`batch-status-badge ${status
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {status}
                  </span>
                </td>

                <td>
                  <div className="batch-actions">
                    {canView && (
                      <Link
                        to={`${basePath}/${batch._id}`}
                        className="batch-action view"
                      >
                        View
                      </Link>
                    )}

                    {canEdit && (
                      <Link
                        to={`${basePath}/${batch._id}/edit`}
                        className="batch-action edit"
                      >
                        Edit
                      </Link>
                    )}

                    {canDelete && (
                      <button
                        type="button"
                        className="batch-action delete"
                        onClick={() => onDelete?.(batch._id)}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default BatchTable;
