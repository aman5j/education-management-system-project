import api from "./api";

export const getPendingFeeReport = (params = {}) => {
  return api.get("/reports/pending-fees", {
    params,
    silent: true,
  });
};

export const getPendingFeeReportFilters = () => {
  return api.get("/reports/pending-fee-filters", {
    silent: true,
  });
};