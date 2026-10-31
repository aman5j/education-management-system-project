import { useCallback, useEffect, useState } from "react";
import {
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiDownload,
  FiExternalLink,
  FiFileText,
  FiRefreshCw,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import { getAssetUrl } from "../../utils/assetUrl";

import "./StudentCertificates.css";

const dateText = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const numberText = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const typeText = (type) => {
  if (type === "COURSE_COMPLETION") {
    return "Course Completion";
  }

  if (type === "EXAM_PARTICIPATION") {
    return "Exam Participation";
  }

  return type || "Certificate";
};

const errorText = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to load your certificates.";

export default function StudentCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadCertificates = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const response =
          await studentPortalService.getMyCertificates();

        const data = response?.data || {};

        setCertificates(
          Array.isArray(data.certificates)
            ? data.certificates
            : []
        );
      } catch (err) {
        setError(errorText(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    loadCertificates();
  }, [loadCertificates]);

  const openCertificate = (pdfUrl) => {
    if (!pdfUrl) {
      setError("Certificate PDF is not available.");
      return;
    }

    window.open(
      getAssetUrl(pdfUrl),
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <main className="student-certificates">
      <header className="student-certificates__header">
        <div className="student-certificates__heading">
          <span className="student-certificates__heading-icon">
            <FiAward />
          </span>

          <div>
            <span className="student-certificates__eyebrow">
              STUDENT PORTAL
            </span>

            <h1>My Certificates</h1>

            <p>
              View and download certificates shared by your institute.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="student-certificates__refresh"
          onClick={() => loadCertificates(true)}
          disabled={loading || refreshing}
        >
          <FiRefreshCw
            className={
              refreshing
                ? "student-certificates__spin"
                : ""
            }
          />
          Refresh
        </button>
      </header>

      <section className="student-certificates__summary">
        <div className="student-certificates__summary-icon">
          <FiFileText />
        </div>

        <div>
          <span>Certificates shared with you</span>
          <strong>{certificates.length}</strong>
        </div>
      </section>

      {error && (
        <div
          className="student-certificates__error"
          role="alert"
        >
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <section className="student-certificates__state">
          <span className="student-certificates__loader" />
          <h2>Loading your certificates</h2>
          <p>Please wait while we retrieve your shared certificates.</p>
        </section>
      ) : certificates.length === 0 ? (
        <section className="student-certificates__state">
          <span className="student-certificates__empty-icon">
            <FiAward />
          </span>

          <h2>No certificates available yet</h2>

          <p>
            Certificates shared by your institute will appear here.
            Please contact your institute administrator if you
            believe a certificate should already be available.
          </p>
        </section>
      ) : (
        <section className="student-certificates__grid">
          {certificates.map((certificate) => (
            <article
              className="student-certificate-card"
              key={certificate.id}
            >
              <div className="student-certificate-card__top">
                <span className="student-certificate-card__icon">
                  <FiAward />
                </span>

                <span className="student-certificate-card__status">
                  <FiCheckCircle />
                  Shared
                </span>
              </div>

              <div className="student-certificate-card__content">
                <span className="student-certificate-card__type">
                  {typeText(certificate.certificateType)}
                </span>

                <h2>
                  {certificate.courseName || "Certificate"}
                </h2>

                <p className="student-certificate-card__number">
                  Certificate No:{" "}
                  <strong>
                    {certificate.certificateNo || "—"}
                  </strong>
                </p>

                <div className="student-certificate-card__details">
                  <div>
                    <span>Student Name</span>
                    <strong>
                      {certificate.studentName || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Roll Number</span>
                    <strong>
                      {certificate.rollNo || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Course Duration</span>
                    <strong>
                      {certificate.courseDuration || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Issue Date</span>
                    <strong>
                      <FiCalendar />
                      {dateText(certificate.issueDate)}
                    </strong>
                  </div>

                  <div>
                    <span>Exam Result</span>
                    <strong>
                      {certificate.result || "—"}
                    </strong>
                  </div>

                  <div>
                    <span>Percentage</span>
                    <strong>
                      {numberText(certificate.percentage)}%
                    </strong>
                  </div>

                  <div>
                    <span>Grade</span>
                    <strong>
                      {certificate.grade || "—"}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="student-certificate-card__footer">
                <span>
                  <FiCheckCircle />
                  Verified institute-issued record
                </span>

                <button
                  type="button"
                  onClick={() =>
                    openCertificate(certificate.pdfUrl)
                  }
                  disabled={!certificate.pdfUrl}
                >
                  <FiDownload />
                  View / Download PDF
                  <FiExternalLink />
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}