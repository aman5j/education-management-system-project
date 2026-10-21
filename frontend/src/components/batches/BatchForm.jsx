
import React, { useEffect, useState } from "react";

const initialState = {
  course_id: "",
  batch_name: "",
  max_seats: 1,
  status: "Upcoming",
};

const BatchForm = ({
  initialData = null,
  courses = [],
  loadingCourses = false,
  loading = false,
  submitLabel = "Create Batch",
  onSubmit,
}) => {
  const [form, setForm] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");

  useEffect(() => {
    if (!initialData) {
      setForm(initialState);
    } else {
      setForm({
        course_id:
          initialData.course_id?._id ||
          initialData.course_id?.id ||
          initialData.course_id ||
          "",
        batch_name: initialData.batch_name || "",
        max_seats: initialData.max_seats ?? 1,
        status: initialData.status || "Upcoming",
      });
    }

    setErrors({});
    setServerError("");
  }, [initialData]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));

    setServerError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = {};
    const batchName = form.batch_name.trim();
    const maxSeats = Number(form.max_seats);

    if (!form.course_id) {
      nextErrors.course_id = "Please select a course.";
    }

    if (!batchName) {
      nextErrors.batch_name = "Batch name is required.";
    } else if (batchName.length < 2) {
      nextErrors.batch_name =
        "Batch name must contain at least 2 characters.";
    } else if (batchName.length > 100) {
      nextErrors.batch_name =
        "Batch name cannot exceed 100 characters.";
    }

    if (
      form.max_seats === "" ||
      !Number.isInteger(maxSeats) ||
      maxSeats < 1
    ) {
      nextErrors.max_seats =
        "Maximum seats must be a positive whole number.";
    }

    if (!["Upcoming", "Ongoing", "Closed"].includes(form.status)) {
      nextErrors.status = "Please select a valid status.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const formData = {
      course_id: form.course_id,
      batch_name: batchName,
      max_seats: maxSeats,
      status: form.status,
    };

    setErrors({});
    setServerError("");

    try {
      await onSubmit(formData);
    } catch (error) {
      const response = error?.response?.data;
      const fieldErrors = {};
      const validationErrors = response?.errors;

      if (Array.isArray(validationErrors)) {
        validationErrors.forEach((item) => {
          const field = item.field || item.path || item.param;
          const message = item.message || item.msg;

          if (field && message && !fieldErrors[field]) {
            fieldErrors[field] = message;
          }
        });
      }

      setErrors(fieldErrors);
      setServerError(
        response?.message || "Unable to save batch."
      );
    }
  };

  const safeCourses = Array.isArray(courses) ? courses : [];

  const occupiedSeats = initialData
    ? Math.max(
        Number(initialData.max_seats || 0) -
          Number(initialData.available_seats || 0),
        0
      )
    : 0;

  return (
    <form
      className="batch-form"
      onSubmit={handleSubmit}
      noValidate
    >
      {serverError && (
        <div className="batch-form-error" role="alert">
          {serverError}
        </div>
      )}

      <div className="batch-form-section">
        <h2>Batch Information</h2>

        <div className="batch-form-grid">
          <div className="batch-field">
            <label htmlFor="course_id">
              Course <span className="required">*</span>
            </label>

            <select
              id="course_id"
              name="course_id"
              value={form.course_id}
              onChange={handleChange}
              disabled={loading || loadingCourses}
              required
            >
              <option value="">
                {loadingCourses
                  ? "Loading courses..."
                  : safeCourses.length === 0
                    ? "No courses available"
                    : "Select Course"}
              </option>

              {safeCourses.map((course) => {
                const courseId = course?._id || course?.id;

                if (!courseId) return null;

                return (
                  <option key={courseId} value={courseId}>
                    {course.courseTitle || course.title || "Untitled Course"}
                  </option>
                );
              })}
            </select>

            {!loadingCourses && safeCourses.length === 0 && (
              <small className="batch-help-text">
                No courses found. Please create a course first.
              </small>
            )}

            {errors.course_id && (
              <div className="batch-field-error">
                {errors.course_id}
              </div>
            )}
          </div>

          <div className="batch-field">
            <label htmlFor="batch_name">
              Batch Name <span className="required">*</span>
            </label>

            <input
              id="batch_name"
              type="text"
              name="batch_name"
              value={form.batch_name}
              onChange={handleChange}
              placeholder="Enter batch name"
              minLength={2}
              maxLength={100}
              disabled={loading}
              required
            />

            {errors.batch_name && (
              <div className="batch-field-error">
                {errors.batch_name}
              </div>
            )}
          </div>

          <div className="batch-field">
            <label htmlFor="max_seats">
              Maximum Seats <span className="required">*</span>
            </label>

            <input
              id="max_seats"
              type="number"
              name="max_seats"
              min="1"
              step="1"
              value={form.max_seats}
              onChange={handleChange}
              disabled={loading}
              required
            />

            {errors.max_seats && (
              <div className="batch-field-error">
                {errors.max_seats}
              </div>
            )}

            {initialData && (
              <small className="batch-help-text">
                Available seats are calculated automatically.
              </small>
            )}
          </div>

          <div className="batch-field">
            <label htmlFor="status">
              Status <span className="required">*</span>
            </label>

            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
              disabled={loading}
              required
            >
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Closed">Closed</option>
            </select>

            {errors.status && (
              <div className="batch-field-error">
                {errors.status}
              </div>
            )}
          </div>
        </div>
      </div>

      {initialData && (
        <div className="batch-seat-summary">
          <div>
            <span>Maximum Seats</span>
            <strong>{Number(initialData.max_seats) || 0}</strong>
          </div>

          <div>
            <span>Available Seats</span>
            <strong>
              {Number(initialData.available_seats) || 0}
            </strong>
          </div>

          <div>
            <span>Occupied Seats</span>
            <strong>{occupiedSeats}</strong>
          </div>
        </div>
      )}

      <div className="batch-form-footer">
        <button
          type="submit"
          className="batch-submit-button"
          disabled={
            loading ||
            loadingCourses ||
            safeCourses.length === 0
          }
        >
          {loading ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default BatchForm;
