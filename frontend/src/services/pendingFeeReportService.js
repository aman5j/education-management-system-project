import api from "./api";

export const getPendingFeeReport = (
  params = {}
) => {
  return api.get(
    "/reports/pending-fees",
    {
      params,
    }
  );
};

export const getPendingFeeReportFilters = () => {
  return api.get(
    "/reports/pending-fee-filters"
  );
};