
import api from "./api";

export const getCourseReport = (params = {}) =>
  api.get("/reports/courses", {
    params,
    silent: true,
  });
