import api from "./api";

export const getAssignments = (params = {}) =>
  api.get("/assignments/admin", { params });

export const getAssignment = (id) =>
  api.get(`/assignments/admin/${id}`);

export const createAssignment = (formData) =>
  api.post("/assignments/admin", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateAssignment = (id, formData) =>
  api.put(`/assignments/admin/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const updateAssignmentStatus = (id, status) =>
  api.patch(`/assignments/admin/${id}/status`, { status });

export const deleteAssignment = (id) =>
  api.delete(`/assignments/admin/${id}`);

export const addAssignmentAttachments = (id, formData) =>
  api.post(`/assignments/admin/${id}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const removeAssignmentAttachment = (id, fileId) =>
  api.delete(`/assignments/admin/${id}/attachments/${fileId}`);

export const downloadAssignmentFile = (id, fileId) =>
  api.get(`/assignments/admin/${id}/files/${fileId}/download`, {
    responseType: "blob",
  });