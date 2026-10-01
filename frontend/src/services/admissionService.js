import api from "./api";

export const getAdmissions = (params = {}) =>
  api.get("/admissions", {
    params,
  });

export const getAdmission = (id) =>
  api.get(`/admissions/${id}`);

export const createAdmission = (data) =>
  api.post("/admissions", data);

export const updateAdmission = (
  id,
  data
) =>
  api.put(`/admissions/${id}`, data);

export const deleteAdmission = (id) =>
  api.delete(`/admissions/${id}`);