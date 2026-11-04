
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
};

export default studentAssignmentService;
