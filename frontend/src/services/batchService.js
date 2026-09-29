import api from "./api";

export const getBatches =
  async (params = {}) => {
    return api.get(
      "/batches",
      {
        params,
      }
    );
  };

export const getBatch =
  async (id) => {
    return api.get(
      `/batches/${id}`
    );
  };

export const createBatch =
  async (data) => {
    return api.post(
      "/batches",
      data
    );
  };

export const updateBatch =
  async (
    id,
    data
  ) => {
    return api.put(
      `/batches/${id}`,
      data
    );
  };

export const deleteBatch =
  async (id) => {
    return api.delete(
      `/batches/${id}`
    );
  };