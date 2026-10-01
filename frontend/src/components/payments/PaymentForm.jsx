import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getAdmissions,
} from "../../services/admissionService";

const getToday = () =>
  new Date()
    .toISOString()
    .split("T")[0];

const initialForm = {
  admission_id: "",
  amount: "",
  payment_date: getToday(),
  payment_mode: "Cash",
  receipt_no: "",
  status: "Verified",
  notes: "",
};

const PaymentForm = ({
  initialData = null,
  onSubmit,
  submitting = false,
  submitLabel = "Create Payment",
}) => {
  const [form, setForm] =
    useState(initialForm);

  const [
    admissions,
    setAdmissions,
  ] = useState([]);

  const [
    loadingAdmissions,
    setLoadingAdmissions,
  ] = useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadAdmissions =
      async () => {
        try {
          setLoadingAdmissions(
            true
          );

          const response =
            await getAdmissions({
              page: 1,
              limit: 100,
              status: "Active",
            });

          const list =
            response?.data?.data
              ?.admissions ??
            response?.data
              ?.admissions ??
            [];

          setAdmissions(
            Array.isArray(list)
              ? list
              : []
          );
        } catch (loadError) {
          console.error(
            "Load admissions error:",
            loadError
          );

          setAdmissions([]);

          setError(
            loadError?.response
              ?.data?.message ||
              "Unable to load admissions."
          );
        } finally {
          setLoadingAdmissions(
            false
          );
        }
      };

    loadAdmissions();
  }, []);

  useEffect(() => {
    if (!initialData) {
      setForm(initialForm);
      return;
    }

    const admissionId =
      initialData.admission_id?._id ||
      initialData.admission_id ||
      "";

    setForm({
      admission_id:
        admissionId,

      amount:
        initialData.amount ??
        "",

      payment_date:
        initialData.payment_date
          ? new Date(
              initialData.payment_date
            )
              .toISOString()
              .split("T")[0]
          : getToday(),

      payment_mode:
        initialData.payment_mode ||
        "Cash",

      receipt_no:
        initialData.receipt_no ||
        "",

      status:
        initialData.status ||
        "Verified",

      notes:
        initialData.notes ||
        "",
    });
  }, [initialData]);

  const selectedAdmission =
    useMemo(
      () =>
        admissions.find(
          (admission) =>
            String(
              admission._id
            ) ===
            String(
              form.admission_id
            )
        ) ||
        null,
      [
        admissions,
        form.admission_id,
      ]
    );

  const finalAmount =
    Number(
      selectedAdmission
        ?.final_amount || 0
    );

  const paidAmount =
    Number(
      selectedAdmission
        ?.paid_amount || 0
    );

  const remainingAmount =
    Math.max(
      finalAmount -
        paidAmount,
      0
    );

  const enteredAmount =
    Number(form.amount) || 0;

  const remainingAfterPayment =
    Math.max(
      remainingAmount -
        enteredAmount,
      0
    );

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );

    setError("");
  };

  const handleAdmissionChange =
    (event) => {
      setForm(
        (previous) => ({
          ...previous,
          admission_id:
            event.target.value,
          amount: "",
        })
      );

      setError("");
    };

  const handleSubmit = async (
    event
  ) => {
    event.preventDefault();

    setError("");

    if (!form.admission_id) {
      setError(
        "Please select an admission."
      );
      return;
    }

    if (
      enteredAmount <= 0
    ) {
      setError(
        "Payment amount must be greater than zero."
      );
      return;
    }

    /*
     * When editing an existing payment,
     * the current payment is already included
     * inside paidAmount.
     *
     * Therefore add it back to calculate
     * the maximum allowed edited amount.
     */
    let maximumAllowed =
      remainingAmount;

    if (
      initialData &&
      selectedAdmission
    ) {
      const currentPaymentAmount =
        Number(
          initialData.amount || 0
        );

      maximumAllowed =
        remainingAmount +
        currentPaymentAmount;
    }

    if (
      form.status ===
        "Verified" &&
      enteredAmount >
        maximumAllowed
    ) {
      setError(
        `Payment cannot exceed ₹${maximumAllowed.toFixed(
          2
        )}.`
      );

      return;
    }

    try {
      await onSubmit({
        admission_id:
          form.admission_id,

        /*
         * student_id is taken from
         * selected admission on backend.
         * We still send it when available.
         */
        student_id:
          selectedAdmission
            ?.student_id?._id ||
          selectedAdmission
            ?.student_id ||
          initialData?.student_id?._id ||
          initialData?.student_id,

        amount:
          enteredAmount,

        payment_date:
          form.payment_date,

        payment_mode:
          form.payment_mode,

        receipt_no:
          form.receipt_no,

        status:
          form.status,

        notes:
          form.notes,
      });
    } catch (submitError) {
      setError(
        submitError?.response
          ?.data?.message ||
          submitError?.message ||
          "Unable to save payment."
      );
    }
  };

  return (
    <form
      className="payment-form"
      onSubmit={
        handleSubmit
      }
    >
      {error && (
        <div className="payment-form-error">
          {error}
        </div>
      )}

      {/* ADMISSION */}

      <section className="payment-form-section">
        <div className="payment-section-header">
          <div>
            <h3>
              Admission Information
            </h3>

            <p>
              Select the admission for this payment.
            </p>
          </div>
        </div>

        <div className="payment-form-grid">
          <div className="payment-form-group payment-form-full">
            <label>
              Admission{" "}
              <span className="required">
                *
              </span>
            </label>

            <select
              name="admission_id"
              value={
                form.admission_id
              }
              onChange={
                handleAdmissionChange
              }
              disabled={
                loadingAdmissions ||
                Boolean(
                  initialData
                )
              }
            >
              <option value="">
                {loadingAdmissions
                  ? "Loading admissions..."
                  : "Select Admission"}
              </option>

              {admissions.map(
                (admission) => {
                  const student =
                    admission.student_id;

                  const course =
                    admission.course_id;

                  const studentName =
                    [
                      student?.firstName,
                      student?.surname,
                    ]
                      .filter(Boolean)
                      .join(" ") ||
                    "Unknown Student";

                  return (
                    <option
                      key={
                        admission._id
                      }
                      value={
                        admission._id
                      }
                    >
                      {student?.rollNo ||
                        "No Roll No"}{" "}
                      -{" "}
                      {
                        studentName
                      }{" "}
                      -{" "}
                      {course?.courseTitle ||
                        "Course"}{" "}
                      - ₹
                      {Number(
                        admission.final_amount ||
                          0
                      ).toLocaleString(
                        "en-IN"
                      )}
                    </option>
                  );
                }
              )}
            </select>

            {initialData && (
              <small className="payment-form-help">
                Admission cannot be changed while editing a payment.
              </small>
            )}
          </div>
        </div>
      </section>

      {/* SUMMARY */}

      <section className="payment-form-section">
        <div className="payment-section-header">
          <div>
            <h3>
              Fee Summary
            </h3>

            <p>
              Current admission payment status.
            </p>
          </div>
        </div>

        <div className="payment-summary-grid">
          <div className="payment-summary-item">
            <span>
              Student
            </span>

            <strong>
              {[
                selectedAdmission
                  ?.student_id
                  ?.firstName,
                selectedAdmission
                  ?.student_id
                  ?.surname,
              ]
                .filter(Boolean)
                .join(" ") ||
                "—"}
            </strong>
          </div>

          <div className="payment-summary-item">
            <span>
              Course
            </span>

            <strong>
              {selectedAdmission
                ?.course_id
                ?.courseTitle ||
                "—"}
            </strong>
          </div>

          <div className="payment-summary-item">
            <span>
              Final Amount
            </span>

            <strong>
              ₹
              {finalAmount.toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </strong>
          </div>

          <div className="payment-summary-item">
            <span>
              Already Paid
            </span>

            <strong>
              ₹
              {paidAmount.toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </strong>
          </div>

          <div className="payment-summary-item payment-summary-remaining">
            <span>
              Current Remaining
            </span>

            <strong>
              ₹
              {remainingAmount.toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </strong>
          </div>

          <div className="payment-summary-item payment-summary-after">
            <span>
              Remaining After Payment
            </span>

            <strong>
              ₹
              {remainingAfterPayment.toLocaleString(
                "en-IN",
                {
                  minimumFractionDigits: 2,
                }
              )}
            </strong>
          </div>
        </div>
      </section>

      {/* PAYMENT */}

      <section className="payment-form-section">
        <div className="payment-section-header">
          <div>
            <h3>
              Payment Information
            </h3>

            <p>
              Enter payment transaction details.
            </p>
          </div>
        </div>

        <div className="payment-form-grid">
          <div className="payment-form-group">
            <label>
              Amount{" "}
              <span className="required">
                *
              </span>
            </label>

            <input
              type="number"
              name="amount"
              value={
                form.amount
              }
              onChange={
                handleChange
              }
              min="0.01"
              step="0.01"
              placeholder="Enter amount"
            />
          </div>

          <div className="payment-form-group">
            <label>
              Payment Date{" "}
              <span className="required">
                *
              </span>
            </label>

            <input
              type="date"
              name="payment_date"
              value={
                form.payment_date
              }
              onChange={
                handleChange
              }
            />
          </div>

          <div className="payment-form-group">
            <label>
              Payment Mode{" "}
              <span className="required">
                *
              </span>
            </label>

            <select
              name="payment_mode"
              value={
                form.payment_mode
              }
              onChange={
                handleChange
              }
            >
              <option value="Cash">
                Cash
              </option>

              <option value="UPI">
                UPI
              </option>

              <option value="Card">
                Card
              </option>

              <option value="Bank Transfer">
                Bank Transfer
              </option>
            </select>
          </div>

          <div className="payment-form-group">
            <label>
              Receipt Number
            </label>

            <input
              type="text"
              name="receipt_no"
              value={
                form.receipt_no
              }
              onChange={
                handleChange
              }
              placeholder="Leave blank for auto-generated receipt"
            />
          </div>

          <div className="payment-form-group">
            <label>
              Status
            </label>

            <select
              name="status"
              value={
                form.status
              }
              onChange={
                handleChange
              }
            >
              <option value="Verified">
                Verified
              </option>

              <option value="Pending">
                Pending
              </option>

              <option value="Failed">
                Failed
              </option>

              <option value="Overdue">
                Overdue
              </option>
            </select>
          </div>

          <div className="payment-form-group payment-form-full">
            <label>
              Notes
            </label>

            <textarea
              name="notes"
              value={
                form.notes
              }
              onChange={
                handleChange
              }
              rows="4"
              placeholder="Add payment notes"
            />
          </div>
        </div>
      </section>

      <div className="payment-form-actions">
        <button
          type="submit"
          className="payment-primary-button"
          disabled={
            submitting
          }
        >
          {submitting
            ? "Saving..."
            : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default PaymentForm;