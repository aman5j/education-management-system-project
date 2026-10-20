import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiEdit2,
  FiBookOpen,
  FiCalendar,
  FiLayers,
} from "react-icons/fi";

import { useAuth } from "../../../context/AuthContext";
import { hasPermission } from "../../../utils/permissions";

import { getSubjectById } from "../../../services/subjectService";
import "../../../styles/SubjectManagement.css";

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ViewSubject() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { user } = useAuth();

  if (!hasPermission(user, "subjects.view")) {
    return (
      <div className="subject-page">
        <div className="subject-alert subject-alert-error" role="alert">
          You do not have permission to view subjects.
        </div>
      </div>
    );
  }

  const location = useLocation();
  const basePath = location.pathname.startsWith("/staff")
    ? "/staff"
    : "/admin";

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const canView = hasPermission(user, "subjects.view");

  useEffect(() => {
    if (!canView) {
      setLoading(false);
      setError("You do not have permission to view subjects.");
      return;
    }

    let cancelled = false;

    const loadSubject = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getSubjectById(id);
        const payload = response?.data;
        const subjectData =
          payload?.data?.subject ||
          payload?.data ||
          payload?.subject ||
          payload;

        if (!subjectData?._id) {
          throw new Error("Subject details could not be found.");
        }

        if (!cancelled) setSubject(subjectData);
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
  }, [id, canView]);

  if (!canView) {
    return (
      <div className="subject-page">
        <div className="subject-alert subject-alert-error" role="alert">
          You do not have permission to view subjects.
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

  if (error || !subject) {
    return (
      <div className="subject-page subject-view-page">
        <div className="subject-page-header">
          <div>
            <h1>View Subject</h1>
            <p>View subject information.</p>
          </div>
          <button
            type="button"
            className="subject-secondary-btn"
            onClick={() => navigate(`${basePath}/subjects`)}
          >
            <FiArrowLeft /> Back to Subjects
          </button>
        </div>
        <div className="subject-alert subject-alert-error" role="alert">
          {error || "Subject not found."}
        </div>
      </div>
    );
  }

  const active = subject.status === "Active";

  return (
    <div className="subject-page subject-view-page">
      <div className="subject-page-header">
        <div>
          <h1>Subject Details</h1>
          <p>View subject information.</p>
        </div>

        <div className="subject-header-actions">
          <button
            type="button"
            className="subject-secondary-btn"
            onClick={() => navigate(`${basePath}/subjects`)}
          >
            <FiArrowLeft /> Back
          </button>
          <button
            type="button"
            className="subject-primary-btn"
            onClick={() =>
              navigate(`${basePath}/subjects/edit/${subject._id}`)
            }
          >
            <FiEdit2 /> Edit Subject
          </button>
        </div>
      </div>

      <div className="subject-card">
        <div className="subject-detail-header">
          <div className="subject-detail-icon">
            <FiBookOpen aria-hidden="true" />
          </div>

          <div className="subject-detail-title">
            <h2>{subject.subjectName || "Untitled Subject"}</h2>
            <p>{subject.subjectCode || "No subject code"}</p>
          </div>

          <span
            className={`subject-status-badge ${
              active ? "subject-status-active" : "subject-status-inactive"
            }`}
          >
            {subject.status || "Unknown"}
          </span>
        </div>

        <div className="subject-detail-grid">
          <div className="subject-detail-item">
            <span className="subject-detail-label">
              <FiBookOpen aria-hidden="true" /> Subject Name
            </span>
            <strong>{subject.subjectName || "Not available"}</strong>
          </div>

          <div className="subject-detail-item">
            <span className="subject-detail-label">
              <FiLayers aria-hidden="true" /> Subject Code
            </span>
            <strong>{subject.subjectCode || "Not available"}</strong>
          </div>

          <div className="subject-detail-item">
            <span className="subject-detail-label">Status</span>
            <strong>{subject.status || "Not available"}</strong>
          </div>

          <div className="subject-detail-item subject-detail-item-full">
            <span className="subject-detail-label">Description</span>
            <p className="subject-detail-description">
              {subject.description?.trim() || "No description provided."}
            </p>
          </div>

          <div className="subject-detail-item">
            <span className="subject-detail-label">
              <FiCalendar aria-hidden="true" /> Created On
            </span>
            <strong>{formatDate(subject.createdAt)}</strong>
          </div>

          <div className="subject-detail-item">
            <span className="subject-detail-label">
              <FiCalendar aria-hidden="true" /> Last Updated
            </span>
            <strong>{formatDate(subject.updatedAt)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
