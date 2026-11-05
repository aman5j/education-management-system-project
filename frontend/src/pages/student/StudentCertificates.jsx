import { useCallback, useEffect, useState } from "react";
import {
  FiAward,
  FiCalendar,
  FiCheckCircle,
  FiDownload,
  FiEye,
  FiFileText,
  FiRefreshCw,
  FiClock,
  FiPercent,
  FiBookOpen,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import { getAssetUrl } from "../../utils/assetUrl";
import certificateimage from "../../assets/certificate.png";

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

const errorText = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to load your certificates.";

export default function StudentCertificates() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [certificateFilter, setCertificateFilter] = useState("all");

  const loadCertificates = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const response = await studentPortalService.getMyCertificates();
      const data = response?.data || {};

      setCertificates(
        Array.isArray(data.certificates) ? data.certificates : []
      );
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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

  const filteredCertificates = certificates.filter((certificate) => {
    if (certificateFilter === "all") return true;

    return (
      String(certificate.status || "").toLowerCase() ===
      certificateFilter
    );
  });

  const verifiedCount = certificates.filter((certificate) => {
    const status = String(certificate.status || "").toLowerCase();
    return status === "verified" || status === "shared" || !status;
  }).length;

  return (
    <main className="student-certificates">
       <div className="page-header"><div><h1>My Certificates</h1></div>

      </div>
      {/* Page heading */}
     

      {/* Error message */}
      {error && (
        <div className="student-certificates__error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {/* Summary and filter */}
        {/* <section className="certificates-toolbars">
        
          <article class="dashboard-stat-card card-success"><div class="stat-card-top"><div class="stat-icon stat-icon-success">   <FiFileText /></div></div><div class="stat-card-body"><span class="stat-card-title">Total Certificates</span><strong class="stat-card-value">{certificates.length}</strong></div></article>

  <article class="dashboard-stat-card card-success"><div class="stat-card-top"><div class="stat-icon stat-icon-success"> <FiCheckCircle /></div></div><div class="stat-card-body"><span class="stat-card-title">Verified Certificates</span><strong class="stat-card-value">{verifiedCount}</strong></div></article>
        
        </section> */}

      {/* Loading */}
      {loading ? (
        <section className="student-certificates__state">
          <span className="student-certificates__loader" />
          <h2>Loading your certificates</h2>
          <p>Please wait while we retrieve your shared certificates.</p>
        </section>
      ) : filteredCertificates.length === 0 ? (
        <section className="student-certificates__state">
          <span className="student-certificates__empty-icon">
            <FiAward />
          </span>
          <h2>
            {certificates.length === 0
              ? "No certificates available yet"
              : "No certificates found"}
          </h2>
          <p>
            Certificates shared by your institute will appear here.
            Please contact your institute administrator if you believe
            a certificate should already be available.
          </p>
        </section>
      ) : (
        <section className="student-certificates__grid">
          {filteredCertificates.map((certificate) => (
            <article className="common-card" key={certificate.id}>
              {/* Certificate image */}
             
                <div className="certificate-card__image-frame">
                  <img
                    src={certificateimage}
                    alt={`${certificate.courseName || "Course"} certificate`}
                  />
                </div>
             

              {/* Certificate title */}
              <div className="certificate-card__body">
                <div className="certificate-card__heading">
                  <div className="certificate-card__title-wrap">
                    <div>
                      <h2>{certificate.courseName || "Certificate"}</h2>
                      <div className="student-roll">
                        Roll Number : 
                       {certificate.rollNo || "—"}
                      </div>
                    </div>
                  </div>

                  <span className="certificate-card__verified">
                    <FiCheckCircle />
                    Verified
                  </span>
                </div>

                {/* Certificate information */}
                <div className="certificate-card__details">


                       <div className="certificate-detail">
                    <span className="certificate-detail__icon">
                      <FiBookOpen />
                    </span>
                    <div>
                      <span> Certificate No</span>
                      <strong>{certificate.certificateNo || "—"}</strong>
                    </div>
                  </div>


                  <div className="certificate-detail">
                    <span className="certificate-detail__icon">
                      <FiCalendar />
                    </span>
                    <div>
                      <span>Issue Date</span>
                      <strong>{dateText(certificate.issueDate)}</strong>
                    </div>
                  </div>

                  <div className="certificate-detail">
                    <span className="certificate-detail__icon">
                      <FiClock />
                    </span>
                    <div>
                      <span>Duration</span>
                      <strong>{certificate.courseDuration || "—"}</strong>
                    </div>
                  </div>

                  <div className="certificate-detail">
                    <span className="certificate-detail__icon">
                      <FiPercent />
                    </span>
                    <div>
                      <span>Percentage</span>
                      <strong>{numberText(certificate.percentage)}%</strong>
                    </div>
                  </div>

                  <div className="certificate-detail">
                    <span className="certificate-detail__icon">
                      <FiAward />
                    </span>
                    <div>
                      <span>Grade</span>
                      <strong>{certificate.grade || "—"}</strong>
                    </div>
                  </div>

                 

                  <div className="certificate-detail">
                    <span className="certificate-detail__icon">
                      <FiFileText />
                    </span>
                    <div>
                      <span>Exam Result</span>
                      <strong>{certificate.result || "—"}</strong>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="certificate-card__footer">
                  <button
                    type="button"
                    className="themebtn themebtnline"
                    onClick={() => openCertificate(certificate.pdfUrl)}
                    disabled={!certificate.pdfUrl}
                  >
                    <FiEye />
                    View Certificate
                  </button>

                  <button
                    type="button"
                    className="themebtn"
                    onClick={() => openCertificate(certificate.pdfUrl)}
                    disabled={!certificate.pdfUrl}
                  >
                    <FiDownload />
                    Download Certificate
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

    </main>
  );
}