
import React, { useState } from "react";
import { Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import CourseForm from "../../../components/courses/CourseForm";
import { createCourse } from "../../../services/courseService";
import { hasPermission } from "../../../utils/permissions";

const AddCourse = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/courses"
    : "/admin/courses";

  const canCreate = hasPermission(user, "courses.create");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (authLoading) {
    return <div className="course-page">Checking permissions...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canCreate) {
    return (
      <div className="course-page">
        <h1>Access denied</h1>
        <p>You do not have permission to create courses.</p>
        <Link to={basePath}>Back to Courses</Link>
      </div>
    );
  }

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError("");

    try {
      await createCourse(formData);
      navigate(basePath, { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to create course."
      );
      throw requestError;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="course-page">
      <div className="course-page-header">
        <div>
          <h1>Add Course</h1>
          <p>Create a new course.</p>
        </div>
        <Link to={basePath} className="course-primary-btn">
          Back to Courses
        </Link>
      </div>

      {error && <div className="course-list-error" role="alert">{error}</div>}

      <div className="course-card">
        <CourseForm
          loading={loading}
          submitLabel="Create Course"
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
};

export default AddCourse;
