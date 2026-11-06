
import api from "./api";

export const getStudentDocuments = async (studentId) => {
  return api.get(`/students/${studentId}/documents`, {
    silent: true,
  });
};

export const uploadStudentDocuments = async (studentId, files) => {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append("documents", file);
  });

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
