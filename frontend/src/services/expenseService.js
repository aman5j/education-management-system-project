import api from "./api";

export const getExpenses = (params = {}) =>
  api.get("/expenses", {
    params,
    silent: true,
  });

export const getExpenseSummary = (params = {}) =>
  api.get("/expenses/summary", {
    params,
    silent: true,
  });

export const getExpense = (id) =>
  api.get(`/expenses/${id}`, {
    silent: true,
  });

export const createExpense = (data) =>
  api.post("/expenses", data, {
    silent: true,
  });

export const updateExpense = (id, data) =>
  api.put(`/expenses/${id}`, data, {
    silent: true,
  });

export const deleteExpense = (id) =>
  api.delete(`/expenses/${id}`, {
    silent: true,
  });

export const uploadExpenseReceipt = (file) => {
  const formData = new FormData();
  formData.append("receipt", file);

  return api.post("/expenses/upload-receipt", formData, {
    headers: {
      "Content-Type": undefined,
    },
    silent: true,
  });
};

export const getExpenseReport = (params = {}) =>
  api.get("/reports/expenses", {
    params,
    silent: true,
  });