import { Link } from "react-router-dom";
import {
  FiEdit2,
  FiEye,
  FiTrash2,
} from "react-icons/fi";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const PaymentTable = ({
  payments = [],
  basePath = "/admin",
  canManagePayments = false,
  deletingId = "",
  onDelete,
}) => {
  if (!payments.length) {
    return (
      <div className="payment-empty">
        No payments found.
      </div>
    );
  }

  return (
    <div className="payment-table-wrapper">
      <table className="payment-table">
        <thead>
          <tr>
            <th>Receipt</th>
            <th>Student</th>
            <th>Course</th>
            <th>Amount</th>
            <th>Payment Date</th>
            <th>Mode</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {payments.map((payment) => {
            const student = payment.student_id;
            const admission = payment.admission_id;

            return (
              <tr key={payment._id}>
                <td>
                  <strong>{payment.receipt_no || "—"}</strong>
                </td>

                <td>
                  <div className="payment-student-cell">
                    <strong>
                      {[
                        student?.firstName,
                        student?.surname,
                      ]
                        .filter(Boolean)
                        .join(" ") || "—"}
                    </strong>

                    <small>{student?.rollNo || "—"}</small>
                  </div>
                </td>

                <td>
                  {admission?.course_id?.courseTitle ||
                    admission?.course_type ||
                    "—"}
                </td>

                <td>
                  <strong>{money(payment.amount)}</strong>
                </td>

                <td>
                  {payment.payment_date
                    ? new Date(
                        payment.payment_date
                      ).toLocaleDateString("en-IN")
                    : "—"}
                </td>

                <td>{payment.payment_mode || "—"}</td>

                <td>
                  <span
                    className={`payment-status payment-status-${String(
                      payment.status || ""
                    ).toLowerCase()}`}
                  >
                    {payment.status || "Unknown"}
                  </span>
                </td>

                <td>
                  <div className="payment-actions">
                    <Link
                      to={`${basePath}/payments/${payment._id}`}
                      title="View payment"
                      aria-label={`View payment ${payment.receipt_no || ""}`}
                    >
                      <FiEye />
                    </Link>

                    {canManagePayments && (
                      <>
                        <Link
                          to={`${basePath}/payments/${payment._id}/edit`}
                          title="Edit payment"
                          aria-label={`Edit payment ${payment.receipt_no || ""}`}
                        >
                          <FiEdit2 />
                        </Link>

                        <button
                          type="button"
                          title="Delete payment"
                          aria-label={`Delete payment ${payment.receipt_no || ""}`}
                          disabled={Boolean(deletingId)}
                          onClick={() => onDelete?.(payment._id)}
                        >
                          <FiTrash2 />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PaymentTable;