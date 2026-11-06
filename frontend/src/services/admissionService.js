
import api from "./api";

export const getAdmissions = (params = {}) =>
  api.get("/admissions", {
    params,
    silent: true,
  });

export const getAdmission = (id) =>
  api.get(`/admissions/${id}`, {
    silent: true,
  });

export const createAdmission = (data) =>
  api.post("/admissions", data, {
    silent: true,
  });

export const updateAdmission = (id, data) =>
  api.put(`/admissions/${id}`, data, {
    silent: true,
  });

export const deleteAdmission = (id) =>
  api.delete(`/admissions/${id}`, {
    silent: true,
  });
