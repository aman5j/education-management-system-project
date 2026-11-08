
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAward,
  FiCheckCircle,
  FiEdit,
  FiFileText,
  FiInfo,
  FiPercent,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiStar,
  FiUpload,
  FiX,
} from "react-icons/fi";

import {
  getAdminUpdateMarksList,
  getAdminFinalResult,
  updateAdminFinalResult,
  publishAdminFinalResult,
} from "../../../services/examResultService";

import Pagination from "../../../components/common/Pagination";
import notification from "../../../utils/notification";

import "../../../styles/UpdateMarks.css";

const PAGE_SIZE = 10;

const unwrap = (response) =>
  response?.data?.data ?? response?.data ?? response;

const errorText = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to complete this request.";

const fullName = (student) =>
  [student?.firstName, student?.surname].filter(Boolean).join(" ") ||
  "Student";

const fmt = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const gradeFor = (percentage) => {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  if (percentage >= 40) return "E";
  return "F";
};

export default function UpdateMarks() {
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
  });

  const [selected, setSelected] = useState(null);
  const [obtainedMarks, setObtainedMarks] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);
  const [publishingId, setPublishingId] = useState("");

  const loadResults = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getAdminUpdateMarksList({
        search: search.trim(),
        status,
        page,
        limit,
      });

      const data = unwrap(response);

      const fetchedResults = Array.isArray(data?.results)
        ? data.results
        : [];

      const fetchedPagination = data?.pagination || {};

      setResults(fetchedResults);
      setPagination({
        total: Number(fetchedPagination.total || 0),
        totalPages: Number(fetchedPagination.totalPages || 0),
      });
    } catch (error) {
      setResults([]);
      setPagination({
        total: 0,
        totalPages: 0,
      });

      notification.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [search, status, page, limit]);

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // Lock background scrolling while the marks modal is open.
  useEffect(() => {
    if (!selected) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleEscape = (event) => {
      if (event.key === "Escape" && !saving) {
        closeEditor();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [selected, saving]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (event) => {
    setStatus(event.target.value);
    setPage(1);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
  };

  const handleLimitChange = (nextLimit) => {
    setLimit(nextLimit);
    setPage(1);
  };

  const openResult = async (item) => {
    setOpening(true);

    try {
      const response = await getAdminFinalResult(item._id);
      const result = unwrap(response);

      setSelected(result);
      setObtainedMarks(String(result.obtainedMarks ?? 0));
    } catch (error) {
      notification.error(errorText(error));
    } finally {
      setOpening(false);
    }
  };

  const closeEditor = () => {
    if (saving) return;

    setSelected(null);
    setObtainedMarks("");
  };

  const totalMarks = Number(
    selected?.exam_id?.totalMarks ??
      selected?.totalMarks ??
      0
  );

  const enteredMarks =
    obtainedMarks === "" ? 0 : Number(obtainedMarks);

  const previewPercentage =
    totalMarks > 0 && Number.isFinite(enteredMarks)
      ? Number(((enteredMarks / totalMarks) * 100).toFixed(2))
      : 0;

  const previewGrade = gradeFor(previewPercentage);

  const previewStatus =
    previewPercentage >= 40 ? "Pass" : "Fail";

  const handleSave = async (event) => {
    event.preventDefault();

    if (!selected) return;

    if (selected.resultStatus === "Published") {
      notification.warning(
        "Published results cannot be edited."
      );
      return;
    }

    if (
      obtainedMarks === "" ||
      !Number.isFinite(enteredMarks) ||
      enteredMarks < 0 ||
      enteredMarks > totalMarks
    ) {
      notification.warning(
        `Obtained marks must be between 0 and ${fmt(totalMarks)}.`
      );
      return;
    }

    setSaving(true);

    try {
      const response = await updateAdminFinalResult(
        selected._id,
        {
          obtainedMarks: enteredMarks,
        }
      );

      const updated = unwrap(response);

      setSelected(updated);
      setObtainedMarks(String(updated.obtainedMarks ?? 0));

      notification.success(
        "Obtained marks updated successfully."
      );

      await loadResults();
    } catch (error) {
      notification.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (item) => {
    if (item.resultStatus === "Published") return;

    const confirmed = await notification.confirm({
      title: "Publish final result?",
      text: `Publish the final result for ${fullName(
        item.student_id
      )}? Once published, obtained marks cannot be changed.`,
      icon: "warning",
      confirmText: "Yes, publish result",
      cancelText: "Cancel",
      confirmButtonColor: "#087b52",
    });

    if (!confirmed) return;

    setPublishingId(item._id);

    try {
      const response = await publishAdminFinalResult(item._id);
      const data = unwrap(response);

      notification.success(
        data?.message || "Result published successfully."
      );

      await loadResults();
    } catch (error) {
      notification.error(errorText(error));
    } finally {
      setPublishingId("");
    }
  };

  const firstRecordNumber =
    pagination.total > 0
      ? (page - 1) * limit + 1
      : 0;

  const lastRecordNumber = Math.min(
    page * limit,
    pagination.total
  );

  return (
    <main className="um-page">
      <header className="um-header">
        <div>
          <span className="um-eyebrow">
            ACADEMIC MANAGEMENT
          </span>

          <h1>Update Marks</h1>

          <p>
            Review answer sheets, update obtained marks and publish
            final student results.
          </p>
        </div>

        <button
          className="um-button um-light"
          type="button"
          onClick={loadResults}
          disabled={loading}
        >
          <FiRefreshCw />
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      <section className="um-card">
        <div className="um-toolbar">
          <label className="um-search">
            <FiSearch />

            <input
              value={search}
              onChange={handleSearchChange}
              placeholder="Search by student, roll number or course..."
            />
          </label>

          <select
            value={status}
            onChange={handleStatusChange}
            aria-label="Filter results by status"
          >
            <option value="All">All Results</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
          </select>
        </div>

        {loading ? (
          <div className="um-empty">
            Loading submitted exam results...
          </div>
        ) : results.length === 0 ? (
          <div className="um-empty">
            No submitted exam results found.
          </div>
        ) : (
          <>
            <div className="um-table-wrap">
              <table className="um-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Roll No.</th>
                    <th>Student Name</th>
                    <th>Course</th>
                    <th>Total Marks</th>
                    <th>Obtained</th>
                    <th>Performance</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {results.map((item, index) => {
                    const total = Number(
                      item.exam_id?.totalMarks ??
                        item.totalMarks ??
                        0
                    );

                    const obtained = Number(
                      item.obtainedMarks || 0
                    );

                    const locked =
                      item.resultStatus === "Published";

                    return (
                      <tr key={item._id}>
                        <td>
                          {(page - 1) * limit + index + 1}
                        </td>

                        <td>
                          {item.student_id?.rollNo || "—"}
                        </td>

                        <td>
                          <strong>
                            {fullName(item.student_id)}
                          </strong>
                        </td>

                        <td>
                          {item.course_id?.courseTitle || "—"}
                        </td>

                        <td>{fmt(total)}</td>
                        <td>{fmt(obtained)}</td>

                        <td>
                          <div>{fmt(item.percentage)}%</div>
                          <div>Grade: {item.grade || "—"}</div>
                          <div>{item.passStatus || "Pending"}</div>
                        </td>

                        <td>
                          <span
                            className={`um-status ${
                              locked ? "published" : "draft"
                            }`}
                          >
                            {item.resultStatus || "Draft"}
                          </span>
                        </td>

                        <td>
                          <div className="um-row-actions">
                            <button
                              type="button"
                              className="um-button um-light um-small"
                              onClick={() =>
                                navigate(
                                  `/admin/exams/answer-sheet/${item._id}`
                                )
                              }
                            >
                              <FiFileText />
                              Answer Sheet
                            </button>

                            <button
                              type="button"
                              className="um-button um-primary um-small"
                              onClick={() => openResult(item)}
                              disabled={locked || opening}
                            >
                              <FiEdit />
                              {opening
                                ? "Loading..."
                                : "Update Marks"}
                            </button>

                            {!locked ? (
                              <button
                                type="button"
                                className="um-button um-publish um-small"
                                onClick={() => handlePublish(item)}
                                disabled={publishingId === item._id}
                              >
                                <FiUpload />
                                {publishingId === item._id
                                  ? "Publishing..."
                                  : "Publish Exam"}
                              </button>
                            ) : (
                              <span className="um-locked-note">
                                <FiCheckCircle />
                                Published
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="um-pagination-summary">
              Showing <strong>{firstRecordNumber}</strong>–
              <strong>{lastRecordNumber}</strong> of{" "}
              <strong>{pagination.total}</strong> results
            </div>
          </>
        )}

        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          itemCount={results.length}
          itemLabel="results"
          limit={limit}
          loading={loading}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      </section>

      {/* Update Marks Modal */}
      {selected && (
        <div
          className="um-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditor();
            }
          }}
        >
          <section
            className="um-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="um-modal-title"
          >
            <header className="um-modal-header">
              <div className="um-modal-heading">
                <div className="um-modal-icon">
                  <FiEdit />
                </div>

                <div>
                  <h2 id="um-modal-title">
                    Mark Update
                  </h2>

                  <p>
                    Update the obtained marks for this exam.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="um-modal-close"
                onClick={closeEditor}
                disabled={saving}
                aria-label="Close modal"
              >
                <FiX />
              </button>
            </header>

            <form onSubmit={handleSave}>
              <div className="um-modal-body">
                <section className="um-modal-student">
                  <div className="um-modal-avatar">
                    {fullName(selected.student_id)
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="um-modal-student-info">
                    <h3>
                      {fullName(
                        selected.student_id
                      ).toUpperCase()}
                    </h3>

                    <p>
                      {selected.course_id?.courseTitle || "Course"}
                      <span>•</span>
                      Roll No:{" "}
                      {selected.student_id?.rollNo || "—"}
                    </p>
                  </div>
                </section>

                <div className="um-modal-section-title">
                  <h3>Exam Result Details</h3>

                  <p>
                    Update the obtained marks. Percentage, grade
                    and result will be calculated automatically.
                  </p>
                </div>

                <div className="um-modal-fields">
                  <label>
                    <span>Total Marks</span>

                    <input
                      type="text"
                      value={fmt(totalMarks)}
                      readOnly
                      disabled
                    />

                    <small>
                      Cannot be changed from this page.
                    </small>
                  </label>

                  <label>
                    <span>
                      Obtained Marks <b>*</b>
                    </span>

                    <input
                      type="number"
                      min="0"
                      max={totalMarks}
                      step="0.01"
                      value={obtainedMarks}
                      onChange={(event) =>
                        setObtainedMarks(event.target.value)
                      }
                      disabled={
                        selected.resultStatus === "Published" ||
                        saving
                      }
                      required
                    />

                    <small>
                      Maximum allowed: {fmt(totalMarks)}
                    </small>
                  </label>
                </div>

                <div className="um-modal-summary">
                  <article className="um-metric-total">
                    <div className="um-metric-icon">
                      <FiStar />
                    </div>

                    <div>
                      <span>Total Marks</span>
                      <strong>{fmt(totalMarks)}</strong>
                    </div>
                  </article>

                  <article className="um-metric-obtained">
                    <div className="um-metric-icon">
                      <FiCheckCircle />
                    </div>

                    <div>
                      <span>Obtained Marks</span>
                      <strong>{fmt(enteredMarks)}</strong>
                    </div>
                  </article>

                  <article className="um-metric-percentage">
                    <div className="um-metric-icon">
                      <FiPercent />
                    </div>

                    <div>
                      <span>Percentage</span>
                      <strong>
                        {fmt(previewPercentage)}%
                      </strong>
                    </div>
                  </article>

                  <article className="um-metric-grade">
                    <div className="um-metric-icon">
                      <FiAward />
                    </div>

                    <div>
                      <span>Grade</span>
                      <strong>{previewGrade}</strong>
                    </div>
                  </article>
                </div>

                <div className="um-modal-result-field">
                  <label>Result</label>

                  <div
                    className={
                      previewStatus === "Pass"
                        ? "um-result-pass"
                        : "um-result-fail"
                    }
                  >
                    {previewStatus}
                  </div>
                </div>

                <div className="um-modal-helper">
                  <FiInfo />

                  <span>
                    Percentage, grade and pass/fail are calculated
                    automatically from the obtained marks and the
                    exam's fixed total marks.
                  </span>
                </div>

                {selected.resultStatus === "Published" && (
                  <div className="um-modal-locked">
                    <FiCheckCircle />

                    This result has been published and can no
                    longer be edited.
                  </div>
                )}
              </div>

              <footer className="um-modal-footer">
                <button
                  type="button"
                  className="um-button um-light um-modal-cancel"
                  onClick={closeEditor}
                  disabled={saving}
                >
                  Cancel
                </button>

                {selected.resultStatus !== "Published" && (
                  <button
                    type="submit"
                    className="um-button um-primary um-modal-submit"
                    disabled={saving}
                  >
                    <FiSave />

                    {saving ? "Updating..." : "Update Marks"}
                  </button>
                )}
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
