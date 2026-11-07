
import api from "./api";

export const getBatches = (params = {}) =>
  api.get("/batches", {
    params,
    silent: true,
  });

export const getBatch = (id) =>
  api.get(`/batches/${id}`, {
    silent: true,
  });

export const createBatch = (data) =>
  api.post("/batches", data, {
    silent: true,
  });

export const updateBatch = (id, data) =>
  api.put(`/batches/${id}`, data, {
    silent: true,
  });

export const deleteBatch = (id) =>
  api.delete(`/batches/${id}`, {
    silent: true,
  });
