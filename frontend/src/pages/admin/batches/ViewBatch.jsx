
import React, { useEffect, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import { getBatch } from "../../../services/batchService";

const ViewBatch = () => {
  const { id } = useParams();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/batches"
    : "/admin/batches";

  const canView = hasPermission(user, "batches.view");
  const canUpdate = hasPermission(user, "batches.update");

  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user || !canView) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadBatch = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await getBatch(id);

        if (!cancelled) {
          setBatch(response?.data?.data || null);

          if (!response?.data?.data) {
            setError("Batch not found.");
          }
        }
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
  }, [id, authLoading, user, canView]);

  if (authLoading) {
    return <div className="batch-loading">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canView) {
    return (
      <div className="batch-page">
        <div className="batch-list-error" role="alert">
          You do not have permission to view batches.
        </div>
      </div>
    );
  }

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
  const availableSeats = Math.min(
    maxSeats,
    Math.max(Number(batch.available_seats) || 0, 0)
  );
  const occupiedSeats = Math.max(maxSeats - availableSeats, 0);

  return (
    <div className="batch-page">
      <div className="batch-page-header">
        <div>
          <h1>View Batch</h1>
          <p>Batch details.</p>
        </div>

        {canUpdate && (
          <Link
            to={`${basePath}/${id}/edit`}
            className="batch-add-button"
          >
            Edit Batch
          </Link>
        )}
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
