import React, {
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import BatchForm from "../../../components/batches/BatchForm";

import { createBatch } from "../../../services/batchService";
import { getCourses } from "../../../services/courseService";

const AddBatch = () => {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] =
    useState(true);
  const [saving, setSaving] = useState(false);
  const [courseError, setCourseError] =
    useState("");

  useEffect(() => {
    const loadCourses = async () => {
  try {
    setLoadingCourses(true);
    setCourseError("");

    console.log("Fetching courses for Add Batch...");

    const response = await getCourses({
      page: 1,
      limit: 100,
    });

    console.log("Courses API response:", response);

    // API response:
    // {
    //   success: true,
    //   data: [...]
    // }

    const courseList = response?.data?.data ?? [];

    console.log("Courses loaded:", courseList);

    setCourses(Array.isArray(courseList) ? courseList : []);

    if (!Array.isArray(courseList) || courseList.length === 0) {
      setCourseError("No courses found. Please create a course first.");
    }
  } catch (error) {
    console.error("Failed to load courses:", error);

    setCourses([]);

    setCourseError(
      error?.response?.data?.message ||
        "Unable to load courses."
    );
  } finally {
    setLoadingCourses(false);
  }
};

    loadCourses();
  }, []);

  const handleSubmit = async (formData) => {
    try {
      setSaving(true);

      console.log(
        "Creating batch with:",
        formData
      );

      await createBatch(formData);

      navigate("/admin/batches");
    } catch (error) {
      console.error(
        "Failed to create batch:",
        error
      );

      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="batch-page">
      <div className="batch-page-header">
        <div>
          <h1>Add Batch</h1>

          <p>
            Create a new batch for an existing
            course.
          </p>
        </div>
      </div>

      <div className="batch-card">
        {courseError && (
          <div className="batch-form-error">
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