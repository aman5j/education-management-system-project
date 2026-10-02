import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "react-router-dom";

import {
  FiCheckCircle,
  FiAlertCircle,
  FiSearch,
} from "react-icons/fi";

import {
  verifyReceipt,
} from "../../services/receiptService";

import "../../styles/ReceiptManagement.css";

const money = (value) => {
  return `₹${Number(
    value || 0
  ).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
};

const formatDate = (value) => {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );
};

const VerifyReceipt = () => {
  const {
    receiptNo: routeReceiptNo,
  } = useParams();

  const [
    receiptNo,
    setReceiptNo,
  ] = useState(
    routeReceiptNo || ""
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    result,
    setResult,
  ] = useState(null);

  const handleVerify = async (
    event
  ) => {
    event?.preventDefault();

    const value =
      receiptNo.trim();

    if (!value) {
      setError(
        "Please enter a receipt number."
      );

      setResult(null);

      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);

      const response =
        await verifyReceipt(value);

      setResult(
        response?.data || null
      );
    } catch (verifyError) {
      setError(
        verifyError?.response
          ?.data?.message ||
          verifyError?.message ||
          "Unable to verify receipt."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeReceiptNo) {
      handleVerify();
    }
  }, [routeReceiptNo]);

  return (
    <div className="receipt-verification-page">
      <div className="receipt-verification-container">
        <div className="receipt-verification-header">
          <h1>
            Receipt Verification
          </h1>

          <p>
            Verify the authenticity of
            an education payment receipt.
          </p>
        </div>

        <form
          className="receipt-verification-search"
          onSubmit={handleVerify}
        >
          <div className="receipt-search-input">
            <FiSearch />

            <input
              type="text"
              value={receiptNo}
              onChange={(event) =>
                setReceiptNo(
                  event.target.value
                )
              }
              placeholder="Enter receipt number"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Verifying..."
              : "Verify Receipt"}
          </button>
        </form>

        {error && (
          <div className="receipt-verification-error">
            <FiAlertCircle />

            <div>
              <strong>
                Receipt Verification Failed
              </strong>

              <span>
                {error}
              </span>
            </div>
          </div>
        )}

        {result && (
          <div className="verified-receipt-card">
            <div className="verified-receipt-success">
              <FiCheckCircle />

              <div>
                <strong>
                  Receipt Verified
                </strong>

                <span>
                  This payment receipt is
                  valid and verified.
                </span>
              </div>
            </div>

            <div className="verified-receipt-number">
              <span>
                Receipt Number
              </span>

              <strong>
                {result.receipt.receiptNo}
              </strong>
            </div>

            <div className="verified-receipt-grid">
              <div>
                <span>
                  Student Name
                </span>

                <strong>
                  {
                    result.student.fullName ||
                    "—"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Roll Number
                </span>

                <strong>
                  {
                    result.student.rollNo ||
                    "—"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Course
                </span>

                <strong>
                  {
                    result.admission.courseTitle ||
                    "—"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Batch
                </span>

                <strong>
                  {
                    result.admission.batchName ||
                    "—"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Payment Date
                </span>

                <strong>
                  {formatDate(
                    result.receipt.paymentDate
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Payment Mode
                </span>

                <strong>
                  {
                    result.receipt.paymentMode ||
                    "—"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Amount Paid
                </span>

                <strong>
                  {money(
                    result.receipt.amount
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Total Fee
                </span>

                <strong>
                  {money(
                    result.admission.totalFee
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Total Paid
                </span>

                <strong>
                  {money(
                    result.admission.paidFee
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Remaining Fee
                </span>

                <strong>
                  {money(
                    result.admission.remainingFee
                  )}
                </strong>
              </div>
            </div>

            <div className="verified-receipt-footer">
              <span>
                Payment Status
              </span>

              <strong>
                {result.receipt.status}
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyReceipt;