import React, {
  useEffect,
  useState,
} from "react";

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
  const [form, setForm] =
    useState(initialState);

  const [errors, setErrors] =
    useState({});

  const [serverError, setServerError] =
    useState("");

  /*
   * Load initial values
   * when editing a batch.
   */
  useEffect(() => {
    if (!initialData) {
      setForm(initialState);
      setErrors({});
      setServerError("");

      return;
    }

    setForm({
      course_id:
        initialData.course_id?._id ||
        initialData.course_id?.id ||
        initialData.course_id ||
        "",

      batch_name:
        initialData.batch_name || "",

      max_seats:
        initialData.max_seats || 1,

      status:
        initialData.status || "Upcoming",
    });

    setErrors({});
    setServerError("");
  }, [initialData]);

  /*
   * Handle input/select changes
   */
  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

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

  /*
   * Submit batch
   */
  const handleSubmit = async (event) => {
    event.preventDefault();

    setErrors({});
    setServerError("");

    if (!form.course_id) {
      setErrors({
        course_id:
          "Please select a course.",
      });

      return;
    }

    if (!form.batch_name.trim()) {
      setErrors({
        batch_name:
          "Batch name is required.",
      });

      return;
    }

    if (
      !form.max_seats ||
      Number(form.max_seats) < 1
    ) {
      setErrors({
        max_seats:
          "Maximum seats must be at least 1.",
      });

      return;
    }

    const formData = {
      course_id: form.course_id,

      batch_name:
        form.batch_name.trim(),

      max_seats:
        Number(form.max_seats),

      status: form.status,
    };

    console.log(
      "Batch form data:",
      formData
    );

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error(
        "Batch submit error:",
        error
      );

      const response =
        error?.response?.data;

      const validationErrors =
        response?.errors || [];

      const fieldErrors = {};

      if (
        Array.isArray(
          validationErrors
        )
      ) {
        validationErrors.forEach(
          (item) => {
            const field =
              item.field ||
              item.path ||
              item.param;

            const message =
              item.message ||
              item.msg;

            if (
              field &&
              message &&
              !fieldErrors[field]
            ) {
              fieldErrors[field] =
                message;
            }
          }
        );
      }

      setErrors(fieldErrors);

      setServerError(
        response?.message ||
          "Unable to save batch."
      );
    }
  };

  return (
    <form
      className="batch-form"
      onSubmit={handleSubmit}
      noValidate
    >
      {serverError && (
        <div className="batch-form-error">
          {serverError}
        </div>
      )}

      <div className="batch-form-section">
        <h2>
          Batch Information
        </h2>

        <div className="batch-form-grid">

          {/* =========================
              COURSE
          ========================== */}
          {/* <div className="batch-field">
            <label htmlFor="course_id">
              Course *
            </label>

            <select
              id="course_id"
              name="course_id"
              value={form.course_id}
              onChange={handleChange}
              disabled={
                loadingCourses ||
                loading
              }
            >
              <option value="">
                {loadingCourses
                  ? "Loading courses..."
                  : courses.length === 0
                  ? "No courses available"
                  : "Select Course"}
              </option>

              {!loadingCourses &&
                Array.isArray(courses) &&
                courses.map(
                  (course) => {
                    const courseId =
                      course?._id ||
                      course?.id;

                    const courseTitle =
                      course?.courseTitle ||
                      course?.title ||
                      "Untitled Course";

                    if (!courseId) {
                      return null;
                    }

                    return (
                      <option
                        key={courseId}
                        value={courseId}
                      >
                        {courseTitle}
                      </option>
                    );
                  }
                )}
            </select>

            {loadingCourses && (
              <small className="batch-help-text">
                Fetching courses from
                database...
              </small>
            )}

            {!loadingCourses &&
              courses.length === 0 && (
                <small className="batch-help-text">
                  No courses found. Please
                  create a course first.
                </small>
              )}

            {errors.course_id && (
              <div className="batch-field-error">
                {errors.course_id}
              </div>
            )}
          </div> */}

          {/* <div className="batch-field">
            <label htmlFor="course_id">
                Course <span className="required">*</span>
            </label>

            <select
                id="course_id"
                name="course_id"
                value={form.course_id}
                onChange={handleChange}
                disabled={loadingCourses || courses.length === 0}
            >
                <option value="">
                {loadingCourses
                    ? "Loading courses..."
                    : courses.length === 0
                    ? "No courses available"
                    : "Select Course"}
                </option>

                {Array.isArray(courses) &&
                courses.map((course) => (
                    <option
                    key={course._id}
                    value={course._id}
                    >
                    {course.courseTitle}
                    </option>
                ))}
            </select>

            {!loadingCourses && courses.length === 0 && (
                <small className="form-help error-text">
                No courses found. Please create a course first.
                </small>
            )}

            {!loadingCourses && courses.length > 0 && (
                <small className="form-help">
                Select the course for this batch.
                </small>
            )}
            </div> */}

          <div className="batch-field">
            <label htmlFor="course_id">
                Course <span className="required">*</span>
            </label>

            <select
                id="course_id"
                name="course_id"
                value={form.course_id}
                onChange={handleChange}
                disabled={loadingCourses || courses.length === 0}
            >
                <option value="">
                {loadingCourses
                    ? "Loading courses..."
                    : courses.length === 0
                    ? "No courses available"
                    : "Select Course"}
                </option>

                {Array.isArray(courses) &&
                courses.map((course) => (
                    <option
                    key={course._id}
                    value={course._id}
                    >
                    {course.courseTitle}
                    </option>
                ))}
            </select>

            {!loadingCourses && courses.length === 0 && (
                <small className="batch-help-text">
                No courses found. Please create a course first.
                </small>
            )}

            {!loadingCourses && courses.length > 0 && (
                <small className="batch-help-text">
                Select the course for this batch.
                </small>
            )}

            {errors.course_id && (
                <div className="batch-field-error">
                {errors.course_id}
                </div>
            )}
            </div>

          {/* =========================
              BATCH NAME
          ========================== */}
          <div className="batch-field">
            <label htmlFor="batch_name">
              Batch Name *
            </label>

            <input
              id="batch_name"
              type="text"
              name="batch_name"
              value={form.batch_name}
              onChange={handleChange}
              placeholder="Enter batch name"
              disabled={loading}
            />

            {errors.batch_name && (
              <div className="batch-field-error">
                {errors.batch_name}
              </div>
            )}
          </div>

          {/* =========================
              MAX SEATS
          ========================== */}
          <div className="batch-field">
            <label htmlFor="max_seats">
              Maximum Seats *
            </label>

            <input
              id="max_seats"
              type="number"
              name="max_seats"
              min="1"
              value={form.max_seats}
              onChange={handleChange}
              disabled={loading}
            />

            {errors.max_seats && (
              <div className="batch-field-error">
                {errors.max_seats}
              </div>
            )}

            {initialData && (
              <small className="batch-help-text">
                Available seats are
                calculated automatically.
              </small>
            )}
          </div>

          {/* =========================
              STATUS
          ========================== */}
          <div className="batch-field">
            <label htmlFor="status">
              Status *
            </label>

            <select
              id="status"
              name="status"
              value={form.status}
              onChange={handleChange}
              disabled={loading}
            >
              <option value="Upcoming">
                Upcoming
              </option>

              <option value="Ongoing">
                Ongoing
              </option>

              <option value="Closed">
                Closed
              </option>
            </select>

            {errors.status && (
              <div className="batch-field-error">
                {errors.status}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================
          EDIT SEAT SUMMARY
      ========================== */}
      {initialData && (
        <div className="batch-seat-summary">

          <div>
            <span>
              Maximum Seats
            </span>

            <strong>
              {initialData.max_seats}
            </strong>
          </div>

          <div>
            <span>
              Available Seats
            </span>

            <strong>
              {initialData.available_seats}
            </strong>
          </div>

          <div>
            <span>
              Occupied Seats
            </span>

            <strong>
              {Math.max(
                Number(
                  initialData.max_seats
                ) -
                  Number(
                    initialData.available_seats
                  ),
                0
              )}
            </strong>
          </div>
        </div>
      )}

      {/* =========================
          SUBMIT
      ========================== */}
      <div className="batch-form-footer">
        <button
          type="submit"
          className="batch-submit-button"
          disabled={
            loading ||
            loadingCourses ||
            courses.length === 0
          }
        >
          {loading
            ? "Saving..."
            : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default BatchForm;