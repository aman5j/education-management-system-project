import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import CourseForm from "../../../components/courses/CourseForm";
import { createCourse } from "../../../services/courseService";

const AddCourse = () => {
  const navigate = useNavigate();
  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (formData) => {
    try {
      setLoading(true);

      await createCourse(formData);

      navigate("/admin/courses");
    } catch (error) {
      console.error(
        "Failed to create course:",
        error
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="course-page">
      <div className="course-page-header">
        <div>
          <h1>Add Course</h1>
          <p>
            Create a new course.
          </p>
        </div>
      </div>

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