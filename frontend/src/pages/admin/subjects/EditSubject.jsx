
import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { FiSave } from "react-icons/fi";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

import {
  getSubjectById,
  updateSubject,
} from "../../../services/subjectService";

import notification, {
  getApiErrorMessage,
} from "../../../utils/notification";

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
  const location = useLocation();

  const { user } = useAuth();

  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";

  const canUpdate = hasPermission(user, "subjects.update");

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (!canUpdate) {
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadSubject = async () => {
      try {
        setLoading(true);

        if (!id) {
          throw new Error("Subject ID is missing.");
        }

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
      } catch (error) {
        if (!cancelled) {
          notification.error(getApiErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadSubject();

    return () => {
      cancelled = true;
    };
  }, [id, canUpdate]);

  const changeField = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: name === "subjectCode" ? value.toUpperCase() : value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = {};

    if (formData.subjectName.trim().length < 2) {
      errors.subjectName =
        "Subject name must contain at least 2 characters.";
    }

    if (formData.subjectCode.trim().length < 2) {
      errors.subjectCode =
        "Subject code must contain at least 2 characters.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length) {
      notification.warning("Please correct the highlighted fields.");
      return;
    }

    try {
      setSaving(true);

      await updateSubject(id, {
        subjectName: formData.subjectName.trim(),
        subjectCode: formData.subjectCode.trim().toUpperCase(),
        description: formData.description.trim(),
        status: formData.status,
      });

      notification.success("Subject updated successfully.");

      navigate(`${basePath}/subjects`, {
        replace: true,
      });
    } catch (error) {
      notification.error(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (!canUpdate) {
    return (
      <div className="subject-page">
        <div className="subject-alert subject-alert-error" role="alert">
          You do not have permission to update subjects.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="subject-page">
        <div className="subject-card">
          <p>Loading subject details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="subject-page subject-form-page">
      <div className="page-header">
        <div>
          <h1>Edit Subject</h1>
        </div>
      </div>

      <div className="common-card">
        <div className="cardbody">
          <form onSubmit={handleSubmit} noValidate>
            <div className="subject-form-grid">
              <div className="input-felid admission-form-full">
                <label htmlFor="subjectName">
                  Subject Name <span className="required">*</span>
                </label>

                <input
                  id="subjectName"
                  name="subjectName"
                  value={formData.subjectName}
                  onChange={changeField}
                  maxLength={100}
                  required
                />

                {fieldErrors.subjectName && (
                  <p className="subject-field-error">
                    {fieldErrors.subjectName}
                  </p>
                )}
              </div>

              <div className="input-felid">
                <label htmlFor="subjectCode">
                  Subject Code <span className="required">*</span>
                </label>

                <input
                  id="subjectCode"
                  name="subjectCode"
                  value={formData.subjectCode}
                  onChange={changeField}
                  maxLength={30}
                  required
                />

                {fieldErrors.subjectCode && (
                  <p className="subject-field-error">
                    {fieldErrors.subjectCode}
                  </p>
                )}
              </div>

              <div className="input-felid">
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
                <FiSave />
                {saving ? "Saving..." : "Update Subject"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
