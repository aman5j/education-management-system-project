
import api from "./api";

export const getExams = (params = {}) =>
  api.get("/exams", { params });

export const getExam = (id) => {
  if (!id) throw new Error("Exam ID is required.");
  return api.get(`/exams/${id}`);
};

export const createExam = (data) =>
  api.post("/exams", data);

export const updateExam = (id, data) => {
  if (!id) throw new Error("Exam ID is required.");
  return api.patch(`/exams/${id}`, data);
};

export const deleteExam = (id) => {
  if (!id) throw new Error("Exam ID is required.");
  return api.delete(`/exams/${id}`);
};
