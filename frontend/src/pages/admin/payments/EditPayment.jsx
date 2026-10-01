import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import "../../../styles/PaymentManagement.css";
import PaymentForm from "../../../components/payments/PaymentForm";

import {
  getPayment,
  updatePayment,
} from "../../../services/paymentService";

const EditPayment = () => {
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
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    const loadPayment =
      async () => {
        try {
          setLoading(true);

          const response =
            await getPayment(
              id
            );

          setPayment(
            response?.data?.data
          );
        } catch (loadError) {
          console.error(
            "Load payment error:",
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

  const handleSubmit =
    async (formData) => {
      try {
        setSaving(true);

        await updatePayment(
          id,
          formData
        );

        navigate(
          `/admin/payments/${id}`
        );
      } catch (submitError) {
        throw new Error(
          submitError?.response
            ?.data?.message ||
            "Unable to update payment."
        );
      } finally {
        setSaving(false);
      }
    };

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

  return (
    <div className="payment-page">
      <div className="payment-page-header">
        <div>
          <h1>
            Edit Payment
          </h1>

          <p>
            Update payment information.
          </p>
        </div>
      </div>

      <PaymentForm
        initialData={
          payment
        }
        submitting={
          saving
        }
        submitLabel="Update Payment"
        onSubmit={
          handleSubmit
        }
      />
    </div>
  );
};

export default EditPayment;