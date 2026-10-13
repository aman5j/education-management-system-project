
import api from "./api";

export const getAttendanceReport = (params = {}) =>
  api.get("/reports/attendance", { params });
