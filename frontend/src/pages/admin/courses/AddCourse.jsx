
import React, { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  Navigate,
} from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import CourseForm from "../../../components/courses/CourseForm";
import { createCourse } from "../../../services/courseService";
import { hasPermission } from "../../../utils/permissions";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

const AddCourse = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff/courses"
    : "/admin/courses";

  const canCreate = hasPermission(user, "courses.create");
  const [loading, setLoading] = useState(false);

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
    if (loading) return;

    setLoading(true);

    try {
      const response = await createCourse(formData);

      notification.success(
        response?.data?.message || "Course created successfully."
      );

      navigate(basePath, { replace: true });
    } catch (error) {
      notification.error(getApiErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="course-page">
      <div className="page-header">
        <div>
          <h1>Add New Course</h1>
        </div>
      </div>

      <CourseForm
        loading={loading}
        submitLabel="Create Course"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default AddCourse;
