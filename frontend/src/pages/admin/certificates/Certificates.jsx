import { useCallback, useEffect, useState } from "react";
import {
  FiAward,
  FiCheckCircle,
  FiClock,
  FiDownload,
  FiEye,
  FiFileText,
  FiRefreshCw,
  FiSearch,
  FiX,
  FiAlertCircle,
  FiExternalLink,
} from "react-icons/fi";

import certificateService from "../../../services/certificateService";
import { getAssetUrl } from "../../../utils/assetUrl";

import "./Certificates.css";

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response;

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to complete this request.";

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

const formatNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const getStudentName = (student) =>
  [
    student?.firstName,
    student?.surname,
  ]
    .filter(Boolean)
    .join(" ") || "Student";

const getCertificateTypeLabel = (type) => {
  if (type === "COURSE_COMPLETION") {
    return "Course Completion";
  }

  if (type === "EXAM_PARTICIPATION") {
    return "Exam Participation";
  }

  return type || "—";
};

const getResultClass = (status) =>
  String(status || "").toLowerCase() === "pass"
    ? "cert-result-pass"
    : "cert-result-fail";

const getGenerationClass = (state) => {
  switch (state) {
    case "Generated":
      return "cert-status-generated";

    case "Generating":
      return "cert-status-generating";

    case "Failed":
      return "cert-status-failed";

    default:
      return "";
  }
};

const getBusinessStatusClass = (status) => {
  switch (status) {
    case "Shared":
      return "cert-status-shared";

    case "Revoked":
      return "cert-status-revoked";

    case "Generated":
      return "cert-status-generated";

    default:
      return "";
  }
};

const Certificates = () => {
  const [activeTab, setActiveTab] = useState("eligible");

  const [eligibleResults, setEligibleResults] = useState([]);
  const [certificates, setCertificates] = useState([]);

  const [summary, setSummary] = useState({
    total: 0,
    generated: 0,
    shared: 0,
    revoked: 0,
    generating: 0,
    failed: 0,
  });

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [businessStatus, setBusinessStatus] = useState("All");
  const [generationState, setGenerationState] = useState("All");

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingId, setGeneratingId] = useState("");

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [selectedCertificate, setSelectedCertificate] =
    useState(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const loadData = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        if (activeTab === "eligible") {
          const [eligibleResponse, summaryResponse] =
            await Promise.all([
              certificateService.getEligibleResults({
                page,
                limit: 10,
                search,
              }),

              certificateService.getCertificates({
                page: 1,
                limit: 1,
              }),
            ]);

          const eligibleData = unwrap(eligibleResponse);
          const summaryData = unwrap(summaryResponse);

          setEligibleResults(
            eligibleData?.results || []
          );

          setPagination(
            eligibleData?.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 1,
            }
          );

          setSummary(
            summaryData?.summary || {
              total: 0,
              generated: 0,
              shared: 0,
              revoked: 0,
              generating: 0,
              failed: 0,
            }
          );
        } else {
          const response =
            await certificateService.getCertificates({
              page,
              limit: 10,
              search,
              status: businessStatus,
              generationState,
            });

          const data = unwrap(response);

          setCertificates(
            data?.certificates || []
          );

          setPagination(
            data?.pagination || {
              page: 1,
              limit: 10,
              total: 0,
              totalPages: 1,
            }
          );

          setSummary(
            data?.summary || {
              total: 0,
              generated: 0,
              shared: 0,
              revoked: 0,
              generating: 0,
              failed: 0,
            }
          );
        }
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      activeTab,
      page,
      search,
      businessStatus,
      generationState,
    ]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedCertificate) return undefined;

    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSelectedCertificate(null);
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [selectedCertificate]);

  const handleSearch = (event) => {
    event.preventDefault();

    setPage(1);
    setSearch(searchInput.trim());
    setNotice("");
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
    setError("");
    setNotice("");
  };

  const handleGenerate = async (result) => {
    if (!result?.resultId) return;

    const studentName = result.student?.name || "this student";

    const confirmed = window.confirm(
      `Generate a certificate for ${studentName}?\n\n` +
        `Certificate type: ${getCertificateTypeLabel(
          result.certificateType
        )}`
    );

    if (!confirmed) return;

    setGeneratingId(result.resultId);
    setError("");
    setNotice("");

    try {
      const response =
        await certificateService.generateCertificate(
          result.resultId
        );

      const data = unwrap(response);

      setNotice(
        data?.message ||
          "Certificate generated successfully."
      );

      await loadData(true);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setGeneratingId("");
    }
  };

  const handleViewCertificate = async (certificate) => {
    if (!certificate?._id) return;

    setSelectedCertificate(certificate);
    setDetailLoading(true);
    setError("");

    try {
      const response =
        await certificateService.getCertificateById(
          certificate._id
        );

      const data = unwrap(response);

      setSelectedCertificate(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenPdf = (certificateUrl) => {
    if (!certificateUrl) {
      setError("PDF is not available for this certificate.");
      return;
    }

    const url = getAssetUrl(certificateUrl);

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handlePageChange = (nextPage) => {
    if (
      nextPage < 1 ||
      nextPage > pagination.totalPages
    ) {
      return;
    }

    setPage(nextPage);
  };

  const handleFilterChange = (type, value) => {
    setPage(1);

    if (type === "businessStatus") {
      setBusinessStatus(value);
    }

    if (type === "generationState") {
      setGenerationState(value);
    }
  };

  const selected = selectedCertificate;

  return (
    <div className="certificates-page">
      <div className="certificates-page-header">
        <div>
          <div className="certificates-title-row">
            <div className="certificates-title-icon">
              <FiAward />
            </div>

            <div>
              <h1>Certificates</h1>
              <p>
                Generate, manage and verify student certificates.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="cert-refresh-button"
          onClick={() => loadData(true)}
          disabled={loading || refreshing}
        >
          <FiRefreshCw
            className={
              refreshing ? "cert-spin" : ""
            }
          />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="cert-summary-grid">
        <div className="cert-summary-card">
          <div className="cert-summary-icon cert-icon-blue">
            <FiFileText />
          </div>

          <div>
            <span>Total Certificates</span>
            <strong>{summary.total}</strong>
          </div>
        </div>

        <div className="cert-summary-card">
          <div className="cert-summary-icon cert-icon-green">
            <FiCheckCircle />
          </div>

          <div>
            <span>Generated</span>
            <strong>{summary.generated}</strong>
          </div>
        </div>

        <div className="cert-summary-card">
          <div className="cert-summary-icon cert-icon-purple">
            <FiAward />
          </div>

          <div>
            <span>Shared</span>
            <strong>{summary.shared}</strong>
          </div>
        </div>

        <div className="cert-summary-card">
          <div className="cert-summary-icon cert-icon-orange">
            <FiClock />
          </div>

          <div>
            <span>Generating</span>
            <strong>{summary.generating}</strong>
          </div>
        </div>

        <div className="cert-summary-card">
          <div className="cert-summary-icon cert-icon-red">
            <FiAlertCircle />
          </div>

          <div>
            <span>Failed</span>
            <strong>{summary.failed}</strong>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="certificates-tabs">
        <button
          type="button"
          className={
            activeTab === "eligible"
              ? "cert-tab cert-tab-active"
              : "cert-tab"
          }
          onClick={() => handleTabChange("eligible")}
        >
          <FiCheckCircle />
          Eligible Results
        </button>

        <button
          type="button"
          className={
            activeTab === "issued"
              ? "cert-tab cert-tab-active"
              : "cert-tab"
          }
          onClick={() => handleTabChange("issued")}
        >
          <FiAward />
          Generated Certificates
        </button>
      </div>

      {/* Search and filters */}
      <div className="certificates-toolbar">
        <form
          className="cert-search-form"
          onSubmit={handleSearch}
        >
          <FiSearch />

          <input
            type="text"
            value={searchInput}
            onChange={(event) =>
              setSearchInput(event.target.value)
            }
            placeholder={
              activeTab === "eligible"
                ? "Search student, roll number or course..."
                : "Search certificate number, student or course..."
            }
          />

          {searchInput && (
            <button
              type="button"
              className="cert-search-clear"
              onClick={handleClearSearch}
              aria-label="Clear search"
            >
              <FiX />
            </button>
          )}

          <button type="submit">
            Search
          </button>
        </form>

        {activeTab === "issued" && (
          <div className="cert-filter-group">
            <select
              value={businessStatus}
              onChange={(event) =>
                handleFilterChange(
                  "businessStatus",
                  event.target.value
                )
              }
              aria-label="Certificate business status"
            >
              <option value="All">All statuses</option>
              <option value="Generated">Generated</option>
              <option value="Shared">Shared</option>
              <option value="Revoked">Revoked</option>
            </select>

            <select
              value={generationState}
              onChange={(event) =>
                handleFilterChange(
                  "generationState",
                  event.target.value
                )
              }
              aria-label="PDF generation status"
            >
              <option value="All">All generation states</option>
              <option value="Generated">PDF Generated</option>
              <option value="Generating">Generating</option>
              <option value="Failed">Failed</option>
            </select>
          </div>
        )}
      </div>

      {notice && (
        <div className="cert-alert cert-alert-success">
          <FiCheckCircle />
          <span>{notice}</span>
          <button
            type="button"
            onClick={() => setNotice("")}
            aria-label="Dismiss message"
          >
            <FiX />
          </button>
        </div>
      )}

      {error && (
        <div className="cert-alert cert-alert-error">
          <FiAlertCircle />
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Dismiss error"
          >
            <FiX />
          </button>
        </div>
      )}

      {/* Eligible results table */}
      {activeTab === "eligible" && (
        <section className="certificates-table-card">
          <div className="cert-table-heading">
            <div>
              <h2>Eligible Students</h2>
              <p>
                Published exam results available for certificate generation.
              </p>
            </div>

            <span className="cert-record-count">
              {pagination.total} records
            </span>
          </div>

          {loading ? (
            <div className="cert-table-state">
              <span className="cert-loader" />
              <p>Loading eligible results...</p>
            </div>
          ) : eligibleResults.length === 0 ? (
            <div className="cert-table-state">
              <FiFileText />
              <h3>No eligible results found</h3>
              <p>
                Published exam results that do not already have an
                active certificate will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="cert-table-scroll">
                <table className="certificates-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Exam Result</th>
                      <th>Certificate Type</th>
                      <th>Published Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {eligibleResults.map((item) => (
                      <tr key={item.resultId}>
                        <td>
                          <div className="cert-student-cell">
                            <div className="cert-student-avatar">
                              {item.student?.name
                                ?.charAt(0)
                                ?.toUpperCase() || "S"}
                            </div>

                            <div>
                              <strong>
                                {item.student?.name || "Student"}
                              </strong>

                              <span>
                                Roll No:{" "}
                                {item.student?.rollNo || "—"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong className="cert-primary-text">
                            {item.course?.name || "—"}
                          </strong>

                          <span className="cert-cell-subtext">
                            {item.course?.duration || ""}
                          </span>
                        </td>

                        <td>
                          <div className="cert-result-cell">
                            <strong>
                              {formatNumber(
                                item.result?.obtainedMarks
                              )}
                              /
                              {formatNumber(
                                item.exam?.totalMarks
                              )}
                            </strong>

                            <span>
                              {formatNumber(
                                item.result?.percentage
                              )}
                              %
                            </span>

                            <span
                              className={`cert-result-pill ${getResultClass(
                                item.result?.passStatus
                              )}`}
                            >
                              {item.result?.passStatus || "Fail"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span className="cert-type-text">
                            {getCertificateTypeLabel(
                              item.certificateType
                            )}
                          </span>
                        </td>

                        <td>
                          {formatDate(
                            item.result?.publishedAt
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            className="cert-generate-button"
                            onClick={() =>
                              handleGenerate(item)
                            }
                            disabled={
                              generatingId === item.resultId
                            }
                          >
                            {generatingId === item.resultId ? (
                              <>
                                <span className="cert-button-loader" />
                                Generating
                              </>
                            ) : (
                              <>
                                <FiAward />
                                Generate
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </section>
      )}

      {/* Generated certificates table */}
      {activeTab === "issued" && (
        <section className="certificates-table-card">
          <div className="cert-table-heading">
            <div>
              <h2>Certificate Records</h2>
              <p>
                Review generated PDFs and certificate generation status.
              </p>
            </div>

            <span className="cert-record-count">
              {pagination.total} records
            </span>
          </div>

          {loading ? (
            <div className="cert-table-state">
              <span className="cert-loader" />
              <p>Loading certificates...</p>
            </div>
          ) : certificates.length === 0 ? (
            <div className="cert-table-state">
              <FiAward />
              <h3>No certificates found</h3>
              <p>
                Generated certificate records will appear here.
              </p>
            </div>
          ) : (
            <>
              <div className="cert-table-scroll">
                <table className="certificates-table">
                  <thead>
                    <tr>
                      <th>Certificate No.</th>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Result</th>
                      <th>PDF Status</th>
                      <th>Certificate Status</th>
                      <th>Issue Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {certificates.map((item) => (
                      <tr key={item._id}>
                        <td>
                          <strong className="cert-number">
                            {item.certificateNo || "—"}
                          </strong>

                          <span className="cert-cell-subtext">
                            {getCertificateTypeLabel(
                              item.certificateType
                            )}
                          </span>
                        </td>

                        <td>
                          <strong className="cert-primary-text">
                            {item.studentNameSnapshot ||
                              getStudentName(item.student_id)}
                          </strong>

                          <span className="cert-cell-subtext">
                            Roll No:{" "}
                            {item.rollNoSnapshot ||
                              item.student_id?.rollNo ||
                              "—"}
                          </span>
                        </td>

                        <td>
                          {item.courseNameSnapshot ||
                            item.course_id?.courseTitle ||
                            "—"}
                        </td>

                        <td>
                          <div className="cert-result-cell">
                            <strong>
                              {formatNumber(
                                item.obtainedMarksSnapshot
                              )}
                              /
                              {formatNumber(
                                item.totalMarksSnapshot
                              )}
                            </strong>

                            <span>
                              {formatNumber(
                                item.percentageSnapshot
                              )}
                              %
                            </span>

                            <span
                              className={`cert-result-pill ${getResultClass(
                                item.passStatusSnapshot
                              )}`}
                            >
                              {item.passStatusSnapshot || "—"}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`cert-status-pill ${getGenerationClass(
                              item.generationState
                            )}`}
                          >
                            {item.generationState || "Unknown"}
                          </span>

                          {item.generationState === "Failed" &&
                            item.generationError && (
                              <span
                                className="cert-cell-subtext cert-error-detail"
                                title={item.generationError}
                              >
                                {item.generationError}
                              </span>
                            )}
                        </td>

                        <td>
                          <span
                            className={`cert-status-pill ${getBusinessStatusClass(
                              item.status
                            )}`}
                          >
                            {item.status || "—"}
                          </span>
                        </td>

                        <td>
                          {formatDate(item.issueDate)}
                        </td>

                        <td>
                          <div className="cert-row-actions">
                            <button
                              type="button"
                              className="cert-icon-button"
                              title="View certificate details"
                              onClick={() =>
                                handleViewCertificate(item)
                              }
                            >
                              <FiEye />
                            </button>

                            {item.generationState === "Generated" &&
                              item.certificateUrl && (
                                <button
                                  type="button"
                                  className="cert-icon-button cert-download-button"
                                  title="Open PDF"
                                  onClick={() =>
                                    handleOpenPdf(
                                      item.certificateUrl
                                    )
                                  }
                                >
                                  <FiDownload />
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </section>
      )}

      {/* Certificate detail modal */}
      {selected && (
        <div
          className="cert-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedCertificate(null);
            }
          }}
        >
          <div
            className="cert-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cert-modal-title"
          >
            <div className="cert-modal-header">
              <div>
                <h2 id="cert-modal-title">
                  Certificate Details
                </h2>
                <p>
                  View certificate information and PDF status.
                </p>
              </div>

              <button
                type="button"
                className="cert-modal-close"
                onClick={() =>
                  setSelectedCertificate(null)
                }
                aria-label="Close details"
              >
                <FiX />
              </button>
            </div>

            {detailLoading ? (
              <div className="cert-modal-loading">
                <span className="cert-loader" />
                <p>Loading certificate details...</p>
              </div>
            ) : (
              <>
                <div className="cert-modal-body">
                  <div className="cert-detail-highlight">
                    <div className="cert-detail-award">
                      <FiAward />
                    </div>

                    <div>
                      <span>Certificate Number</span>
                      <strong>
                        {selected.certificateNo || "—"}
                      </strong>
                    </div>
                  </div>

                  <div className="cert-detail-grid">
                    <DetailItem
                      label="Student Name"
                      value={
                        selected.studentNameSnapshot ||
                        getStudentName(selected.student_id)
                      }
                    />

                    <DetailItem
                      label="Roll Number"
                      value={
                        selected.rollNoSnapshot ||
                        selected.student_id?.rollNo
                      }
                    />

                    <DetailItem
                      label="Course"
                      value={
                        selected.courseNameSnapshot ||
                        selected.course_id?.courseTitle
                      }
                    />

                    <DetailItem
                      label="Course Duration"
                      value={selected.courseDurationSnapshot}
                    />

                    <DetailItem
                      label="Certificate Type"
                      value={getCertificateTypeLabel(
                        selected.certificateType
                      )}
                    />

                    <DetailItem
                      label="Issue Date"
                      value={formatDate(selected.issueDate)}
                    />

                    <DetailItem
                      label="Obtained Marks"
                      value={`${formatNumber(
                        selected.obtainedMarksSnapshot
                      )} / ${formatNumber(
                        selected.totalMarksSnapshot
                      )}`}
                    />

                    <DetailItem
                      label="Percentage"
                      value={`${formatNumber(
                        selected.percentageSnapshot
                      )}%`}
                    />

                    <DetailItem
                      label="Grade"
                      value={selected.gradeSnapshot}
                    />

                    <DetailItem
                      label="Result"
                      value={selected.passStatusSnapshot}
                    />

                    <DetailItem
                      label="PDF Generation"
                      value={selected.generationState}
                    />

                    <DetailItem
                      label="Certificate Status"
                      value={selected.status}
                    />

                    <DetailItem
                      label="Result Published"
                      value={formatDate(
                        selected.resultPublishedAt
                      )}
                    />
                  </div>

                  {selected.generationError && (
                    <div className="cert-detail-error">
                      <FiAlertCircle />
                      <div>
                        <strong>Generation error</strong>
                        <p>{selected.generationError}</p>
                      </div>
                    </div>
                  )}

                  {selected.auditHistory?.length > 0 && (
                    <div className="cert-audit-section">
                      <h3>Activity History</h3>

                      <div className="cert-audit-list">
                        {selected.auditHistory
                          .slice()
                          .reverse()
                          .map((entry, index) => (
                            <div
                              className="cert-audit-item"
                              key={`${entry.action}-${index}`}
                            >
                              <span className="cert-audit-dot" />

                              <div>
                                <strong>
                                  {entry.action}
                                </strong>

                                <span>
                                  {formatDate(
                                    entry.performedAt
                                  )}
                                </span>

                                {entry.remarks && (
                                  <p>{entry.remarks}</p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="cert-modal-footer">
                  <button
                    type="button"
                    className="cert-secondary-button"
                    onClick={() =>
                      setSelectedCertificate(null)
                    }
                  >
                    Close
                  </button>

                  {selected.generationState === "Generated" &&
                    selected.certificateUrl && (
                      <button
                        type="button"
                        className="cert-generate-button"
                        onClick={() =>
                          handleOpenPdf(
                            selected.certificateUrl
                          )
                        }
                      >
                        <FiExternalLink />
                        Open Certificate PDF
                      </button>
                    )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Pagination = ({ pagination, onPageChange }) => {
  const currentPage = pagination.page || 1;
  const totalPages = Math.max(
    pagination.totalPages || 1,
    1
  );

  if (totalPages <= 1) return null;

  return (
    <div className="cert-pagination">
      <span>
        Page {currentPage} of {totalPages}
      </span>

      <div>
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() =>
            onPageChange(currentPage - 1)
          }
        >
          Previous
        </button>

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() =>
            onPageChange(currentPage + 1)
          }
        >
          Next
        </button>
      </div>
    </div>
  );
};

const DetailItem = ({ label, value }) => (
  <div className="cert-detail-item">
    <span>{label}</span>
    <strong>{value || "—"}</strong>
  </div>
);

export default Certificates;