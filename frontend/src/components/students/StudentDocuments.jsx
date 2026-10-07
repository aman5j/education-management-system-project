import {
  useEffect,
  useRef,
  useState,
} from "react";

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

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

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

const StudentDocuments = ({
  student,
  onClose,
  onCountChange,
}) => {
  const inputRef = useRef(null);

  const [documents, setDocuments] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [busyDocumentId, setBusyDocumentId] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const loadDocuments = async () => {
    if (!student?._id) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response =
        await getStudentDocuments(
          student._id
        );

      const list =
        response?.data?.data
          ?.documents || [];

      const normalizedList =
        Array.isArray(list)
          ? list
          : [];

      setDocuments(
        normalizedList
      );

      onCountChange?.(
        normalizedList.length
      );
    } catch (requestError) {
      console.error(
        "Failed to load student documents:",
        requestError
      );

      setError(
        requestError?.response?.data
          ?.message ||
          "Unable to load documents."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [student?._id]);

  const validateFiles = (
    selectedFiles
  ) => {
    const files =
      Array.from(
        selectedFiles || []
      );

    if (!files.length) {
      return {
        valid: false,
        message:
          "Please select at least one document.",
      };
    }

    if (files.length > 10) {
      return {
        valid: false,
        message:
          "You can upload maximum 10 documents at a time.",
      };
    }

    const invalidType =
      files.find(
        (file) =>
          !ALLOWED_TYPES.includes(
            file.type
          )
      );

    if (invalidType) {
      return {
        valid: false,
        message:
          `${invalidType.name} is not a supported document type.`,
      };
    }

    const oversized =
      files.find(
        (file) =>
          file.size > MAX_FILE_SIZE
      );

    if (oversized) {
      return {
        valid: false,
        message:
          `${oversized.name} is larger than 10 MB.`,
      };
    }

    return {
      valid: true,
      files,
    };
  };

  const handleFileChange = async (
    event
  ) => {
    const selectedFiles =
      event.target.files;

    const result =
      validateFiles(
        selectedFiles
      );

    event.target.value = "";

    if (!result.valid) {
      setError(result.message);
      setSuccess("");
      return;
    }

    try {
      setUploading(true);
      setError("");
      setSuccess("");

      const response =
        await uploadStudentDocuments(
          student._id,
          result.files
        );

      setSuccess(
        response?.data?.message ||
          "Documents uploaded successfully."
      );

      await loadDocuments();
    } catch (requestError) {
      console.error(
        "Document upload error:",
        requestError
      );

      setError(
        requestError?.response?.data
          ?.message ||
          "Unable to upload documents."
      );
    } finally {
      setUploading(false);
    }
  };

  const getDocumentName = (
    document
  ) =>
    document?.originalName ||
    document?.fileName ||
    "Document";

  const formatFileSize = (
    bytes
  ) => {
    const size =
      Number(bytes || 0);

    if (!size) {
      return "0 KB";
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (
      size <
      1024 * 1024
    ) {
      return `${(
        size / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      size /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  };

  const formatDate = (
    value
  ) => {
    if (!value) {
      return "-";
    }

    return new Date(
      value
    ).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  };

  const isImage = (
    document
  ) =>
    [
      "image/jpeg",
      "image/png",
      "image/webp",
    ].includes(
      document?.mimeType
    );

  const handleView = async (
    document
  ) => {
    try {
      setBusyDocumentId(
        document._id
      );

      setError("");

      const response =
        await viewStudentDocument(
          student._id,
          document._id
        );

      const blob =
        new Blob(
          [response.data],
          {
            type:
              document.mimeType ||
              response.headers?.[
                "content-type"
              ] ||
              "application/octet-stream",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );

      window.setTimeout(
        () =>
          URL.revokeObjectURL(
            url
          ),
        60000
      );
    } catch (requestError) {
      console.error(
        "Document view error:",
        requestError
      );

      setError(
        requestError?.response?.data
          ?.message ||
          "Unable to view document."
      );
    } finally {
      setBusyDocumentId("");
    }
  };

  const handleDownload = async (
    document
  ) => {
    try {
      setBusyDocumentId(
        document._id
      );

      setError("");

      const response =
        await downloadStudentDocument(
          student._id,
          document._id
        );

      const blob =
        new Blob(
          [response.data],
          {
            type:
              document.mimeType ||
              response.headers?.[
                "content-type"
              ] ||
              "application/octet-stream",
          }
        );

      const url =
        URL.createObjectURL(
          blob
        );

      const link =
        window.document.createElement(
          "a"
        );

      link.href = url;

      link.download =
        getDocumentName(
          document
        );

      window.document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      URL.revokeObjectURL(
        url
      );
    } catch (requestError) {
      console.error(
        "Document download error:",
        requestError
      );

      setError(
        requestError?.response?.data
          ?.message ||
          "Unable to download document."
      );
    } finally {
      setBusyDocumentId("");
    }
  };

  const handleDelete = async (
    document
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${getDocumentName(
          document
        )}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setBusyDocumentId(
        document._id
      );

      setError("");
      setSuccess("");

      const response =
        await deleteStudentDocument(
          student._id,
          document._id
        );

      const updatedDocuments =
        documents.filter(
          (item) =>
            String(item._id) !==
            String(document._id)
        );

      setDocuments(
        updatedDocuments
      );

      onCountChange?.(
        updatedDocuments.length
      );

      setSuccess(
        response?.data?.message ||
          "Document deleted successfully."
      );
    } catch (requestError) {
      console.error(
        "Document delete error:",
        requestError
      );

      setError(
        requestError?.response?.data
          ?.message ||
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

  return (
    <div
      className="student-documents-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="student-documents-modal">
        <div className="student-documents-header">
          <div>
            <span className="student-documents-eyebrow">
              STUDENT MANAGEMENT
            </span>

            <h2>
              Student Documents
            </h2>

            <p>
              {fullName || "Student"}{" "}
              • Roll No:{" "}
              {student?.rollNo || "-"}
            </p>
          </div>

          <button
            type="button"
            className="student-documents-close"
            onClick={onClose}
          >
            <FiX />
          </button>
        </div>

        <div className="student-documents-body">
          {error && (
            <div className="student-documents-error">
              {error}
            </div>
          )}

          {success && (
            <div className="student-documents-success">
              {success}
            </div>
          )}

          <div className="student-documents-toolbar">
            <div>
              <strong>
                Uploaded Documents
              </strong>

              <span>
                {documents.length}{" "}
                document
                {documents.length === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <button
              type="button"
              className="student-documents-upload-button"
              disabled={uploading}
              onClick={() =>
                inputRef.current?.click()
              }
            >
              <FiUpload />

              {uploading
                ? "Uploading..."
                : "Upload Documents"}
            </button>

            <input
              ref={inputRef}
              type="file"
              multiple
              hidden
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
              onChange={
                handleFileChange
              }
            />
          </div>

          <p className="student-documents-help">
            Maximum 10 files per upload
            and 10 MB per file.
            Supported: PDF, JPG, JPEG,
            PNG, WEBP, DOC, DOCX, XLS
            and XLSX.
          </p>

          {loading ? (
            <div className="student-documents-loading">
              Loading documents...
            </div>
          ) : documents.length ===
            0 ? (
            <div className="student-documents-empty">
              <FiFileText />

              <strong>
                No documents uploaded
              </strong>

              <span>
                Click "Upload Documents"
                to add student documents.
              </span>
            </div>
          ) : (
            <div className="student-documents-list">
              {documents.map(
                (document) => (
                  <div
                    className="student-document-row"
                    key={
                      document._id
                    }
                  >
                    <div className="student-document-icon">
                      {isImage(
                        document
                      ) ? (
                        <FiFile />
                      ) : (
                        <FiFileText />
                      )}
                    </div>

                    <div className="student-document-info">
                      <strong
                        title={getDocumentName(
                          document
                        )}
                      >
                        {getDocumentName(
                          document
                        )}
                      </strong>

                      <span>
                        {formatFileSize(
                          document.fileSize
                        )}{" "}
                        •{" "}
                        {formatDate(
                          document.uploadedAt
                        )}
                      </span>
                    </div>

                    <div className="student-document-actions">
                      <button
                        type="button"
                        title="View"
                        disabled={
                          busyDocumentId ===
                          document._id
                        }
                        onClick={() =>
                          handleView(
                            document
                          )
                        }
                      >
                        <FiEye />
                      </button>

                      <button
                        type="button"
                        title="Download"
                        disabled={
                          busyDocumentId ===
                          document._id
                        }
                        onClick={() =>
                          handleDownload(
                            document
                          )
                        }
                      >
                        <FiDownload />
                      </button>

                      <button
                        type="button"
                        title="Delete"
                        className="danger"
                        disabled={
                          busyDocumentId ===
                          document._id
                        }
                        onClick={() =>
                          handleDelete(
                            document
                          )
                        }
                      >
                        <FiTrash2 />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDocuments;