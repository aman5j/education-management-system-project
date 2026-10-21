
import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import { getBatch } from "../../../services/batchService";

const ViewBatch = () => {
  const { id } = useParams();
  const location = useLocation();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/batches"
    : "/admin/batches";

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadBatch = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getBatch(id);
        if (!cancelled) setBatch(response?.data?.data || null);
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError?.response?.data?.message ||
              "Failed to load batch."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBatch();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return <div className="batch-loading">Loading batch...</div>;
  }

  if (error || !batch) {
    return (
      <div className="batch-list-error" role="alert">
        {error || "Batch not found."}
      </div>
    );
  }

  const maxSeats = Number(batch.max_seats) || 0;
  const availableSeats = Number(batch.available_seats) || 0;
  const occupiedSeats = Math.max(maxSeats - availableSeats, 0);

  return (
    <div className="batch-page">
      <div className="batch-page-header">
        <div>
          <h1>View Batch</h1>
          <p>Batch details.</p>
        </div>

        <Link
          to={`${basePath}/${id}/edit`}
          className="batch-add-button"
        >
          Edit Batch
        </Link>
      </div>

      <div className="batch-card">
        <div className="batch-details">
          <div className="batch-detail-item">
            <span>Batch Name</span>
            <strong>{batch.batch_name || "—"}</strong>
          </div>

          <div className="batch-detail-item">
            <span>Course</span>
            <strong>{batch.course_id?.courseTitle || "—"}</strong>
          </div>

          <div className="batch-detail-item">
            <span>Maximum Seats</span>
            <strong>{maxSeats}</strong>
          </div>

          <div className="batch-detail-item">
            <span>Available Seats</span>
            <strong>{availableSeats}</strong>
          </div>

          <div className="batch-detail-item">
            <span>Occupied Seats</span>
            <strong>{occupiedSeats}</strong>
          </div>

          <div className="batch-detail-item">
            <span>Status</span>
            <strong>{batch.status || "—"}</strong>
          </div>

          <div className="batch-detail-item">
            <span>Created</span>
            <strong>
              {batch.createdAt
                ? new Date(batch.createdAt).toLocaleString()
                : "—"}
            </strong>
          </div>

          <div className="batch-detail-item">
            <span>Updated</span>
            <strong>
              {batch.updatedAt
                ? new Date(batch.updatedAt).toLocaleString()
                : "—"}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewBatch;
