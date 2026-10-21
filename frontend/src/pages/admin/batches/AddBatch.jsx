
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import BatchForm from "../../../components/batches/BatchForm";
import { createBatch } from "../../../services/batchService";
import { getCourses } from "../../../services/courseService";

const AddBatch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/batches"
    : "/admin/batches";

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [saving, setSaving] = useState(false);
  const [courseError, setCourseError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        setCourseError("");

        const response = await getCourses({ page: 1, limit: 100 });
        if (cancelled) return;

        const payload = response?.data?.data;
        const courseList = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.courses)
            ? payload.courses
            : [];

        setCourses(courseList);

        if (courseList.length === 0) {
          setCourseError("No courses found. Please create a course first.");
        }
      } catch (error) {
        if (!cancelled) {
          setCourses([]);
          setCourseError(
            error?.response?.data?.message || "Unable to load courses."
          );
        }
      } finally {
        if (!cancelled) setLoadingCourses(false);
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (formData) => {
    setSaving(true);
    try {
      await createBatch(formData);
      navigate(basePath, { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="batch-page">
      <div className="batch-page-header">
        <div>
          <h1>Add Batch</h1>
          <p>Create a new batch for an existing course.</p>
        </div>
      </div>

      <div className="batch-card">
        {courseError && (
          <div className="batch-form-error" role="alert">
            {courseError}
          </div>
        )}

        <BatchForm
          courses={courses}
          loadingCourses={loadingCourses}
          loading={saving}
          submitLabel="Create Batch"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default AddBatch;
