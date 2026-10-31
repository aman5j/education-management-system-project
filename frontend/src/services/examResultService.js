
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





export const getExamResultReview = (resultId) => {
  if (!resultId) throw new Error("Result ID is required.");
  return api.get(`/exam-results/${resultId}/review`);
};

export const unpublishExamResult = (resultId, reason) =>
  api.patch(`/exam-results/${resultId}/unpublish`, { reason });

export const overrideQuestionMarks = (
  resultId,
  questionId,
  payload
) =>
  api.patch(
    `/exam-results/${resultId}/questions/${questionId}/marks`,
    payload
  );

export const previewAnswerKeyCorrection = (examId, payload) =>
  api.post(
    `/exam-results/exams/${examId}/answer-key/preview`,
    payload
  );

export const applyAnswerKeyCorrection = (examId, payload) =>
  api.post(
    `/exam-results/exams/${examId}/answer-key/apply`,
    payload
  );



/*Admin control the marks and percentage */

export const getAdminUpdateMarksList = (params = {}) =>
  api.get("/exam-results/admin/update-marks", { params });

export const getAdminFinalResult = (resultId) => {
  if (!resultId) throw new Error("Result ID is required.");
  return api.get(`/exam-results/admin/update-marks/${resultId}`);
};

export const updateAdminFinalResult = (resultId, payload) => {
  if (!resultId) throw new Error("Result ID is required.");
  return api.patch(
    `/exam-results/admin/update-marks/${resultId}`,
    payload
  );
};


export const publishAdminFinalResult = (resultId) => {
  if (!resultId) throw new Error("Result ID is required.");

  return api.patch(
    `/exam-results/admin/update-marks/${resultId}/publish`
  );
};