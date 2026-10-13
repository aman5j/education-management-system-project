
import api from "./api";

export const getExamResults = (params = {}) =>
  api.get("/exam-results", { params });

export const getExamCandidates = (examId) => {
  if (!examId) throw new Error("Exam ID is required.");
  return api.get(`/exam-results/exams/${examId}/candidates`);
};

export const getExamResult = (resultId) => {
  if (!resultId) throw new Error("Result ID is required.");
  return api.get(`/exam-results/${resultId}`);
};

export const saveExamResult = (payload) =>
  api.post("/exam-results", payload);

export const publishExamResult = (resultId) => {
  if (!resultId) throw new Error("Result ID is required.");
  return api.patch(`/exam-results/${resultId}/publish`);
};
