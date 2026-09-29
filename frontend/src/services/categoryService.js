import api from "./api";

export const getCategories =
  async (params = {}) => {
    return api.get(
      "/categories",
      {
        params,
      }
    );
  };

export const getCategory =
  async (id) => {
    return api.get(
      `/categories/${id}`
    );
  };

// export const createCategory =
//   async (formData) => {
//     return api.post(
//       "/categories",
//       formData
//     );
//   };

// export const updateCategory =
//   async (
//     id,
//     formData
//   ) => {
//     return api.put(
//       `/categories/${id}`,
//       formData
//     );
//   };

export const createCategory = async (formData) => {
  return api.post("/categories", formData, {
    headers: {
      "Content-Type": "multipart/form-data", // Ensure multipart form data is sent correctly
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


export const deleteCategory =
  async (id) => {
    return api.delete(
      `/categories/${id}`
    );
  };