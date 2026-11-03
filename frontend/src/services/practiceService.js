
import api from "./api";

const BASE_URL = "/practice/admin";

export const getPracticeTests = (params = {}) =>
  api.get(`${BASE_URL}/tests`, { params });

export const getPracticeTest = (id) => {
  if (!id) throw new Error("Practice test ID is required.");
  return api.get(`${BASE_URL}/tests/${id}`);
};

export const createPracticeTest = (data) =>
  api.post(`${BASE_URL}/tests`, data);

export const updatePracticeTest = (id, data) => {
  if (!id) throw new Error("Practice test ID is required.");
  return api.patch(`${BASE_URL}/tests/${id}`, data);
};

export const updatePracticeTestStatus = (id, status) => {
  if (!id) throw new Error("Practice test ID is required.");
  return api.patch(`${BASE_URL}/tests/${id}/status`, { status });
};

export const deletePracticeTest = (id) => {
  if (!id) throw new Error("Practice test ID is required.");
  return api.delete(`${BASE_URL}/tests/${id}`);
};
