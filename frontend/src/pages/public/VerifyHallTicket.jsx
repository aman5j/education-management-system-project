
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FiCheckCircle, FiXCircle, FiShield } from "react-icons/fi";
import api from "../../services/api";

import "../../styles/VerifyHallTicket.css";

export default function VerifyHallTicket() {
  const { id } = useParams();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const verify = async () => {
      setLoading(true);
      setError("");
      setResult(null);

      try {
        const response = await api.get(`/public/hall-tickets/${id}`);
        const payload = response?.data?.data;

        if (!payload) {
          throw new Error("Verification details were not returned.");
        }

        if (mounted) setResult(payload);
      } catch (err) {
        if (mounted) {
          setError(
            err?.response?.data?.message ||
              "Unable to verify this hall ticket."
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    verify();

    return () => {
      mounted = false;
    };
  }, [id]);

  const active = result?.status === "Active";

  return (
    <main className="verify-hall-page">
      <section className="verify-hall-card">
        <div className="verify-hall-brand">
          <span className="verify-hall-logo">ITS</span>
          <div>
            <strong>INDIA TECH SAMADHAAN</strong>
            <span>Computer Education & Skill Development</span>
          </div>
        </div>

        <div className="verify-hall-address">
          123, Education Street, New Delhi - 110001
        </div>

        <div className="verify-hall-title">
          <FiShield />
          <h1>Hall Ticket Verification</h1>
          <p>Official ticket status check</p>
        </div>

        {loading ? (
          <div className="verify-hall-message">
            Checking hall ticket...
          </div>
        ) : error ? (
          <div className="verify-hall-result verify-hall-invalid">
            <FiXCircle />
            <h2>Verification Failed</h2>
            <p>{error}</p>
          </div>
        ) : (
          <div
            className={`verify-hall-result ${
              active ? "verify-hall-valid" : "verify-hall-invalid"
            }`}
          >
            {active ? <FiCheckCircle /> : <FiXCircle />}
            <h2>{active ? "Valid Hall Ticket" : "Cancelled Hall Ticket"}</h2>
            <p>
              {active
                ? "This ticket exists in the institute records and is active."
                : "This hall ticket exists but is not active."}
            </p>

            <div className="verify-hall-details">
              <div>
                <span>Hall Ticket No.</span>
                <strong>{result.hallTicketNo}</strong>
              </div>
              <div>
                <span>Student Name</span>
                <strong>{result.studentName || "—"}</strong>
              </div>
              <div>
                <span>Roll Number</span>
                <strong>{result.rollNo || "—"}</strong>
              </div>
              <div>
                <span>Course</span>
                <strong>{result.course || "—"}</strong>
              </div>
              <div>
                <span>Exam Date</span>
                <strong>
                  {result.examDate
                    ? new Date(result.examDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        timeZone: "UTC",
                      })
                    : "—"}
                </strong>
              </div>
              <div>
                <span>Exam Time</span>
                <strong>
                  {result.startTime || "—"} – {result.endTime || "—"}
                </strong>
              </div>
            </div>
          </div>
        )}

        <Link className="verify-hall-back" to="/login">
          Return to EMS
        </Link>
      </section>
    </main>
  );
}
