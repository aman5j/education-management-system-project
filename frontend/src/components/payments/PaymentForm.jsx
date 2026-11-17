
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  getAdmissions,
} from "../../services/admissionService";
import notification from "../../utils/notification";

const getToday = () =>
  new Date().toISOString().split("T")[0];

const initialForm = {
  admission_id: "",
  amount: "",
  payment_date: getToday(),
  payment_mode: "Cash",
  receipt_no: "",
  status: "Verified",
  notes: "",
};

const getAdmissionId = (admission) =>
  admission?._id || admission || "";

const getStudentName = (admission) =>
  [
    admission?.student_id?.firstName,
    admission?.student_id?.surname,
  ]
    .filter(Boolean)
    .join(" ") || "Unknown Student";

const getAdmissionLabel = (admission) => {
  if (!admission) return "";

  const student = admission.student_id;

  return [
    student?.rollNo,
    getStudentName(admission),
    student?.mobile,
  ]
    .filter(Boolean)
    .join(" - ");
};

const PaymentForm = ({
  initialData = null,
  onSubmit,
  submitting = false,
  submitLabel = "Create Payment",
}) => {
  const [form, setForm] = useState(initialForm);

  const [admissions, setAdmissions] = useState([]);
  const [selectedAdmission, setSelectedAdmission] = useState(
    initialData?.admission_id &&
      typeof initialData.admission_id === "object"
      ? initialData.admission_id
      : null
  );

  const [search, setSearch] = useState(
    initialData?.admission_id &&
      typeof initialData.admission_id === "object"
      ? getAdmissionLabel(initialData.admission_id)
      : ""
  );

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadingAdmissions, setLoadingAdmissions] = useState(false);

  const wrapperRef = useRef(null);

  // !!!!! INSERTION START: SEARCH ACTIVE ADMISSIONS !!!!!
  useEffect(() => {
    const searchValue = search.trim();

    if (searchValue.length < 2 || selectedAdmission) {
      setAdmissions([]);
      setLoadingAdmissions(false);
      return;
    }

    let active = true;

    const timer = setTimeout(async () => {
      try {
        setLoadingAdmissions(true);

        const response = await getAdmissions({
          search: searchValue,
          page: 1,
          limit: 10,
          status: "Active",
        });

        if (!active) return;

        const list =
          response?.data?.data?.admissions ??
          response?.data?.admissions ??
          [];

        setAdmissions(Array.isArray(list) ? list : []);
      } catch (error) {
        console.error("Admission search error:", error);

        if (active) {
          setAdmissions([]);
        }
      } finally {
        if (active) {
          setLoadingAdmissions(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, selectedAdmission]);
  // !!!!! INSERTION END: SEARCH ACTIVE ADMISSIONS !!!!!

  // !!!!! INSERTION START: CLOSE ADMISSION SEARCH OUTSIDE CLICK !!!!!
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);
  // !!!!! INSERTION END: CLOSE ADMISSION SEARCH OUTSIDE CLICK !!!!!

  useEffect(() => {
    if (!initialData) {
      setForm(initialForm);
      setSelectedAdmission(null);
      setSearch("");
      return;
    }

    const admission = initialData.admission_id;

    const admissionId = getAdmissionId(admission);

    setForm({
      admission_id: admissionId,
      amount: initialData.amount ?? "",
      payment_date: initialData.payment_date
        ? new Date(initialData.payment_date)
            .toISOString()
            .split("T")[0]
        : getToday(),
      payment_mode: initialData.payment_mode || "Cash",
      receipt_no: initialData.receipt_no || "",
      status: initialData.status || "Verified",
      notes: initialData.notes || "",
    });

    if (admission && typeof admission === "object") {
      setSelectedAdmission(admission);
      setSearch(getAdmissionLabel(admission));
    }
  }, [initialData]);

  const handleAdmissionSearch = (event) => {
    const value = event.target.value;

    setSearch(value);
    setDropdownOpen(true);

    if (selectedAdmission || form.admission_id) {
      setSelectedAdmission(null);

      setForm((previous) => ({
        ...previous,
        admission_id: "",
        amount: "",
      }));
    }
  };

  const handleAdmissionSelect = (admission) => {
    setSelectedAdmission(admission);
    setSearch(getAdmissionLabel(admission));
    setDropdownOpen(false);

    setForm((previous) => ({
      ...previous,
      admission_id: admission._id,
      amount: "",
    }));
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const finalAmount = Number(
    selectedAdmission?.final_amount ||
      initialData?.admission_id?.final_amount ||
      0
  );

  const paidAmount = Number(
    selectedAdmission?.paid_amount ||
      initialData?.admission_id?.paid_amount ||
      0
  );

  const remainingAmount = Math.max(
    finalAmount - paidAmount,
    0
  );

  const enteredAmount = Number(form.amount) || 0;

  const remainingAfterPayment = Math.max(
    remainingAmount - enteredAmount,
    0
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submitting) return;

    if (!form.admission_id) {
      notification.warning("Please select an admission.");
      return;
    }

    if (!form.payment_date) {
      notification.warning("Please select a payment date.");
      return;
    }

    if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) {
      notification.warning(
        "Payment amount must be greater than zero."
      );
      return;
    }

    let maximumAllowed = remainingAmount;

    if (initialData && selectedAdmission) {
      maximumAllowed =
        remainingAmount + Number(initialData.amount || 0);
    }

    if (
      form.status === "Verified" &&
      enteredAmount > maximumAllowed
    ) {
      notification.warning(
        `Payment cannot exceed ₹${maximumAllowed.toFixed(2)}.`
      );
      return;
    }

    try {
      await onSubmit({
        admission_id: form.admission_id,
        student_id:
          selectedAdmission?.student_id?._id ||
          selectedAdmission?.student_id ||
          initialData?.student_id?._id ||
          initialData?.student_id,
        amount: enteredAmount,
        payment_date: form.payment_date,
        payment_mode: form.payment_mode,
        receipt_no: form.receipt_no,
        status: form.status,
        notes: form.notes,
      });
    } catch {
      // The Add/Edit page owns API error notifications.
    }
  };

  return (
    <form className="payment-form" onSubmit={handleSubmit}>
      {/* ADMISSION INFORMATION */}
      <section className="payment-form-section">
        <div className="payment-section-header">
          <div>
            <h3>Admission Information</h3>
            <p>Select the admission for this payment.</p>
          </div>
        </div>

        <div className="payment-form-grid">
          <div className="payment-form-group payment-form-full">
            <label>
              Admission <span className="required">*</span>
            </label>

            {/* !!!!! INSERTION START: SEARCHABLE ADMISSION SELECTOR !!!!! */}
            <div
              className="payment-admission-search"
              ref={wrapperRef}
            >
              <input
                type="text"
                value={search}
                onChange={handleAdmissionSearch}
                onFocus={() => {
                  if (!initialData) {
                    setDropdownOpen(true);
                  }
                }}
                disabled={Boolean(initialData)}
                placeholder="Search by roll number, student name, mobile or course..."
                autoComplete="off"
              />

              {loadingAdmissions && (
                <span className="payment-admission-search-loader">
                  Searching...
                </span>
              )}

              {dropdownOpen && !initialData && (
                <div className="payment-admission-results">
                  {loadingAdmissions ? (
                    <div className="payment-admission-message">
                      Searching admissions...
                    </div>
                  ) : search.trim().length < 2 ? (
                    <div className="payment-admission-message">
                      Type at least 2 characters to search admissions.
                    </div>
                  ) : admissions.length > 0 ? (
                    admissions.map((admission) => (
                      <button
                        type="button"
                        key={admission._id}
                        className="payment-admission-option"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          handleAdmissionSelect(admission);
                        }}
                      >
                        <strong>
                          {admission.student_id?.rollNo || "No Roll No"}
                        </strong>

                        <span>
                          {getStudentName(admission)}
                        </span>

                        <small>
                          {admission.student_id?.mobile || "No mobile"}
                        </small>

                        <div className="payment-admission-option-details">
                          <span>
                            {admission.course_id?.courseTitle || "Course"}
                          </span>
                          <strong>
                            ₹{Number(admission.final_amount || 0).toLocaleString("en-IN")}
                          </strong>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="payment-admission-message">
                      No active admission found for "{search}".
                    </div>
                  )}
                </div>
              )}

              {selectedAdmission && (
                <div className="payment-selected-admission">
                  <div className="payment-selected-admission-details">
                    <strong>
                      {getStudentName(selectedAdmission)}
                    </strong>

                    <span>
                      Roll No: {selectedAdmission.student_id?.rollNo || "—"}
                    </span>

                    <span>
                      Mobile: {selectedAdmission.student_id?.mobile || "—"}
                    </span>

                    <span>
                      Course: {selectedAdmission.course_id?.courseTitle || "—"}
                    </span>

                    <span>
                      Admission Fee: ₹
                      {Number(selectedAdmission.final_amount || 0).toLocaleString("en-IN")}
                    </span>
                  </div>

                  <span className="payment-admission-selected-label">
                    Selected
                  </span>
                </div>
              )}
            </div>
            {/* !!!!! INSERTION END: SEARCHABLE ADMISSION SELECTOR !!!!! */}

            {initialData && (
              <small className="payment-form-help">
                Admission cannot be changed while editing a payment.
              </small>
            )}
          </div>
        </div>
      </section>

      {/* FEE SUMMARY */}
      <section className="payment-form-section">
        <div className="payment-section-header">
          <div>
            <h3>Fee Summary</h3>
            <p>Current admission payment status.</p>
          </div>
        </div>

        <div className="payment-summary-grid">
          <div className="payment-summary-item">
            <span>Student</span>
            <strong>
              {getStudentName(selectedAdmission) === "Unknown Student"
                ? "—"
                : getStudentName(selectedAdmission)}
            </strong>
          </div>

          <div className="payment-summary-item">
            <span>Course</span>
            <strong>
              {selectedAdmission?.course_id?.courseTitle || "—"}
            </strong>
          </div>

          <div className="payment-summary-item">
            <span>Final Amount</span>
            <strong>
              ₹{finalAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </strong>
          </div>

          <div className="payment-summary-item">
            <span>Already Paid</span>
            <strong>
              ₹{paidAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </strong>
          </div>

          <div className="payment-summary-item payment-summary-remaining">
            <span>Current Remaining</span>
            <strong>
              ₹{remainingAmount.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </strong>
          </div>

          <div className="payment-summary-item payment-summary-after">
            <span>Remaining After Payment</span>
            <strong>
              ₹{remainingAfterPayment.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </strong>
          </div>
        </div>
      </section>

      {/* PAYMENT INFORMATION */}
      <section className="payment-form-section">
        <div className="payment-section-header">
          <div>
            <h3>Payment Information</h3>
            <p>Enter payment transaction details.</p>
          </div>
        </div>

        <div className="payment-form-grid">
          <div className="payment-form-group">
            <label>
              Amount <span className="required">*</span>
            </label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              min="0.01"
              step="0.01"
              placeholder="Enter amount"
            />
          </div>

          <div className="payment-form-group">
            <label>
              Payment Date <span className="required">*</span>
            </label>
            <input
              type="date"
              name="payment_date"
              value={form.payment_date}
              onChange={handleChange}
            />
          </div>

          <div className="payment-form-group">
            <label>
              Payment Mode <span className="required">*</span>
            </label>
            <select
              name="payment_mode"
              value={form.payment_mode}
              onChange={handleChange}
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </div>

          <div className="payment-form-group">
            <label>Receipt Number</label>
            <input
              type="text"
              name="receipt_no"
              value={form.receipt_no}
              onChange={handleChange}
              placeholder="Leave blank for auto-generated receipt"
            />
          </div>

          <div className="payment-form-group">
            <label>Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <option value="Verified">Verified</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
              <option value="Overdue">Overdue</option>
            </select>
          </div>

          <div className="payment-form-group payment-form-full">
            <label>Notes</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
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
          disabled={submitting}
        >
          {submitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default PaymentForm;
