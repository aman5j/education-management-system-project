import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiDownload,
  FiFileText,
  FiShield,
  FiXCircle,
} from "react-icons/fi";

import api from "../../services/api";
import { getAssetUrl } from "../../utils/assetUrl";

import "./VerifyCertificate.css";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

export default function VerifyCertificate() {
  const { verificationCode } = useParams();

  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState(null);
  const [valid, setValid] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    const verify = async () => {
      setLoading(true);
      setCertificate(null);
      setValid(false);
      setMessage("");

      try {
        if (!/^[A-F0-9]{40}$/i.test(verificationCode || "")) {
          setMessage("The certificate verification code is invalid.");
          return;
        }

        const response = await api.get(
          `/public/certificates/verify/${encodeURIComponent(
            verificationCode
          )}`
        );

        const data = response?.data?.data;

        if (!active) return;

        if (data?.valid === true) {
          setCertificate(data);
          setValid(true);
          setMessage(
            "This certificate is genuine and exists in the institute records."
          );
        } else {
          setMessage(
            data?.message || "This certificate could not be verified."
          );
        }
      } catch (error) {
        if (!active) return;

        const data = error?.response?.data?.data;

        setMessage(
          data?.message ||
            error?.response?.data?.message ||
            "Unable to verify this certificate. Please try again later."
        );
      } finally {
        if (active) setLoading(false);
      }
    };

    verify();

    return () => {
      active = false;
    };
  }, [verificationCode]);

  const openPdf = () => {
    if (!certificate?.pdfUrl) return;

    window.open(
      getAssetUrl(certificate.pdfUrl),
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <main className="public-certificate-page">
      <section className="public-certificate-card">
        <header className="public-certificate-header">
          <span className="public-certificate-logo">
            <FiAward />
          </span>

          <div>
            <span className="public-certificate-eyebrow">
              CERTIFICATE VERIFICATION
            </span>
            <h1>Certificate Verification</h1>
            <p>
              Official online verification of institute-issued certificates.
            </p>
          </div>
        </header>

        {loading ? (
          <div className="public-certificate-state">
            <span className="public-certificate-spinner" />
            <h2>Verifying certificate</h2>
            <p>Please wait while we check the institute records.</p>
          </div>
        ) : valid && certificate ? (
          <>
            <div className="public-certificate-result public-certificate-result--valid">
              <FiCheckCircle />
              <div>
                <strong>Certificate Verified</strong>
                <span>{message}</span>
              </div>
            </div>

            <div className="public-certificate-details">
              <div className="public-certificate-detail">
                <span>Certificate Number</span>
                <strong>{certificate.certificateNo || "—"}</strong>
              </div>

              <div className="public-certificate-detail">
                <span>Institute</span>
                <strong>{certificate.instituteName || "—"}</strong>
              </div>

              <div className="public-certificate-detail">
                <span>Student Name</span>
                <strong>{certificate.studentName || "—"}</strong>
              </div>

              <div className="public-certificate-detail">
                <span>Roll Number</span>
                <strong>{certificate.rollNo || "—"}</strong>
              </div>

              <div className="public-certificate-detail">
                <span>Course</span>
                <strong>{certificate.courseName || "—"}</strong>
              </div>

              <div className="public-certificate-detail">
                <span>Course Duration</span>
                <strong>{certificate.courseDuration || "—"}</strong>
              </div>

              <div className="public-certificate-detail">
                <span>Result</span>
                <strong>{certificate.result || "—"}</strong>
              </div>

              <div className="public-certificate-detail">
                <span>Obtained Marks</span>
                <strong>
                  {formatNumber(certificate.obtainedMarks)} /{" "}
                  {formatNumber(certificate.totalMarks)}
                </strong>
              </div>

              <div className="public-certificate-detail">
                <span>Percentage</span>
                <strong>
                  {formatNumber(certificate.percentage)}%
                </strong>
              </div>

              <div className="public-certificate-detail">
                <span>Grade</span>
                <strong>{certificate.grade || "—"}</strong>
              </div>

              <div className="public-certificate-detail">
                <span>Issue Date</span>
                <strong>
                  <FiCalendar />
                  {formatDate(certificate.issueDate)}
                </strong>
              </div>

              <div className="public-certificate-detail">
                <span>Certificate Type</span>
                <strong>
                  {certificate.certificateType === "COURSE_COMPLETION"
                    ? "Course Completion"
                    : certificate.certificateType === "EXAM_PARTICIPATION"
                    ? "Exam Participation"
                    : certificate.certificateType || "—"}
                </strong>
              </div>
            </div>

            {certificate.pdfUrl && (
              <button
                type="button"
                className="public-certificate-download"
                onClick={openPdf}
              >
                <FiDownload />
                View Certificate PDF
              </button>
            )}
          </>
        ) : (
          <div className="public-certificate-result public-certificate-result--invalid">
            <FiXCircle />
            <div>
              <strong>Certificate Not Verified</strong>
              <span>{message}</span>
            </div>
          </div>
        )}

        <footer className="public-certificate-footer">
          <span>
            <FiShield />
            Public certificate verification
          </span>

          <Link to="/login">Institute Login</Link>
        </footer>
      </section>

      <p className="public-certificate-disclaimer">
        This verification confirms the certificate record available in the
        institute's database. For any discrepancy, contact the issuing institute.
      </p>
    </main>
  );
}