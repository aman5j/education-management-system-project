import api from "./api";

export const getFeeReport =
  (params = {}) => {
    return api.get(
      "/reports/fees",
      {
        params,
      }
    );
  };

export const getFeeReportFilters =
  () => {
    return api.get(
      "/reports/fee-filters"
    );
  };