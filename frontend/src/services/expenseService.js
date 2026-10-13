
import api from "./api";

export const getExpenses = (params = {}) =>
  api.get("/expenses", { params });

export const getExpenseSummary = (params = {}) =>
  api.get("/expenses/summary", { params });

export const getExpense = (id) =>
  api.get(`/expenses/${id}`);

export const createExpense = (data) =>
  api.post("/expenses", data);

export const updateExpense = (id, data) =>
  api.put(`/expenses/${id}`, data);

export const deleteExpense = (id) =>
  api.delete(`/expenses/${id}`);


export const uploadExpenseReceipt = (file) => {
  const formData = new FormData();
  formData.append("receipt", file);

  return api.post("/expenses/upload-receipt", formData, {
    headers: {
      "Content-Type": undefined,
    },
  });
};


export const getExpenseReport = (params = {}) =>
  api.get("/reports/expenses", { params });
