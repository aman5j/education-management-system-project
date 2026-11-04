
import api from "./api";

const studentAssignmentService = {
  getAssignments: () =>
    api.get("/assignments/student"),

  getAssignment: (id) =>
    api.get(`/assignments/student/${id}`),

  downloadReferenceFile: (assignmentId, fileId) =>
    api.get(
      `/assignments/student/${assignmentId}/files/${fileId}/download`,
      { responseType: "blob" }
    ),

  // Student assignment submission
  submitAssignment: (assignmentId, formData) =>
    api.post(
      `/assignments/student/${assignmentId}/submit`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    ),

  getSubmissionHistory: (assignmentId) =>
    api.get(`/assignments/student/${assignmentId}/history`),

  downloadSubmissionFile: (
    assignmentId,
    versionId,
    fileId
  ) =>
    api.get(
      `/assignments/student/${assignmentId}/history/${versionId}/files/${fileId}/download`,
      { responseType: "blob" }
    ),
};

export default studentAssignmentService;
