import React from "react";

import {
  Link,
} from "react-router-dom";

const BatchTable = ({
  batches,
  onDelete,
}) => {
  if (
    !batches ||
    batches.length === 0
  ) {
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
            <th>
              Batch Name
            </th>

            <th>
              Course
            </th>

            <th>
              Max Seats
            </th>

            <th>
              Available Seats
            </th>

            <th>
              Filled
            </th>

            <th>
              Status
            </th>

            <th>
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {batches.map(
            (batch) => {
              const occupied =
                Math.max(
                  batch.max_seats -
                    batch.available_seats,
                  0
                );

              return (
                <tr
                  key={
                    batch._id
                  }
                >
                  <td>
                    <strong>
                      {
                        batch.batch_name
                      }
                    </strong>
                  </td>

                  <td>
                    {
                      batch
                        .course_id
                        ?.courseTitle ||
                      "—"
                    }
                  </td>

                  <td>
                    {
                      batch.max_seats
                    }
                  </td>

                  <td>
                    <span className="batch-available-seats">
                      {
                        batch.available_seats
                      }
                    </span>
                  </td>

                  <td>
                    {occupied}
                  </td>

                  <td>
                    <span
                      className={`batch-status-badge ${batch.status
                        .toLowerCase()
                        .replace(
                          /\s+/g,
                          "-"
                        )}`}
                    >
                      {
                        batch.status
                      }
                    </span>
                  </td>

                  <td>
                    <div className="batch-actions">
                      <Link
                        to={`/admin/batches/${batch._id}`}
                        className="batch-action view"
                      >
                        View
                      </Link>

                      <Link
                        to={`/admin/batches/${batch._id}/edit`}
                        className="batch-action edit"
                      >
                        Edit
                      </Link>

                      <button
                        type="button"
                        className="batch-action delete"
                        onClick={() =>
                          onDelete(
                            batch._id
                          )
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            }
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BatchTable;