import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { FiArrowLeft } from "react-icons/fi";

import PaymentForm from "../../../components/payments/PaymentForm";
import { createPayment } from "../../../services/paymentService";
import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

import "../../../styles/PaymentManagement.css";

const AddPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (formData) => {
    if (saving) return;

    setSaving(true);

    try {
      const response = await createPayment(formData);
      const data = response?.data?.data ?? {};

      notification.success(
        response?.data?.message ||
          "Payment created successfully."
      );

      navigate(`${basePath}/payments/${data._id || ""}`.replace(/\/$/, ""));
    } catch (error) {
      notification.error(getApiErrorMessage(error));
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="payment-page">
      <div className="payment-page-header">
        <div>
          <Link
            to={`${basePath}/payments`}
            className="payment-back-link"
          >
            <FiArrowLeft />
            Back to Payments
          </Link>
          <h1>Add Payment</h1>
          <p>Create a new student payment.</p>
        </div>
      </div>

      <PaymentForm
        submitting={saving}
        submitLabel="Create Payment"
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default AddPayment;