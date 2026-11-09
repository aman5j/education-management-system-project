import api from "./api";

// ----------------------------------------------------
// ADMIN ASSIGNMENT MANAGEMENT
// ----------------------------------------------------

export const getAssignments = (params = {}) =>
  api.get("/assignments/admin", {
    params,
    silent: true,
  });

export const getAssignment = (id) =>
  api.get(`/assignments/admin/${id}`, {
    silent: true,
  });

export const createAssignment = (formData) =>
  api.post("/assignments/admin", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    silent: true,
  });

export const updateAssignment = (id, formData) =>
  api.put(`/assignments/admin/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    silent: true,
  });

export const updateAssignmentStatus = (id, status) =>
  api.patch(
    `/assignments/admin/${id}/status`,
    { status },
    { silent: true }
  );

export const deleteAssignment = (id) =>
  api.delete(`/assignments/admin/${id}`, {
    silent: true,
  });

// ----------------------------------------------------
// ADMIN REFERENCE ATTACHMENTS
// ----------------------------------------------------

export const addAssignmentAttachments = (id, formData) =>
  api.post(`/assignments/admin/${id}/attachments`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    silent: true,
  });

export const removeAssignmentAttachment = (id, fileId) =>
  api.delete(`/assignments/admin/${id}/attachments/${fileId}`, {
    silent: true,
  });

export const downloadAssignmentFile = (id, fileId) =>
  api.get(
    `/assignments/admin/${id}/files/${fileId}/download`,
    {
      responseType: "blob",
      silent: true,
    }
  );

// ----------------------------------------------------
// ADMIN SUBMISSIONS
// ----------------------------------------------------

export const getAssignmentSubmissions = (id, params = {}) =>
  api.get(`/assignments/admin/${id}/submissions`, {
    params,
    silent: true,
  });

export const getAdminSubmissionHistory = (
  assignmentId,
  submissionId
) =>
  api.get(
    `/assignments/admin/${assignmentId}/submissions/${submissionId}/history`,
    { silent: true }
  );

export const setStudentResubmission = (
  assignmentId,
  submissionId,
  enabled
) =>
  api.patch(
    `/assignments/admin/${assignmentId}/submissions/${submissionId}/resubmission`,
    { enabled },
    { silent: true }
  );

export const downloadSubmissionFile = (submissionId, fileId) =>
  api.get(
    `/assignments/admin/submissions/${submissionId}/files/${fileId}`,
    {
      responseType: "blob",
      silent: true,
    }
  );

// ----------------------------------------------------
// ADMIN EVALUATION
// ----------------------------------------------------

export const getSubmissionEvaluation = (submissionId) =>
  api.get(
    `/assignments/admin/submissions/${submissionId}/evaluation`,
    { silent: true }
  );

export const saveSubmissionEvaluation = (submissionId, data) =>
  api.post(
    `/assignments/admin/submissions/${submissionId}/evaluation`,
    data,
    { silent: true }
  );

export const publishSubmissionEvaluation = (submissionId) =>
  api.patch(
    `/assignments/admin/submissions/${submissionId}/evaluation/publish`,
    {},
    { silent: true }
  );