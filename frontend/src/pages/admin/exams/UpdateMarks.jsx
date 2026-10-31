
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiAward,
  FiCheckCircle,
  FiEdit,
  FiFileText,
  FiPercent,
  FiRefreshCw,
  FiSave,
  FiSearch,
  FiStar,
  FiUpload,
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
  const [publishingId, setPublishingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  const openResult = async (item) => {
    setError("");
    setSuccess("");

    try {
      const response = await getAdminFinalResult(item._id);
      const result = unwrap(response);

      setSelected(result);
      setObtainedMarks(String(result.obtainedMarks ?? 0));
    } catch (err) {
      setError(errorText(err));
    }
  };

  const closeEditor = () => {
    setSelected(null);
    setObtainedMarks("");
    setError("");
    setSuccess("");
  };

  const totalMarks = Number(selected?.exam_id?.totalMarks ?? selected?.totalMarks ?? 0);
  const enteredMarks = obtainedMarks === "" ? 0 : Number(obtainedMarks);

  const previewPercentage =
    totalMarks > 0 && Number.isFinite(enteredMarks)
      ? Number(((enteredMarks / totalMarks) * 100).toFixed(2))
      : 0;

  const previewGrade = gradeFor(previewPercentage);
  const previewStatus = previewPercentage >= 40 ? "Pass" : "Fail";

  const handleSave = async (event) => {
    event.preventDefault();

    if (!selected) return;

    if (selected.resultStatus === "Published") {
      setError("Published results cannot be edited.");
      return;
    }

    if (
      obtainedMarks === "" ||
      !Number.isFinite(enteredMarks) ||
      enteredMarks < 0 ||
      enteredMarks > totalMarks
    ) {
      setError(`Obtained marks must be between 0 and ${totalMarks}.`);
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await updateAdminFinalResult(selected._id, {
        obtainedMarks: enteredMarks,
      });

      const updated = unwrap(response);
      setSelected(updated);
      setObtainedMarks(String(updated.obtainedMarks));
      setSuccess("Obtained marks updated successfully.");
      await loadResults();
    } catch (err) {
      setError(errorText(err));
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

      setSuccess(data?.message || "Result published successfully.");
      await loadResults();

      if (selected?._id === item._id) {
        const refreshed = await getAdminFinalResult(item._id);
        setSelected(unwrap(refreshed));
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setPublishingId("");
    }
  };

  if (selected) {
    const locked = selected.resultStatus === "Published";

    return (
      <main className="um-page">
        <header className="um-header">
          <div>
            <button className="um-back" type="button" onClick={closeEditor}>
              ← Back to Update Marks
            </button>
            <span className="um-eyebrow">ACADEMIC MANAGEMENT / RESULT</span>
            <h1>Update Student Marks</h1>
            <p>Only obtained marks can be changed. Total marks are fixed.</p>
          </div>

          <span className={`um-status ${locked ? "published" : "draft"}`}>
            {selected.resultStatus || "Draft"}
          </span>
        </header>

        {error && <div className="um-alert error">{error}</div>}
        {success && <div className="um-alert success">{success}</div>}

        <section className="um-card um-student">
          <div className="um-avatar">
            {fullName(selected.student_id).charAt(0).toUpperCase()}
          </div>
          <div>
            <h2>{fullName(selected.student_id).toUpperCase()}</h2>
            <p>
              {selected.course_id?.courseTitle || "Course"} · Roll No:{" "}
              {selected.student_id?.rollNo || "—"}
            </p>
          </div>
        </section>

        <form className="um-card um-form" onSubmit={handleSave}>
          <div className="um-section-title">
            <div>
              <h2>Exam Result Details</h2>
              <p>Total marks are taken directly from the scheduled exam.</p>
            </div>
          </div>

          <div className="um-summary-grid">
            <article>
              <FiStar />
              <span>Total Marks</span>
              <strong>{fmt(totalMarks)}</strong>
              <small>Fixed by exam configuration</small>
            </article>
            <article>
              <FiCheckCircle />
              <span>Obtained Marks</span>
              <strong>{fmt(enteredMarks)}</strong>
              <small>{locked ? "Published score" : "Admin editable"}</small>
            </article>
            <article>
              <FiPercent />
              <span>Percentage</span>
              <strong>{fmt(previewPercentage)}%</strong>
              <small>Automatically calculated</small>
            </article>
            <article>
              <FiAward />
              <span>Grade</span>
              <strong>{previewGrade}</strong>
              <small>{previewStatus}</small>
            </article>
          </div>

          <div className="um-field-grid">
            <label>
              Total Marks
              <input value={fmt(totalMarks)} readOnly disabled />
              <small>Cannot be changed from this page.</small>
            </label>

            <label>
              Obtained Marks
              <input
                type="number"
                min="0"
                max={totalMarks}
                step="0.01"
                value={obtainedMarks}
                onChange={(event) => setObtainedMarks(event.target.value)}
                disabled={locked || saving}
                required
              />
              <small>Maximum allowed: {fmt(totalMarks)}</small>
            </label>

            <label>
              Percentage
              <input value={`${fmt(previewPercentage)}%`} readOnly disabled />
            </label>

            <label>
              Grade
              <input value={previewGrade} readOnly disabled />
            </label>

            <label>
              Result
              <input value={previewStatus} readOnly disabled />
            </label>
          </div>

          <div className="um-helper">
            Percentage, grade and pass/fail are calculated automatically from
            the obtained marks and the exam's fixed total marks.
          </div>

          <div className="um-actions">
            <button
              type="button"
              className="um-button um-light"
              onClick={closeEditor}
            >
              Back to List
            </button>

            {!locked && (
              <button
                type="submit"
                className="um-button um-primary"
                disabled={saving}
              >
                <FiSave /> {saving ? "Saving..." : "Update Obtained Marks"}
              </button>
            )}

            {locked && (
              <span className="um-locked-note">
                <FiCheckCircle /> Published — marks locked
              </span>
            )}
          </div>
        </form>
      </main>
    );
  }

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
          <FiRefreshCw /> Refresh
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
          <div className="um-empty">Loading submitted exam results...</div>
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
                  const total = Number(item.exam_id?.totalMarks ?? item.totalMarks ?? 0);
                  const obtained = Number(item.obtainedMarks || 0);
                  const locked = item.resultStatus === "Published";

                  return (
                    <tr key={item._id}>
                      <td>{index + 1}</td>
                      <td>{item.student_id?.rollNo || "—"}</td>
                      <td><strong>{fullName(item.student_id)}</strong></td>
                      <td>{item.course_id?.courseTitle || "—"}</td>
                      <td>{fmt(total)}</td>
                      <td>{fmt(obtained)}</td>
                      <td>
                        <div>{fmt(item.percentage)}%</div>
                        <div>Grade: {item.grade || "—"}</div>
                        <div>{item.passStatus || "Pending"}</div>
                      </td>
                      <td>
                        <span className={`um-status ${locked ? "published" : "draft"}`}>
                          {item.resultStatus || "Draft"}
                        </span>
                      </td>
                      <td>
                        <div className="um-row-actions">
                          <button
                            type="button"
                            className="um-button um-light um-small"
                            onClick={() =>
                            //   navigate(`/admin/exams/results/${item._id}/review`)
                            navigate(`/admin/exams/answer-sheet/${item._id}`)
                            }
                          >
                            <FiFileText /> Answer Sheet
                          </button>

                          <button
                            type="button"
                            className="um-button um-primary um-small"
                            onClick={() => openResult(item)}
                            disabled={locked}
                          >
                            <FiEdit /> Update Marks
                          </button>

                          {!locked ? (
                            <button
                              type="button"
                              className="um-button um-publish um-small"
                              onClick={() => handlePublish(item)}
                              disabled={publishingId === item._id}
                            >
                              <FiUpload />
                              {publishingId === item._id ? "Publishing..." : "Publish Exam"}
                            </button>
                          ) : (
                            <span className="um-locked-note">
                              <FiCheckCircle /> Published
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
    </main>
  );
}
