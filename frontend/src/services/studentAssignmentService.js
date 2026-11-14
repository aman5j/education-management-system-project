
import api from "./api";

const studentAssignmentService = {
  getAssignments: () =>
    api.get("/assignments/student", {
      silent: true,
    }),

  getAssignment: (id) =>
    api.get(`/assignments/student/${id}`, {
      silent: true,
    }),

  downloadReferenceFile: (assignmentId, fileId) =>
    api.get(
      `/assignments/student/${assignmentId}/files/${fileId}/download`,
      {
        responseType: "blob",
        silent: true,
      }
    ),

  submitAssignment: (assignmentId, formData) =>
    api.post(
      `/assignments/student/${assignmentId}/submit`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        silent: true,
      }
    ),

  getSubmissionHistory: (assignmentId) =>
    api.get(`/assignments/student/${assignmentId}/history`, {
      silent: true,
    }),

  downloadSubmissionFile: (
    assignmentId,
    versionId,
    fileId
  ) =>
    api.get(
      `/assignments/student/${assignmentId}/history/${versionId}/files/${fileId}/download`,
      {
        responseType: "blob",
        silent: true,
      }
    ),
};

export default studentAssignmentService;
