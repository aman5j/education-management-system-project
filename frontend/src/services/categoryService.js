
import api from "./api";

export const getCategories = async (params = {}, config = {}) => {
  return api.get("/categories", {
    params,
    ...config,
  });
};

export const getCategory = async (id) => {
  return api.get(`/categories/${id}`);
};

export const createCategory = async (formData) => {
  return api.post("/categories", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const updateCategory = async (id, formData) => {
  return api.put(`/categories/${id}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const deleteCategory = async (id) => {
  return api.delete(`/categories/${id}`);
};
