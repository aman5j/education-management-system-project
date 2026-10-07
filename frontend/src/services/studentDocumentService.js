import api from "./api";

export const getStudentDocuments =
  async (studentId) => {
    return api.get(
      `/students/${studentId}/documents`
    );
  };

export const uploadStudentDocuments =
  async (
    studentId,
    files
  ) => {
    const formData =
      new FormData();

    files.forEach((file) => {
      formData.append(
        "documents",
        file
      );
    });

    return api.post(
      `/students/${studentId}/documents`,
      formData,
      {
        headers: {
          "Content-Type":
            "multipart/form-data",
        },
      }
    );
  };

export const viewStudentDocument =
  async (
    studentId,
    documentId
  ) => {
    return api.get(
      `/students/${studentId}/documents/${documentId}/view`,
      {
        responseType: "blob",
      }
    );
  };

export const downloadStudentDocument =
  async (
    studentId,
    documentId
  ) => {
    return api.get(
      `/students/${studentId}/documents/${documentId}/download`,
      {
        responseType: "blob",
      }
    );
  };

export const deleteStudentDocument =
  async (
    studentId,
    documentId
  ) => {
    return api.delete(
      `/students/${studentId}/documents/${documentId}`
    );
  };