
import { useCallback, useEffect, useState } from "react";
import {
  FiDownload,
  FiFile,
  FiFileText,
  FiFolder,
  FiRefreshCw,
  FiAlertCircle,
  FiEye,
  FiImage,
} from "react-icons/fi";

import studentPortalService from "../../services/studentPortalService";
import notification, {
  getApiErrorMessage,
} from "../../utils/notification";

import "./StudentDocuments.css";

const getExtension = (name = "") => {
  const parts = String(name).split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
};

const isPdf = (doc) =>
  String(doc?.mimeType || "").toLowerCase() === "application/pdf" ||
  getExtension(doc?.originalName) === "pdf";

const isImage = (doc) =>
  String(doc?.mimeType || "").toLowerCase().startsWith("image/") ||
  ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(
    getExtension(doc?.originalName)
  );

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
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;

  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
};

const getErrorMessage = (error, fallback) =>
  getApiErrorMessage(error) || fallback || "Something went wrong.";

const getDocumentId = (doc) => String(doc?.id || doc?._id || "");

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
        throw new Error(response?.message || "Unable to load documents.");
      }

      const data = response.data || {};

      setStudent(data.student || null);
      setDocuments(
        Array.isArray(data.documents) ? data.documents : []
      );
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Unable to load your documents."
      );

      setError(message);
      notification.error(message);

      setDocuments([]);
      setStudent(null);
    } 
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Fetch image and PDF previews through the authenticated API.
  useEffect(() => {
    let cancelled = false;
    const objectUrls = [];

    const loadPreviews = async () => {
      const previewDocuments = documents.filter(
        (doc) => isImage(doc) || isPdf(doc)
      );

      const entries = await Promise.all(
        previewDocuments.map(async (doc) => {
          const id = getDocumentId(doc);

          try {
            const blob = await studentPortalService.viewMyDocument(id);

            if (!(blob instanceof Blob) || blob.size === 0) {
              throw new Error("The preview file is empty.");
            }

            const url = URL.createObjectURL(blob);
            objectUrls.push(url);

            return [id, url];
          } catch {
            return [id, ""];
          }
        })
      );

      if (!cancelled) {
        setPreviews(Object.fromEntries(entries));
      } else {
        objectUrls.forEach((url) => URL.revokeObjectURL(url));
      }
    };

    setPreviews({});
    loadPreviews();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [documents]);

  const openDocument = async (doc) => {
    const id = getDocumentId(doc);
    if (!id) return;

    setActionId(id);
    setError("");

    try {
      const blob = await studentPortalService.viewMyDocument(id);

      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error("The document could not be opened.");
      }

      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");

      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = doc.originalName || "document";

      window.document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Unable to open this document."
      );

      setError(message);
      notification.error(message);
    }
    finally {
      setActionId("");
    }
  };

  const downloadDocument = async (doc) => {
    const id = getDocumentId(doc);
    if (!id) return;

    setActionId(id);
    setError("");

    try {
      const blob = await studentPortalService.downloadMyDocument(id);

      if (!(blob instanceof Blob) || blob.size === 0) {
        throw new Error("The document download returned an empty file.");
      }

      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");

      link.href = url;
      link.download = doc.originalName || "document";

      window.document.body.appendChild(link);
      link.click();
      link.remove();
      notification.success("Document downloaded successfully.");

      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) {
      const message = getErrorMessage(
        err,
        "Unable to download this document."
      );

      setError(message);
      notification.error(message);
    } 
    finally {
      setActionId("");
    }
  };

  const handlePreviewKeyDown = (event, doc) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDocument(doc);
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
          {documents.map((doc) => {
            const id = getDocumentId(doc);
            const pdf = isPdf(doc);
            const image = isImage(doc);
            const previewUrl = previews[id];

            return (
              <article className="student-document-card" key={id}>
                <div
                  className="student-document-card__preview"
                  role="button"
                  tabIndex={0}
                  onClick={() => openDocument(doc)}
                  onKeyDown={(event) => handlePreviewKeyDown(event, doc)}
                  title={`Open ${doc.originalName || "document"}`}
                  aria-label={`Open ${doc.originalName || "document"}`}
                >
                  {previewUrl && image ? (
                    <img
                      className="student-document-card__image"
                      src={previewUrl}
                      alt={doc.originalName || "Document preview"}
                    />
                  ) : previewUrl && pdf ? (
                    <iframe
                      className="student-document-card__pdf"
                      src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                      title={`${doc.originalName || "PDF"} preview`}
                      tabIndex={-1}
                    />
                  ) : (
                    <div className="student-document-card__file-fallback">
                      {image ? (
                        <FiImage />
                      ) : pdf ? (
                        <FiFileText />
                      ) : (
                        <FiFile />
                      )}
                      <strong>
                        {getExtension(doc.originalName).toUpperCase() ||
                          "FILE"}
                      </strong>
                      <span>
                        {previewUrl === "" && (image || pdf)
                          ? "Preview unavailable"
                          : "Loading preview…"}
                      </span>
                    </div>
                  )}

                  <span className="student-document-card__view">
                    <FiEye /> Open
                  </span>
                </div>

                <div className="student-document-card__footer">
                  <div className="student-document-card__details">
                    <h2 title={doc.originalName}>
                      {doc.originalName || "Untitled document"}
                    </h2>
                    <p>
                      {formatDate(doc.uploadedAt)}
                      <span>•</span>
                      {formatSize(doc.fileSize)}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="student-document-card__download"
                    onClick={() => downloadDocument(doc)}
                    disabled={actionId === id}
                    aria-label={`Download ${doc.originalName}`}
                    title="Download document"
                  >
                    {actionId === id ? (
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
