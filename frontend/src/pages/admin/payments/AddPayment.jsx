import {
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import "../../../styles/PaymentManagement.css";
import PaymentForm from "../../../components/payments/PaymentForm";

import {
  createPayment,
} from "../../../services/paymentService";

const AddPayment = () => {
  const navigate =
    useNavigate();

  const location = useLocation();
  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";

  const [
    saving,
    setSaving,
  ] = useState(false);

  const handleSubmit =
    async (formData) => {
      try {
        setSaving(true);

        await createPayment(
          formData
        );

         navigate(`${basePath}/payments`);
      } catch (error) {
        console.error(
          "Create payment error:",
          error
        );

        throw new Error(
          error?.response
            ?.data?.message ||
            "Unable to create payment."
        );
      } finally {
        setSaving(false);
      }
    };

  return (
    <div className="payment-page">
      <div className="payment-page-header">
        <div>
          <h1>
            Add Payment
          </h1>

          <p>
            Create a new student payment.
          </p>
        </div>
      </div>

      <PaymentForm
        submitting={
          saving
        }
        submitLabel="Create Payment"
        onSubmit={
          handleSubmit
        }
      />
    </div>
  );
};

export default AddPayment;