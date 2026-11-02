import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  FiAlertCircle,
  FiBookOpen,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiFileText,
  FiRefreshCw,
  FiUser,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import { getAssetUrl } from "../../utils/assetUrl";

import "./StudentAdmissionDetails.css";

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const statusClass = (status) =>
  String(status || "unknown")
    .toLowerCase()
    .replace(/[^a-z]+/g, "-");

function DetailRow({ label, value }) {
  return (
    <div className="sad-detail-row">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function FinanceItem({ label, value, highlight = false }) {
  return (
    <div className={`sad-finance-item ${highlight ? "sad-finance-highlight" : ""}`}>
      <span>{label}</span>
      <strong>{money(value)}</strong>
    </div>
  );
}

function AdmissionCard({ admission, index }) {
  const { course, finance } = admission;

  return (
    <article className="sad-admission-card">
      <header className="sad-admission-card-header">
        <div className="sad-admission-heading">
          <span className="sad-admission-index">
            Admission {index + 1}
          </span>
          <h2>{course?.name || "Course unavailable"}</h2>
          <small>{admission.admissionNumber}</small>
        </div>

        <span
          className={`sad-status sad-status--${statusClass(admission.status)}`}
        >
          {admission.status}
        </span>
      </header>

      <div className="sad-information-grid">
        <section className="sad-panel">
          <div className="sad-panel-heading">
            <FiBookOpen />
            <h3>Admission Information</h3>
          </div>

          <DetailRow
            label="Admission Number"
            value={admission.admissionNumber}
          />

          <DetailRow
            label="Admission Date"
            value={formatDate(admission.admissionDate)}
          />

          <DetailRow
            label="Course Enrolled"
            value={course?.name}
          />

          <DetailRow
            label="Batch"
            value={admission.batch}
          />

          <DetailRow
            label="Course Duration"
            value={
              course?.duration
                ? `${course.duration} ${course.durationUnit || ""}`
                : "—"
            }
          />

          <DetailRow
            label="Course Type"
            value={course?.type}
          />

          <DetailRow
            label="Admission Status"
            value={admission.status}
          />
        </section>

        <section className="sad-panel">
          <div className="sad-panel-heading">
            <FiCreditCard />
            <h3>Fee Details</h3>
          </div>

          <FinanceItem
            label="Course Fee"
            value={finance.courseFee}
          />

          <FinanceItem
            label="Discount"
            value={finance.discountAmount}
          />

          <FinanceItem
            label={`GST ${finance.gstTaken ? "(Applied)" : "(Not applied)"}`}
            value={finance.gstAmount}
          />

          <FinanceItem
            label="Admission Fee"
            value={finance.admissionFee}
          />

          <FinanceItem
            label="Final Amount"
            value={finance.finalAmount}
            highlight
          />

          <FinanceItem
            label="Paid Amount"
            value={finance.paidAmount}
          />

          <FinanceItem
            label="Remaining Amount"
            value={finance.remainingAmount}
            highlight
          />
        </section>
      </div>
    </article>
  );
}

export default function StudentAdmissionDetails() {
  const [data, setData] = useState({
    student: null,
    institute: null,
    admissions: [],
  });

  const [qrCode, setQrCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadDetails = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response =
        await studentPortalService.getMyAdmissionDetails();

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to load admission details."
        );
      }

      const result = response.data || {};

      const student = result.student || null;
      const admissions = Array.isArray(result.admissions)
        ? result.admissions
        : [];

      setData({
        student,
        institute: result.institute || null,
        admissions,
      });

      if (student?.rollNo) {
        const qr = await QRCode.toDataURL(
          `EMS-STUDENT|ROLL:${student.rollNo}`,
          {
            width: 220,
            margin: 1,
            errorCorrectionLevel: "M",
          }
        );

        setQrCode(qr);
      } else {
        setQrCode("");
      }
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Unable to load your admission details."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDetails();
  }, [loadDetails]);

  const student = data.student;
  const institute = data.institute;

  const profileImage = student?.profileImage
    ? getAssetUrl(student.profileImage)
    : "";

  const logo = institute?.logoUrl
    ? getAssetUrl(institute.logoUrl)
    : "";

  if (loading) {
    return (
      <div className="sad-state">
        <FiRefreshCw className="sad-spin" />
        <p>Loading your admission details...</p>
      </div>
    );
  }

  return (
    <div className="student-admission-details">
      <header className="sad-page-header">
        <div>
          <span className="sad-eyebrow">STUDENT PORTAL</span>
          <h1>My Admission Details</h1>
          <p>
            View your student information and all your admission records.
          </p>
        </div>

        <button
          type="button"
          className="sad-refresh"
          onClick={() => loadDetails(true)}
          disabled={refreshing}
        >
          <FiRefreshCw className={refreshing ? "sad-spin" : ""} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="sad-error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          <button type="button" onClick={() => loadDetails(true)}>
            Try again
          </button>
        </div>
      )}

      {student && (
        <section className="sad-student-card">
          <div className="sad-student-main">
            <div className="sad-student-avatar">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={student.name}
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <FiUser />
              )}
            </div>

            <div className="sad-student-info">
              <span className="sad-eyebrow">STUDENT IDENTITY</span>
              <h2>{student.name || "Student"}</h2>
              <p>Roll Number: {student.rollNo || "—"}</p>
              <p>{student.email || "—"}</p>
              <p>{student.mobile || "—"}</p>
            </div>
          </div>

          <div className="sad-student-qr">
            {qrCode ? (
              <img src={qrCode} alt="Student identity QR code" />
            ) : (
              <div className="sad-qr-placeholder">
                QR unavailable
              </div>
            )}
            <strong>{student.rollNo || "Student ID"}</strong>
            <small>Student identity QR</small>
          </div>
        </section>
      )}

      {institute && (
        <section className="sad-institute-card">
          <div className="sad-panel-heading">
            <FiCheckCircle />
            <h3>Institute Details</h3>
          </div>

          <div className="sad-institute-content">
            {logo && (
              <img
                className="sad-institute-logo"
                src={logo}
                alt={institute.name}
              />
            )}

            <div>
              <span>Institute Name</span>
              <strong>{institute.name || "—"}</strong>
            </div>

            <div>
              <span>Address</span>
              <strong>{institute.address || "—"}</strong>
            </div>

            <div>
              <span>Contact</span>
              <strong>{institute.phone || institute.alternatePhone || "—"}</strong>
              {institute.email && <small>{institute.email}</small>}
              {institute.website && <small>{institute.website}</small>}
            </div>
          </div>
        </section>
      )}

      <div className="sad-section-heading">
        <div>
          <span className="sad-eyebrow">YOUR ENROLLMENTS</span>
          <h2>Admission Records</h2>
        </div>

        <span className="sad-count">
          {data.admissions.length} admission(s)
        </span>
      </div>

      {data.admissions.length === 0 ? (
        <div className="sad-empty">
          <FiFileText />
          <h3>No admission records found</h3>
          <p>
            Your admission details will appear here once the institute
            records an admission for you.
          </p>
        </div>
      ) : (
        <div className="sad-admission-list">
          {data.admissions.map((admission, index) => (
            <AdmissionCard
              key={admission.id}
              admission={admission}
              index={index}
            />
          ))}
        </div>
      )}
    </div>
  );
}