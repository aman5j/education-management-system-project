import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { verifyReceipt } from "../../services/receiptService";

const VerifyReceipt = () => {
  const { receiptNo } = useParams();

  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!receiptNo) {
      return;
    }

    const verify = async () => {
      try {
        setLoading(true);
        setError("");
        setReceipt(null);

        const response = await verifyReceipt(receiptNo);

        if (response?.success) {
          setReceipt(response.data);
        } else {
          setError(
            response?.message || "Receipt verification failed."
          );
        }
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            err?.message ||
            "Receipt verification failed."
        );
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [receiptNo]);

  return (
    <div className="verify-receipt-page">
      <div className="verify-receipt-container">
        <h1>Receipt Verification</h1>

        {loading && (
          <div className="verify-loading">
            Verifying receipt...
          </div>
        )}

        {!loading && error && (
          <div className="verify-error">
            <h2>Receipt Not Verified</h2>
            <p>{error}</p>
          </div>
        )}

        {!loading && receipt && (
          <div className="verify-success">
            <div className="verify-success-icon">
              ✓
            </div>

            <h2>Receipt Verified</h2>

            <p>
              This payment receipt is valid and verified.
            </p>

            <div className="receipt-verification-details">
              <div>
                <span>Receipt Number</span>
                <strong>
                  {receipt.receipt?.receiptNo}
                </strong>
              </div>

              <div>
                <span>Student</span>
                <strong>
                  {receipt.student?.fullName || "-"}
                </strong>
              </div>

              <div>
                <span>Roll No</span>
                <strong>
                  {receipt.student?.rollNo || "-"}
                </strong>
              </div>

              <div>
                <span>Course</span>
                <strong>
                  {receipt.admission?.courseTitle || "-"}
                </strong>
              </div>

              <div>
                <span>Batch</span>
                <strong>
                  {receipt.admission?.batchName || "-"}
                </strong>
              </div>

              <div>
                <span>Payment Amount</span>
                <strong>
                  ₹{Number(
                    receipt.receipt?.amount || 0
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

              <div>
                <span>Payment Mode</span>
                <strong>
                  {receipt.receipt?.paymentMode || "-"}
                </strong>
              </div>

              <div>
                <span>Status</span>
                <strong>
                  {receipt.receipt?.status || "-"}
                </strong>
              </div>

              <div>
                <span>Total Fee</span>
                <strong>
                  ₹{Number(
                    receipt.admission?.totalFee || 0
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

              <div>
                <span>Paid Fee</span>
                <strong>
                  ₹{Number(
                    receipt.admission?.paidFee || 0
                  ).toLocaleString("en-IN")}
                </strong>
              </div>

              <div>
                <span>Remaining Fee</span>
                <strong>
                  ₹{Number(
                    receipt.admission?.remainingFee || 0
                  ).toLocaleString("en-IN")}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyReceipt;