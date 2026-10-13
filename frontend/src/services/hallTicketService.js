import api from "./api";

export const getHallTickets = (params = {}) =>
  api.get("/hall-tickets", { params });

export const generateHallTickets = (payload) =>
  api.post("/hall-tickets/generate", payload);

export const cancelHallTicket = (id) => {
  if (!id) throw new Error("Hall ticket ID is required.");
  return api.patch(`/hall-tickets/${id}/cancel`);
};