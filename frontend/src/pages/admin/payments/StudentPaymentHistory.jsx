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
  FiEye,
  FiMessageCircle,
} from "react-icons/fi";

import {
  getStudentPaymentHistory,
} from "../../../services/paymentService";

import generatePaymentReceipt from "../../../utils/generatePaymentReceipt";

import {
  getAssetUrl,
} from "../../../utils/assetUrl";

import "../../../styles/PaymentManagement.css";

const StudentPaymentHistory = () => {
  const { studentId } = useParams();

  const [student, setStudent] =
    useState(null);

  const [admission, setAdmission] =
    useState(null);

  const [summary, setSummary] =
    useState({
      totalFee: 0,
      totalPaid: 0,
      remainingAmount: 0,
      totalPayments: 0,
    });

  const [payments, setPayments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await getStudentPaymentHistory(
            studentId
          );

        const data =
          response?.data?.data;

        setStudent(
          data?.student || null
        );

        setAdmission(
          data?.admission || null
        );

        setSummary(
          data?.summary || {
            totalFee: 0,
            totalPaid: 0,
            remainingAmount: 0,
            totalPayments: 0,
          }
        );

        setPayments(
          Array.isArray(data?.payments)
            ? data.payments
            : []
        );
      } catch (loadError) {
        console.error(
          "Load student payment history error:",
          loadError
        );

        setError(
          loadError?.response?.data?.message ||
            "Unable to load payment history."
        );
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      loadHistory();
    }
  }, [studentId]);

  const getStudentName = () => {
    if (!student) {
      return "-";
    }

    return [
      student.firstName,
      student.surname,
    ]
      .filter(Boolean)
      .join(" ");
  };

  const getCourseName = () => {
    return (
      admission?.course_id?.courseTitle ||
      admission?.course_type ||
      "-"
    );
  };

  const getBatchName = () => {
    return (
      admission?.batch_id?.batch_name ||
      "-"
    );
  };

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }
    );
  };

  const formatCurrency = (amount) => {
    return `₹${Number(
      amount || 0
    ).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

const handleDownloadReceipt = async (payment) => {
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
    /*
    |--------------------------------------------------------------------------
    | The receipt generator expects:
    | generatePaymentReceipt(payment)
    |
    | Make sure the payment object contains the
    | populated student and admission information.
    |--------------------------------------------------------------------------
    */

    const receiptPayment = {
      ...payment,

      student_id:
        payment?.student_id?.firstName
          ? payment.student_id
          : student,

      admission_id:
        payment?.admission_id || admission,
    };

    await generatePaymentReceipt(
      receiptPayment
    );
  } catch (error) {
    console.error(
      "Download receipt error:",
      error
    );

    alert(
      error?.message ||
        "Unable to generate payment receipt."
    );
  }
};

const handleShareWhatsApp = () => {
  try {
    if (!student) {
      alert("Student information is not available.");
      return;
    }

    if (!payments.length) {
      alert(
        "No payment history is available to share."
      );
      return;
    }

    const studentName = getStudentName();
    const courseName = getCourseName();
    const batchName = getBatchName();

    const paymentLines = payments
      .map((payment, index) => {
        return [
          `${index + 1}. ${payment?.receipt_no || "-"}`,
          `   Date: ${formatDate(
            payment?.payment_date
          )}`,
          `   Mode: ${
            payment?.payment_mode || "-"
          }`,
          `   Amount: ${formatCurrency(
            payment?.amount
          )}`,
          `   Status: ${
            payment?.status || "-"
          }`,
        ].join("\n");
      })
      .join("\n\n");

    const message = [
      "🏫 IT Learning Institute",
      "",
      "📋 *Student Payment History*",
      "",
      `👤 Student: ${studentName}`,
      `🎓 Roll No: ${student?.rollNo || "-"}`,
      `📱 Mobile: ${student?.mobile || "-"}`,
      `📧 Email: ${student?.email || "-"}`,
      "",
      `📚 Course: ${courseName}`,
      `🗓️ Batch: ${batchName}`,
      `📅 Admission Date: ${formatDate(
        admission?.admission_date
      )}`,
      "",
      "💰 *Payment Summary*",
      `Total Course Fee: ${formatCurrency(
        summary.totalFee
      )}`,
      `Total Paid: ${formatCurrency(
        summary.totalPaid
      )}`,
      `Remaining: ${formatCurrency(
        summary.remainingAmount
      )}`,
      `Total Transactions: ${
        summary.totalPayments || 0
      }`,
      "",
      "💳 *Payment History*",
      "",
      paymentLines,
      "",
      "Thank you.",
      "IT Learning Institute",
    ].join("\n");

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
      message
    )}`;

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
  } catch (error) {
    console.error(
      "WhatsApp share error:",
      error
    );

    alert(
      "Unable to prepare WhatsApp payment history."
    );
  }
};

  if (loading) {
    return (
      <div className="payment-page">
        <div className="payment-state">
          Loading payment history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-page">
        <div className="payment-error">
          {error}
        </div>

        <Link
          to="/admin/students"
          className="payment-secondary-button"
        >
          <FiArrowLeft />
          Back to Students
        </Link>
      </div>
    );
  }

  return (
    <div className="payment-page">
      {/* Header */}

      {/* <div className="payment-page-header">
        <div>
          <div className="payment-back-link">
            <Link to="/admin/students">
              <FiArrowLeft />
              Back to Students
            </Link>
          </div>

          <h1>
            Student Payment History
          </h1>

          <p>
            View all payment transactions
            for this student.
          </p>
        </div>
      </div> */}

      <div className="payment-page-header">
        <div>
          <div className="payment-back-link">
            <Link to="/admin/students">
              <FiArrowLeft />
              Back to Students
            </Link>
          </div>

          <h1>
            Student Payment History
          </h1>

          <p>
            View all payment transactions
            for this student.
          </p>
        </div>

        <div className="student-payment-header-actions">
          <button
            type="button"
            className="student-whatsapp-button"
            onClick={handleShareWhatsApp}
            disabled={!payments.length}
            title="Share payment history on WhatsApp"
          >
            <FiMessageCircle />
            Share on WhatsApp
          </button>
        </div>
      </div>

      {/* Student Card */}

      <div className="payment-card payment-student-card">
        <div className="payment-student-profile">
          <div className="payment-student-image">
            {student?.profileImage ? (
              <img
                src={getAssetUrl(
                  student.profileImage
                )}
                alt={getStudentName()}
              />
            ) : (
              <div className="payment-student-avatar">
                {student?.firstName
                  ?.charAt(0)
                  ?.toUpperCase() || "S"}
              </div>
            )}
          </div>

          <div>
            <h2>
              {getStudentName()}
            </h2>

            <div className="payment-student-meta">
              <span>
                Roll No:{" "}
                <strong>
                  {student?.rollNo || "-"}
                </strong>
              </span>

              <span>
                Mobile:{" "}
                <strong>
                  {student?.mobile || "-"}
                </strong>
              </span>

              <span>
                Email:{" "}
                <strong>
                  {student?.email || "-"}
                </strong>
              </span>
            </div>
          </div>
        </div>

        <div className="payment-admission-info">
          <div>
            <span>Course</span>
            <strong>
              {getCourseName()}
            </strong>
          </div>

          <div>
            <span>Batch</span>
            <strong>
              {getBatchName()}
            </strong>
          </div>

          <div>
            <span>Admission Date</span>
            <strong>
              {formatDate(
                admission?.admission_date
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* Summary */}

      <div className="payment-summary-grid">
        <div className="payment-summary-card">
          <span>
            Total Course Fee
          </span>

          <strong>
            {formatCurrency(
              summary.totalFee
            )}
          </strong>
        </div>

        <div className="payment-summary-card">
          <span>
            Total Paid
          </span>

          <strong>
            {formatCurrency(
              summary.totalPaid
            )}
          </strong>
        </div>

        <div className="payment-summary-card">
          <span>
            Remaining
          </span>

          <strong>
            {formatCurrency(
              summary.remainingAmount
            )}
          </strong>
        </div>

        <div className="payment-summary-card">
          <span>
            Total Transactions
          </span>

          <strong>
            {summary.totalPayments}
          </strong>
        </div>
      </div>

      {/* Payment History */}

      <div className="payment-card">
        <div className="payment-section-header">
          <div>
            <h2>
              Payment History
            </h2>

            <p>
              Complete transaction history
              for this student.
            </p>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="payment-state">
            No payment transactions found.
          </div>
        ) : (
          <div className="payment-table-wrapper">
            <table className="payment-table">
              <thead>
                <tr>
                  <th>
                    Receipt No.
                  </th>

                  <th>
                    Payment Date
                  </th>

                  <th>
                    Payment Mode
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {payments.map(
                  (payment) => (
                    <tr
                      key={payment._id}
                    >
                      <td>
                        <strong>
                          {
                            payment.receipt_no
                          }
                        </strong>
                      </td>

                      <td>
                        {formatDate(
                          payment.payment_date
                        )}
                      </td>

                      <td>
                        {
                          payment.payment_mode
                        }
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            payment.amount
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`payment-status payment-status-${String(
                            payment.status ||
                              ""
                          ).toLowerCase()}`}
                        >
                          {payment.status ===
                          "Verified" ? (
                            <FiCheckCircle />
                          ) : (
                            <FiClock />
                          )}

                          {
                            payment.status
                          }
                        </span>
                      </td>

                      <td>
                        <div className="payment-action-buttons">
                        {/* View Payment */}
                          <Link
                            to={`/admin/payments/${payment._id}`}
                            className="payment-action-button"
                            title="View Payment"
                          >
                            <FiEye />
                          </Link>
                        
                          {/* Download Receipt */}
                          {payment.status ===
                            "Verified" && (
                            <button
                              type="button"
                              className="payment-action-button"
                              title="Download Receipt"
                              onClick={() =>
                                    handleDownloadReceipt(payment)
                                }
                            >
                              <FiDownload />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentPaymentHistory;