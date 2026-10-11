
import api from "./api";

const QUESTION_API = "/questions";

export const getQuestions = (params = {}) =>
  api.get(QUESTION_API, { params });

export const getQuestion = (id) => {
  if (!id) throw new Error("Question ID is required.");
  return api.get(`${QUESTION_API}/${id}`);
};

export const createQuestion = (data) =>
  api.post(QUESTION_API, data);

export const updateQuestion = (id, data) => {
  if (!id) throw new Error("Question ID is required.");
  return api.patch(`${QUESTION_API}/${id}`, data);
};

export const updateQuestionStatus = (id, status) => {
  if (!id) throw new Error("Question ID is required.");
  return api.patch(`${QUESTION_API}/${id}/status`, { status });
};

export const deleteQuestion = (id) => {
  if (!id) throw new Error("Question ID is required.");
  return api.delete(`${QUESTION_API}/${id}`);
};
