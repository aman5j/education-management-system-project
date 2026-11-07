
import api from "./api";

export const getAttendance = (params = {}) =>
  api.get("/attendance", {
    params,
    silent: true,
  });

export const createAttendance = (data) =>
  api.post("/attendance", data, {
    silent: true,
  });

export const updateAttendance = (id, data) =>
  api.patch(`/attendance/${id}`, data, {
    silent: true,
  });
