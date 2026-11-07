
import api from "./api";

export const getExamAccessRequests = (params = {}) =>
  api.get("/exam-access-requests", {
    params,
    silent: true,
  });

export const reviewExamAccessRequest = (requestId, data) => {
  if (!requestId) {
    throw new Error("Exam access request ID is required.");
  }

  return api.patch(
    `/exam-access-requests/${requestId}/review`,
    data,
    { silent: true }
  );
};
