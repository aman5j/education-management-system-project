
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiEdit2,
  FiBookOpen,
  FiCalendar,
  FiLayers,
} from "react-icons/fi";

import { getSubjectById } from "../../../services/subjectService";

import "../../../styles/SubjectManagement.css";

function formatDate(dateValue) {
  if (!dateValue) return "Not available";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getCourseName(course) {
  if (!course) return "Not assigned";

  if (typeof course === "string") {
    return course;
  }

  return course.courseName || course.name || course.title || "Not assigned";
}

export default function ViewSubject() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadSubject = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getSubjectById(id);
        const payload = response.data;
        const subjectData = payload.data || payload.subject || payload;

        if (!subjectData || !subjectData._id) {
          throw new Error("Subject details could not be found.");
        }

        if (!cancelled) {
          setSubject(subjectData);
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
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (!id) {
      setError("Subject ID is missing.");
      setLoading(false);
      return undefined;
    }

    loadSubject();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="subject-page subject-view-page">
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
            onClick={() => navigate("/admin/subjects")}
          >
            <FiArrowLeft aria-hidden="true" />
            Back to Subjects
          </button>
        </div>

        <div className="subject-alert subject-alert-error" role="alert">
          {error || "Subject not found."}
        </div>
      </div>
    );
  }

  const courseName = getCourseName(subject.course_id);
  const statusClass =
    subject.status === "Active"
      ? "subject-status-active"
      : "subject-status-inactive";

  return (
    <div className="subject-page subject-view-page">
      <div className="subject-page-header">
        <div>
          <h1>Subject Details</h1>
          <p>View the complete information for this subject.</p>
        </div>

        <div className="subject-header-actions">
          <button
            type="button"
            className="subject-secondary-btn"
            onClick={() => navigate("/admin/subjects")}
          >
            <FiArrowLeft aria-hidden="true" />
            Back
          </button>

          <button
            type="button"
            className="subject-primary-btn"
            onClick={() => navigate(`/admin/subjects/edit/${subject._id}`)}
          >
            <FiEdit2 aria-hidden="true" />
            Edit Subject
          </button>
        </div>
      </div>

      <div className="subject-card">
        <div className="subject-detail-header">
          <div className="subject-detail-icon">
            <FiBookOpen aria-hidden="true" />
          </div>

          <div className="subject-detail-title">
            <h2>{subject.subjectName}</h2>
            <p>{subject.subjectCode}</p>
          </div>

          <span className={`subject-status-badge ${statusClass}`}>
            {subject.status || "Unknown"}
          </span>
        </div>

        <div className="subject-detail-grid">
          <div className="subject-detail-item">
            <span className="subject-detail-label">
              <FiBookOpen aria-hidden="true" />
              Subject Name
            </span>
            <strong>{subject.subjectName || "Not available"}</strong>
          </div>

          <div className="subject-detail-item">
            <span className="subject-detail-label">
              <FiLayers aria-hidden="true" />
              Subject Code
            </span>
            <strong>{subject.subjectCode || "Not available"}</strong>
          </div>

          <div className="subject-detail-item">
            <span className="subject-detail-label">
              <FiLayers aria-hidden="true" />
              Associated Course
            </span>
            <strong>{courseName}</strong>
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
              <FiCalendar aria-hidden="true" />
              Created On
            </span>
            <strong>{formatDate(subject.createdAt)}</strong>
          </div>

          <div className="subject-detail-item">
            <span className="subject-detail-label">
              <FiCalendar aria-hidden="true" />
              Last Updated
            </span>
            <strong>{formatDate(subject.updatedAt)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
