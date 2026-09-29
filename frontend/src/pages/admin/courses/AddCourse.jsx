import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import CourseForm from "../../../components/courses/CourseForm";
import { createCourse } from "../../../services/courseService";

const AddCourse = () => {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);

    try {
      await createCourse(formData);

      navigate("/admin/courses");
    } catch (error) {
      /*
       * IMPORTANT:
       * Do NOT swallow the error.
       *
       * CourseForm needs this error
       * to display field-wise validation.
       */
      throw error;
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