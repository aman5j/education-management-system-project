import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";

import { createSubject } from "../../../services/subjectService";
import "../../../styles/SubjectManagement.css";

const INITIAL_FORM = {
  subjectName: "",
  subjectCode: "",
  description: "",
  status: "Active",
};

export default function AddSubject() {
  const navigate = useNavigate();
  const location = useLocation();
  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";
    
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const changeField = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: name === "subjectCode" ? value.toUpperCase() : value,
    }));

    setFieldErrors((previous) => ({ ...previous, [name]: "" }));
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const errors = {};
    if (formData.subjectName.trim().length < 2) {
      errors.subjectName = "Subject name must contain at least 2 characters.";
    }
    if (formData.subjectCode.trim().length < 2) {
      errors.subjectCode = "Subject code must contain at least 2 characters.";
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    try {
      setSaving(true);

      await createSubject({
        subjectName: formData.subjectName.trim(),
        subjectCode: formData.subjectCode.trim().toUpperCase(),
        description: formData.description.trim(),
        status: formData.status,
      });

      navigate(`${basePath}/subjects`, {
        replace: true,
        state: { message: "Subject created successfully." },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to create subject. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="subject-page subject-form-page">
      <div className="subject-page-header">
        <div>
          <h1>Add Subject</h1>
          <p>Create a reusable subject independent of courses.</p>
        </div>

        <button
          type="button"
          className="subject-secondary-btn"
          onClick={() => navigate(`${basePath}/subjects`)}
        >
          <FiArrowLeft /> Back to Subjects
        </button>
      </div>

      {error && (
        <div className="subject-alert subject-alert-error" role="alert">
          {error}
        </div>
      )}

      <div className="subject-card">
        <form onSubmit={handleSubmit} noValidate>
          <div className="subject-form-grid">
            <div className="subject-field">
              <label htmlFor="subjectName">Subject Name *</label>
              <input
                id="subjectName"
                name="subjectName"
                value={formData.subjectName}
                onChange={changeField}
                maxLength={100}
                required
              />
              {fieldErrors.subjectName && (
                <p className="subject-field-error">{fieldErrors.subjectName}</p>
              )}
            </div>

            <div className="subject-field">
              <label htmlFor="subjectCode">Subject Code *</label>
              <input
                id="subjectCode"
                name="subjectCode"
                value={formData.subjectCode}
                onChange={changeField}
                maxLength={30}
                placeholder="e.g. JS101"
                required
              />
              {fieldErrors.subjectCode && (
                <p className="subject-field-error">{fieldErrors.subjectCode}</p>
              )}
            </div>

            <div className="subject-field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={changeField}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="subject-field subject-field-full">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                maxLength={1000}
                value={formData.description}
                onChange={changeField}
                placeholder="Describe this subject"
              />
            </div>
          </div>

          <div className="subject-form-actions">
            <button
              type="button"
              className="subject-secondary-btn"
              onClick={() => navigate(`${basePath}/subjects`)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="subject-primary-btn"
              disabled={saving}
            >
              <FiSave /> {saving ? "Saving..." : "Save Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
