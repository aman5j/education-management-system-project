import api from "./api";

export const getPaymentReport = async (params = {}) => {
  return api.get("/reports/payments", {
    params,
  });
};

export const getPaymentReportFilters = async () => {
  return api.get("/reports/payment-filters");
};