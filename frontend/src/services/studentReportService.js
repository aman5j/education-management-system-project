import api from "./api";

export const getStudentReportFilters = async () => {
  return api.get("/reports/student-filters", {
    silent: true,
  });
};

export const getStudentReport = async (filters = {}) => {
  const params = {};

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params[key] = value;
    }
  });

  return api.get("/reports/students", {
    params,
    silent: true,
  });
};