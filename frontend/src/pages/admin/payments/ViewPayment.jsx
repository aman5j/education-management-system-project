import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

import "../../../styles/PaymentManagement.css";

import {
  getPayment,
} from "../../../services/paymentService";

const money = (
  value
) =>
  `₹${Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;

const formatDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  return new Date(
    value
  ).toLocaleDateString(
    "en-IN"
  );
};

const ViewPayment = () => {
  const {
    id,
  } = useParams();

  const navigate =
    useNavigate();

  const [
    payment,
    setPayment,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const loadPayment =
      async () => {
        try {
          const response =
            await getPayment(
              id
            );

          setPayment(
            response?.data?.data
          );
        } catch (loadError) {
          console.error(
            loadError
          );

          setError(
            loadError?.response
              ?.data?.message ||
              "Unable to load payment."
          );
        } finally {
          setLoading(false);
        }
      };

    loadPayment();
  }, [id]);

  if (loading) {
    return (
      <div className="payment-state">
        Loading payment...
      </div>
    );
  }

  if (error) {
    return (
      <div className="payment-error">
        {error}
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="payment-empty">
        Payment not found.
      </div>
    );
  }

  const student =
    payment.student_id;

  const admission =
    payment.admission_id;

  const finalAmount =
    Number(
      admission?.final_amount ||
        0
    );

  const paidAmount =
    Number(
      admission?.paid_amount ||
        0
    );

  const remaining =
    Math.max(
      finalAmount -
        paidAmount,
      0
    );

  return (
    <div className="payment-page">
      <div className="payment-page-header">
        <div>
          <h1>
            Payment Details
          </h1>

          <p>
            View complete payment information.
          </p>
        </div>

        <div className="payment-header-actions">
          <Link
            to={`/admin/payments/${id}/edit`}
            className="payment-primary-button"
          >
            Edit Payment
          </Link>

          <button
            type="button"
            className="payment-secondary-button"
            onClick={() =>
              navigate(
                "/admin/payments"
              )
            }
          >
            Back
          </button>
        </div>
      </div>

      <div className="payment-view-card">
        <section className="payment-view-section">
          <h3>
            Student Information
          </h3>

          <div className="payment-details-grid">
            <div>
              <span>
                Roll No
              </span>

              <strong>
                {student?.rollNo ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Student Name
              </span>

              <strong>
                {[
                  student?.firstName,
                  student?.surname,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Mobile
              </span>

              <strong>
                {student?.mobile ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Email
              </span>

              <strong>
                {student?.email ||
                  "—"}
              </strong>
            </div>
          </div>
        </section>

        <section className="payment-view-section">
          <h3>
            Admission Information
          </h3>

          <div className="payment-details-grid">
            <div>
              <span>
                Admission ID
              </span>

              <strong>
                {
                  admission?._id
                }
              </strong>
            </div>

            <div>
              <span>
                Course
              </span>

              <strong>
                {admission?.course_type ||
                  "—"}
              </strong>
            </div>

            <div>
              <span>
                Final Amount
              </span>

              <strong>
                {money(
                  finalAmount
                )}
              </strong>
            </div>

            <div>
              <span>
                Total Paid
              </span>

              <strong>
                {money(
                  paidAmount
                )}
              </strong>
            </div>

            <div>
              <span>
                Remaining
              </span>

              <strong className="payment-danger">
                {money(
                  remaining
                )}
              </strong>
            </div>
          </div>
        </section>

        <section className="payment-view-section">
          <h3>
            Transaction Information
          </h3>

          <div className="payment-details-grid">
            <div>
              <span>
                Receipt Number
              </span>

              <strong>
                {
                  payment.receipt_no
                }
              </strong>
            </div>

            <div>
              <span>
                Amount
              </span>

              <strong className="payment-highlight">
                {money(
                  payment.amount
                )}
              </strong>
            </div>

            <div>
              <span>
                Payment Date
              </span>

              <strong>
                {formatDate(
                  payment.payment_date
                )}
              </strong>
            </div>

            <div>
              <span>
                Payment Mode
              </span>

              <strong>
                {
                  payment.payment_mode
                }
              </strong>
            </div>

            <div>
              <span>
                Status
              </span>

              <strong>
                <span
                  className={`payment-status payment-status-${String(
                    payment.status
                  ).toLowerCase()}`}
                >
                  {
                    payment.status
                  }
                </span>
              </strong>
            </div>

            <div className="payment-detail-full">
              <span>
                Notes
              </span>

              <strong>
                {payment.notes ||
                  "—"}
              </strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ViewPayment;