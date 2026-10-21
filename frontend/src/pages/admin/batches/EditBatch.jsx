
import React, { useEffect, useState } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";
import BatchForm from "../../../components/batches/BatchForm";
import {
  getBatch,
  updateBatch,
} from "../../../services/batchService";
import { getCourses } from "../../../services/courseService";

const EditBatch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/batches"
    : "/admin/batches";

  const canUpdate = hasPermission(user, "batches.update");

  const [batch, setBatch] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user || !canUpdate) {
      setLoading(false);
      setLoadingCourses(false);
      return undefined;
    }

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setLoadingCourses(true);
      setError("");

      try {
        const [batchResponse, coursesResponse] = await Promise.all([
          getBatch(id),
          getCourses({ page: 1, limit: 100 }),
        ]);

        if (cancelled) return;

        const batchData = batchResponse?.data?.data || null;
        const payload = coursesResponse?.data?.data;

        const courseList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.courses)
            ? payload.courses
            : [];

        setBatch(batchData);
        setCourses(courseList);

        if (!batchData) {
          setError("Batch not found.");
        }

        if (courseList.length === 0) {
          setError((previous) =>
            previous
              ? `${previous} No courses are available.`
              : "No courses are available."
          );
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError?.response?.data?.message ||
              "Failed to load batch information."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingCourses(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [id, authLoading, user, canUpdate]);

  const handleSubmit = async (formData) => {
    setSaving(true);

    try {
      await updateBatch(id, formData);
      navigate(basePath, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="batch-loading">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canUpdate) {
    return (
      <div className="batch-page">
        <div className="batch-list-error" role="alert">
          You do not have permission to update batches.
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

  return (
    <div className="batch-page">
      <div className="batch-page-header">
        <div>
          <h1>Edit Batch</h1>
          <p>Update batch information.</p>
        </div>
      </div>

      <div className="batch-card">
        <BatchForm
          initialData={batch}
          courses={courses}
          loadingCourses={loadingCourses}
          loading={saving}
          submitLabel="Update Batch"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default EditBatch;
