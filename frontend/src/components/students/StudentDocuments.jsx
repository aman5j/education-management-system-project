
import { useCallback, useEffect, useRef, useState } from "react";

import {
  FiDownload,
  FiEye,
  FiFile,
  FiFileText,
  FiTrash2,
  FiUpload,
  FiX,
} from "react-icons/fi";

import {
  getStudentDocuments,
  uploadStudentDocuments,
  viewStudentDocument,
  downloadStudentDocument,
  deleteStudentDocument,
} from "../../services/studentDocumentService";

import notification from "../../utils/notification";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES_PER_UPLOAD = 10;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
];

const StudentDocuments = ({
  student,
  onClose,
  onCountChange,
  inline = false,
  draftFiles = [],
  onDraftFilesChange,
}) => {
  const inputRef = useRef(null);
  const loadPromiseRef = useRef(null);
  const countChangeRef = useRef(onCountChange);

  const studentId = student?._id;

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(Boolean(studentId));
  const [loadFailed, setLoadFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    countChangeRef.current = onCountChange;
  }, [onCountChange]);

  const loadDocuments = useCallback(
    async (isActive = () => true) => {
      if (!studentId) {
        if (isActive()) {
          setDocuments([]);
          setLoading(false);
          setLoadFailed(false);
        }
        return true;
      }

      setLoading(true);

      try {
        // Reuse an in-flight request when React StrictMode
        // runs the development effect more than once.
        if (!loadPromiseRef.current) {
          loadPromiseRef.current = getStudentDocuments(studentId);
        }

        const response = await loadPromiseRef.current;
        const list = response?.data?.data?.documents;

        if (!Array.isArray(list)) {
          throw new Error("Invalid student documents response.");
        }

        if (isActive()) {
          setDocuments(list);
          setLoadFailed(false);
          countChangeRef.current?.(list.length);
        }

        return true;
      } catch (error) {
        if (isActive()) {
          setLoadFailed(true);

          notification.error(
            error?.response?.data?.message ||
            error?.message ||
            "Unable to load student documents."
          );
        }

        return false;
      } finally {
        loadPromiseRef.current = null;

        if (isActive()) {
          setLoading(false);
        }
      }
    },
    [studentId]
  );

  useEffect(() => {
    let active = true;

    loadDocuments(() => active);

    return () => {
      active = false;
    };
  }, [loadDocuments]);

  const getDocumentName = (document) =>
    document?.originalName ||
    document?.fileName ||
    "Document";

  const formatFileSize = (bytes) => {
    const size = Number(bytes || 0);

    if (!size) return "0 KB";
    if (size < 1024) return `${size} B`;

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const isImage = (fileOrDocument) => {
    const mimeType = fileOrDocument?.mimeType || fileOrDocument?.type;

    return [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(mimeType);
  };

  const validateFiles = (selectedFiles) => {
    const files = Array.from(selectedFiles || []);

    if (!files.length) {
      return {
        valid: false,
        message: "Please select at least one document.",
      };
    }

    if (files.length > MAX_FILES_PER_UPLOAD) {
      return {
        valid: false,
        message: "You can upload a maximum of 10 documents at a time.",
      };
    }

    const invalidType = files.find((file) => {
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      return (
        !ALLOWED_TYPES.includes(file.type) &&
        !ALLOWED_EXTENSIONS.includes(extension)
      );
    });

    if (invalidType) {
      return {
        valid: false,
        message: `${invalidType.name} is not a supported document type.`,
      };
    }

    const oversized = files.find(
      (file) => file.size > MAX_FILE_SIZE
    );

    if (oversized) {
      return {
        valid: false,
        message: `${oversized.name} is larger than 10 MB.`,
      };
    }

    return { valid: true, files };
  };

  const handleFileChange = async (event) => {
    const selectedFiles = event.target.files;
    const result = validateFiles(selectedFiles);

    event.target.value = "";
    setValidationError("");

    if (!result.valid) {
      setValidationError(result.message);
      return;
    }

    // Add Student: keep selected files in the form until
    // the student record has been created.
    if (!studentId) {
      onDraftFilesChange?.((previous) => [
        ...previous,
        ...result.files,
      ]);

      notification.info(
        `${result.files.length} document(s) selected. They will upload after the student is created.`
      );

      return;
    }

    setUploading(true);

    try {
      const response = await uploadStudentDocuments(
        studentId,
        result.files
      );

      await loadDocuments();

      notification.success(
        response?.data?.message ||
        "Documents uploaded successfully."
      );
    } catch (error) {
      notification.error(
        error?.response?.data?.message ||
        error?.message ||
        "Unable to upload documents."
      );
    } finally {
      setUploading(false);
    }
  };

  const removeDraftFile = (indexToRemove) => {
    onDraftFilesChange?.((previous) =>
      previous.filter((_, index) => index !== indexToRemove)
    );
  };

  const handleView = async (document) => {
    if (!studentId || busyDocumentId) return;

    setBusyDocumentId(document._id);

    // Open the tab during the click event to avoid popup blockers
    // after the asynchronous document request.
    const previewWindow = window.open("about:blank", "_blank");

    if (!previewWindow) {
      setBusyDocumentId("");
      notification.warning(
        "Please allow pop-ups to preview student documents."
      );
      return;
    }

    try {
      previewWindow.document.title = "Loading document...";

      const response = await viewStudentDocument(
        studentId,
        document._id
      );

      const blob = new Blob([response.data], {
        type:
          document.mimeType ||
          response.headers?.["content-type"] ||
          "application/octet-stream",
      });

      const url = URL.createObjectURL(blob);

      previewWindow.location.href = url;

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (error) {
      previewWindow.close();

      notification.error(
        error?.response?.data?.message ||
        "Unable to view document."
      );
    } finally {
      setBusyDocumentId("");
    }
  };

  const handleDownload = async (document) => {
    if (!studentId || busyDocumentId) return;

    setBusyDocumentId(document._id);

    try {
      const response = await downloadStudentDocument(
        studentId,
        document._id
      );

      const blob = new Blob([response.data], {
        type:
          document.mimeType ||
          response.headers?.["content-type"] ||
          "application/octet-stream",
      });

      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");

      link.href = url;
      link.download = getDocumentName(document);

      window.document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);

      notification.success("Document downloaded successfully.");
    } catch (error) {
      notification.error(
        error?.response?.data?.message ||
        "Unable to download document."
      );
    } finally {
      setBusyDocumentId("");
    }
  };

  const handleDelete = async (document) => {
    if (!studentId || busyDocumentId) return;

    const confirmed = await notification.confirmDelete(
      `"${getDocumentName(document)}"`
    );

    if (!confirmed) return;

    setBusyDocumentId(document._id);

    try {
      await deleteStudentDocument(
        studentId,
        document._id
      );

      const updatedDocuments = documents.filter(
        (item) => String(item._id) !== String(document._id)
      );

      setDocuments(updatedDocuments);
      countChangeRef.current?.(updatedDocuments.length);

      notification.success("Document deleted successfully.");
    } catch (error) {
      notification.error(
        error?.response?.data?.message ||
        "Unable to delete document."
      );
    } finally {
      setBusyDocumentId("");
    }
  };

  const fullName = [
    student?.firstName,
    student?.surname,
  ]
    .filter(Boolean)
    .join(" ");

  const documentContent = (
    <>
      <div className="admin-profile-upload-box">
        <span className="admin-profile-upload-icon">
          <FiUpload />
        </span>

        <strong>Upload Student Document</strong>

        <small>
          Maximum 10 files per upload and 10 MB per file.
          Supported: PDF, JPG, JPEG, PNG, WEBP, DOC, DOCX, XLS and XLSX.
        </small>

        <label className="admin-profile-browse-button">
          {uploading ? "Uploading..." : "Browse files"}

          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            disabled={uploading || Boolean(busyDocumentId)}
            accept={ALLOWED_EXTENSIONS.join(",")}
            onChange={handleFileChange}
          />
        </label>
      </div>

      {validationError && (
        <div className="student-documents-error" role="alert">
          {validationError}
        </div>
      )}

      <div className="student-documents-section-heading">
        <strong>My Documents</strong>
        <span>
          {studentId ? documents.length : draftFiles.length} document(s)
        </span>
      </div>

      {!studentId ? (
        draftFiles.length === 0 ? (
          <div className="student-documents-empty">
            <FiFileText />
            <strong>No documents selected</strong>
            <span>
              Browse files to add documents to this student.
            </span>
          </div>
        ) : (
          <div className="student-documents-grid">
            {draftFiles.map((file, index) => (
              <div
                className="student-document-card"
                key={`${file.name}-${file.size}-${index}`}
              >
                <div
                  className={`student-document-file-icon ${
                    isImage(file) ? "image-file" : "regular-file"
                  }`}
                >
                  {isImage(file) ? <FiFile /> : <FiFileText />}
                </div>

                <div className="student-document-info">
                  <strong title={file.name}>{file.name}</strong>
                  <span>
                    {file.name.split(".").pop()?.toUpperCase()}
                    {" • "}
                    {formatFileSize(file.size)}
                  </span>
                  <span className="student-document-date">
                    Ready to upload
                  </span>
                </div>

                <div className="student-document-actions">
                  <button
                    type="button"
                    title="Remove selected file"
                    aria-label={`Remove ${file.name}`}
                    className="danger"
                    onClick={() => removeDraftFile(index)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : loading ? (
        <div className="student-documents-loading">
          Loading documents...
        </div>
      ) : loadFailed ? (
        <div className="student-documents-empty">
          <FiFileText />
          <strong>Unable to load documents</strong>
          <span>Check your connection and try again.</span>
          <button
            type="button"
            className="student-secondary-button"
            onClick={() => loadDocuments()}
          >
            Retry
          </button>
        </div>
      ) : documents.length === 0 ? (
        <div className="student-documents-empty">
          <FiFileText />
          <strong>No documents uploaded</strong>
          <span>Choose files above to upload student documents.</span>
        </div>
      ) : (
        <div className="student-documents-grid">
          {documents.map((document) => {
            const isBusy = busyDocumentId === document._id;

            return (
              <div
                className="student-document-card"
                key={document._id}
              >
                <div
                  className={`student-document-file-icon ${
                    isImage(document) ? "image-file" : "regular-file"
                  }`}
                >
                  {isImage(document) ? <FiFile /> : <FiFileText />}
                </div>

                <div className="student-document-info">
                  <strong title={getDocumentName(document)}>
                    {getDocumentName(document)}
                  </strong>

                  <span>
                    {String(
                      getDocumentName(document).split(".").pop() || "FILE"
                    ).toUpperCase()}
                    {" • "}
                    {formatFileSize(document.fileSize)}
                  </span>

                  <span className="student-document-date">
                    {formatDate(document.uploadedAt)}
                  </span>
                </div>

                <div className="student-document-actions">
                  <button
                    type="button"
                    title="View document"
                    aria-label={`View ${getDocumentName(document)}`}
                    disabled={Boolean(busyDocumentId)}
                    onClick={() => handleView(document)}
                  >
                    {isBusy ? "..." : <FiEye />}
                  </button>

                  <button
                    type="button"
                    title="Download document"
                    aria-label={`Download ${getDocumentName(document)}`}
                    disabled={Boolean(busyDocumentId)}
                    onClick={() => handleDownload(document)}
                  >
                    <FiDownload />
                  </button>

                  <button
                    type="button"
                    title="Delete document"
                    aria-label={`Delete ${getDocumentName(document)}`}
                    className="danger"
                    disabled={Boolean(busyDocumentId)}
                    onClick={() => handleDelete(document)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="student-documents-inline">
        {documentContent}
      </div>
    );
  }

  return (
    <div
      className="student-documents-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <section
        className="student-documents-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-documents-title"
      >
        <header className="student-documents-header">
          <div>
            <span className="student-documents-eyebrow">
              STUDENT MANAGEMENT
            </span>

            <h2 id="student-documents-title">
              Student Documents
            </h2>

            <p>
              {fullName || "Student"}
              {student?.rollNo ? ` · ${student.rollNo}` : ""}
            </p>
          </div>

          <button
            type="button"
            className="student-documents-close"
            onClick={onClose}
            aria-label="Close documents"
          >
            <FiX />
          </button>
        </header>

        <div className="student-documents-body">
          {documentContent}
        </div>
      </section>
    </div>
  );
};

export default StudentDocuments;
