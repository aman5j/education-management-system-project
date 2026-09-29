import React, {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import CourseForm from "../../../components/courses/CourseForm";

import {
  getCourse,
  updateCourse,
} from "../../../services/courseService";

const EditCourse = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    const loadCourse = async () => {
      try {
        const response =
          await getCourse(id);

        setCourse(response.data.data);
      } catch (error) {
        console.error(
          "Failed to load course:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    loadCourse();
  }, [id]);

  // const handleSubmit = async (formData) => {
  //   try {
  //     setSaving(true);

  //     await updateCourse(id, formData);

  //     navigate("/admin/courses");
  //   } catch (error) {
  //     console.error(
  //       "Failed to update course:",
  //       error
  //     );
  //   } finally {
  //     setSaving(false);
  //   }
  // };

  const handleSubmit = async (formData) => {
  setSaving(true);

  try {
    await updateCourse(
      id,
      formData
    );

    navigate(
      "/admin/courses"
    );
  } catch (error) {
    console.error(
      "Failed to update course:",
      error
    );

    /*
     * IMPORTANT:
     * Send backend validation error
     * back to CourseForm.
     */
    throw error;
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <div className="course-page">
        <div className="course-loading">
          Loading course...
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="course-page">
        <div className="course-empty">
          Course not found.
        </div>
      </div>
    );
  }

  return (
    <div className="course-page">
      <div className="course-page-header">
        <div>
          <h1>Edit Course</h1>
          <p>
            Update course information.
          </p>
        </div>
      </div>

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