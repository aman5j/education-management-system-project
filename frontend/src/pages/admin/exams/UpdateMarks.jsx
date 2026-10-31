
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

import "../../../styles/UpdateMarks.css";

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

  const [selected, setSelected] = useState(null);
  const [obtainedMarks, setObtainedMarks] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);
  const [publishingId, setPublishingId] = useState("");

  const [error, setError] = useState("");
  const [modalError, setModalError] = useState("");
  const [success, setSuccess] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getAdminUpdateMarksList({
        search,
        status,
        page: 1,
        limit: 100,
      });

      const data = unwrap(response);
      setResults(data?.results || []);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [search, status]);

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

  const openResult = async (item) => {
    setOpening(true);
    setError("");
    setSuccess("");
    setModalError("");
    setModalSuccess("");

    try {
      const response = await getAdminFinalResult(item._id);
      const result = unwrap(response);

      setSelected(result);
      setObtainedMarks(String(result.obtainedMarks ?? 0));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setOpening(false);
    }
  };

  const closeEditor = () => {
    if (saving) return;

    setSelected(null);
    setObtainedMarks("");
    setModalError("");
    setModalSuccess("");
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
      setModalError("Published results cannot be edited.");
      return;
    }

    if (
      obtainedMarks === "" ||
      !Number.isFinite(enteredMarks) ||
      enteredMarks < 0 ||
      enteredMarks > totalMarks
    ) {
      setModalError(
        `Obtained marks must be between 0 and ${fmt(totalMarks)}.`
      );
      return;
    }

    setSaving(true);
    setModalError("");
    setModalSuccess("");

    try {
      const response = await updateAdminFinalResult(selected._id, {
        obtainedMarks: enteredMarks,
      });

      const updated = unwrap(response);

      setSelected(updated);
      setObtainedMarks(String(updated.obtainedMarks ?? 0));
      setModalSuccess("Obtained marks updated successfully.");

      await loadResults();
    } catch (err) {
      setModalError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (item) => {
    if (item.resultStatus === "Published") return;

    const confirmed = window.confirm(
      `Publish the final result for ${fullName(item.student_id)}? Once published, obtained marks cannot be changed.`
    );

    if (!confirmed) return;

    setPublishingId(item._id);
    setError("");
    setSuccess("");

    try {
      const response = await publishAdminFinalResult(item._id);
      const data = unwrap(response);

      setSuccess(
        data?.message || "Result published successfully."
      );

      await loadResults();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPublishingId("");
    }
  };

  return (
    <main className="um-page">
      <header className="um-header">
        <div>
          <span className="um-eyebrow">ACADEMIC MANAGEMENT</span>
          <h1>Update Marks</h1>
          <p>
            Review answer sheets, update obtained marks and publish final
            student results.
          </p>
        </div>

        <button
          className="um-button um-light"
          type="button"
          onClick={loadResults}
          disabled={loading}
        >
          <FiRefreshCw />
          Refresh
        </button>
      </header>

      {error && <div className="um-alert error">{error}</div>}
      {success && <div className="um-alert success">{success}</div>}

      <section className="um-card">
        <div className="um-toolbar">
          <label className="um-search">
            <FiSearch />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by student, roll number or course..."
            />
          </label>

          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
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

                  const obtained = Number(item.obtainedMarks || 0);
                  const locked = item.resultStatus === "Published";

                  return (
                    <tr key={item._id}>
                      <td>{index + 1}</td>
                      <td>{item.student_id?.rollNo || "—"}</td>
                      <td>
                        <strong>{fullName(item.student_id)}</strong>
                      </td>
                      <td>{item.course_id?.courseTitle || "—"}</td>
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
                            {opening ? "Loading..." : "Update Marks"}
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
        )}
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
                  <h2 id="um-modal-title">Mark Update</h2>
                  <p>Update the obtained marks for this exam.</p>
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
                {modalError && (
                  <div className="um-alert error">
                    {modalError}
                  </div>
                )}

                {modalSuccess && (
                  <div className="um-alert success">
                    {modalSuccess}
                  </div>
                )}

                <section className="um-modal-student">
                  <div className="um-modal-avatar">
                    {fullName(selected.student_id)
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div className="um-modal-student-info">
                    <h3>
                      {fullName(selected.student_id).toUpperCase()}
                    </h3>

                    <p>
                      {selected.course_id?.courseTitle || "Course"}
                      <span>•</span>
                      Roll No: {selected.student_id?.rollNo || "—"}
                    </p>
                  </div>
                </section>

                <div className="um-modal-section-title">
                  <h3>Exam Result Details</h3>
                  <p>
                    Update the obtained marks. Percentage, grade and result
                    will be calculated automatically.
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
                    <small>Cannot be changed from this page.</small>
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
                      onChange={(event) => {
                        setObtainedMarks(event.target.value);
                        setModalError("");
                        setModalSuccess("");
                      }}
                      disabled={
                        selected.resultStatus === "Published" || saving
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
                      <strong>{fmt(previewPercentage)}%</strong>
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
                    automatically from the obtained marks and the exam's
                    fixed total marks.
                  </span>
                </div>

                {selected.resultStatus === "Published" && (
                  <div className="um-modal-locked">
                    <FiCheckCircle />
                    This result has been published and can no longer be
                    edited.
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
