import api from "./api";

export const getPaymentReport = (params = {}) =>
  api.get("/reports/payments", {
    params,
    silent: true,
  });

export const getPaymentReportFilters = () =>
  api.get("/reports/payment-filters", {
    silent: true,
  });