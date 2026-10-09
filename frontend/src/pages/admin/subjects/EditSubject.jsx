
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";

import {
  getSubjectById,
  updateSubject,
} from "../../../services/subjectService";
import { getCourses } from "../../../services/courseService";

import "../../../styles/SubjectManagement.css";

const INITIAL_FORM = {
  subjectName: "",
  subjectCode: "",
  course_id: "",
  description: "",
  status: "Active",
};

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

export default function EditSubject() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Load subject details independently of course loading.
  useEffect(() => {
    let cancelled = false;

    const loadSubject = async () => {
      if (!id) {
        setError("Subject ID is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const response = await getSubjectById(id);
        const payload = response?.data;
        const subject =
          payload?.data?.subject ||
          payload?.subject ||
          payload?.data ||
          payload;

        if (!subject || !subject._id) {
          throw new Error("Subject details were not found.");
        }

        const courseId =
          typeof subject.course_id === "object"
            ? subject.course_id?._id ||
              subject.course_id?.id ||
              ""
            : subject.course_id || "";

        if (!cancelled) {
          setFormData({
            subjectName: subject.subjectName || "",
            subjectCode: subject.subjectCode || "",
            course_id: courseId,
            description: subject.description || "",
            status: subject.status || "Active",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to load subject details."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadSubject();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Load courses independently.
  useEffect(() => {
    let cancelled = false;

    const loadCourses = async () => {
      try {
        setLoadingCourses(true);

        const response = await getCourses({ page: 1, limit: 100 });
        const courseList = extractCourseList(response).filter(
          (course) => course && (course._id || course.id)
        );

        if (!cancelled) {
          setCourses(courseList);

          if (courseList.length === 0) {
            console.warn(
              "No courses returned by GET /api/courses:",
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
              "Unable to load courses."
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

    if (formData.subjectCode.trim().length < 2) {
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

      await updateSubject(id, {
        subjectName: formData.subjectName.trim(),
        subjectCode: formData.subjectCode.trim().toUpperCase(),
        course_id: formData.course_id,
        description: formData.description.trim(),
        status: formData.status,
      });

      navigate("/admin/subjects", {
        replace: true,
        state: { message: "Subject updated successfully." },
      });
    } catch (err) {
      const responseData = err.response?.data;

      if (responseData?.errors && typeof responseData.errors === "object") {
        setFieldErrors(responseData.errors);
      }

      setError(
        responseData?.message ||
          "Unable to update subject. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="subject-page">
        <div className="subject-card">
          <p>Loading subject details...</p>
        </div>
      </div>
    );
  }

  if (!formData.subjectName && error) {
    return (
      <div className="subject-page">
        <div className="subject-page-header">
          <div>
            <h1>Edit Subject</h1>
            <p>Update the selected subject.</p>
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

        <div className="subject-alert subject-alert-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="subject-page subject-form-page">
      <div className="subject-page-header">
        <div>
          <h1>Edit Subject</h1>
          <p>Update subject details and course association.</p>
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
              {saving ? "Updating..." : "Update Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
