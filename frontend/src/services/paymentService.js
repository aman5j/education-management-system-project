import api from "./api";

export const getPayments = (params = {}) =>
  api.get("/payments", {
    params,
    silent: true,
  });

export const getStudentPaymentHistory = (studentId) =>
  api.get(`/payments/student/${studentId}`, {
    silent: true,
  });

export const getPayment = (id) =>
  api.get(`/payments/${id}`, {
    silent: true,
  });

export const createPayment = (data) =>
  api.post("/payments", data, {
    silent: true,
  });

export const updatePayment = (id, data) =>
  api.put(`/payments/${id}`, data, {
    silent: true,
  });

export const deletePayment = (id) =>
  api.delete(`/payments/${id}`, {
    silent: true,
  });