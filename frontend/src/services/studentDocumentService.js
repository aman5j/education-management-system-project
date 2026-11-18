
import api from "./api";

export const getStudentDocuments = async (studentId) => {
  return api.get(`/students/${studentId}/documents`, {
    silent: true,
  });
};

// !!!!! INSERTION START: UPLOAD DOCUMENTS WITH ADMIN-ENTERED NAMES !!!!!
export const uploadStudentDocuments = async (studentId, documents) => {
  const formData = new FormData();

  documents.forEach((document) => {
    formData.append("documents", document.file);
  });

  formData.append(
    "documentNames",
    JSON.stringify(
      documents.map((document) => document.displayName.trim())
    )
  );

  return api.post(
    `/students/${studentId}/documents`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      silent: true,
    }
  );
};
// !!!!! INSERTION END: UPLOAD DOCUMENTS WITH ADMIN-ENTERED NAMES !!!!!

export const viewStudentDocument = async (studentId, documentId) => {
  return api.get(
    `/students/${studentId}/documents/${documentId}/view`,
    {
      responseType: "blob",
      silent: true,
    }
  );
};

export const downloadStudentDocument = async (
  studentId,
  documentId
) => {
  return api.get(
    `/students/${studentId}/documents/${documentId}/download`,
    {
      responseType: "blob",
      silent: true,
    }
  );
};

export const deleteStudentDocument = async (
  studentId,
  documentId
) => {
  return api.delete(
    `/students/${studentId}/documents/${documentId}`,
    {
      silent: true,
    }
  );
};
