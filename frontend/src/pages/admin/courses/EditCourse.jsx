
import React, { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
  Navigate,
} from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import CourseForm from "../../../components/courses/CourseForm";
import {
  getCourse,
  updateCourse,
} from "../../../services/courseService";
import { hasPermission } from "../../../utils/permissions";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

const EditCourse = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/courses"
    : "/admin/courses";

  const canUpdate = hasPermission(user, "courses.update");
  const canView = hasPermission(user, "courses.view");

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (authLoading || !canView || !canUpdate || !id) {
      return;
    }

    let cancelled = false;

    const loadCourse = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const response = await getCourse(id);

        if (!cancelled) {
          const courseData = response?.data?.data ?? null;
          setCourse(courseData);

          if (!courseData) {
            setLoadError("Course not found.");
          }
        }
      } catch (error) {
        if (!cancelled) {
          const message = getApiErrorMessage(error);
          setLoadError(message);
          notification.error(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      cancelled = true;
    };
  }, [id, canView, canUpdate, authLoading]);

  if (authLoading) {
    return <div className="course-page">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canUpdate || !canView) {
    return (
      <div className="course-page">
        <h1>Access denied</h1>
        <p>You need Courses View and Update permissions to edit a course.</p>
        <Link to={basePath}>Back to Courses</Link>
      </div>
    );
  }

  const handleSubmit = async (formData) => {
    if (saving) return;

    setSaving(true);

    try {
      const response = await updateCourse(id, formData);

      notification.success(
        response?.data?.message || "Course updated successfully."
      );

      navigate(basePath, { replace: true });
    } catch (error) {
      notification.error(getApiErrorMessage(error));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="course-page">
        <p>Loading course...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-page">
        <div className="course-list-error" role="alert">
          {loadError || "Course not found."}
        </div>
        <Link to={basePath}>Back to Courses</Link>
      </div>
    );
  }

  return (
    <div className="course-page">
      <div className="page-header">
        <div>
          <h1>Edit Course</h1>
        </div>
      </div>

      <CourseForm
        initialData={course}
        loading={saving}
        submitLabel="Update Course"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default EditCourse;
