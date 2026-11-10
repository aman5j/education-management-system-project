import api from "./api";

export const getFeeReport = (params = {}) =>
  api.get("/reports/fees", {
    params,
    silent: true,
  });

export const getFeeReportFilters = () =>
  api.get("/reports/fee-filters", {
    silent: true,
  });