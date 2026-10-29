import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

import { createSubject } from "../../../services/subjectService";
import "../../../styles/SubjectManagement.css";

const INITIAL_FORM = {
  subjectName: "",
  subjectCode: "",
  description: "",
  status: "Active",
};

export default function AddSubject() {
  const { user } = useAuth();
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

  if (!hasPermission(user, "subjects.create")) {
  return (
    <div className="subject-page">
      <div className="subject-alert subject-alert-error" role="alert">
        You do not have permission to create subjects.
      </div>
    </div>
  );
}

  return (
    <div className="subject-page subject-form-page">
      <div className="page-header">
        <div> 
          <h1>Add Subject</h1>
          
        </div>

        <button
          type="button"
          className="themebtn"
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

      <div className="common-card">
        <form onSubmit={handleSubmit} noValidate className="cardbody">
          <div className="subject-form-grid">
            <div className="input-felid admission-form-full">
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

            <div className="input-felid ">
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

            <div className="input-felid ">
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

            <div className="input-felid admission-form-full">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                rows={5}
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
              className="themebtn themebtnline"
              onClick={() => navigate(`${basePath}/subjects`)}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="themebtn"
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
