
import api from "./api";

export const getBatchReport = (params = {}) =>
  api.get("/reports/batches", {
    params,
    silent: true,
  });

export const getBatchReportFilters = () =>
  api.get("/reports/batch-filters", {
    silent: true,
  });
