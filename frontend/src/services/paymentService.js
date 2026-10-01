import api from "./api";

export const getPayments = (
  params = {}
) =>
  api.get(
    "/payments",
    {
      params,
    }
  );

export const getPayment = (
  id
) =>
  api.get(
    `/payments/${id}`
  );

export const createPayment = (
  data
) =>
  api.post(
    "/payments",
    data
  );

export const updatePayment = (
  id,
  data
) =>
  api.put(
    `/payments/${id}`,
    data
  );

export const deletePayment = (
  id
) =>
  api.delete(
    `/payments/${id}`
  );