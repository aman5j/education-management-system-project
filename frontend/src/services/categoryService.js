
import api from "./api";

// Category requests are handled by their calling pages/forms.
// silent prevents duplicate global Axios error toasts.

export const getCategories = async (params = {}, config = {}) => {
  return api.get("/categories", {
    ...config,
    params,
    silent: true,
  });
};

export const getCategory = async (id) => {
  return api.get(`/categories/${id}`, {
    silent: true,
  });
};

export const createCategory = async (formData) => {
  return api.post("/categories", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    silent: true,
  });
};

export const updateCategory = async (id, formData) => {
  return api.put(`/categories/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    silent: true,
  });
};

export const deleteCategory = async (id) => {
  return api.delete(`/categories/${id}`, {
    silent: true,
  });
};
