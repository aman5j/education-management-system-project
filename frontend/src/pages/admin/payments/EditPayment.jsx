import { useCallback, useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

import PaymentForm from "../../../components/payments/PaymentForm";
import {
  getPayment,
  updatePayment,
} from "../../../services/paymentService";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/PaymentManagement.css";

const EditPayment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const loadPayment = useCallback(async () => {
    setLoading(true);
    setLoadFailed(false);

    try {
      const response = await getPayment(id);
      const data = response?.data?.data ?? null;

      if (!data) {
        throw new Error("Payment not found.");
      }

      setPayment(data);
    } catch (error) {
      setLoadFailed(true);
      notification.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  const handleSubmit = async (formData) => {
    if (saving) return;

    setSaving(true);

    try {
      await updatePayment(id, formData);

      notification.success(
        "Payment updated successfully."
      );

      navigate(`${basePath}/payments/${id}`);
    } catch (error) {
      notification.error(getApiErrorMessage(error));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="payment-page">
        <div className="payment-state">
          Loading payment...
        </div>
      </div>
    );
  }

  if (loadFailed || !payment) {
    return (
      <div className="payment-page">
        <div className="payment-error">
          Unable to load payment. Please retry.
        </div>

        <button
          type="button"
          className="payment-primary-button"
          onClick={loadPayment}
        >
          Retry
        </button>

        <Link
          to={`${basePath}/payments`}
          className="payment-secondary-button"
        >
          <FiArrowLeft />
          Back to Payments
        </Link>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-page-header">
        <div>
          <Link
            to={`${basePath}/payments/${id}`}
            className="payment-back-link"
          >
            <FiArrowLeft />
            Back to Payment Details
          </Link>

          <h1>Edit Payment</h1>
          <p>Update payment information.</p>
        </div>
      </div>

      <PaymentForm
        initialData={payment}
        submitting={saving}
        submitLabel="Update Payment"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default EditPayment;