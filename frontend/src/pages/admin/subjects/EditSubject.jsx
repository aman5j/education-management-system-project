import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiSave } from "react-icons/fi";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

import {
  getSubjectById,
  updateSubject,
} from "../../../services/subjectService";
import "../../../styles/SubjectManagement.css";

const EMPTY_FORM = {
  subjectName: "",
  subjectCode: "",
  description: "",
  status: "Active",
};

export default function EditSubject() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { user } = useAuth();

  if (!hasPermission(user, "subjects.update")) {
    return (
      <div className="subject-page">
        <div className="subject-alert subject-alert-error" role="alert">
          You do not have permission to update subjects.
        </div>
      </div>
    );
  }

  const location = useLocation();
  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let cancelled = false;

    const loadSubject = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getSubjectById(id);
        const payload = response?.data;
        const subject =
          payload?.data?.subject ||
          payload?.data ||
          payload?.subject ||
          payload;

        if (!subject?._id) {
          throw new Error("Subject details were not found.");
        }

        if (!cancelled) {
          setFormData({
            subjectName: subject.subjectName || "",
            subjectCode: subject.subjectCode || "",
            description: subject.description || "",
            status: subject.status || "Active",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              err.message ||
              "Unable to load subject details."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (!id) {
      setError("Subject ID is missing.");
      setLoading(false);
    } else {
      loadSubject();
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

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

      await updateSubject(id, {
        subjectName: formData.subjectName.trim(),
        subjectCode: formData.subjectCode.trim().toUpperCase(),
        description: formData.description.trim(),
        status: formData.status,
      });

      navigate(`${basePath}/subjects`, {
        replace: true,
        state: { message: "Subject updated successfully." },
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to update subject. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="subject-page">
        <div className="subject-card">
          <p>Loading subject details...</p>
        </div>
      </div>
    );
  }

  if (error && !formData.subjectName) {
    return (
      <div className="subject-page">
        <div className="subject-page-header">
          <div><h1>Edit Subject</h1></div>
          <button
            type="button"
            className="subject-secondary-btn"
            onClick={() => navigate(`${basePath}/subjects`)}
          >
            <FiArrowLeft /> Back to Subjects
          </button>
        </div>
        <div className="subject-alert subject-alert-error" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="subject-page subject-form-page">
      <div className="subject-page-header">
        <div>
          <h1>Edit Subject</h1>
          <p>Update subject information.</p>
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
              />
            </div>
          </div>

          <div className="subject-form-actions">
            <button
              type="button"
              className="subject-secondary-btn"
              onClick={() => navigate("/admin/subjects")}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="subject-primary-btn"
              disabled={saving}
            >
              <FiSave /> {saving ? "Saving..." : "Update Subject"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
