
import api from "./api";

// Assignment management
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

// Reference attachments
export const addAssignmentAttachments = (id, formData) =>
  api.post(`/assignments/admin/${id}/attachments`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const removeAssignmentAttachment = (id, fileId) =>
  api.delete(`/assignments/admin/${id}/attachments/${fileId}`);

export const downloadAssignmentFile = (id, fileId) =>
  api.get(
    `/assignments/admin/${id}/files/${fileId}/download`,
    { responseType: "blob" }
  );

// Admin submissions
export const getAssignmentSubmissions = (id, params = {}) =>
  api.get(`/assignments/admin/${id}/submissions`, { params });

export const getAdminSubmissionHistory = (assignmentId, submissionId) =>
  api.get(
    `/assignments/admin/${assignmentId}/submissions/${submissionId}/history`
  );

export const setStudentResubmission = (
  assignmentId,
  submissionId,
  enabled
) =>
  api.patch(
    `/assignments/admin/${assignmentId}/submissions/${submissionId}/resubmission`,
    { enabled }
  );

export const downloadSubmissionFile = (submissionId, fileId) =>
  api.get(
    `/assignments/admin/submissions/${submissionId}/files/${fileId}`,
    { responseType: "blob" }
  );
