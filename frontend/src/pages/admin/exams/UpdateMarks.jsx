
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiEdit,
  FiRefreshCw,
  FiSearch,
  FiSave,
  FiAward,
  FiPercent,
  FiStar,
} from "react-icons/fi";

import {
  getAdminUpdateMarksList,
  getAdminFinalResult,
  updateAdminFinalResult,
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

const number = (value) => Number(value || 0);

const format = (value) =>
  number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  });

const initialForm = (result) => {
  const objectiveTotal =
    result.objectiveTotalMarks ?? result.totalMarks ?? 0;

  const objectiveObtained =
    result.objectiveObtainedMarks ?? result.obtainedMarks ?? 0;

  const practicalTotal = result.practicalTotalMarks ?? 0;
  const practicalObtained = result.practicalObtainedMarks ?? 0;

  return {
    objectiveTotalMarks: String(objectiveTotal),
    objectiveObtainedMarks: String(objectiveObtained),
    practicalTotalMarks: String(practicalTotal),
    practicalObtainedMarks: String(practicalObtained),
    totalMarks: String(result.totalMarks ?? 0),
    obtainedMarks: String(result.obtainedMarks ?? 0),
    percentage: String(result.percentage ?? 0),
    grade: result.grade || "F",
    passStatus: result.passStatus || "Fail",
    subjectName: result.subjectName || "",
  };
};

export default function UpdateMarks() {
  const navigate = useNavigate();

  const [results, setResults] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadResults = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getAdminUpdateMarksList({
        search,
        status,
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
      setForm(initialForm(result));
    } catch (err) {
      setError(errorText(err));
    }
  };

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const objectiveObtained = number(form?.objectiveObtainedMarks);
  const practicalObtained = number(form?.practicalObtainedMarks);

  const calculatedObtained = objectiveObtained + practicalObtained;

  const updateTotalFromComponents = () => {
    if (!form) return;

    const total =
      number(form.objectiveTotalMarks) +
      number(form.practicalTotalMarks);

    updateField("totalMarks", String(total));
    updateField("obtainedMarks", String(calculatedObtained));
  };

  const updateObtainedFromComponents = () => {
    updateField("obtainedMarks", String(calculatedObtained));
  };

  const filteredResults = useMemo(() => results, [results]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!selected || !form) return;

    const payload = {
      objectiveTotalMarks: Number(form.objectiveTotalMarks),
      objectiveObtainedMarks: Number(form.objectiveObtainedMarks),
      practicalTotalMarks: Number(form.practicalTotalMarks),
      practicalObtainedMarks: Number(form.practicalObtainedMarks),
      totalMarks: Number(form.totalMarks),
      obtainedMarks: Number(form.obtainedMarks),
      percentage: Number(form.percentage),
      grade: form.grade,
      passStatus: form.passStatus,
      subjectName: form.subjectName,
    };

    if (Object.values(payload).some((value) =>
      typeof value === "number" && !Number.isFinite(value)
    )) {
      setError("Please enter valid marks and percentage values.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const response = await updateAdminFinalResult(
        selected._id,
        payload
      );

      const updated = unwrap(response);

      setSelected(updated);
      setForm(initialForm(updated));
      setSuccess("Final marks and result updated successfully.");

      await loadResults();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSaving(false);
    }
  };

  if (selected && form) {
    return (
      <main className="um-page">
        <header className="um-header">
          <div>
            <button
              className="um-back"
              type="button"
              onClick={() => {
                setSelected(null);
                setForm(null);
                setError("");
                setSuccess("");
              }}
            >
              <FiArrowLeft /> Back to Update Marks
            </button>

            <span className="um-eyebrow">STUDENT EXAMINATION</span>
            <h1>Update Student Result</h1>
            <p>Enter the final marks approved by the institute.</p>
          </div>

          <button
            className="um-button um-light"
            type="button"
            onClick={() => openResult(selected)}
            disabled={saving}
          >
            <FiRefreshCw /> Refresh
          </button>
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
              {selected.course_id?.courseTitle || "Course"} 
              {" · "}
              Roll No: {selected.student_id?.rollNo || "—"}
            </p>
          </div>
          <span className={`um-status ${String(selected.resultStatus).toLowerCase()}`}>
            {selected.resultStatus || "Draft"}
          </span>
        </section>

        <section className="um-grade-guide">
          <div className="um-guide-title">
            <FiAward /> Course Grade System
          </div>
          <div className="um-grade-grid">
            {[
              ["D", "Average", "35–49%"],
              ["B", "Good", "50–74%"],
              ["A", "Very Good", "75–89%"],
              ["A+", "Excellent", "90–100%"],
            ].map(([grade, label, range]) => (
              <div className="um-grade" key={grade}>
                <strong>{grade}</strong>
                <span>{label}</span>
                <b>{range}</b>
              </div>
            ))}
          </div>
        </section>

        <form className="um-card um-form" onSubmit={handleSave}>
          <div className="um-section-title">
            <h2>Exam Result Details</h2>
            <p>All values below determine the final institute marksheet.</p>
          </div>

          <div className="um-summary-grid">
            <article>
              <FiStar />
              <span>Total Marks</span>
              <strong>{format(form.totalMarks)}</strong>
              <small>Objective + Practical</small>
            </article>
            <article>
              <FiCheckCircle />
              <span>Obtained Marks</span>
              <strong>{format(form.obtainedMarks)}</strong>
              <small>Final score approved by Admin</small>
            </article>
            <article>
              <FiPercent />
              <span>Percentage</span>
              <strong>{format(form.percentage)}%</strong>
              <small>Admin-controlled percentage</small>
            </article>
            <article>
              <FiAward />
              <span>Grade</span>
              <strong>{form.grade}</strong>
              <small>{form.passStatus}</small>
            </article>
          </div>

          <div className="um-field-grid">
            <label>
              Total Objective Marks
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.objectiveTotalMarks}
                onChange={(e) => updateField("objectiveTotalMarks", e.target.value)}
              />
            </label>

            <label>
              Obtained Objective Marks
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.objectiveObtainedMarks}
                onChange={(e) => {
                  updateField("objectiveObtainedMarks", e.target.value);
                  setTimeout(updateObtainedFromComponents, 0);
                }}
              />
              <small>Objective marks awarded by Admin</small>
            </label>

            <label>
              Total Practical Marks
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.practicalTotalMarks}
                onChange={(e) => updateField("practicalTotalMarks", e.target.value)}
              />
            </label>

            <label>
              Obtained Practical Marks
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.practicalObtainedMarks}
                onChange={(e) => {
                  updateField("practicalObtainedMarks", e.target.value);
                  setTimeout(updateObtainedFromComponents, 0);
                }}
              />
              <small>Practical marks awarded by Admin</small>
            </label>

            <label>
              Final Total Marks
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.totalMarks}
                onChange={(e) => updateField("totalMarks", e.target.value)}
              />
            </label>

            <label>
              Final Obtained Marks
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.obtainedMarks}
                onChange={(e) => updateField("obtainedMarks", e.target.value)}
              />
            </label>

            <label>
              Final Percentage (%)
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.percentage}
                onChange={(e) => updateField("percentage", e.target.value)}
              />
              <small>Admin can directly set the percentage.</small>
            </label>

            <label>
              Grade
              <select
                value={form.grade}
                onChange={(e) => updateField("grade", e.target.value)}
              >
                {["A+", "A", "B", "C", "D", "E", "F", "Distinction", "Pass"].map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </label>

            <label>
              Final Result
              <select
                value={form.passStatus}
                onChange={(e) => updateField("passStatus", e.target.value)}
              >
                <option value="Pass">Pass</option>
                <option value="Fail">Fail</option>
              </select>
            </label>

            <label className="um-full">
              Subject / Examination Name
              <input
                value={form.subjectName}
                onChange={(e) => updateField("subjectName", e.target.value)}
                placeholder="Enter subject or examination name"
              />
            </label>
          </div>

          <div className="um-helper">
            <strong>Quick calculation:</strong> Objective + Practical marks =
            {` ${format(calculatedObtained)} `}obtained marks.
            <button type="button" onClick={updateTotalFromComponents}>
              Apply component totals
            </button>
          </div>

          <div className="um-actions">
            <button
              type="button"
              className="um-button um-light"
              onClick={() => {
                setSelected(null);
                setForm(null);
              }}
            >
              Back to List
            </button>
            <button
              type="submit"
              className="um-button um-primary"
              disabled={saving}
            >
              <FiSave /> {saving ? "Saving..." : "Update Result"}
            </button>
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
          <p>Manage final objective, practical, percentage and grade details.</p>
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

      <section className="um-card">
        <div className="um-toolbar">
          <label className="um-search">
            <FiSearch />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student, roll number or course..."
            />
          </label>

          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="All">All Results</option>
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
          </select>
        </div>

        {loading ? (
          <div className="um-empty">Loading student results...</div>
        ) : !filteredResults.length ? (
          <div className="um-empty">
            No saved exam results found. Create or submit an exam result first.
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
                  <th>Performance</th>
                  <th>Result Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredResults.map((item, index) => (
                  <tr key={item._id}>
                    <td>{index + 1}</td>
                    <td>{item.student_id?.rollNo || "—"}</td>
                    <td><strong>{fullName(item.student_id)}</strong></td>
                    <td>{item.course_id?.courseTitle || "—"}</td>
                    <td>
                      <div>Marks: {format(item.obtainedMarks)} / {format(item.totalMarks)}</div>
                      <div>Result: {item.passStatus || "Pending"}</div>
                      <div>Grade: {item.grade || "—"}</div>
                      <div>{format(item.percentage)}%</div>
                    </td>
                    <td>
                      <span className={`um-status ${String(item.resultStatus).toLowerCase()}`}>
                        {item.resultStatus || "Draft"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="um-button um-primary um-small"
                        type="button"
                        onClick={() => openResult(item)}
                      >
                        <FiEdit /> Update Result
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
