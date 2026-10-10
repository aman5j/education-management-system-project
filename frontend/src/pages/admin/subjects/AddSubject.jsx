
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";

import { createSubject } from "../../../services/subjectService";
import { getCourses } from "../../../services/courseService";

import "../../../styles/SubjectManagement.css";

const extractCourseList = (response) => {
  const payload = response?.data;

  const candidates = [
    payload?.data,
    payload?.data?.courses,
    payload?.courses,
    payload?.data?.data,
    payload,
  ];

  const list = candidates.find(Array.isArray) || [];

  if (list.length === 1 && Array.isArray(list[0]?.courses)) {
    return list[0].courses;
  }

  return list;
};

const getCourseLabel = (course) =>
  course?.courseTitle ||
  course?.courseName ||
  course?.name ||
  course?.title ||
  course?.course_name ||
  course?.code ||
  "Unnamed course";

const INITIAL_FORM = {
  subjectName: "",
  subjectCode: "",
  course_id: "",
  description: "",
  status: "Active",
};

export default function AddSubject() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      try {
        setLoadingCourses(true);
        setError("");

        const response = await getCourses({ page: 1, limit: 100 });

        const courseList = extractCourseList(response).filter(
          (course) => course && (course._id || course.id)
        );

        if (!cancelled) {
          setCourses(courseList);

          if (courseList.length === 0) {
            console.warn(
              "No course records returned by GET /api/courses:",
              response?.data
            );
          }
        }
      } catch (err) {
        console.error("Failed to load courses:", err);

        if (!cancelled) {
          setCourses([]);
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to load courses. Please try again."
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingCourses(false);
        }
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: name === "subjectCode" ? value.toUpperCase() : value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setError("");
  };

  const validateForm = () => {
    const errors = {};

    if (formData.subjectName.trim().length < 2) {
      errors.subjectName = "Subject name must contain at least 2 characters.";
    }

    if (!formData.subjectCode.trim()) {
      errors.subjectCode = "Subject code is required.";
    } else if (formData.subjectCode.trim().length < 2) {
      errors.subjectCode = "Subject code must contain at least 2 characters.";
    }

    if (!formData.course_id) {
      errors.course_id = "Please select a course.";
    }

    if (!["Active", "Inactive"].includes(formData.status)) {
      errors.status = "Please select a valid status.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!validateForm()) return;

    try {
      setSaving(true);

      await createSubject({
        subjectName: formData.subjectName.trim(),
        subjectCode: formData.subjectCode.trim().toUpperCase(),
        course_id: formData.course_id,
        description: formData.description.trim(),
        status: formData.status,
      });

      navigate("/admin/subjects", {
        replace: true,
        state: { message: "Subject created successfully." },
      });
    } catch (err) {
      const responseData = err.response?.data;

      if (responseData?.errors && typeof responseData.errors === "object") {
        setFieldErrors(responseData.errors);
      }

      setError(
        responseData?.message ||
          "Unable to create subject. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="subject-page subject-form-page">
      <div className="subject-page-header">
        <div>
          <h1>Add Subject</h1>
          <p>Create a subject and associate it with a course.</p>
        </div>

        <button
          type="button"
          className="subject-secondary-btn"
          onClick={() => navigate("/admin/subjects")}
        >
          <FiArrowLeft aria-hidden="true" />
          Back to Subjects
        </button>
      </div>

      {error && (
        <div className="subject-alert subject-alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="subject-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="subject-form-grid">
            <div className="subject-field">
              <label htmlFor="subjectName">
                Subject Name <span>*</span>
              </label>
              <input
                id="subjectName"
                name="subjectName"
                value={formData.subjectName}
                onChange={handleChange}
                placeholder="Enter subject name"
                maxLength={100}
                required
                aria-invalid={Boolean(fieldErrors.subjectName)}
              />
              {fieldErrors.subjectName && (
                <p className="subject-field-error">
                  {fieldErrors.subjectName}
                </p>
              )}
            </div>

            <div className="subject-field">
              <label htmlFor="subjectCode">
                Subject Code <span>*</span>
              </label>
              <input
                id="subjectCode"
                name="subjectCode"
                value={formData.subjectCode}
                onChange={handleChange}
                placeholder="e.g. CS101"
                maxLength={30}
                required
                aria-invalid={Boolean(fieldErrors.subjectCode)}
              />
              {fieldErrors.subjectCode && (
                <p className="subject-field-error">
                  {fieldErrors.subjectCode}
                </p>
              )}
            </div>

            <div className="subject-field">
              <label htmlFor="course_id">
                Course <span>*</span>
              </label>
              <select
                id="course_id"
                name="course_id"
                value={formData.course_id}
                onChange={handleChange}
                disabled={loadingCourses || courses.length === 0}
                required
                aria-invalid={Boolean(fieldErrors.course_id)}
              >
                <option value="">
                  {loadingCourses
                    ? "Loading courses..."
                    : courses.length === 0
                      ? "No courses available"
                      : "Select a course"}
                </option>

                {courses.map((course) => (
                  <option
                    key={course._id || course.id}
                    value={course._id || course.id}
                  >
                    {getCourseLabel(course)}
                  </option>
                ))}
              </select>

              {fieldErrors.course_id && (
                <p className="subject-field-error">
                  {fieldErrors.course_id}
                </p>
              )}

              {!loadingCourses && courses.length === 0 && (
                <p className="subject-helper-text">
                  No courses were returned. Check the courses API response
                  and browser console.
                </p>
              )}
            </div>

            <div className="subject-field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="subject-field subject-field-full">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter subject description (optional)"
                rows={4}
                maxLength={1000}
              />
              <span className="subject-helper-text">
                {formData.description.length}/1000 characters
              </span>
            </div>
          </div>

          <div className="subject-form-actions">
            <button
              type="button"
              className="subject-secondary-btn"
              onClick={() => navigate("/admin/subjects")}
              disabled={saving}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="subject-primary-btn"
              disabled={saving || loadingCourses || courses.length === 0}
            >
              <FiSave aria-hidden="true" />
              {saving ? "Saving..." : "Save Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
