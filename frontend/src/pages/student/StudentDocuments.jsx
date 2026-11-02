import { useCallback, useEffect, useState } from "react";
import {
  FiDownload,
  FiFile,
  FiFileText,
  FiFolder,
  FiImage,
  FiRefreshCw,
  FiAlertCircle,
  FiEye,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import "./StudentDocuments.css";

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatSize = (bytes) => {
  const size = Number(bytes || 0);

  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const isImage = (mimeType = "") =>
  String(mimeType).startsWith("image/");

const isPdf = (mimeType = "", name = "") =>
  mimeType === "application/pdf" ||
  String(name).toLowerCase().endsWith(".pdf");

const getFileExtension = (name = "") => {
  const parts = String(name).split(".");
  return parts.length > 1
    ? parts.pop().toUpperCase()
    : "FILE";
};

const getErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.message ||
  "Unable to load your documents.";

export default function StudentDocuments() {
  const [documents, setDocuments] = useState([]);
  const [student, setStudent] = useState(null);
  const [previews, setPreviews] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState("");

  const loadDocuments = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    setError("");

    try {
      const response = await studentPortalService.getMyDocuments();

      if (!response?.success) {
        throw new Error(
          response?.message || "Unable to load documents."
        );
      }

      const data = response.data || {};

      setStudent(data.student || null);
      setDocuments(
        Array.isArray(data.documents) ? data.documents : []
      );
    } catch (err) {
      setError(getErrorMessage(err));
      setDocuments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Load image thumbnails through the authenticated document endpoint.
  useEffect(() => {
    let cancelled = false;
    const objectUrls = [];

    const loadImagePreviews = async () => {
      const imageDocuments = documents.filter((document) =>
        isImage(document.mimeType)
      );

      const entries = await Promise.all(
        imageDocuments.map(async (document) => {
          try {
            const blob =
              await studentPortalService.viewMyDocument(document.id);

            const url = URL.createObjectURL(blob);
            objectUrls.push(url);

            return [document.id, url];
          } catch {
            return [document.id, ""];
          }
        })
      );

      if (!cancelled) {
        setPreviews(Object.fromEntries(entries));
      }
    };

    setPreviews({});
    loadImagePreviews();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [documents]);

  const openDocument = async (document) => {
    setActionId(document.id);
    setError("");

    try {
      const blob =
        await studentPortalService.viewMyDocument(document.id);

      const url = URL.createObjectURL(blob);
      const opened = window.open(url, "_blank", "noopener,noreferrer");

      if (!opened) {
        const link = document.createElement("a");
        link.href = url;
        link.download = document.originalName || "document";
        link.click();
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionId("");
    }
  };

  const downloadDocument = async (docRecord) => {
  setActionId(docRecord.id);
  setError("");

  try {
    const blob =
      await studentPortalService.downloadMyDocument(docRecord.id);

    const url = URL.createObjectURL(blob);
    const link = window.document.createElement("a");

    link.href = url;
    link.download = docRecord.originalName || "document";
    window.document.body.appendChild(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    setError(getErrorMessage(err));
  } finally {
    setActionId("");
  }
};

  return (
    <main className="student-documents">
      <header className="student-documents__header">
        <div className="student-documents__heading">
          <span className="student-documents__heading-icon">
            <FiFolder />
          </span>

          <div>
            <span className="student-documents__eyebrow">
              STUDENT PORTAL
            </span>
            <h1>My Documents</h1>
            <p>View and download your uploaded documents.</p>
          </div>
        </div>

        <button
          type="button"
          className="student-documents__refresh"
          onClick={() => loadDocuments(true)}
          disabled={loading || refreshing}
        >
          <FiRefreshCw
            className={refreshing ? "student-documents__spin" : ""}
          />
          Refresh
        </button>
      </header>

      {student && (
        <section className="student-documents__student">
          <div className="student-documents__student-icon">
            <FiFileText />
          </div>

          <div className="student-documents__student-info">
            <span>Student</span>
            <strong>{student.name || "Student"}</strong>
            <small>Roll Number: {student.rollNo || "—"}</small>
          </div>

          <div className="student-documents__total">
            <strong>{documents.length}</strong>
            <span>Documents</span>
          </div>
        </section>
      )}

      {error && (
        <div className="student-documents__error" role="alert">
          <FiAlertCircle />
          <span>{error}</span>
          <button type="button" onClick={() => setError("")}>
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <section className="student-documents__state">
          <FiRefreshCw className="student-documents__spin" />
          <h2>Loading your documents</h2>
          <p>Please wait while we retrieve your files.</p>
        </section>
      ) : documents.length === 0 ? (
        <section className="student-documents__state">
          <span className="student-documents__empty-icon">
            <FiFolder />
          </span>
          <h2>No documents available</h2>
          <p>
            Documents uploaded by your institute will appear here.
            Please contact your institute administrator if you expect
            to see a document.
          </p>
        </section>
      ) : (
        <section className="student-documents__grid">
          {documents.map((document) => {
            const image = isImage(document.mimeType);
            const pdf = isPdf(
              document.mimeType,
              document.originalName
            );

            return (
              <article
                className="student-document-card"
                key={document.id}
              >
                <button
                  type="button"
                  className="student-document-card__preview"
                  onClick={() => openDocument(document)}
                  title={`View ${document.originalName}`}
                  disabled={actionId === document.id}
                >
                  {image && previews[document.id] ? (
                    <img
                      src={previews[document.id]}
                      alt={document.originalName}
                    />
                  ) : (
                    <span
                      className={`student-document-card__file-icon ${
                        pdf ? "student-document-card__file-icon--pdf" : ""
                      }`}
                    >
                      {image ? <FiImage /> : pdf ? <FiFileText /> : <FiFile />}
                      <small>{getFileExtension(document.originalName)}</small>
                    </span>
                  )}
                  <span className="student-document-card__view">
                    <FiEye /> View
                  </span>
                </button>

                <div className="student-document-card__footer">
                  <div className="student-document-card__details">
                    <h2 title={document.originalName}>
                      {document.originalName}
                    </h2>
                    <p>
                      {formatDate(document.uploadedAt)}
                      <span>•</span>
                      {formatSize(document.fileSize)}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="student-document-card__download"
                    onClick={() => downloadDocument(document)}
                    disabled={actionId === document.id}
                    aria-label={`Download ${document.originalName}`}
                    title="Download document"
                  >
                    {actionId === document.id ? (
                      <FiRefreshCw className="student-documents__spin" />
                    ) : (
                      <FiDownload />
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}