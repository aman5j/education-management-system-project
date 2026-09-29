import React, {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  getBatch,
} from "../../../services/batchService";

const ViewBatch = () => {
  const {
    id,
  } = useParams();

  const [
    batch,
    setBatch,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const loadBatch =
      async () => {
        try {
          const response =
            await getBatch(
              id
            );

          setBatch(
            response?.data?.data
          );
        } catch (requestError) {
          console.error(
            "Failed to load batch:",
            requestError
          );

          setError(
            requestError?.response
              ?.data?.message ||
              "Failed to load batch."
          );
        } finally {
          setLoading(false);
        }
      };

    loadBatch();
  }, [id]);

  if (loading) {
    return (
      <div className="batch-loading">
        Loading batch...
      </div>
    );
  }

  if (error) {
    return (
      <div className="batch-list-error">
        {error}
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="batch-list-error">
        Batch not found.
      </div>
    );
  }

  const occupiedSeats =
    Math.max(
      batch.max_seats -
        batch.available_seats,
      0
    );

  return (
    <div className="batch-page">
      <div className="batch-page-header">
        <div>
          <h1>
            View Batch
          </h1>

          <p>
            Batch details.
          </p>
        </div>

        <Link
          to={`/admin/batches/${id}/edit`}
          className="batch-add-button"
        >
          Edit Batch
        </Link>
      </div>

      <div className="batch-card">
        <div className="batch-details">
          <div className="batch-detail-item">
            <span>
              Batch Name
            </span>

            <strong>
              {
                batch.batch_name
              }
            </strong>
          </div>

          <div className="batch-detail-item">
            <span>
              Course
            </span>

            <strong>
              {
                batch.course_id
                  ?.courseTitle ||
                "—"
              }
            </strong>
          </div>

          <div className="batch-detail-item">
            <span>
              Maximum Seats
            </span>

            <strong>
              {
                batch.max_seats
              }
            </strong>
          </div>

          <div className="batch-detail-item">
            <span>
              Available Seats
            </span>

            <strong>
              {
                batch.available_seats
              }
            </strong>
          </div>

          <div className="batch-detail-item">
            <span>
              Occupied Seats
            </span>

            <strong>
              {
                occupiedSeats
              }
            </strong>
          </div>

          <div className="batch-detail-item">
            <span>
              Status
            </span>

            <strong>
              {
                batch.status
              }
            </strong>
          </div>

          <div className="batch-detail-item">
            <span>
              Created
            </span>

            <strong>
              {batch.createdAt
                ? new Date(
                    batch.createdAt
                  ).toLocaleString()
                : "—"}
            </strong>
          </div>

          <div className="batch-detail-item">
            <span>
              Updated
            </span>

            <strong>
              {batch.updatedAt
                ? new Date(
                    batch.updatedAt
                  ).toLocaleString()
                : "—"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBatch;