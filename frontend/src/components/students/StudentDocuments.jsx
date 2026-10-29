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
  inline = false,
  draftFiles = [],
  onDraftFilesChange,
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

    if (!student?._id) {
      onDraftFilesChange?.((previous) => [
        ...previous,
        ...result.files,
      ]);

      setSuccess(
        `${result.files.length} document(s) selected. They will upload after the student is created.`
      );

      setError("");
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
      className={
        inline
          ? "student-documents-inline"
          : "student-documents-overlay"
      }
      onMouseDown={(event) => {
        if (
          !inline &&
          event.target ===
            event.currentTarget
        ) {
          onClose?.();
        }
      }}
    >
     


    {error && (
      <div className="student-documents-error" role="alert">
        {error}
      </div>
    )}

    {success && (
      <div className="student-documents-success" role="status">
        {success}
      </div>
    )}

   

<div class="admin-profile-upload-box"><span class="admin-profile-upload-icon">
  <svg stroke="currentColor" fill="none" stroke-width="2" viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
  </span><strong>Upload Student Document</strong><small>Maximum 10 files per upload and 10 MB per file. Supported: PDF, JPG, JPEG, PNG, WEBP, DOC, DOCX, XLS and XLSX.

</small><label class="admin-profile-browse-button">Browse files
   <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
        onChange={handleFileChange}
      />
    </label></div>

    {/* Document count */}
    <div className="student-documents-section-heading">
      <strong>My Documents</strong>
      <span>
        {!student?._id ? draftFiles.length : documents.length}{" "}
        {(!student?._id ? draftFiles.length : documents.length) === 1
          ? ""
          : ""}
      </span>
    </div>

    {/* Draft files before student record exists */}
    {!student?._id ? (
      draftFiles.length === 0 ? (
        <div className="student-documents-empty">
          <FiFileText />
          <strong>No Documents Uploaded Yet</strong>
          <span>Click to Browse files button to add student documents.</span>
        </div>
      ) : (
        <div className="student-documents-grid">
          {draftFiles.map((file, index) => (
            <div
              className="student-document-card"
              key={`${file.name}-${file.size}-${index}`}
            >
              <div className="student-document-file-icon">
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
                  onClick={() =>
                    onDraftFilesChange?.((previous) =>
                      previous.filter((_, i) => i !== index)
                    )
                  }
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
    ) : documents.length === 0 ? (
      <div className="student-documents-empty">
        <FiFileText />
        <strong>No documents uploaded</strong>
        <span>Choose files above to upload student documents.</span>
      </div>
    ) : (
      <div className="student-documents-grid">
        {documents.map((document) => (
          <div className="student-document-card" key={document._id}>
            <div
              className={`student-document-file-icon ${
                isImage(document)
                  ? "image-file"
                  : "regular-file"
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
                disabled={busyDocumentId === document._id}
                onClick={() => handleView(document)}
              >
                <FiEye />
              </button>

              <button
                type="button"
                title="Download document"
                aria-label={`Download ${getDocumentName(document)}`}
                disabled={busyDocumentId === document._id}
                onClick={() => handleDownload(document)}
              >
                <FiDownload />
              </button>

              <button
                type="button"
                title="Delete document"
                aria-label={`Delete ${getDocumentName(document)}`}
                className="danger"
                disabled={busyDocumentId === document._id}
                onClick={() => handleDelete(document)}
              >
                <FiTrash2 />
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  


    </div>
  );
};

export default StudentDocuments;