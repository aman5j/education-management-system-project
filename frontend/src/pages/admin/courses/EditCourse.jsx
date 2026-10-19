
import React, { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import CourseForm from "../../../components/courses/CourseForm";
import { getCourse, updateCourse } from "../../../services/courseService";

const EditCourse = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/courses"
    : "/admin/courses";

  const permissions = user?.assignedRole?.permissions || [];
  const canUpdate =
    user?.role === "admin" || permissions.includes("courses.update");
  const canView =
    user?.role === "admin" || permissions.includes("courses.view");

  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canView || !canUpdate) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadCourse = async () => {
      try {
        const response = await getCourse(id);
        if (!cancelled) {
          setCourse(response.data?.data ?? null);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(
            requestError.response?.data?.message ||
              "Unable to load course."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCourse();
    return () => {
      cancelled = true;
    };
  }, [id, canView, canUpdate]);

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
    setSaving(true);
    setError("");

    try {
      await updateCourse(id, formData);
      navigate(basePath, { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update course."
      );
      throw requestError;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="course-page"><p>Loading course...</p></div>;
  }

  if (!course) {
    return (
      <div className="course-page">
        <p>{error || "Course not found."}</p>
        <Link to={basePath}>Back to Courses</Link>
      </div>
    );
  }

  return (
    <div className="course-page">
      <div className="course-page-header">
        <div>
          <h1>Edit Course</h1>
          <p>Update course information.</p>
        </div>
        <Link to={basePath} className="course-primary-btn">
          Back to Courses
        </Link>
      </div>

      {error && <div className="course-list-error" role="alert">{error}</div>}

      <div className="course-card">
        <CourseForm
          initialData={course}
          loading={saving}
          submitLabel="Update Course"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default EditCourse;
