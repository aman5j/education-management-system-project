import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEdit,
  FiFileText,
} from "react-icons/fi";

import {
  getPayment,
} from "../../../services/paymentService";

import generatePaymentReceipt from "../../../utils/generatePaymentReceipt";

import {
  getAssetUrl,
} from "../../../utils/assetUrl";

import "../../../styles/PaymentManagement.css";

const ViewPayment = () => {
  const { id } = useParams();

  const [payment, setPayment] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | Load Payment
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const loadPayment = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getPayment(id);

        const paymentData =
          response?.data?.data;

        setPayment(
          paymentData || null
        );
      } catch (loadError) {
        console.error(
          "Load payment error:",
          loadError
        );

        setError(
          loadError?.response?.data?.message ||
            "Unable to load payment."
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadPayment();
    }
  }, [id]);

  /*
  |--------------------------------------------------------------------------
  | Helpers
  |--------------------------------------------------------------------------
  */

  const getStudentName = () => {
    return [
      payment?.student_id?.firstName,
      payment?.student_id?.surname,
    ]
      .filter(Boolean)
      .join(" ") || "-";
  };

  const getCourseName = () => {
    return (
      payment?.admission_id?.course_id
        ?.courseTitle ||
      payment?.admission_id
        ?.courseTitle ||
      payment?.admission_id
        ?.course_type ||
      "-"
    );
  };

  const getBatchName = () => {
    return (
      payment?.admission_id?.batch_id
        ?.batch_name ||
      payment?.admission_id
        ?.batchName ||
      "-"
    );
  };

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };

  const formatCurrency = (value) => {
    return `₹${Number(
      value || 0
    ).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  /*
  |--------------------------------------------------------------------------
  | Fee Calculations
  |--------------------------------------------------------------------------
  */

  const totalFee = Number(
    payment?.admission_id
      ?.final_amount || 0
  );

  const paidAmount = Number(
    payment?.admission_id
      ?.paid_amount || 0
  );

  const remainingAmount = Math.max(
    totalFee - paidAmount,
    0
  );

  const discountAmount =
    payment?.admission_id
      ?.discount_type === "Percentage"
      ? (
          Number(
            payment?.admission_id
              ?.course_fee || 0
          ) *
          Number(
            payment?.admission_id
              ?.discount_value || 0
          )
        ) / 100
      : Number(
          payment?.admission_id
            ?.discount_value || 0
        );

  /*
  |--------------------------------------------------------------------------
  | Download Receipt
  |--------------------------------------------------------------------------
  */

  const handleDownloadReceipt = async () => {
    if (!payment) {
      return;
    }

    if (payment.status !== "Verified") {
      alert(
        "Receipt can only be downloaded for verified payments."
      );

      return;
    }

    try {
      await generatePaymentReceipt(
        payment
      );
    } catch (receiptError) {
      console.error(
        "Download receipt error:",
        receiptError
      );

      alert(
        receiptError?.message ||
          "Unable to generate payment receipt."
      );
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="payment-page">
        <div className="payment-state">
          Loading payment details...
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Error
  |--------------------------------------------------------------------------
  */

  if (error || !payment) {
    return (
      <div className="payment-page">
        <div className="payment-error">
          {error ||
            "Payment not found."}
        </div>

        <Link
          to="/admin/payments"
          className="payment-secondary-button"
        >
          <FiArrowLeft />
          Back to Payments
        </Link>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Main UI
  |--------------------------------------------------------------------------
  */

  return (
    <div className="payment-page">
      {/* =========================================================
          HEADER
      ========================================================= */}

      <div className="payment-page-header">
        <div>
          <div className="payment-back-link">
            <Link to="/admin/payments">
              <FiArrowLeft />
              Back to Payments
            </Link>
          </div>

          <h1>
            View Payment
          </h1>

          <p>
            View complete payment,
            student and fee details.
          </p>
        </div>

        <div className="payment-view-header-actions">
          {payment.status ===
            "Verified" && (
            <button
              type="button"
              className="payment-primary-button"
              onClick={
                handleDownloadReceipt
              }
            >
              <FiDownload />
              Download Receipt
            </button>
          )}

          <Link
            to={`/admin/payments/${payment._id}/edit`}
            className="payment-secondary-button"
          >
            <FiEdit />
            Edit Payment
          </Link>
        </div>
      </div>

      {/* =========================================================
          RECEIPT / STATUS HEADER
      ========================================================= */}

      <div className="payment-card payment-detail-header-card">
        <div className="payment-receipt-info">
          <div className="payment-receipt-icon">
            <FiFileText />
          </div>

          <div>
            <span>
              Receipt Number
            </span>

            <strong>
              {payment.receipt_no ||
                "-"}
            </strong>
          </div>
        </div>

        <div
          className={`payment-status payment-status-${String(
            payment.status || ""
          ).toLowerCase()}`}
        >
          {payment.status ===
          "Verified" ? (
            <FiCheckCircle />
          ) : (
            <FiClock />
          )}

          {payment.status || "-"}
        </div>
      </div>

      {/* =========================================================
          STUDENT INFORMATION
      ========================================================= */}

      <div className="payment-card">
        <div className="payment-detail-section-title">
          <h2>
            Student Information
          </h2>
        </div>

        <div className="payment-student-detail-layout">
          <div className="payment-student-detail-image">
            {payment?.student_id
              ?.profileImage ? (
              <img
                src={getAssetUrl(
                  payment.student_id
                    .profileImage
                )}
                alt={getStudentName()}
              />
            ) : (
              <div className="payment-student-avatar">
                {payment?.student_id
                  ?.firstName
                  ?.charAt(0)
                  ?.toUpperCase() ||
                  "S"}
              </div>
            )}
          </div>

          <div className="payment-detail-grid">
            <div className="payment-detail-item">
              <span>
                Student Name
              </span>

              <strong>
                {getStudentName()}
              </strong>
            </div>

            <div className="payment-detail-item">
              <span>
                Roll No
              </span>

              <strong>
                {payment?.student_id
                  ?.rollNo || "-"}
              </strong>
            </div>

            <div className="payment-detail-item">
              <span>
                Mobile
              </span>

              <strong>
                {payment?.student_id
                  ?.mobile || "-"}
              </strong>
            </div>

            <div className="payment-detail-item">
              <span>
                Email
              </span>

              <strong>
                {payment?.student_id
                  ?.email || "-"}
              </strong>
            </div>

            <div className="payment-detail-item">
              <span>
                Father Name
              </span>

              <strong>
                {payment?.student_id
                  ?.fatherName || "-"}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          ADMISSION / COURSE
      ========================================================= */}

      <div className="payment-card">
        <div className="payment-detail-section-title">
          <h2>
            Admission & Course Details
          </h2>
        </div>

        <div className="payment-detail-grid payment-detail-grid-four">
          <div className="payment-detail-item">
            <span>
              Course
            </span>

            <strong>
              {getCourseName()}
            </strong>
          </div>

          <div className="payment-detail-item">
            <span>
              Batch
            </span>

            <strong>
              {getBatchName()}
            </strong>
          </div>

          <div className="payment-detail-item">
            <span>
              Course Type
            </span>

            <strong>
              {payment?.admission_id
                ?.course_type || "-"}
            </strong>
          </div>

          <div className="payment-detail-item">
            <span>
              Admission Date
            </span>

            <strong>
              {formatDate(
                payment?.admission_id
                  ?.admission_date
              )}
            </strong>
          </div>

          <div className="payment-detail-item">
            <span>
              Admission Status
            </span>

            <strong>
              {payment?.admission_id
                ?.status || "-"}
            </strong>
          </div>
        </div>
      </div>

      {/* =========================================================
          FEE BREAKDOWN
      ========================================================= */}

      <div className="payment-card">
        <div className="payment-detail-section-title">
          <h2>
            Fee Breakdown
          </h2>
        </div>

        <div className="payment-fee-breakdown">
          <div className="payment-fee-row">
            <span>
              Course Fee
            </span>

            <strong>
              {formatCurrency(
                payment?.admission_id
                  ?.course_fee
              )}
            </strong>
          </div>

          <div className="payment-fee-row">
            <span>
              Discount
            </span>

            <strong>
              -{" "}
              {formatCurrency(
                discountAmount
              )}
            </strong>
          </div>

          <div className="payment-fee-row">
            <span>
              GST
            </span>

            <strong>
              {formatCurrency(
                payment?.admission_id
                  ?.gst_amount
              )}
            </strong>
          </div>

          <div className="payment-fee-row">
            <span>
              Admission Fee
            </span>

            <strong>
              {formatCurrency(
                payment?.admission_id
                  ?.admission_fee
              )}
            </strong>
          </div>

          <div className="payment-fee-row payment-fee-total">
            <span>
              Final Amount
            </span>

            <strong>
              {formatCurrency(
                totalFee
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* =========================================================
          PAYMENT INFORMATION
      ========================================================= */}

      <div className="payment-card">
        <div className="payment-detail-section-title">
          <h2>
            Payment Information
          </h2>
        </div>

        <div className="payment-detail-grid">
          <div className="payment-detail-item">
            <span>
              Receipt Number
            </span>

            <strong>
              {payment.receipt_no ||
                "-"}
            </strong>
          </div>

          <div className="payment-detail-item">
            <span>
              Payment Date
            </span>

            <strong>
              {formatDate(
                payment.payment_date
              )}
            </strong>
          </div>

          <div className="payment-detail-item">
            <span>
              Payment Mode
            </span>

            <strong>
              {payment.payment_mode ||
                "-"}
            </strong>
          </div>

          <div className="payment-detail-item">
            <span>
              Payment Amount
            </span>

            <strong className="payment-amount-highlight">
              {formatCurrency(
                payment.amount
              )}
            </strong>
          </div>

          <div className="payment-detail-item">
            <span>
              Payment Status
            </span>

            <strong>
              {payment.status ||
                "-"}
            </strong>
          </div>
        </div>

        {payment.notes && (
          <div className="payment-notes-box">
            <span>
              Notes
            </span>

            <p>
              {payment.notes}
            </p>
          </div>
        )}
      </div>

      {/* =========================================================
          FEE SUMMARY
      ========================================================= */}

      <div className="payment-view-summary">
        <div className="payment-view-summary-card">
          <span>
            Total Fee
          </span>

          <strong>
            {formatCurrency(
              totalFee
            )}
          </strong>
        </div>

        <div className="payment-view-summary-card">
          <span>
            Total Paid
          </span>

          <strong>
            {formatCurrency(
              paidAmount
            )}
          </strong>
        </div>

        <div className="payment-view-summary-card payment-remaining-card">
          <span>
            Remaining Fee
          </span>

          <strong>
            {formatCurrency(
              remainingAmount
            )}
          </strong>
        </div>
      </div>

      {/* =========================================================
          BOTTOM ACTIONS
      ========================================================= */}

      <div className="payment-bottom-actions">
        <Link
          to="/admin/payments"
          className="payment-secondary-button"
        >
          <FiArrowLeft />
          Back to Payments
        </Link>

        {payment.status ===
          "Verified" && (
          <button
            type="button"
            className="payment-primary-button"
            onClick={
              handleDownloadReceipt
            }
          >
            <FiDownload />
            Download Receipt
          </button>
        )}
      </div>
    </div>
  );
};

export default ViewPayment;