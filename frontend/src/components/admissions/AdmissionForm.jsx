import {
  useEffect,
  useMemo,
  useState,
} from "react";

const initialForm = {
  student: "",
  courseType: "",
  course: "",
  courseFee: "",
  discountType: "amount",
  discountValue: "",
  gstRate: "",
  admissionFee: "",
  admissionDate: new Date()
    .toISOString()
    .split("T")[0],
  batch: "",
  availableSeats: "",
  referralBy: "",
  status: "active",
  remark: "",
};

const AdmissionForm = ({
  students = [],
  initialData = null,
  onSubmit,
  submitting = false,
  submitLabel = "Save Admission",
}) => {
  const [form, setForm] =
    useState(initialForm);

  const [error, setError] =
    useState("");

  useEffect(() => {
    if (!initialData) {
      setForm(initialForm);
      return;
    }

    setForm({
      student:
        initialData.student?._id ||
        initialData.student ||
        "",

      courseType:
        initialData.courseType || "",

      course:
        initialData.course || "",

      courseFee:
        initialData.courseFee ?? "",

      discountType:
        initialData.discountType ||
        "amount",

      discountValue:
        initialData.discountValue ??
        "",

      gstRate:
        initialData.gstRate ?? "",

      admissionFee:
        initialData.admissionFee ??
        "",

      admissionDate:
        initialData.admissionDate
          ? new Date(
              initialData.admissionDate
            )
              .toISOString()
              .split("T")[0]
          : new Date()
              .toISOString()
              .split("T")[0],

      batch:
        initialData.batch || "",

      availableSeats:
        initialData.availableSeats ??
        "",

      referralBy:
        initialData.referralBy || "",

      status:
        initialData.status ||
        "active",

      remark:
        initialData.remark || "",
    });
  }, [initialData]);

  const calculations = useMemo(() => {
    const courseFee =
      Math.max(
        Number(form.courseFee) || 0,
        0
      );

    const discountValue =
      Math.max(
        Number(form.discountValue) || 0,
        0
      );

    let discountAmount = 0;

    if (
      form.discountType ===
      "percentage"
    ) {
      discountAmount =
        (courseFee *
          discountValue) /
        100;
    } else {
      discountAmount =
        discountValue;
    }

    discountAmount = Math.min(
      discountAmount,
      courseFee
    );

    const taxableAmount =
      courseFee - discountAmount;

    const gstRate =
      Math.max(
        Number(form.gstRate) || 0,
        0
      );

    const gstAmount =
      (taxableAmount * gstRate) /
      100;

    const admissionFee =
      Math.max(
        Number(form.admissionFee) ||
          0,
        0
      );

    const finalAmount =
      taxableAmount +
      gstAmount +
      admissionFee;

    return {
      courseFee,
      discountAmount,
      taxableAmount,
      gstAmount,
      admissionFee,
      finalAmount,
    };
  }, [
    form.courseFee,
    form.discountType,
    form.discountValue,
    form.gstRate,
    form.admissionFee,
  ]);

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (!form.student) {
      setError(
        "Please select a student."
      );
      return;
    }

    if (!form.course.trim()) {
      setError(
        "Course is required."
      );
      return;
    }

    if (
      Number(form.courseFee) < 0
    ) {
      setError(
        "Course fee cannot be negative."
      );
      return;
    }

    if (
      form.discountType ===
        "percentage" &&
      Number(form.discountValue) >
        100
    ) {
      setError(
        "Percentage discount cannot exceed 100%."
      );
      return;
    }

    try {
      await onSubmit({
        ...form,
        courseFee:
          Number(form.courseFee) ||
          0,
        discountValue:
          Number(form.discountValue) ||
          0,
        gstRate:
          Number(form.gstRate) || 0,
        admissionFee:
          Number(form.admissionFee) ||
          0,
        availableSeats:
          Number(form.availableSeats) ||
          0,
      });
    } catch (submitError) {
      setError(
        submitError.message ||
          "Unable to save admission."
      );
    }
  };

  return (
    <form
      className="admission-form"
      onSubmit={handleSubmit}
    >
      {error && (
        <div className="admission-form-error">
          {error}
        </div>
      )}

      {/* ================================= */}
      {/* STUDENT INFORMATION */}
      {/* ================================= */}

      <section className="admission-form-section">
        <div className="admission-section-header">
          <div>
            <h3>
              Student Information
            </h3>

            <p>
              Select the student for this
              admission.
            </p>
          </div>
        </div>

        <div className="admission-form-grid">
          <div className="admission-form-group admission-form-full">
            <label>
              Student{" "}
              <span className="required">
                *
              </span>
            </label>

            <select
              name="student"
              value={form.student}
              onChange={handleChange}
              disabled={Boolean(
                initialData
              )}
              required
            >
              <option value="">
                Select student
              </option>

              {students.map(
                (student) => {
                  const name = [
                    student.firstName,
                    student.surname,
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <option
                      key={student._id}
                      value={student._id}
                    >
                      {student.rollNo} -{" "}
                      {name} -{" "}
                      {student.mobile}
                    </option>
                  );
                }
              )}
            </select>

            {initialData && (
              <small className="admission-form-help">
                Student cannot be changed
                after admission creation.
              </small>
            )}
          </div>
        </div>
      </section>

      {/* ================================= */}
      {/* COURSE INFORMATION */}
      {/* ================================= */}

      <section className="admission-form-section">
        <div className="admission-section-header">
          <div>
            <h3>
              Course Information
            </h3>

            <p>
              Add course and batch
              information.
            </p>
          </div>
        </div>

        <div className="admission-form-grid">
          <div className="admission-form-group">
            <label>
              Course Type
            </label>

            <input
              type="text"
              name="courseType"
              value={form.courseType}
              onChange={handleChange}
              placeholder="Enter course type"
            />
          </div>

          <div className="admission-form-group">
            <label>
              Course{" "}
              <span className="required">
                *
              </span>
            </label>

            <input
              type="text"
              name="course"
              value={form.course}
              onChange={handleChange}
              placeholder="Enter course"
              required
            />
          </div>

          <div className="admission-form-group">
            <label>
              Batch
            </label>

            <input
              type="text"
              name="batch"
              value={form.batch}
              onChange={handleChange}
              placeholder="Enter batch"
            />
          </div>

          <div className="admission-form-group">
            <label>
              Available Seats
            </label>

            <input
              type="number"
              min="0"
              name="availableSeats"
              value={
                form.availableSeats
              }
              onChange={handleChange}
              placeholder="Enter available seats"
            />

            <small className="admission-form-help">
              Batch capacity will be
              connected to the Batch module
              in its phase.
            </small>
          </div>
        </div>
      </section>

      {/* ================================= */}
      {/* FEE INFORMATION */}
      {/* ================================= */}

      <section className="admission-form-section">
        <div className="admission-section-header">
          <div>
            <h3>
              Fee Information
            </h3>

            <p>
              Configure course fee,
              discount, GST and admission
              fee.
            </p>
          </div>
        </div>

        <div className="admission-form-grid">
          <div className="admission-form-group">
            <label>
              Course Fee
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              name="courseFee"
              value={form.courseFee}
              onChange={handleChange}
              placeholder="0"
            />
          </div>

          <div className="admission-form-group">
            <label>
              Discount Type
            </label>

            <select
              name="discountType"
              value={
                form.discountType
              }
              onChange={handleChange}
            >
              <option value="amount">
                Amount
              </option>

              <option value="percentage">
                Percentage
              </option>
            </select>
          </div>

          <div className="admission-form-group">
            <label>
              Discount Value
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              name="discountValue"
              value={
                form.discountValue
              }
              onChange={handleChange}
              placeholder={
                form.discountType ===
                "percentage"
                  ? "0%"
                  : "0"
              }
            />
          </div>

          <div className="admission-form-group">
            <label>
              GST (%)
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              name="gstRate"
              value={form.gstRate}
              onChange={handleChange}
              placeholder="0"
            />
          </div>

          <div className="admission-form-group">
            <label>
              Admission Fee
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              name="admissionFee"
              value={
                form.admissionFee
              }
              onChange={handleChange}
              placeholder="0"
            />
          </div>
        </div>

        {/* CALCULATION */}
        <div className="admission-calculation-card">
          <div>
            <span>
              Course Fee
            </span>

            <strong>
              ₹
              {calculations.courseFee.toFixed(
                2
              )}
            </strong>
          </div>

          <div>
            <span>
              Discount
            </span>

            <strong className="discount-value">
              - ₹
              {calculations.discountAmount.toFixed(
                2
              )}
            </strong>
          </div>

          <div>
            <span>
              GST
            </span>

            <strong>
              + ₹
              {calculations.gstAmount.toFixed(
                2
              )}
            </strong>
          </div>

          <div>
            <span>
              Admission Fee
            </span>

            <strong>
              + ₹
              {calculations.admissionFee.toFixed(
                2
              )}
            </strong>
          </div>

          <div className="admission-final-amount">
            <span>
              Final Amount
            </span>

            <strong>
              ₹
              {calculations.finalAmount.toFixed(
                2
              )}
            </strong>
          </div>
        </div>
      </section>

      {/* ================================= */}
      {/* ADMISSION DETAILS */}
      {/* ================================= */}

      <section className="admission-form-section">
        <div className="admission-section-header">
          <div>
            <h3>
              Admission Details
            </h3>

            <p>
              Complete admission
              information.
            </p>
          </div>
        </div>

        <div className="admission-form-grid">
          <div className="admission-form-group">
            <label>
              Admission Date
            </label>

            <input
              type="date"
              name="admissionDate"
              value={
                form.admissionDate
              }
              onChange={handleChange}
            />
          </div>

          <div className="admission-form-group">
            <label>
              Referral By
            </label>

            <input
              type="text"
              name="referralBy"
              value={
                form.referralBy
              }
              onChange={handleChange}
              placeholder="Enter referral"
            />
          </div>

          <div className="admission-form-group">
            <label>
              Status
            </label>

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>

              <option value="cancelled">
                Cancelled
              </option>
            </select>
          </div>

          <div className="admission-form-group admission-form-full">
            <label>
              Remark
            </label>

            <textarea
              name="remark"
              value={form.remark}
              onChange={handleChange}
              placeholder="Add admission remark"
              rows="4"
            />
          </div>
        </div>
      </section>

      <div className="admission-form-actions">
        <button
          type="submit"
          className="admission-primary-button"
          disabled={submitting}
        >
          {submitting
            ? "Saving..."
            : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default AdmissionForm;